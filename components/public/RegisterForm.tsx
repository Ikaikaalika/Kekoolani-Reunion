'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { checkoutSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

const formSchema = checkoutSchema.omit({ answers: true }).extend({
  tickets: z.array(
    z.object({
      ticket_type_id: z.string(),
      quantity: z.coerce.number().int().min(0)
    })
  ),
  answers: z.record(z.any()).optional(),
  contact_phone: z.string().min(1, 'Phone number is required'),
  contact_address: z.string().min(1, 'Mailing address is required'),
  lineage: z.string().min(1, 'Select a lineage'),
  lineage_other: z.string().optional(),
  attendance_days: z.array(z.string()).min(1, 'Select at least one day'),
  tshirt_size: z.string().min(1, 'Select a T-shirt size'),
  tshirt_quantity: z.coerce.number().int().min(1, 'Enter a quantity'),
  additional_participants: z.string().optional(),
  participant_days: z.string().optional(),
  participant_shirts: z.string().optional(),
  donation_note: z.string().optional()
});

type FormSchema = z.infer<typeof formSchema>;

type Ticket = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  priceFormatted: string;
  currency: string;
  inventory: number | null;
};

type Question = {
  id: string;
  prompt: string;
  field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  options: any;
  required: boolean;
};

const LINEAGE_OPTIONS = ['Nawai', 'Katherine', 'Amy', 'Other / Not listed'];

const PARTICIPATION_DAYS = [
  { value: 'Friday', label: 'Friday (July 10)' },
  { value: 'Saturday', label: 'Saturday (July 11)' },
  { value: 'Sunday', label: 'Sunday (July 12)' }
];

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

interface RegisterFormProps {
  tickets: Ticket[];
  questions: Question[];
  presetTicket?: string;
}

