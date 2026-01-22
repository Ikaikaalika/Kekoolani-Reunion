'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/supabase';

type Question = Database['public']['Tables']['registration_questions']['Row'];
type Ticket = Database['public']['Tables']['ticket_types']['Row'];

interface Props {
  questions: Question[];
  tickets: Ticket[];
  ticketAssignments: Record<string, string[]>;
  upsertAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

type OptionItem = {
  id: string;
  label: string;
  value: string;
};

const OPTION_FIELD_TYPES = new Set<Question['field_type']>(['select', 'checkbox']);

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `opt-${Math.random().toString(36).slice(2, 9)}`;
}

function parseOptions(raw: unknown): OptionItem[] {
  if (!Array.isArray(raw)) {
    return [createEmptyOption()];
  }
  const normalized = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const option = item as Record<string, unknown>;
      const label = typeof option.label === 'string' ? option.label : null;
      const value = typeof option.value === 'string' ? option.value : null;
      if (!label || !value) return null;
      return {
        id: createId(),
        label,
        value
      };
    })
    .filter((item): item is OptionItem => Boolean(item));

  return normalized.length ? normalized : [createEmptyOption()];
}

function createEmptyOption(): OptionItem {
  return { id: createId(), label: '', value: '' };
}

function SaveButton({ label = 'Save Question' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
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

function TicketSelector({
  tickets,
  value,
  onChange
}: {
  tickets: Ticket[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggleTicket = (ticketId: string) => {
    onChange(value.includes(ticketId) ? value.filter((id) => id !== ticketId) : [...value, ticketId]);
  };

  return (
    <div className="space-y-2">
      <Label>Ticket visibility</Label>
      <p className="text-xs text-koa">Leave all unchecked to apply this question to every ticket type.</p>
      {tickets.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {tickets.map((ticket) => (
            <label
              key={ticket.id}
              className="flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm text-koa"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-sand-300"
                checked={value.includes(ticket.id)}
                onChange={() => toggleTicket(ticket.id)}
              />
              <span>{ticket.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-koa">Add ticket types first to target specific questions.</p>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  ticketIds,
  tickets,
  upsertAction,
  deleteAction
}: {
  question: Question;
  ticketIds: string[];
  tickets: Ticket[];
  upsertAction: Props['upsertAction'];
  deleteAction: Props['deleteAction'];
}) {
  const [fieldType, setFieldType] = useState<Question['field_type']>(question.field_type);
  const [options, setOptions] = useState<OptionItem[]>(() => parseOptions(question.options));
  const [assignedTickets, setAssignedTickets] = useState<string[]>(() => ticketIds ?? []);

  const requiresOptions = OPTION_FIELD_TYPES.has(fieldType);
  const ticketIdsJson = useMemo(() => JSON.stringify(assignedTickets), [assignedTickets]);
  const optionsJson = useMemo(
    () =>
      JSON.stringify(
        (requiresOptions ? options : [])
          .map((option) => ({ label: option.label.trim(), value: option.value.trim() }))
          .filter((option) => option.label && option.value)
      ),
    [options, requiresOptions]
  );

  const ensureOptionArray = () => {
    if (!requiresOptions) return;
    setOptions((prev) => (prev.length ? prev : [createEmptyOption()]));
  };

  return (
    <div className="card shadow-soft space-y-4 p-6">
      <form action={upsertAction} className="space-y-4">
        <input type="hidden" name="id" value={question.id} />
        <input type="hidden" name="options" value={optionsJson} />
        <input type="hidden" name="ticket_ids" value={ticketIdsJson} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`prompt-${question.id}`}>Prompt</Label>
            <Input id={`prompt-${question.id}`} name="prompt" defaultValue={question.prompt} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`field-${question.id}`}>Field Type</Label>
            <select
              id={`field-${question.id}`}
              name="field_type"
              value={fieldType}
              onChange={(event) => {
                const value = event.target.value as Question['field_type'];
                setFieldType(value);
                if (OPTION_FIELD_TYPES.has(value)) {
                  ensureOptionArray();
                }
              }}
              className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-koa focus:border-brandBlue focus:outline-none"
            >
              <option value="text">Short answer</option>
              <option value="textarea">Long answer</option>
              <option value="select">Dropdown</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`position-${question.id}`}>Display Order</Label>
            <Input id={`position-${question.id}`} name="position" type="number" defaultValue={question.position ?? ''} min={0} />
          </div>
        </div>
        <TicketSelector tickets={tickets} value={assignedTickets} onChange={setAssignedTickets} />
        {requiresOptions ? (
          <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <div className="flex items-center justify-between">
              <Label>Answer choices</Label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOptions((prev) => [...prev, createEmptyOption()])}
              >
                Add option
              </Button>
            </div>
            {options.map((option, index) => (
              <div key={option.id} className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                <Input
                  value={option.label}
                  placeholder="Display label (e.g., Yes)"
                  onChange={(event) =>
                    setOptions((prev) =>
                      prev.map((current) =>
                        current.id === option.id ? { ...current, label: event.target.value } : current
                      )
                    )
                  }
                />
                <Input
                  value={option.value}
                  placeholder="Value saved (e.g., yes)"
                  onChange={(event) =>
                    setOptions((prev) =>
                      prev.map((current) =>
                        current.id === option.id ? { ...current, value: event.target.value } : current
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOptions((prev) => prev.filter((current) => current.id !== option.id || prev.length === 1))}
                  disabled={options.length === 1 && !option.label && !option.value}
                >
                  Remove
                </Button>
              </div>
            ))}
            <p className="text-xs text-koa">Values should be short and unique for each option.</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 text-sm text-koa">
            <input type="checkbox" name="required" defaultChecked={question.required} className="h-4 w-4 rounded border-sand-300" />
            Required field
          </label>
          <SaveButton />
        </div>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={question.id} />
        <DeleteButton />
      </form>
    </div>
  );
}

function NewQuestionForm({ upsertAction, tickets }: { upsertAction: Props['upsertAction']; tickets: Ticket[] }) {
  const [fieldType, setFieldType] = useState<Question['field_type']>('text');
  const [options, setOptions] = useState<OptionItem[]>([createEmptyOption()]);
  const [assignedTickets, setAssignedTickets] = useState<string[]>([]);
  const requiresOptions = OPTION_FIELD_TYPES.has(fieldType);

  const optionsJson = useMemo(
    () =>
      JSON.stringify(
        (requiresOptions ? options : [])
          .map((option) => ({ label: option.label.trim(), value: option.value.trim() }))
          .filter((option) => option.label && option.value)
      ),
    [options, requiresOptions]
  );
  const ticketIdsJson = useMemo(() => JSON.stringify(assignedTickets), [assignedTickets]);

  return (
    <div className="rounded-3xl border border-dashed border-sand-300 bg-white/90 p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-sand-900">Add Question</h3>
      <p className="text-sm text-koa">Collect the details you need from families during registration.</p>
      <form action={upsertAction} className="mt-4 space-y-4">
        <input type="hidden" name="options" value={optionsJson} />
        <input type="hidden" name="ticket_ids" value={ticketIdsJson} />
        <div className="space-y-2">
          <Label htmlFor="new-prompt">Prompt</Label>
          <Input id="new-prompt" name="prompt" placeholder="Do you have any dietary needs?" required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-field">Field Type</Label>
            <select
              id="new-field"
              name="field_type"
              value={fieldType}
              onChange={(event) => {
                const value = event.target.value as Question['field_type'];
                setFieldType(value);
                if (OPTION_FIELD_TYPES.has(value)) {
                  setOptions((prev) => (prev.length ? prev : [createEmptyOption()]));
                }
              }}
              className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-koa focus:border-brandBlue focus:outline-none"
            >
              <option value="text">Short answer</option>
              <option value="textarea">Long answer</option>
              <option value="select">Dropdown</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-position">Display Order</Label>
            <Input id="new-position" name="position" type="number" min={0} />
          </div>
        </div>
        <TicketSelector tickets={tickets} value={assignedTickets} onChange={setAssignedTickets} />
        {requiresOptions ? (
          <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <div className="flex items-center justify-between">
              <Label>Answer choices</Label>
              <Button type="button" variant="secondary" onClick={() => setOptions((prev) => [...prev, createEmptyOption()])}>
                Add option
              </Button>
            </div>
            {options.map((option, index) => (
              <div key={option.id} className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                <Input
                  value={option.label}
                  placeholder="Display label"
                  onChange={(event) =>
                    setOptions((prev) =>
                      prev.map((current) =>
                        current.id === option.id ? { ...current, label: event.target.value } : current
                      )
                    )
                  }
                />
                <Input
                  value={option.value}
                  placeholder="Saved value"
                  onChange={(event) =>
                    setOptions((prev) =>
                      prev.map((current) =>
                        current.id === option.id ? { ...current, value: event.target.value } : current
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setOptions((prev) =>
                      prev.length > 1
                        ? prev.filter((current) => current.id !== option.id)
                        : prev.map((current) => ({ ...current, label: '', value: '' }))
                    )
                  }
                  disabled={options.length === 1 && !option.label && !option.value}
                >
                  Remove
                </Button>
              </div>
            ))}
            <p className="text-xs text-koa">Both label and value are required for each option.</p>
          </div>
        ) : null}
        <label className="flex items-center gap-3 text-sm text-koa">
          <input type="checkbox" name="required" className="h-4 w-4 rounded border-sand-300" />
          Required
        </label>
        <SaveButton label="Add Question" />
      </form>
    </div>
  );
}

export default function QuestionsManager({ questions, tickets, ticketAssignments, upsertAction, deleteAction }: Props) {
  return (
    <div className="space-y-8">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          ticketIds={ticketAssignments[question.id] ?? []}
          tickets={tickets}
          upsertAction={upsertAction}
          deleteAction={deleteAction}
        />
      ))}
      <NewQuestionForm upsertAction={upsertAction} tickets={tickets} />
    </div>
  );
}
