import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { attractionSchema } from '@/types';

export async function GET() {
  try {
    const attractions = await prisma.attraction.findMany({
      include: {
        comments: true,
        visitedBy: true,
        wantToVisitBy: true,
      },
    });

    return NextResponse.json(attractions);
  } catch (error) {
    return NextResponse.json(
      { error: '获取景点列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = attractionSchema.parse(body);

    const attraction = await prisma.attraction.create({
      data: validatedData,
    });

    return NextResponse.json(attraction);
  } catch (error) {
    return NextResponse.json(
      { error: '创建景点失败' },
      { status: 500 }
    );
  }
} 