import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { auth } from '@/auth';

export async function getAuthUser(req: NextRequest) {
  // 从请求中获取 token
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token?.email) {
    return null;
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email: token.email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  return user;
}

export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// 导出 auth 函数供其他模块使用
export { auth }; 