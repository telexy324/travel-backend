import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, provider, providerId } = await request.json();

    // 查找或创建用户
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { accounts: { some: { providerId } } },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          accounts: {
            create: {
              provider,
              providerId,
              type: 'oauth',
            },
          },
        },
      });
    }

    // 生成 JWT
    const token = sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Mobile auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 