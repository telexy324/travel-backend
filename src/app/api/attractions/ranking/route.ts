import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Attraction } from '@/types';

interface AttractionWithCount extends Attraction {
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
}

export async function GET() {
  try {
    const attractions = await prisma.attraction.findMany({
      include: {
        _count: {
          select: {
            visitedBy: true,
            wantToVisitBy: true,
          },
        },
      },
    }) as AttractionWithCount[];

    const visitedRanking = attractions
      .sort((a, b) => b._count.visitedBy - a._count.visitedBy)
      .slice(0, 10)
      .map(({ _count, ...attraction }) => ({
        ...attraction,
        visitedCount: _count.visitedBy,
      }));

    const wantToVisitRanking = attractions
      .sort((a, b) => b._count.wantToVisitBy - a._count.wantToVisitBy)
      .slice(0, 10)
      .map(({ _count, ...attraction }) => ({
        ...attraction,
        wantToVisitCount: _count.wantToVisitBy,
      }));

    return NextResponse.json({
      visitedRanking,
      wantToVisitRanking,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
} 