import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  if (!path.startsWith('/admin')) {
    return res;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAdmin = session?.user.app_metadata?.role === 'admin';

  if (!session || !isAdmin) {
    const redirectUrl = new URL('/admin-login', req.nextUrl.origin);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname + req.nextUrl.search);
    if (!session) {
      redirectUrl.searchParams.set('reason', 'signin');
    } else if (!isAdmin) {
      redirectUrl.searchParams.set('reason', 'unauthorized');
    }
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*']
};
