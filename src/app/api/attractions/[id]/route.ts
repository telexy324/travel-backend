import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { attractionSchema } from '@/types/dtos';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      include: {
        createdBy: true,
        _count: true,
        location: true,
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
    // 1. 校验权限
    const attractionForAuth = await prisma.attraction.findUnique({
      where: { id },
      include: { createdBy: true },
    });
    if (!attractionForAuth) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }
    if (attractionForAuth.createdBy.id !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权修改此景点' },
        { status: 403 }
      );
    }

    // 2. 更新数据
    const body = await request.json();
    const validatedData = attractionSchema.parse(body);
    const { location, ...updateData } = validatedData;

    // 3. 更新位置（如有）
    if (location) {
      await prisma.$executeRaw`
        DELETE FROM "Location" WHERE "attractionId" = ${id}
      `;
      await prisma.$executeRaw`
        INSERT INTO "Location" ("id", "attractionId", "geo")
        VALUES (
          ${crypto.randomUUID()},
          ${id},
          ST_SetSRID(ST_MakePoint(${location.geo.longitude}, ${location.geo.latitude}), 4326)
        )
      `;
    }

    // 4. 更新景点基本信息
    await prisma.attraction.update({
      where: { id },
      data: updateData,
    });

    // 5. 返回更新后的完整数据
    const updatedAttraction = await prisma.attraction.findUnique({
      where: { id },
      include: {
        createdBy: true,
        _count: true,
        location: true,
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
    // 1. 校验权限
    const attractionForAuth = await prisma.attraction.findUnique({
      where: { id },
      include: { createdBy: true },
    });
    if (!attractionForAuth) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }
    if (attractionForAuth.createdBy.id !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权删除此景点' },
        { status: 403 }
      );
    }

    // 2. 先删位置再删景点
    await prisma.$executeRaw`
      DELETE FROM "Location" WHERE "attractionId" = ${id}
    `;
    await prisma.attraction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除景点失败:', error);
    return NextResponse.json(
      { success: false, message: '删除景点失败' },
      { status: 500 }
    );
  }
}