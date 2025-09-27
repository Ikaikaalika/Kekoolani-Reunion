import SectionsManager from '@/components/admin/SectionsManager';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { normalizeSectionList } from '@/lib/sections';

async function getSections() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('content_sections')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  return normalizeSectionList(data ?? []);
}

export default async function AdminSectionsPage() {
  const sections = await getSections();

  return <SectionsManager sections={sections} />;
}
