import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import type { Prisma } from '@prisma/client';
import { attractionBackendSchema } from '@/types/dtos';

// 定义位置数据的类型
interface LocationData {
  geo: {
    latitude: number;
    longitude: number;
  };
}

// 定义景点数据的类型
type AttractionWithLocation = {
  id: string;
  name: string;
  description: string;
  images: string[];
  address: string;
  city: string;
  province: string;
  country: string;
  category: string;
  price: number;
  openingHours?: string | null;
  contact?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
  location: LocationData | null;
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

// 定义原始SQL查询返回的位置数据类型
interface LocationQueryResult {
  id: string;
  location: LocationData;
}

// 定义景点创建的数据验证模式
// const createAttractionSchema = z.object({
//   name: z.string().min(1, '景点名称不能为空'),
//   description: z.string().min(1, '景点描述不能为空'),
//   images: z.array(z.string().url('图片URL格式不正确')),
//   location: z.object({
//     lat: z.number(),
//     lng: z.number(),
//   }),
//   address: z.string().min(1, '地址不能为空'),
//   city: z.string().min(1, '城市不能为空'),
//   province: z.string().min(1, '省份不能为空'),
//   country: z.string().min(1, '国家不能为空'),
//   category: z.string().min(1, '分类不能为空'),
//   price: z.number().min(0, '价格不能为负数'),
//   openingHours: z.string().optional(),
//   contact: z.string().optional(),
//   website: z.string().url('网站URL格式不正确').optional(),
// });

// 定义景点查询参数的数据验证模式
const querySchema = z.object({
  lat: z.string().optional(),
  lng: z.string().optional(),
  radius: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // 验证查询参数
    const validatedQuery = querySchema.parse(query);
    
    // 获取景点列表
    const attractions = await prisma.attraction.findMany({
      where: {
        ...(validatedQuery.city && { city: validatedQuery.city }),
        ...(validatedQuery.category && { category: validatedQuery.category }),
        ...(validatedQuery.minPrice && { price: { gte: parseFloat(validatedQuery.minPrice) } }),
        ...(validatedQuery.maxPrice && { price: { lte: parseFloat(validatedQuery.maxPrice) } }),
        location: {
          isNot: null, // 只获取有位置数据的景点
        },
      },
      include: {
        _count: {
          select: {
            visitedBy: true,
            wantToVisitBy: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 转换类型
    const attractionsWithLocation: AttractionWithLocation[] = attractions.map(attraction => ({
      ...attraction,
      location: null, // 初始化为 null，后续会被更新
    }));

    // 如果提供了地理位置参数，使用原始 SQL 查询位置数据
    if (validatedQuery.lat && validatedQuery.lng && validatedQuery.radius) {
      const lat = parseFloat(validatedQuery.lat);
      const lng = parseFloat(validatedQuery.lng);
      const radius = parseFloat(validatedQuery.radius);

      const locations = await prisma.$queryRaw<LocationQueryResult[]>`
        SELECT 
          a.id,
          json_build_object(
            'geo', json_build_object(
              'latitude', ST_Y(l.geo::geometry),
              'longitude', ST_X(l.geo::geometry)
            )
          ) as location
        FROM "Attraction" a
        INNER JOIN "Location" l ON a.id = l."attractionId"
        WHERE ST_DWithin(
          l.geo::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radius * 1000}
        )
      `;

      // 合并位置数据到景点信息中
      const locationMap = new Map(locations.map((loc: LocationQueryResult) => [loc.id, loc.location]));
      attractionsWithLocation.forEach((attraction) => {
        attraction.location = locationMap.get(attraction.id) || null;
      });
    } else {
      // 如果没有地理位置参数，获取所有景点的位置数据
      const locations = await prisma.$queryRaw<LocationQueryResult[]>`
        SELECT 
          a.id,
          json_build_object(
            'geo', json_build_object(
              'latitude', ST_Y(l.geo::geometry),
              'longitude', ST_X(l.geo::geometry)
            )
          ) as location
        FROM "Attraction" a
        INNER JOIN "Location" l ON a.id = l."attractionId"
      `;

      // 合并位置数据到景点信息中
      const locationMap = new Map(locations.map((loc: LocationQueryResult) => [loc.id, loc.location]));
      attractionsWithLocation.forEach((attraction) => {
        attraction.location = locationMap.get(attraction.id) || null;
      });
    }
    
    return NextResponse.json(attractionsWithLocation);
  } catch (error) {
    console.error('Error fetching attractions:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的查询参数' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '获取景点列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const user = await requireAuth(req);
    
    // 解析请求数据
    const body = await req.json();
    
    // 验证数据
    const validatedData = attractionBackendSchema.parse(body);
    
    // 使用事务来确保数据一致性
    const attraction = await prisma.$transaction(async (tx) => {
      // 1. 创建景点基本信息
      const newAttraction = await tx.attraction.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          images: validatedData.images,
          address: validatedData.address,
          city: validatedData.city,
          province: validatedData.province,
          country: validatedData.country,
          category: validatedData.category,
          price: validatedData.price,
          openingHours: validatedData.openingHours,
          contact: validatedData.contact,
          website: validatedData.website,
          createdBy: {
            connect: { id: user.id },
          },
        },
      });

      // 2. 使用原始 SQL 创建位置数据
      await tx.$executeRaw`
        UPDATE "Attraction"
        SET location = ST_SetSRID(ST_MakePoint(${validatedData.location.lng}, ${validatedData.location.lat}), 4326)
        WHERE id = ${newAttraction.id}
      `;

      // 3. 返回完整的景点信息
      const completeAttraction = await tx.attraction.findUnique({
        where: { id: newAttraction.id },
        include: {
          _count: {
            select: {
              visitedBy: true,
              wantToVisitBy: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // 转换为正确的类型
      return {
        ...completeAttraction,
        location: null, // 初始化为 null，后续会被更新
      } as AttractionWithLocation;
    });
    
    return NextResponse.json(attraction, { status: 201 });
  } catch (error) {
    console.error('Error creating attraction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的景点数据' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '创建景点失败' },
      { status: 500 }
    );
  }
} 