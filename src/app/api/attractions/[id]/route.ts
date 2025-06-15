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
    // 先查主表和 location 关联
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      include: {
        location: true,
        _count: true,
      },
    });
    if (!attraction) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }
    // 如果有 location，查 geo 字段
    let geo = null;
    if (attraction.location) {
      const geoRes = await prisma.$queryRawUnsafe<any[]>(
        `SELECT ST_X(geo) as lng, ST_Y(geo) as lat FROM "Location" WHERE id = $1`,
        attraction.location.id
      );
      if (geoRes && geoRes.length > 0) {
        geo = { longitude: geoRes[0].lng, latitude: geoRes[0].lat };
      }
    }
    return NextResponse.json({
      success: true,
      data: {
        ...attraction,
        location: attraction.location && geo
          ? { ...attraction.location, geo }
          : null,
      },
    });
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
    // 权限校验
    const attractionForAuth = await prisma.attraction.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!attractionForAuth) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }
    if (attractionForAuth.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权修改此景点' },
        { status: 403 }
      );
    }
    // 解析数据
    const body = await request.json();
    const validatedData = attractionSchema.parse(body);
    const { location, ...updateData } = validatedData;
    // 更新主表
    await prisma.attraction.update({
      where: { id },
      data: updateData,
    });
    // 更新 location
    if (location) {
      await prisma.$executeRaw`DELETE FROM "Location" WHERE "attractionId" = ${id}`;
      await prisma.$executeRaw`
        INSERT INTO "Location" ("id", "attractionId", "geo")
        VALUES (
          ${crypto.randomUUID()},
          ${id},
          ST_SetSRID(ST_MakePoint(${location.geo.longitude}, ${location.geo.latitude}), 4326)
        )
      `;
    }
    // 返回最新数据
    return await GET(request, { params });
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
    // 权限校验
    const attractionForAuth = await prisma.attraction.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!attractionForAuth) {
      return NextResponse.json(
        { success: false, message: '景点不存在' },
        { status: 404 }
      );
    }
    if (attractionForAuth.createdById !== session.user.id) {
      return NextResponse.json(
        { success: false, message: '无权删除此景点' },
        { status: 403 }
      );
    }
    // 先删 location
    await prisma.$executeRaw`DELETE FROM "Location" WHERE "attractionId" = ${id}`;
    // 再删主表
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