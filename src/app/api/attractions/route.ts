import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Attraction } from '@/types/responses';
import { attractionSchema } from '@/types/dtos';
import { auth } from '@/auth';

interface LocationData {
  geo: {
    latitude: number;
    longitude: number;
  };
}

interface LocationQueryResult {
  id: string;
  location: LocationData;
}

function formatAttraction(attraction: any): Attraction {
  return {
    id: attraction.id,
    name: attraction.name,
    description: attraction.description,
    images: attraction.images,
    address: attraction.address,
    city: attraction.city,
    province: attraction.province,
    country: attraction.country,
    category: attraction.category,
    price: attraction.price,
    openingHours: attraction.openingHours,
    contact: attraction.contact,
    website: attraction.website,
    createdAt: attraction.createdAt.toISOString(),
    updatedAt: attraction.updatedAt.toISOString(),
    location: attraction.location ? {
      geo: {
        latitude: attraction.location.geo.coordinates[1],
        longitude: attraction.location.geo.coordinates[0],
      },
    } : null,
    _count: attraction._count,
    createdBy: attraction.createdBy,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const skip = (page - 1) * limit;

    const [attractions, total] = await Promise.all([
      prisma.attraction.findMany({
        where: {
          location: {
            isNot: null, // 只获取有位置数据的景点
          },
        },
        skip,
        take: limit,
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
          // location: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.attraction.count(),
    ]);

    const formattedAttractions = attractions.map(formatAttraction);
    const attractionsWithLocation: Attraction[] = formattedAttractions.map(attraction => ({
      ...attraction,
      location: null, // 初始化为 null，后续会被更新
    }));

    // 如果提供了地理位置参数，使用原始 SQL 查询位置数据
    const queryLat = searchParams.get('lat');
    const queryLng = searchParams.get('lng');
    const queryRadius = searchParams.get('radius');
    if (queryLat && queryLng && queryRadius) {
      const lat = parseFloat(queryLng);
      const lng = parseFloat(queryLng);
      const radius = parseFloat(queryRadius);
      const locations = await prisma.$queryRaw<LocationQueryResult[]>`Add commentMore actions
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
      // 合并位置数据到景点信息中Add commentMore actions
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

    return successResponse({
      items: attractionsWithLocation,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse('未授权', 401);
    }

    const json = await request.json();
    const data = attractionSchema.parse(json);

    const attraction = await prisma.$transaction(async (tx) => {
      // 创建景点
      const newAttraction = await tx.attraction.create({
        data: {
          name: data.name,
          description: data.description,
          images: data.images,
          address: data.address,
          city: data.city,
          province: data.province,
          country: data.country,
          category: data.category,
          price: data.price,
          openingHours: data.openingHours,
          contact: data.contact,
          website: data.website,
          createdById: userId,
        },
      });

      // 如果有位置信息，创建位置记录
      if (data.location) {
        await tx.$executeRaw`
          INSERT INTO "Location" ("id", "attractionId", "geo")
          VALUES (
            ${crypto.randomUUID()},
            ${newAttraction.id},
            ST_SetSRID(ST_MakePoint(${data.location.geo.longitude}, ${data.location.geo.latitude}), 4326)
          )
        `;
      }

      // 获取完整的景点信息，包括位置
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
          location: true,
        },
      });
    });

    if (!attraction) {
      throw new Error('创建景点失败');
    }

    const formattedAttraction = formatAttraction(attraction);

    return successResponse(formattedAttraction, '创建成功');
  } catch (error) {
    return handleApiError(error);
  }
} 