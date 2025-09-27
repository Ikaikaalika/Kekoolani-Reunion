import TicketsManager from '@/components/admin/TicketsManager';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { upsertTicket, deleteTicket } from '@/lib/actions/tickets';

async function getTickets() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from('ticket_types').select('*').order('position', { ascending: true });
  return data ?? [];
}

export default async function AdminTicketsPage() {
  const tickets = await getTickets();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Ticket Types</h2>
        <p className="text-sm text-white/70">Manage pricing, visibility, and inventory for each reunion pass.</p>
      </div>
      <TicketsManager tickets={tickets} upsertAction={upsertTicket} deleteAction={deleteTicket} />
    </div>
  );
}
