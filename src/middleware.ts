import { auth } from '@/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isAuthApiRoute = req.nextUrl.pathname.startsWith('/api/auth');

  console.log('Middleware:', {
    path: req.nextUrl.pathname,
    isLoggedIn,
    isApiRoute,
    isAuthRoute,
    isAuthApiRoute,
    auth: req.auth
  });

  // 允许认证相关的 API 路由
  if (isAuthApiRoute) {
    return undefined;
  }

  // 允许认证相关的页面路由
  if (isAuthRoute) {
    return undefined;
  }

  if (isApiRoute && !isLoggedIn) {
    return Response.json(
      { error: '未授权' },
      { status: 401 }
    );
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 