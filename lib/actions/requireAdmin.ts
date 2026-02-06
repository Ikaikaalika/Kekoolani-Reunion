'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';

export async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Unauthorized');
  }
  const isAdmin = data.user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    throw new Error('Unauthorized');
  }
  return data.user;
}
