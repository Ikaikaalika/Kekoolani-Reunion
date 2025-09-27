import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type OrderWithRelations = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    ticket_type_id: string;
    quantity: number;
    ticket_types: { name: string | null } | null;
  }>;
  attendees: Database['public']['Tables']['attendees']['Row'][];
};

async function getOrders(): Promise<OrderWithRelations[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(ticket_type_id, quantity, ticket_types(name)), attendees(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as OrderWithRelations[] | null) ?? [];
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Orders & Attendees</h2>
        <p className="text-sm text-white/70">Track reunion registrations and attendee details.</p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <table className="min-w-full text-left text-sm text-white/80">
          <thead className="text-xs uppercase tracking-[0.2em] text-white/50">
            <tr>
              <th className="py-3 pr-6">Order</th>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3 pr-6">Total</th>
              <th className="py-3 pr-6">Items</th>
              <th className="py-3">Attendees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="py-3 pr-6 font-mono text-xs text-white/60">{order.id.slice(0, 10)}...</td>
                <td className="py-3 pr-6">{order.purchaser_name}</td>
                <td className="py-3 pr-6">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === 'paid'
                        ? 'bg-fern-500/20 text-fern-200'
                        : order.status === 'pending'
                        ? 'bg-sand-400/20 text-sand-200'
                        : 'bg-lava-500/20 text-lava-200'
                    }`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 pr-6">{formatCurrency(order.total_cents)}</td>
                <td className="py-3 pr-6">
                  <ul className="space-y-1 text-xs text-white/70">
                    {(order.order_items ?? []).map((item, idx) => (
                      <li key={`${order.id}-item-${idx}`}>
                        {item.quantity} × {item.ticket_types?.name ?? item.ticket_type_id}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3">
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-white/60 group-open:text-white">View</summary>
                    <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                      {(order.attendees ?? []).map((attendee, idx) => (
                        <div key={`${order.id}-attendee-${idx}`} className="space-y-1 text-xs text-white/70">
                          <p className="uppercase tracking-[0.2em] text-white/50">Attendee {idx + 1}</p>
                          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-white/80">
                            {JSON.stringify(attendee.answers, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/50">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
