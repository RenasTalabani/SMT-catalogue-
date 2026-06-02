import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that only admin+ can access
const ADMIN_ROUTES = ['/finance', '/reports', '/users', '/roles', '/audit', '/performance'];

// Routes that only super_admin can access
const SUPER_ADMIN_ROUTES = ['/users', '/roles'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth state from the persisted Zustand store in cookies/localStorage.
  // Next.js middleware runs on the edge and cannot read localStorage, so we
  // use a cookie that the auth store writes on login.
  const token = request.cookies.get('daraliraq_token')?.value
    ?? request.headers.get('x-auth-token')
    ?? null;

  const role = request.cookies.get('daraliraq_role')?.value ?? null;

  // Not authenticated — redirect to login
  if (!token && !pathname.startsWith('/login') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route guards
  if (token && role) {
    const isAdminOrAbove     = ['super_admin', 'admin'].includes(role);
    const isSuperAdmin       = role === 'super_admin';

    const needsAdmin     = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    const needsSuperAdmin = SUPER_ADMIN_ROUTES.some((r) => pathname.startsWith(r));

    if (needsSuperAdmin && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (needsAdmin && !isAdminOrAbove) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|shop|login).*)',
  ],
};
