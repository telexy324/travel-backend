import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { attractionBackendSchema } from '@/types/dtos';

// 定义评论创建的数据验证模式
const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(500, '评论内容不能超过500字'),
  rating: z.number().min(1).max(5), // 仅用于前端校验，不入库
});

// 定义景点更新的数据验证模式
// const updateAttractionSchema = z.object({
//   name: z.string().min(1, '景点名称不能为空'),
//   description: z.string().min(1, '景点描述不能为空'),
//   images: z.array(z.string()),
//   address: z.string().optional(),
//   city: z.string().optional(),
//   province: z.string().optional(),
//   country: z.string().optional(),
//   category: z.string().optional(),
//   price: z.number().min(0, '价格不能为负数').optional(),
//   openingHours: z.string().optional(),
//   contact: z.string().optional(),
//   website: z.string().url('网站URL格式不正确').optional(),
//   location: z.object({
//     lat: z.number(),
//     lng: z.number(),
//   }),
// });

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
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
      { error: '获取景点信息失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // 验证数据
    const validatedData = attractionBackendSchema.parse(body);
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

    // 只传递有值的字段，避免 undefined
    const updateData: any = {
      name: validatedData.name,
      description: validatedData.description,
      images: validatedData.images,
      openingHours: validatedData.openingHours,
      contact: validatedData.contact,
      website: validatedData.website,
    };
    if (typeof validatedData.address === 'string') updateData.address = validatedData.address;
    if (typeof validatedData.city === 'string') updateData.city = validatedData.city;
    if (typeof validatedData.province === 'string') updateData.province = validatedData.province;
    if (typeof validatedData.country === 'string') updateData.country = validatedData.country;
    if (typeof validatedData.category === 'string') updateData.category = validatedData.category;
    if (typeof validatedData.price === 'number') updateData.price = validatedData.price;

    const updatedAttraction = await prisma.attraction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            visitedBy: true,
            wantToVisitBy: true,
          },
        },
      },
    });

    // 更新位置信息
    if (validatedData.location) {
      await prisma.$executeRaw`
        UPDATE "Location"
        SET geo = ST_SetSRID(ST_MakePoint(${validatedData.location.lng}, ${validatedData.location.lat}), 4326)
        WHERE "attractionId" = ${params.id}
      `;
    }

    return NextResponse.json(updatedAttraction);
  } catch (error) {
    console.error('Error updating attraction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
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
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

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

    // 删除景点
    await prisma.attraction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
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
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const user = await requireAuth(request);
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
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        // rating 字段不入库
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