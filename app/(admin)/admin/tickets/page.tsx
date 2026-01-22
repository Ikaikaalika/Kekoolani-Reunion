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
        <p className="section-title">Tickets</p>
        <h2 className="mt-3 text-3xl font-semibold text-sand-900">Ticket Types</h2>
        <p className="mt-2 text-sm text-koa">Manage pricing, visibility, and inventory for each reunion pass.</p>
      </div>
      <TicketsManager tickets={tickets} upsertAction={upsertTicket} deleteAction={deleteTicket} />
    </div>
  );
}
