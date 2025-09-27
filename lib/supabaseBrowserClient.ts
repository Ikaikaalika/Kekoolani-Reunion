'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase public environment variables');
}

function getAllCookies() {
  if (typeof document === 'undefined') {
    return [];
  }
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((cookie) => {
      const [name, ...valueParts] = cookie.split('=');
      return {
        name,
        value: valueParts.join('=')
      };
    });
}

function setAllCookies(cookies: { name: string; value: string; options: Record<string, any> }[]) {
  if (typeof document === 'undefined') {
    return;
  }
  cookies.forEach(({ name, value, options }) => {
    const parts = [
      `${name}=${value}`,
      `Path=${options?.path ?? '/'}`
    ];
    if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);
    if (options?.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options?.domain) parts.push(`Domain=${options.domain}`);
    if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
    if (options?.secure) parts.push('Secure');
    document.cookie = parts.join('; ');
  });
}

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => getAllCookies(),
      setAll: (cookies) => setAllCookies(cookies)
    }
  });
