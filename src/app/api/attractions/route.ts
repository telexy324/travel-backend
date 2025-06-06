import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Attraction, AttractionsResponse } from '@/types/responses';
import { attractionSchema } from '@/types/dtos';
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const skip = (page - 1) * limit;

    const [attractions, total] = await Promise.all([
      prisma.attraction.findMany({
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }) as Promise<PrismaAttraction[]>,
      prisma.attraction.count(),
    ]);

    const formattedAttractions = attractions.map(formatAttraction);

    const response: AttractionsResponse = {
      success: true,
      data: {
        items: formattedAttractions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return successResponse(response);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attraction = await prisma.$transaction(async (tx: any) => {
      const newAttraction = await tx.attraction.create({
        data: {
          ...data,
          createdById: userId,
        },
      });

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
    }) as PrismaAttraction;

    const formattedAttraction = formatAttraction(attraction);

    return successResponse(formattedAttraction, '创建成功');
  } catch (error) {
    return handleApiError(error);
  }
} 