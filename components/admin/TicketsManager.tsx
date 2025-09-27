'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/supabase';

type Ticket = Database['public']['Tables']['ticket_types']['Row'];

interface TicketsManagerProps {
  tickets: Ticket[];
  upsertAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Ticket
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" loading={pending}>
      Remove
    </Button>
  );
}

export default function TicketsManager({ tickets, upsertAction, deleteAction }: TicketsManagerProps) {
  return (
    <div className="space-y-8">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={upsertAction} className="space-y-4">
            <input type="hidden" name="id" value={ticket.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`name-${ticket.id}`}>Name</Label>
                <Input id={`name-${ticket.id}`} name="name" defaultValue={ticket.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`price-${ticket.id}`}>Price (cents)</Label>
                <Input id={`price-${ticket.id}`} name="price_cents" type="number" defaultValue={ticket.price_cents} min={0} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`currency-${ticket.id}`}>Currency</Label>
                <Input id={`currency-${ticket.id}`} name="currency" defaultValue={ticket.currency} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inventory-${ticket.id}`}>Inventory</Label>
                <Input id={`inventory-${ticket.id}`} name="inventory" type="number" defaultValue={ticket.inventory ?? ''} min={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`description-${ticket.id}`}>Description</Label>
              <Textarea id={`description-${ticket.id}`} name="description" rows={3} defaultValue={ticket.description ?? ''} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input type="checkbox" name="active" defaultChecked={ticket.active} className="h-4 w-4 rounded border-slate-300" />
                Visible on registration
              </label>
              <SaveButton />
            </div>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={ticket.id} />
            <DeleteButton />
          </form>
        </div>
      ))}

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Add Ticket Type</h3>
        <p className="text-sm text-slate-600">Create a new ticket offering for the reunion.</p>
        <form action={upsertAction} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" placeholder="Weekend Pass" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-price">Price (cents)</Label>
              <Input id="new-price" name="price_cents" type="number" min={0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-currency">Currency</Label>
              <Input id="new-currency" name="currency" defaultValue="usd" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-inventory">Inventory</Label>
              <Input id="new-inventory" name="inventory" type="number" min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-description">Description</Label>
            <Textarea id="new-description" name="description" rows={3} placeholder="Includes access to all events and luʻau." />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Visible on registration
          </label>
          <SaveButton />
        </form>
      </div>
    </div>
  );
}
