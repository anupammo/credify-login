import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const protectedRoutes = ['/dashboard'];
const authRoutes = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('credify_token')?.value;
  const isValid = token ? await verifyToken(token) : null;

  // Build redirects from the public origin, not request.url — behind Nginx the
  // latter resolves to localhost:3001 and would send users off-site.
  const base = process.env.NEXTAUTH_URL || request.url;

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isValid) {
      const url = new URL('/login', base);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (authRoutes.some(route => pathname.startsWith(route)) && isValid) {
    return NextResponse.redirect(new URL('/dashboard', base));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