export default function RegisterForm({ tickets, questions, presetTicket }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTickets = useMemo(
    () =>
      tickets.map((ticket) => ({
        ticket_type_id: ticket.id,
        quantity: ticket.id === presetTicket ? 1 : 0
      })),
    [tickets, presetTicket]
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchaser_name: '',
      purchaser_email: '',
      contact_phone: '',
      contact_address: '',
      lineage: '',
      lineage_other: '',
      attendance_days: [],
      tshirt_size: '',
      tshirt_quantity: 1,
      additional_participants: '',
      participant_days: '',
      participant_shirts: '',
      donation_note: '',
      tickets: defaultTickets
    }
  });

  const quantities = watch('tickets');

  const totalCents = quantities.reduce((sum, item) => {
    const ticket = tickets.find((ticket) => ticket.id === item.ticket_type_id);
    if (!ticket) return sum;
    return sum + ticket.price_cents * (Number.isFinite(item.quantity) ? item.quantity : 0);
  }, 0);

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    setLoading(true);
    try {
      const answers = questions.reduce<Record<string, unknown>>(
        (acc, question) => {
          const fieldName = `question_${question.id}`;
          const raw = (data as any)[fieldName];
          let value: unknown = raw;
          if (question.field_type === 'checkbox') {
            value = raw === true || raw === 'true' || raw === 'on';
          }
          acc[question.id] = value ?? null;
          return acc;
        },
        {
          contact_phone: data.contact_phone,
          contact_address: data.contact_address,
          lineage: data.lineage,
          lineage_other: data.lineage_other || null,
          attendance_days: data.attendance_days ?? [],
          tshirt_size: data.tshirt_size,
          tshirt_quantity: data.tshirt_quantity,
          additional_participants: data.additional_participants || null,
          participant_days: data.participant_days || null,
          participant_shirts: data.participant_shirts || null,
          donation_note: data.donation_note || null
        }
      );

      const payload = {
        purchaser_name: data.purchaser_name,
        purchaser_email: data.purchaser_email,
        tickets: data.tickets,
        answers
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? 'Unable to start checkout');
      }
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl as string;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="card shadow-soft backdrop-soft space-y-8 p-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Primary Contact</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="purchaser_name">Full Name (Last, First, Middle)</Label>
            <Input id="purchaser_name" placeholder="Last, First Middle" {...register('purchaser_name')} />
            {errors.purchaser_name && (
              <p className="text-xs text-red-500">{errors.purchaser_name.message}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="purchaser_email">Email</Label>
            <Input id="purchaser_email" type="email" placeholder="ohana@kekoolani.com" {...register('purchaser_email')} />
            {errors.purchaser_email && (
              <p className="text-xs text-red-500">{errors.purchaser_email.message}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input id="contact_phone" placeholder="808-555-1234" {...register('contact_phone')} />
            {errors.contact_phone && (
              <p className="text-xs text-red-500">{errors.contact_phone.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_address">Mailing Address</Label>
          <Textarea id="contact_address" rows={3} placeholder="Street, City, State, Zip" {...register('contact_address')} />
          {errors.contact_address && (
            <p className="text-xs text-red-500">{errors.contact_address.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Lineage & Attendance</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lineage">Lineage (Parent/Grandparent Line)</Label>
            <select
              id="lineage"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
              {...register('lineage')}
            >
              <option value="">Select a lineage</option>
              {LINEAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.lineage && <p className="text-xs text-red-500">{errors.lineage.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineage_other">Lineage (if Other)</Label>
            <Input id="lineage_other" placeholder="Share your lineage details" {...register('lineage_other')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Days of Participation</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {PARTICIPATION_DAYS.map((day) => (
              <label key={day.value} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <input type="checkbox" value={day.value} className="h-4 w-4" {...register('attendance_days')} />
                <span>{day.label}</span>
              </label>
            ))}
          </div>
          {errors.attendance_days && <p className="text-xs text-red-500">{errors.attendance_days.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Primary T-shirt Order</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tshirt_size">T-shirt Size</Label>
            <select
              id="tshirt_size"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
              {...register('tshirt_size')}
            >
              <option value="">Select a size</option>
              {TSHIRT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            {errors.tshirt_size && <p className="text-xs text-red-500">{errors.tshirt_size.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tshirt_quantity">Quantity</Label>
            <Input id="tshirt_quantity" type="number" min={1} {...register('tshirt_quantity')} />
            {errors.tshirt_quantity && <p className="text-xs text-red-500">{errors.tshirt_quantity.message}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Additional Participants</h2>
        <div className="space-y-2">
          <Label htmlFor="additional_participants">Names, Ages, Relationships</Label>
          <Textarea
            id="additional_participants"
            rows={4}
            placeholder="List each participant: Name, age, relationship"
            {...register('additional_participants')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="participant_days">Participation Days by Participant</Label>
          <Textarea
            id="participant_days"
            rows={3}
            placeholder="Example: Keoni (Fri/Sat), Leilani (Sat/Sun)"
            {...register('participant_days')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="participant_shirts">T-shirt Sizes & Quantities by Participant</Label>
          <Textarea
            id="participant_shirts"
            rows={3}
            placeholder="Example: Keoni (L x1), Leilani (S x1)"
            {...register('participant_shirts')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-black">Ticket Packages</h2>
        <div className="space-y-4">
          {tickets.length ? (
            tickets.map((ticket, index) => (
              <div key={ticket.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="mono text-xs font-semibold uppercase tracking-[0.2em] text-koa">{ticket.name}</p>
                  <p className="mt-2 text-2xl font-semibold text-black">{ticket.priceFormatted}</p>
                  <p className="mt-1 text-sm text-koa">{ticket.description}</p>
                  {typeof ticket.inventory === 'number' && (
                    <p className="mono mt-2 text-xs uppercase tracking-[0.2em] text-brandBlue">
                      {ticket.inventory} remaining
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`tickets.${index}.quantity`} className="mono text-xs uppercase text-slate-500">
                    Qty
                  </Label>
                  <Input
                    id={`tickets.${index}.quantity`}
                    type="number"
                    min={0}
                    max={ticket.inventory ?? undefined}
                    className="w-20 text-center"
                    {...register(`tickets.${index}.quantity` as const, { valueAsNumber: true })}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-koa">Tickets will be available soon.</p>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Registration Questions</h2>
          <div className="grid gap-5">
            {questions.map((question) => {
              const fieldName = `question_${question.id}`;
              const options = Array.isArray(question.options) ? (question.options as Array<any>) : [];
              return (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={fieldName}>
                    {question.prompt}
                    {question.required && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                  </Label>
                  {question.field_type === 'textarea' && (
                    <Textarea id={fieldName} rows={4} {...register(fieldName as any)} />
                  )}
                  {question.field_type === 'text' && <Input id={fieldName} {...register(fieldName as any)} />}
                  {question.field_type === 'date' && <Input id={fieldName} type="date" {...register(fieldName as any)} />}
                  {question.field_type === 'checkbox' && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input type="checkbox" id={fieldName} className="h-4 w-4" {...register(fieldName as any)} />
                      <span>Yes</span>
                    </div>
                  )}
                  {question.field_type === 'select' && (
                    <select
                      id={fieldName}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                      {...register(fieldName as any)}
                    >
                      <option value="">Select an option</option>
                      {options.map((option, idx) => (
                        <option key={idx} value={option.value ?? option.label}>
                          {option.label ?? option.value}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="donation_note">Donation Note (Optional)</Label>
        <Textarea
          id="donation_note"
          rows={3}
          placeholder="Share any additional contribution details for the reunion fund."
          {...register('donation_note')}
        />
        <p className="text-xs text-koa">
          Additional funds support reunion expenses and the Kekoʻolani Trust fund for Waipiʻo land stewardship.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-deep px-6 py-4 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">Total</p>
        <p className="text-2xl font-semibold">{formatCurrency(totalCents)}</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <Button type="submit" size="lg" loading={loading} disabled={!tickets.length} className="w-full">
        Proceed to Payment
      </Button>
    </form>
  );
}
