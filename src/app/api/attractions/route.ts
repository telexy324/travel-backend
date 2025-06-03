import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
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
    const user = await getAuthUser(request as any);
    
    const attractions = await prisma.attraction.findMany({
      include: {
        _count: {
          select: {
            visitedBy: true,
            wantToVisitBy: true,
          },
        },
      },
    });

    // 如果用户已登录，添加用户的访问状态
    const attractionsWithUserStatus = user
      ? await Promise.all(
          attractions.map(async (attraction) => {
            const [visited, wantToVisit] = await Promise.all([
              prisma.userAttraction.findUnique({
                where: {
                  userId_attractionId: {
                    userId: user.id,
                    attractionId: attraction.id,
                  },
                  type: 'VISITED',
                },
              }),
              prisma.userAttraction.findUnique({
                where: {
                  userId_attractionId: {
                    userId: user.id,
                    attractionId: attraction.id,
                  },
                  type: 'WANT_TO_VISIT',
                },
              }),
            ]);

            return {
              ...attraction,
              userStatus: {
                visited: !!visited,
                wantToVisit: !!wantToVisit,
              },
            };
          })
        )
      : attractions;

    return NextResponse.json(attractionsWithUserStatus);
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
    const user = await getAuthUser(request as any);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const attraction = await prisma.attraction.create({
      data: {
        ...data,
        createdBy: {
          connect: { id: user.id },
        },
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