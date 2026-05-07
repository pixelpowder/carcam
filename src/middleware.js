import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/outreach/gmail-auth') || // OAuth callback redirected from Google
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow service-to-service calls (e.g. cron → gmail-sync) when they carry the cron secret.
  // The middleware can't see env vars at edge runtime in older Next versions, so guard with
  // a presence check too.
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
