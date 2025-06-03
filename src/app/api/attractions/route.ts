import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 验证景点创建的数据
const createAttractionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  images: z.array(z.string().url()),
});

// 获取景点列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // 默认 5km

    let attractions;
    if (lat && lng) {
      // 使用 PostGIS 进行地理位置查询
      attractions = await prisma.$queryRaw`
        SELECT 
          id, name, description, images, 
          ST_AsGeoJSON(location)::json as location,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography
          ) as distance
        FROM "Attraction"
        WHERE ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography,
          ${parseInt(radius)}
        )
        ORDER BY distance;
      `;
    } else {
      attractions = await prisma.attraction.findMany({
        include: {
          _count: {
            select: {
              visitedBy: true,
              wantToVisitBy: true,
            },
          },
        },
      });
    }

    return NextResponse.json(attractions);
  } catch (error) {
    console.error('Error fetching attractions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attractions' },
      { status: 500 }
    );
  }
}

// 创建新景点
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createAttractionSchema.parse(body);

    const attraction = await prisma.attraction.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        location: {
          type: 'Point',
          coordinates: [validatedData.location.longitude, validatedData.location.latitude],
        },
        images: validatedData.images,
      },
    });

    return NextResponse.json(attraction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating attraction:', error);
    return NextResponse.json(
      { error: 'Failed to create attraction' },
      { status: 500 }
    );
  }
} 