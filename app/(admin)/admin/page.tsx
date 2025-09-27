import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type TicketRow = Database['public']['Tables']['ticket_types']['Row'];

async function loadOverview() {
  const supabase = createSupabaseServerClient();
  const [ordersRes, ticketsRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('ticket_types').select('*').eq('active', true)
  ]);

  const ordersData = (ordersRes.data ?? []) as OrderRow[];
  const totalRevenue = ordersData
    .filter((order) => order.status === 'paid')
    .reduce((sum, order) => sum + order.total_cents, 0);

  const ticketData = (ticketsRes.data ?? []) as TicketRow[];

  return {
    latestOrders: ordersData,
    ticketCount: ticketData.length,
    totalRevenue
  };
}

export default async function AdminOverviewPage() {
  const { latestOrders, ticketCount, totalRevenue } = await loadOverview();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Paid orders captured via Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Ticket Types</CardTitle>
            <CardDescription>Visible on the public registration page</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{ticketCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Last five registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{latestOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Orders</CardTitle>
          <CardDescription>Monitor incoming registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.2em] text-white/60">
                  <th className="py-3 pr-6">Order</th>
                  <th className="py-3 pr-6">Purchaser</th>
                  <th className="py-3 pr-6">Status</th>
                  <th className="py-3 pr-6">Total</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {latestOrders.map((order) => (
                  <tr key={order.id} className="text-white/80">
                    <td className="py-3 pr-6 font-mono text-xs">{order.id.slice(0, 8)}...</td>
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
                    <td className="py-3">{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!latestOrders.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-white/50">
                      No orders yet. Once family registers, you’ll see them here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
