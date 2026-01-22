import type { Database } from '@/types/supabase';

export type RegistrationFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'multiselect'
  | 'number'
  | 'email'
  | 'phone'
  | 'photo';

export type RegistrationFieldScope = 'person' | 'order';

export type RegistrationFieldOption = {
  label: string;
  value: string;
};

export type RegistrationField = {
  id: string;
  field_key: string;
  label: string;
  field_type: RegistrationFieldType;
  options: RegistrationFieldOption[];
  required: boolean;
  position: number;
  scope: RegistrationFieldScope;
  enabled: boolean;
  help_text: string | null;
  placeholder: string | null;
  locked: boolean;
  section: string | null;
};

type RegistrationFieldRow = Database['public']['Tables']['registration_fields']['Row'];

export function normalizeRegistrationFields(rows: RegistrationFieldRow[] | null | undefined): RegistrationField[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => ({
      id: row.id,
      field_key: row.field_key,
      label: row.label,
      field_type: row.field_type as RegistrationFieldType,
      options: Array.isArray(row.options) ? (row.options as RegistrationFieldOption[]) : [],
      required: row.required ?? false,
      position: row.position ?? 0,
      scope: (row.scope as RegistrationFieldScope) ?? 'person',
      enabled: row.enabled ?? true,
      help_text: row.help_text ?? null,
      placeholder: row.placeholder ?? null,
      locked: row.locked ?? false,
      section: row.section ?? null
    }))
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}
