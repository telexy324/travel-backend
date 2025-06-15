import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { attractionSchema } from '@/types/dtos';
import { Prisma } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
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
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: attraction });
  } catch (error) {
    console.error('获取景点详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取景点详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      );
    }

    const id = params.id;
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      select: {
        createdById: true,
      },
    });

    if (!attraction) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }

    if (attraction.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权修改此景点' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = attractionSchema.parse(body);

    const updateData: Prisma.AttractionUpdateInput = {
      ...validatedData,
      location: validatedData.location
        ? {
            create: {
              geo: {
                create: {
                  latitude: validatedData.location.geo.latitude,
                  longitude: validatedData.location.geo.longitude,
                },
              },
            },
          }
        : undefined,
    };

    const updatedAttraction = await prisma.attraction.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
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

    return NextResponse.json({ success: true, data: updatedAttraction });
  } catch (error) {
    console.error('更新景点失败:', error);
    return NextResponse.json(
      { success: false, message: '更新景点失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      );
    }

    const id = params.id;
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      select: {
        createdById: true,
      },
    });

    if (!attraction) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }

    if (attraction.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权删除此景点' },
        { status: 403 }
      );
    }

    await prisma.attraction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除景点失败:', error);
    return NextResponse.json(
      { success: false, message: '删除景点失败' },
      { status: 500 }
    );
  }
} 