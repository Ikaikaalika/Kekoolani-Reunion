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
  answers: z.record(z.any()).optional()
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
      const answers = questions.reduce<Record<string, unknown>>((acc, question) => {
        const fieldName = `question_${question.id}`;
        const raw = (data as any)[fieldName];
        let value: unknown = raw;
        if (question.field_type === 'checkbox') {
          value = raw === true || raw === 'true' || raw === 'on';
        }
        acc[question.id] = value ?? null;
        return acc;
      }, {});

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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchaser_name">Full Name</Label>
          <Input id="purchaser_name" placeholder="First & last name" {...register('purchaser_name')} />
          {errors.purchaser_name && (
            <p className="text-xs text-red-500">{errors.purchaser_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaser_email">Email</Label>
          <Input id="purchaser_email" type="email" placeholder="ohana@kekoolani.com" {...register('purchaser_email')} />
          {errors.purchaser_email && (
            <p className="text-xs text-red-500">{errors.purchaser_email.message}</p>
          )}
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
