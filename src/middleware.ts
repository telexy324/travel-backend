import { auth } from '@/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');

  if (isApiRoute && !isLoggedIn) {
    return Response.json(
      { error: '未授权' },
      { status: 401 }
    );
  }

  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL('/', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 