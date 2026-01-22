'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/supabase';

type RegistrationField = Database['public']['Tables']['registration_fields']['Row'];

interface Props {
  fields: RegistrationField[];
  upsertAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

type OptionItem = {
  id: string;
  label: string;
  value: string;
};

const FIELD_TYPES: Array<{ value: RegistrationField['field_type']; label: string }> = [
  { value: 'text', label: 'Short answer' },
  { value: 'textarea', label: 'Long answer' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'photo', label: 'Photo upload' }
];

const OPTION_FIELD_TYPES = new Set<RegistrationField['field_type']>(['select', 'multiselect']);

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `opt-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyOption(): OptionItem {
  return { id: createId(), label: '', value: '' };
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

function SaveButton({ label = 'Save Field' }: { label?: string }) {
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

function FieldCard({
  field,
  upsertAction,
  deleteAction
}: {
  field: RegistrationField;
  upsertAction: Props['upsertAction'];
  deleteAction: Props['deleteAction'];
}) {
  const [fieldType, setFieldType] = useState<RegistrationField['field_type']>(field.field_type);
  const [options, setOptions] = useState<OptionItem[]>(() => parseOptions(field.options));
  const locked = field.locked ?? false;
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

  return (
    <div className="card shadow-soft space-y-4 p-6">
      <form action={upsertAction} className="space-y-4">
        <input type="hidden" name="id" value={field.id} />
        <input type="hidden" name="field_key" value={field.field_key} />
        <input type="hidden" name="options" value={optionsJson} />
        <input type="hidden" name="scope" value={field.scope ?? 'person'} />
        <input type="hidden" name="locked" value={locked ? 'true' : 'false'} />
        {locked && (
          <>
            <input type="hidden" name="field_type" value={fieldType} />
            <input type="hidden" name="required" value={field.required ? 'true' : 'false'} />
            <input type="hidden" name="enabled" value={field.enabled ? 'true' : 'false'} />
          </>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`field-key-${field.id}`}>Field Key</Label>
            <Input id={`field-key-${field.id}`} value={field.field_key} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`label-${field.id}`}>Label</Label>
            <Input id={`label-${field.id}`} name="label" defaultValue={field.label} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`type-${field.id}`}>Field Type</Label>
            <select
              id={`type-${field.id}`}
              name="field_type"
              value={fieldType}
              onChange={(event) => setFieldType(event.target.value as RegistrationField['field_type'])}
              className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-koa focus:border-brandBlue focus:outline-none"
              disabled={locked}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`section-${field.id}`}>Section</Label>
            <Input id={`section-${field.id}`} name="section" defaultValue={field.section ?? ''} placeholder="Participant Details" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`position-${field.id}`}>Display Order</Label>
            <Input id={`position-${field.id}`} name="position" type="number" defaultValue={field.position ?? 0} min={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
            <Input id={`placeholder-${field.id}`} name="placeholder" defaultValue={field.placeholder ?? ''} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`help-${field.id}`}>Help Text</Label>
            <Textarea id={`help-${field.id}`} name="help_text" rows={2} defaultValue={field.help_text ?? ''} />
          </div>
        </div>
        {requiresOptions ? (
          <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <div className="flex items-center justify-between">
              <Label>Answer choices</Label>
              <Button type="button" variant="secondary" onClick={() => setOptions((prev) => [...prev, createEmptyOption()])}>
                Add option
              </Button>
            </div>
            {options.map((option) => (
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
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-koa">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="required" defaultChecked={field.required} className="h-4 w-4 rounded border-sand-300" disabled={locked} />
              Required
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="enabled" defaultChecked={field.enabled} className="h-4 w-4 rounded border-sand-300" disabled={locked} />
              Enabled
            </label>
          </div>
          <SaveButton />
        </div>
      </form>
      {!locked && (
        <form action={deleteAction}>
          <input type="hidden" name="id" value={field.id} />
          <DeleteButton />
        </form>
      )}
      {locked && <p className="text-xs text-koa">This field is required for registration and cannot be removed.</p>}
    </div>
  );
}

function NewFieldForm({ upsertAction }: { upsertAction: Props['upsertAction'] }) {
  const [fieldType, setFieldType] = useState<RegistrationField['field_type']>('text');
  const [options, setOptions] = useState<OptionItem[]>([createEmptyOption()]);
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

  return (
    <div className="rounded-3xl border border-dashed border-sand-300 bg-white/90 p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-sand-900">Add Registration Field</h3>
      <p className="text-sm text-koa">Create additional questions for each participant.</p>
      <form action={upsertAction} className="mt-4 space-y-4">
        <input type="hidden" name="options" value={optionsJson} />
        <input type="hidden" name="scope" value="person" />
        <input type="hidden" name="locked" value="false" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-field-key">Field Key</Label>
            <Input id="new-field-key" name="field_key" placeholder="e.g., allergy_notes" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-label">Label</Label>
            <Input id="new-label" name="label" placeholder="Allergy notes" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-type">Field Type</Label>
            <select
              id="new-type"
              name="field_type"
              value={fieldType}
              onChange={(event) => setFieldType(event.target.value as RegistrationField['field_type'])}
              className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-koa focus:border-brandBlue focus:outline-none"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-section">Section</Label>
            <Input id="new-section" name="section" placeholder="Participant Details" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-position">Display Order</Label>
            <Input id="new-position" name="position" type="number" min={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-placeholder">Placeholder</Label>
            <Input id="new-placeholder" name="placeholder" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-help">Help Text</Label>
            <Textarea id="new-help" name="help_text" rows={2} />
          </div>
        </div>
        {requiresOptions ? (
          <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <div className="flex items-center justify-between">
              <Label>Answer choices</Label>
              <Button type="button" variant="secondary" onClick={() => setOptions((prev) => [...prev, createEmptyOption()])}>
                Add option
              </Button>
            </div>
            {options.map((option) => (
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
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 text-sm text-koa">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="required" className="h-4 w-4 rounded border-sand-300" defaultChecked />
            Required
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="enabled" className="h-4 w-4 rounded border-sand-300" defaultChecked />
            Enabled
          </label>
        </div>
        <SaveButton label="Add Field" />
      </form>
    </div>
  );
}

export default function RegistrationFieldsManager({ fields, upsertAction, deleteAction }: Props) {
  return (
    <div className="space-y-8">
      {fields.map((field) => (
        <FieldCard key={field.id} field={field} upsertAction={upsertAction} deleteAction={deleteAction} />
      ))}
      <NewFieldForm upsertAction={upsertAction} />
    </div>
  );
}
