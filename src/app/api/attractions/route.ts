import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

// 定义景点创建的数据验证模式
const createAttractionSchema = z.object({
  name: z.string().min(1, '景点名称不能为空'),
  description: z.string().min(1, '景点描述不能为空'),
  images: z.array(z.string().url('图片URL格式不正确')),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  address: z.string().min(1, '地址不能为空'),
  city: z.string().min(1, '城市不能为空'),
  province: z.string().min(1, '省份不能为空'),
  country: z.string().min(1, '国家不能为空'),
  category: z.string().min(1, '分类不能为空'),
  price: z.number().min(0, '价格不能为负数'),
  openingHours: z.string().optional(),
  contact: z.string().optional(),
  website: z.string().url('网站URL格式不正确').optional(),
});

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
    
    // 构建查询条件
    const where: any = {};
    
    // 如果提供了地理位置参数，添加地理空间查询
    if (validatedQuery.lat && validatedQuery.lng && validatedQuery.radius) {
      const lat = parseFloat(validatedQuery.lat);
      const lng = parseFloat(validatedQuery.lng);
      const radius = parseFloat(validatedQuery.radius);
      
      where.location = {
        near: {
          lat,
          lng,
          maxDistance: radius * 1000, // 转换为米
        },
      };
    }

    // 添加其他过滤条件
    if (validatedQuery.city) {
      where.city = validatedQuery.city;
    }
    if (validatedQuery.category) {
      where.category = validatedQuery.category;
    }
    if (validatedQuery.minPrice || validatedQuery.maxPrice) {
      where.price = {};
      if (validatedQuery.minPrice) {
        where.price.gte = parseFloat(validatedQuery.minPrice);
      }
      if (validatedQuery.maxPrice) {
        where.price.lte = parseFloat(validatedQuery.maxPrice);
      }
    }
    
    // 获取景点列表
    const attractions = await prisma.attraction.findMany({
      where,
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
    
    return NextResponse.json(attractions);
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
    const validatedData = createAttractionSchema.parse(body);
    
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
      return tx.attraction.findUnique({
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