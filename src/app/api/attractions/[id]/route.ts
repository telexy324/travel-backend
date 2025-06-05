import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';

// 定义评论创建的数据验证模式
const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(500, '评论内容不能超过500字'),
  rating: z.number().min(1).max(5),
});

// 定义景点更新的数据验证模式
const updateAttractionSchema = z.object({
  name: z.string().min(1, '景点名称不能为空'),
  description: z.string().min(1, '景点描述不能为空'),
  images: z.array(z.string().url('图片URL格式不正确')),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  address: z.string().min(1, '地址不能为空'),
  city: z.string().min(1, '城市不能为空'),
  province: z.string().min(1, '省份不能为空'),
  country: z.string().min(1, '国家不能为空'),
  category: z.string().min(1, '分类不能为空'),
  price: z.number().min(0, '价格不能为负数'),
  openingHours: z.string().optional(),
  contact: z.string().optional(),
  website: z.string().url('网站URL格式不正确').optional(),
});

export async function GET(
  req: NextRequest,
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
      },
    });

    if (!attraction) {
      return NextResponse.json(
        { error: '景点不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(attraction);
  } catch (error) {
    console.error('Error fetching attraction:', error);
    return NextResponse.json(
      { error: '获取景点详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = await requireAuth(req);
    
    // 解析请求数据
    const body = await req.json();
    
    // 验证数据
    const validatedData = updateAttractionSchema.parse(body);
    
    // 检查景点是否存在
    const existingAttraction = await prisma.attraction.findUnique({
      where: { id: params.id },
    });

    if (!existingAttraction) {
      return NextResponse.json(
        { error: '景点不存在' },
        { status: 404 }
      );
    }

    // 检查权限
    if (existingAttraction.createdById !== user.id) {
      return NextResponse.json(
        { error: '没有权限修改此景点' },
        { status: 403 }
      );
    }

    // 使用事务来确保数据一致性
    const attraction = await prisma.$transaction(async (tx) => {
      // 1. 更新景点基本信息
      const updatedAttraction = await tx.attraction.update({
        where: { id: params.id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          images: validatedData.images,
          address: validatedData.address,
          city: validatedData.city,
          province: validatedData.province,
          country: validatedData.country,
          category: validatedData.category,
          price: validatedData.price,
          openingHours: validatedData.openingHours,
          contact: validatedData.contact,
          website: validatedData.website,
        },
      });

      // 2. 更新位置数据
      await tx.$executeRaw`
        UPDATE "Location"
        SET geo = ST_SetSRID(ST_MakePoint(${validatedData.location.lng}, ${validatedData.location.lat}), 4326)
        WHERE "attractionId" = ${params.id}
      `;

      // 3. 返回完整的景点信息
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
    });

    return NextResponse.json(attraction);
  } catch (error) {
    console.error('Error updating attraction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的景点数据' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '更新景点失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = await requireAuth(req);
    
    // 检查景点是否存在
    const existingAttraction = await prisma.attraction.findUnique({
      where: { id: params.id },
    });

    if (!existingAttraction) {
      return NextResponse.json(
        { error: '景点不存在' },
        { status: 404 }
      );
    }

    // 检查权限
    if (existingAttraction.createdById !== user.id) {
      return NextResponse.json(
        { error: '没有权限删除此景点' },
        { status: 403 }
      );
    }

    // 删除景点
    await prisma.attraction.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting attraction:', error);
    return NextResponse.json(
      { error: '删除景点失败' },
      { status: 500 }
    );
  }
}

// 添加评论
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    // 检查景点是否存在
    const existingAttraction = await prisma.attraction.findUnique({
      where: { id: params.id },
    });

    if (!existingAttraction) {
      return NextResponse.json(
        { error: '景点不存在' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = createCommentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        rating: validatedData.rating,
        attraction: {
          connect: { id: params.id },
        },
        user: {
          connect: { id: user.id },
        },
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的评论数据' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '创建评论失败' },
      { status: 500 }
    );
  }
} 