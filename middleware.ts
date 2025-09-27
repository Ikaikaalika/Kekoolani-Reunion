import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  if (!path.startsWith('/admin')) {
    return res;
  }

  const supabase = createMiddlewareClient<Database>({ req, res });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAdmin = session?.user.app_metadata?.role === 'admin';

  if (!session || !isAdmin) {
    const redirectUrl = new URL('/?unauthorized=1', req.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*']
};
