import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        visitedAttractions: true,
        wantToVisitAttractions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      visited: user.visitedAttractions,
      wantToVisit: user.wantToVisitAttractions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取用户景点失败' },
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
    const { attractionId, type } = body;

    if (!attractionId || !type) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    if (type === 'visited') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          visitedAttractions: {
            connect: { id: attractionId },
          },
        },
      });
    } else if (type === 'wantToVisit') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          wantToVisitAttractions: {
            connect: { id: attractionId },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '更新用户景点失败' },
      { status: 500 }
    );
  }
} 