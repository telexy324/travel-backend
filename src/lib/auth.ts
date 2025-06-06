import type { DefaultSession, NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { User, Account, Profile } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import GoogleProvider from 'next-auth/providers/google';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (session?.user) {
        session.user.id = token.id;
      }
      return session;
    },
    async signIn(params: any) {
      try {
        if (!params.user?.email) {
          return false;
        }

        // 检查用户是否已存在
        const existingUser = await prisma.user.findUnique({
          where: { email: params.user.email },
        });

        if (!existingUser) {
          // 创建新用户
          await prisma.user.create({
            data: {
              email: params.user.email,
              name: params.user.name,
              image: params.user.image,
            },
          });
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user }: { user: User }) {
      try {
        // 更新用户信息
        await prisma.user.update({
          where: { id: user.id },
          data: {
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Update user error:', error);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
}; 