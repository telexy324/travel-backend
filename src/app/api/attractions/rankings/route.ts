import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

interface Attraction {
  id: string;
  name: string;
  description: string;
  images: string[];
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'visited';

    if (type !== 'visited' && type !== 'wantToVisit') {
      return NextResponse.json(
        { error: 'Invalid ranking type' },
        { status: 400 }
      );
    }

    const attractions = await prisma.attraction.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        _count: {
          select: {
            visitedBy: type === 'visited',
            wantToVisitBy: type === 'wantToVisit',
          },
        },
      },
      orderBy: {
        ...(type === 'visited'
          ? { visitedBy: { _count: 'desc' } }
          : { wantToVisitBy: { _count: 'desc' } }),
      },
      take: 50,
    });

    const rankings = attractions.map((attraction: Attraction) => ({
      id: attraction.id,
      name: attraction.name,
      description: attraction.description,
      images: attraction.images,
      count: type === 'visited'
        ? attraction._count.visitedBy
        : attraction._count.wantToVisitBy,
    }));

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
} 