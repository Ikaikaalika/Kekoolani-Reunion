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
        <h2 className="text-2xl font-semibold text-slate-900">Orders & Attendees</h2>
        <p className="text-sm text-slate-600">Track reunion registrations and attendee details.</p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="py-3 pr-6">Order</th>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3 pr-6">Total</th>
              <th className="py-3 pr-6">Items</th>
              <th className="py-3">Attendees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="py-3 pr-6 font-mono text-xs text-slate-500">{order.id.slice(0, 10)}...</td>
                <td className="py-3 pr-6">{order.purchaser_name}</td>
                <td className="py-3 pr-6">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === 'paid'
                        ? 'bg-fern-100 text-fern-700'
                        : order.status === 'pending'
                        ? 'bg-sand-100 text-sand-700'
                        : 'bg-lava-100 text-lava-700'
                    }`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 pr-6">{formatCurrency(order.total_cents)}</td>
                <td className="py-3 pr-6">
                  <ul className="space-y-1 text-xs text-slate-600">
                    {(order.order_items ?? []).map((item, idx) => (
                      <li key={`${order.id}-item-${idx}`}>
                        {item.quantity} × {item.ticket_types?.name ?? item.ticket_type_id}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3 align-top">
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-slate-500 transition group-open:text-slate-900">View</summary>
                    <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      {(order.attendees ?? []).map((attendee, idx) => {
                        const answers = attendee.answers && typeof attendee.answers === 'object' ? (attendee.answers as Record<string, unknown>) : {};
                        const entries = Object.entries(answers);
                        return (
                          <div key={`${order.id}-attendee-${idx}`} className="space-y-1 text-xs text-slate-600">
                            <p className="uppercase tracking-[0.2em] text-slate-500">Attendee {idx + 1}</p>
                            {entries.length ? (
                              <ul className="space-y-1">
                                {entries.map(([key, value]) => (
                                  <li key={key}>
                                    <span className="font-semibold text-slate-700">{key}:</span> {String(value ?? '')}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-400">No responses recorded.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
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
