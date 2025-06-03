import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 获取景点详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
      include: {
        comments: {
          include: {
            user: {
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
        },
        _count: {
          select: {
            visitedBy: true,
            wantToVisitBy: true,
          },
        },
      },
    });

    if (!attraction) {
      return NextResponse.json(
        { error: 'Attraction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(attraction);
  } catch (error) {
    console.error('Error fetching attraction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attraction' },
      { status: 500 }
    );
  }
}

// 添加评论
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const commentSchema = z.object({
      content: z.string().min(1).max(1000),
    });
    const validatedData = commentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        userId: session.user.id,
        attractionId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// 标记"已到访"或"我想去"
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const actionSchema = z.object({
      action: z.enum(['visit', 'wantToVisit']),
    });
    const { action } = actionSchema.parse(body);

    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
    });

    if (!attraction) {
      return NextResponse.json(
        { error: 'Attraction not found' },
        { status: 404 }
      );
    }

    if (action === 'visit') {
      await prisma.attraction.update({
        where: { id: params.id },
        data: {
          visitedBy: {
            connect: { id: session.user.id },
          },
        },
      });
    } else {
      await prisma.attraction.update({
        where: { id: params.id },
        data: {
          wantToVisitBy: {
            connect: { id: session.user.id },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating attraction status:', error);
    return NextResponse.json(
      { error: 'Failed to update attraction status' },
      { status: 500 }
    );
  }
} 