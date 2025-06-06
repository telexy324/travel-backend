import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Attraction } from '@/types/responses';
import { updateAttractionSchema } from '@/types/dtos';
import { auth } from '@/auth';

type PrismaAttraction = {
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
  openingHours: string | null;
  contact: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
  location: {
    lat: number;
    lng: number;
  } | null;
  createdById: string;
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

function formatAttraction(attraction: PrismaAttraction): Attraction {
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
        latitude: attraction.location.lat,
        longitude: attraction.location.lng,
      },
    } : null,
    _count: attraction._count,
    createdBy: attraction.createdBy,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
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
    }) as PrismaAttraction | null;

    if (!attraction) {
      return errorResponse('景点不存在', 404);
    }

    return successResponse(formatAttraction(attraction));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse('未授权', 401);
    }

    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });

    if (!attraction) {
      return errorResponse('景点不存在', 404);
    }

    if (attraction.createdById !== userId) {
      return errorResponse('无权修改此景点', 403);
    }

    const json = await request.json();
    const data = updateAttractionSchema.parse(json);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedAttraction = await prisma.$transaction(async (tx: any) => {
      const attraction = await tx.attraction.update({
        where: { id: params.id },
        data: {
          ...data,
          location: undefined, // 先清除位置数据
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

      if (data.location) {
        // 删除旧的位置数据
        await tx.$executeRaw`
          DELETE FROM "Location"
          WHERE "attractionId" = ${params.id}
        `;

        // 插入新的位置数据
        await tx.$executeRaw`
          INSERT INTO "Location" ("id", "attractionId", "geo")
          VALUES (
            ${crypto.randomUUID()},
            ${params.id},
            ST_SetSRID(ST_MakePoint(${data.location.geo.longitude}, ${data.location.geo.latitude}), 4326)
          )
        `;
      }

      return tx.attraction.findUnique({
        where: { id: params.id },
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
    }) as PrismaAttraction;

    return successResponse(formatAttraction(updatedAttraction), '更新成功');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse('未授权', 401);
    }

    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });

    if (!attraction) {
      return errorResponse('景点不存在', 404);
    }

    if (attraction.createdById !== userId) {
      return errorResponse('无权删除此景点', 403);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // 先删除位置数据
      await tx.$executeRaw`
        DELETE FROM "Location"
        WHERE "attractionId" = ${params.id}
      `;

      // 再删除景点数据
      await tx.attraction.delete({
        where: { id: params.id },
      });
    });

    return successResponse(null, '删除成功');
  } catch (error) {
    return handleApiError(error);
  }
} 