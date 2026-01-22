/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { uploadRegistrationImage } from '@/lib/actions/blob';
import type { RegistrationField } from '@/lib/registrationFields';

const PRIMARY_NAME_KEY = 'full_name';
const PRIMARY_EMAIL_KEY = 'email';
const LINEAGE_KEY = 'lineage';
const LINEAGE_OTHER_KEY = 'lineage_other';
const SAME_CONTACT_KEY = 'same_contact';
const SHOW_NAME_KEY = 'show_name';
const SHOW_PHOTO_KEY = 'show_photo';
const PHOTO_UPLOAD_KEY = 'photo_upload';
const CONTACT_KEYS = ['email', 'phone', 'address'];

const ALWAYS_REQUIRED_KEYS = new Set([PRIMARY_NAME_KEY, PRIMARY_EMAIL_KEY]);
const OPTIONAL_CHECKBOX_KEYS = new Set([SAME_CONTACT_KEY, SHOW_NAME_KEY, SHOW_PHOTO_KEY]);
const HIDDEN_KEYS = new Set([PHOTO_UPLOAD_KEY]);

type FormSchema = {
  tickets: { ticket_type_id: string; quantity: number }[];
  people: Array<Record<string, any>>;
  photo_urls?: Array<string | null>;
  payment_method: 'stripe' | 'paypal' | 'check';
  donation_note?: string;
};

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
  ticket_ids?: string[];
};

function preprocessNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildFieldSchema(field: RegistrationField) {
  if (field.field_type === 'photo') {
    return null;
  }
  const required = ALWAYS_REQUIRED_KEYS.has(field.field_key) || field.required;
  const isOptionalCheckbox = OPTIONAL_CHECKBOX_KEYS.has(field.field_key);
  const requiredMessage = `${field.label} is required`;

  switch (field.field_type) {
    case 'textarea':
    case 'text':
    case 'select':
    case 'date':
    case 'email':
    case 'phone': {
      let schema = z.string();
      if (field.field_type === 'email') {
        schema = z.string().email('Email is required');
      }
      if (required && !isOptionalCheckbox) {
        schema = schema.min(1, requiredMessage);
      } else {
        schema = schema.optional();
      }
      return schema;
    }
    case 'number': {
      const minValue = field.field_key === 'tshirt_quantity' ? 1 : 0;
      const schema = z.preprocess(
        preprocessNumber,
        z.number().int().min(minValue, required ? requiredMessage : undefined)
      );
      return required ? schema : schema.optional();
    }
    case 'checkbox': {
      if (required && !isOptionalCheckbox) {
        return z.boolean().refine((value) => value === true, { message: requiredMessage });
      }
      return z.boolean().optional();
    }
    case 'multiselect': {
      const schema = z.array(z.string());
      return required ? schema.min(1, 'Select at least one option') : schema.optional();
    }
    default:
      return z.string().optional();
  }
}

function buildPersonSchema(fields: RegistrationField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const fieldMap = new Map(fields.map((field) => [field.field_key, field]));

  fields.forEach((field) => {
    if (HIDDEN_KEYS.has(field.field_key)) return;
    const schema = buildFieldSchema(field);
    if (schema) {
      shape[field.field_key] = schema;
    }
  });

  const lineageField = fieldMap.get(LINEAGE_KEY);
  const lineageOtherField = fieldMap.get(LINEAGE_OTHER_KEY);

  return z.object(shape).superRefine((data, ctx) => {
    if (lineageField && lineageOtherField) {
      const lineageValue = typeof data[LINEAGE_KEY] === 'string' ? data[LINEAGE_KEY] : '';
      const lineageOtherValue = typeof data[LINEAGE_OTHER_KEY] === 'string' ? data[LINEAGE_OTHER_KEY] : '';
      const optionValue =
        lineageField.options?.find((option) =>
          typeof option?.value === 'string' ? option.value.toLowerCase().includes('other') : false
        )?.value ?? 'Other / Not listed';
      if (lineageValue === optionValue && !lineageOtherValue.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please share your lineage details',
          path: [LINEAGE_OTHER_KEY]
        });
      }
    }

    const showName = Boolean(data[SHOW_NAME_KEY]);
    const showPhoto = Boolean(data[SHOW_PHOTO_KEY]);
    if (SHOW_NAME_KEY in data || SHOW_PHOTO_KEY in data) {
      if (!showName && !showPhoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select name or photo for the Who's Coming section",
          path: [SHOW_NAME_KEY]
        });
      }
    }
  });
}

function buildFormSchema(personSchema: z.ZodTypeAny) {
  return z.object({
    tickets: z.array(
      z.object({
        ticket_type_id: z.string(),
        quantity: z.coerce.number().int().min(0)
      })
    ),
    people: z.array(personSchema).min(1).max(30),
    photo_urls: z.array(z.string().url().nullable()).optional(),
    payment_method: z.enum(['stripe', 'paypal', 'check']),
    donation_note: z.string().optional()
  });
}

function createEmptyPerson(fields: RegistrationField[]) {
  const person: Record<string, any> = {};
  fields.forEach((field) => {
    if (HIDDEN_KEYS.has(field.field_key)) return;
    switch (field.field_type) {
      case 'checkbox':
        person[field.field_key] = field.field_key === SHOW_NAME_KEY ? true : false;
        return;
      case 'multiselect':
        person[field.field_key] = [];
        return;
      case 'number':
        person[field.field_key] = field.field_key === 'tshirt_quantity' ? 1 : '';
        return;
      default:
        person[field.field_key] = '';
    }
  });
  if (!(SHOW_NAME_KEY in person)) {
    person[SHOW_NAME_KEY] = true;
  }
  if (!(SHOW_PHOTO_KEY in person)) {
    person[SHOW_PHOTO_KEY] = false;
  }
  if (!(SAME_CONTACT_KEY in person)) {
    person[SAME_CONTACT_KEY] = false;
  }
  return person;
}

function normalizeFieldValue(field: RegistrationField, value: unknown) {
  if (field.field_type === 'photo') return null;
  if (field.field_type === 'checkbox') {
    return Boolean(value);
  }
  if (field.field_type === 'multiselect') {
    return Array.isArray(value) ? value : [];
  }
  if (field.field_type === 'number') {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return value ?? null;
}

interface RegisterFormProps {
  tickets: Ticket[];
  questions: Question[];
  registrationFields: RegistrationField[];
  presetTicket?: string;
}

type PendingNavigation = { type: 'link'; href: string } | { type: 'back' } | null;

export default function RegisterForm({ tickets, questions, registrationFields, presetTicket }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const allowNavigationRef = useRef(false);
  const isDirtyRef = useRef(false);

  const personFields = useMemo(
    () =>
      registrationFields
        .filter((field) => field.scope === 'person' && field.enabled)
        .sort((a, b) => a.position - b.position),
    [registrationFields]
  );
  const personFieldMap = useMemo(
    () => new Map(personFields.map((field) => [field.field_key, field] as const)),
    [personFields]
  );
  const coreFields = useMemo(
    () => personFields.filter((field) => ![PHOTO_UPLOAD_KEY, SHOW_NAME_KEY, SHOW_PHOTO_KEY].includes(field.field_key)),
    [personFields]
  );
  const sectionGroups = useMemo(() => {
    const groups: Array<{ name: string; fields: RegistrationField[] }> = [];
    const seen = new Map<string, RegistrationField[]>();
    coreFields.forEach((field) => {
      const section = field.section?.trim() || 'Details';
      if (!seen.has(section)) {
        const list: RegistrationField[] = [];
        seen.set(section, list);
        groups.push({ name: section, fields: list });
      }
      seen.get(section)!.push(field);
    });
    return groups;
  }, [coreFields]);
  const personSchema = useMemo(() => buildPersonSchema(personFields), [personFields]);
  const formSchema = useMemo(() => buildFormSchema(personSchema), [personSchema]);
  const createPerson = () => createEmptyPerson(personFields);

  const defaultTickets = useMemo(
    () =>
      tickets.map((ticket) => ({
        ticket_type_id: ticket.id,
        quantity: ticket.id === presetTicket ? 1 : 0
      })),
    [tickets, presetTicket]
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty }
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tickets: defaultTickets,
      people: [createPerson()],
      photo_urls: [],
      payment_method: 'check',
      donation_note: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'people'
  });

  const people = useWatch({ control, name: 'people' });
  const quantities = watch('tickets');
  const photoUrls = watch('photo_urls') as Array<string | null> | undefined;
  const selectedTicketIds = useMemo(
    () => quantities.filter((item) => item.quantity > 0).map((item) => item.ticket_type_id),
    [quantities]
  );
  const activeQuestions = useMemo(() => {
    if (!questions.length) return [];
    const selected = new Set(selectedTicketIds);
    return questions.filter((question) => {
      const ticketIds = Array.isArray(question.ticket_ids) ? question.ticket_ids : [];
      if (!ticketIds.length) {
        return true;
      }
      if (!selected.size) {
        return false;
      }
      return ticketIds.some((ticketId) => selected.has(ticketId));
    });
  }, [questions, selectedTicketIds]);

  const updatePhotoUrl = (index: number, url: string | null) => {
    const next = [...(photoUrls ?? [])];
    while (next.length <= index) {
      next.push(null);
    }
    next[index] = url;
    setValue('photo_urls', next, { shouldDirty: true, shouldValidate: true });
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    setUploadErrors((prev) => ({ ...prev, [index]: '' }));

    const data = new FormData();
    data.append('file', file);
    const result = await uploadRegistrationImage(data);

    if ('error' in result) {
      setUploadErrors((prev) => ({ ...prev, [index]: result.error ?? 'Upload failed' }));
      setUploadingIndex(null);
      return;
    }

    updatePhotoUrl(index, result.url);
    setUploadingIndex(null);
  };

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const primary = people?.[0];
    if (!primary) return;

    const contactKeys = CONTACT_KEYS.filter((key) => personFieldMap.has(key));

    people?.forEach((person, index) => {
      if (index === 0) return;
      if (!person?.[SAME_CONTACT_KEY]) return;

      contactKeys.forEach((fieldKey) => {
        const value = typeof primary[fieldKey] === 'string' ? primary[fieldKey] : '';
        const currentValue = typeof person[fieldKey] === 'string' ? person[fieldKey] : '';
        if (currentValue !== value) {
          setValue(`people.${index}.${fieldKey}` as const, value, { shouldValidate: true, shouldDirty: true });
        }
      });
    });
  }, [people, personFieldMap, setValue]);

  useEffect(() => {
    if (!people?.length) return;
    people.forEach((person, index) => {
      const hasPhoto = Boolean(photoUrls?.[index]);
      if (!hasPhoto && person?.[SHOW_PHOTO_KEY]) {
        setValue(`people.${index}.${SHOW_PHOTO_KEY}` as const, false, { shouldValidate: true, shouldDirty: true });
      }
    });
  }, [people, photoUrls, setValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirtyRef.current || allowNavigationRef.current) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      event.preventDefault();
      setPendingNavigation({ type: 'link', href });
      setShowLeaveModal(true);
    };

    const handlePopState = () => {
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }
      if (!isDirtyRef.current) {
        allowNavigationRef.current = true;
        window.history.back();
        return;
      }
      setPendingNavigation({ type: 'back' });
      setShowLeaveModal(true);
    };

    window.history.pushState({ registrationGuard: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const totalCents = quantities.reduce((sum, item) => {
    const ticket = tickets.find((ticket) => ticket.id === item.ticket_type_id);
    if (!ticket) return sum;
    return sum + ticket.price_cents * (Number.isFinite(item.quantity) ? item.quantity : 0);
  }, 0);

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    setLoading(true);
    try {
      const rawValues = getValues();
      const primaryContact = data.people[0] ?? {};
      const purchaserName = typeof primaryContact[PRIMARY_NAME_KEY] === 'string' ? primaryContact[PRIMARY_NAME_KEY].trim() : '';
      const purchaserEmail = typeof primaryContact[PRIMARY_EMAIL_KEY] === 'string' ? primaryContact[PRIMARY_EMAIL_KEY].trim() : '';

      if (!purchaserName || !purchaserEmail) {
        throw new Error('Primary contact name and email are required.');
      }

      const answers = activeQuestions.reduce<Record<string, unknown>>(
        (acc, question) => {
          const fieldName = `question_${question.id}`;
          const raw = (rawValues as any)[fieldName];
          let value: unknown = raw;
          if (question.field_type === 'checkbox') {
            value = raw === true || raw === 'true' || raw === 'on';
          }
          acc[question.id] = value ?? null;
          return acc;
        },
        {
          people: data.people.map((person, index) => {
            const record: Record<string, unknown> = {};
            personFields.forEach((field) => {
              if (HIDDEN_KEYS.has(field.field_key)) return;
              let value = person[field.field_key];
              if (field.field_key === SHOW_PHOTO_KEY && !photoUrls?.[index]) {
                value = false;
              }
              record[field.field_key] = normalizeFieldValue(field, value);
            });
            return record;
          }),
          photo_urls: data.photo_urls ?? [],
          donation_note: data.donation_note || null
        }
      );

      const payload = {
        purchaser_name: purchaserName,
        purchaser_email: purchaserEmail,
        payment_method: data.payment_method,
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
        allowNavigationRef.current = true;
        window.location.href = json.checkoutUrl as string;
        return;
      }
      if (json.redirectUrl) {
        allowNavigationRef.current = true;
        router.push(json.redirectUrl as string);
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

  const handleStay = () => {
    if (pendingNavigation?.type === 'back') {
      window.history.pushState({ registrationGuard: true }, '', window.location.href);
    }
    setPendingNavigation(null);
    setShowLeaveModal(false);
  };

  const handleLeave = () => {
    setShowLeaveModal(false);
    allowNavigationRef.current = true;

    if (pendingNavigation?.type === 'back') {
      setPendingNavigation(null);
      window.history.back();
      return;
    }

    if (pendingNavigation?.type === 'link') {
      const href = pendingNavigation.href;
      setPendingNavigation(null);
      if (href.startsWith('http')) {
        window.location.href = href;
        return;
      }
      router.push(href);
    }
  };

  return (
    <div className="relative">
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h3 className="text-xl font-semibold text-black">Leave registration?</h3>
            <p className="mt-2 text-sm text-koa">
              Your registration is not saved yet. If you leave this page, the information you entered will be lost.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="border-brandBlue bg-brandBlue text-white hover:bg-brandBlueDark"
                onClick={handleStay}
              >
                Stay
              </Button>
              <Button type="button" variant="ghost" className="text-koa" onClick={handleLeave}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="card shadow-soft backdrop-soft space-y-8 p-8">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-black">Participant Information</h2>
          <p className="text-sm text-koa">
            Start with the primary contact. Add each additional person below. Required fields are marked.
          </p>
        </div>

        <div className="space-y-6">
          {fields.map((field, index) => {
            const personErrors = errors.people?.[index] as Record<string, any> | undefined;
            const sameContact = Boolean(people?.[index]?.[SAME_CONTACT_KEY]);
            const personLabel = index === 0 ? 'Primary Contact' : `Participant ${index + 1}`;
            const contactClass = sameContact ? 'bg-slate-100 text-slate-500' : '';
            const hasPhoto = Boolean(photoUrls?.[index]);
            const showPhotoDisabled = !hasPhoto;
            const lineageValue = typeof people?.[index]?.[LINEAGE_KEY] === 'string' ? people[index][LINEAGE_KEY] : '';
            const lineageField = personFieldMap.get(LINEAGE_KEY);
            const lineageOtherField = personFieldMap.get(LINEAGE_OTHER_KEY);
            const otherValue = (
              lineageField?.options?.find((option) =>
                typeof option?.value === 'string' ? option.value.toLowerCase().includes('other') : false
              )?.value ?? 'Other / Not listed'
            );
            const showLineageOther = Boolean(lineageOtherField && lineageValue === otherValue);
            const showNameField = personFieldMap.get(SHOW_NAME_KEY);
            const showPhotoField = personFieldMap.get(SHOW_PHOTO_KEY);
            const photoField = personFieldMap.get(PHOTO_UPLOAD_KEY);

            const renderField = (fieldItem: RegistrationField) => {
              if (fieldItem.field_key === SAME_CONTACT_KEY) {
                if (index === 0) return null;
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className="md:col-span-2 space-y-2">
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4" {...register(`people.${index}.${fieldItem.field_key}` as any)} />
                      <span>
                        {fieldItem.label}
                        {fieldItem.help_text ? <span className="mt-1 block text-xs text-koa">{fieldItem.help_text}</span> : null}
                      </span>
                    </label>
                    {personErrors?.[fieldItem.field_key] && (
                      <p className="text-xs text-red-500">{personErrors[fieldItem.field_key].message}</p>
                    )}
                  </div>
                );
              }

              if (fieldItem.field_key === LINEAGE_OTHER_KEY && !showLineageOther) {
                return null;
              }

              const fieldName = `people.${index}.${fieldItem.field_key}` as const;
              const error = personErrors?.[fieldItem.field_key];
              const isRequired =
                ALWAYS_REQUIRED_KEYS.has(fieldItem.field_key) ||
                fieldItem.required ||
                (fieldItem.field_key === LINEAGE_OTHER_KEY && showLineageOther);
              const options = Array.isArray(fieldItem.options) ? fieldItem.options : [];
              const isReadOnly = sameContact && CONTACT_KEYS.includes(fieldItem.field_key);
              const wrapperClass =
                fieldItem.field_type === 'textarea' ||
                fieldItem.field_type === 'multiselect' ||
                fieldItem.field_key === LINEAGE_OTHER_KEY
                  ? 'md:col-span-2'
                  : '';

              if (fieldItem.field_type === 'multiselect') {
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className={`space-y-2 ${wrapperClass}`}>
                    <Label>
                      {fieldItem.label}
                      {isRequired && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {options.map((option, optionIndex) => (
                        <label
                          key={`${fieldItem.field_key}-${optionIndex}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <input type="checkbox" value={option.value} className="h-4 w-4" {...register(fieldName as any)} />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {fieldItem.help_text && <p className="text-xs text-koa">{fieldItem.help_text}</p>}
                    {error && <p className="text-xs text-red-500">{error.message}</p>}
                  </div>
                );
              }

              if (fieldItem.field_type === 'select') {
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className={`space-y-2 ${wrapperClass}`}>
                    <Label htmlFor={`person-${index}-${fieldItem.field_key}`}>
                      {fieldItem.label}
                      {isRequired && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                    </Label>
                    <select
                      id={`person-${index}-${fieldItem.field_key}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                      {...register(fieldName as any)}
                    >
                      <option value="">Select an option</option>
                      {options.map((option, optionIndex) => (
                        <option key={`${fieldItem.field_key}-${optionIndex}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {fieldItem.help_text && <p className="text-xs text-koa">{fieldItem.help_text}</p>}
                    {error && <p className="text-xs text-red-500">{error.message}</p>}
                  </div>
                );
              }

              if (fieldItem.field_type === 'checkbox') {
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className={`space-y-2 ${wrapperClass}`}>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input type="checkbox" className="h-4 w-4" {...register(fieldName as any)} />
                      <span>
                        {fieldItem.label}
                        {fieldItem.help_text ? <span className="mt-1 block text-xs text-koa">{fieldItem.help_text}</span> : null}
                      </span>
                    </label>
                    {error && <p className="text-xs text-red-500">{error.message}</p>}
                  </div>
                );
              }

              if (fieldItem.field_type === 'textarea') {
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className={`space-y-2 ${wrapperClass}`}>
                    <Label htmlFor={`person-${index}-${fieldItem.field_key}`}>
                      {fieldItem.label}
                      {isRequired && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                    </Label>
                    <Textarea
                      id={`person-${index}-${fieldItem.field_key}`}
                      rows={3}
                      placeholder={fieldItem.placeholder ?? ''}
                      readOnly={isReadOnly}
                      className={isReadOnly ? contactClass : ''}
                      {...register(fieldName as any)}
                    />
                    {fieldItem.help_text && <p className="text-xs text-koa">{fieldItem.help_text}</p>}
                    {error && <p className="text-xs text-red-500">{error.message}</p>}
                  </div>
                );
              }

              const inputType =
                fieldItem.field_type === 'email'
                  ? 'email'
                  : fieldItem.field_type === 'phone'
                  ? 'tel'
                  : fieldItem.field_type === 'date'
                  ? 'date'
                  : fieldItem.field_type === 'number'
                  ? 'number'
                  : 'text';

              return (
                <div key={`${fieldItem.field_key}-${index}`} className={`space-y-2 ${wrapperClass}`}>
                  <Label htmlFor={`person-${index}-${fieldItem.field_key}`}>
                    {fieldItem.label}
                    {isRequired && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                  </Label>
                  <Input
                    id={`person-${index}-${fieldItem.field_key}`}
                    type={inputType}
                    min={
                      fieldItem.field_type === 'number'
                        ? fieldItem.field_key === 'tshirt_quantity'
                          ? 1
                          : 0
                        : undefined
                    }
                    placeholder={fieldItem.placeholder ?? ''}
                    readOnly={isReadOnly}
                    className={isReadOnly ? contactClass : ''}
                    {...register(fieldName as any)}
                  />
                  {fieldItem.help_text && <p className="text-xs text-koa">{fieldItem.help_text}</p>}
                  {error && <p className="text-xs text-red-500">{error.message}</p>}
                </div>
              );
            };

            return (
              <div key={field.id} className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mono text-xs uppercase tracking-[0.3em] text-koa">{personLabel}</p>
                    <h3 className="mt-2 text-xl font-semibold text-black">Personal Details</h3>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        remove(index);
                        const next = [...(photoUrls ?? [])];
                        if (next.length) {
                          next.splice(index, 1);
                          setValue('photo_urls', next, { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                      className="text-xs font-semibold text-red-500 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {sectionGroups.map((section) => (
                  <div key={`${section.name}-${index}`} className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-black">{section.name}</h4>
                    <div className="grid gap-6 md:grid-cols-2">{section.fields.map((fieldItem) => renderField(fieldItem))}</div>
                  </div>
                ))}

                {(photoField || showNameField || showPhotoField) && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-black">Who's Coming Display</h4>
                    {photoField && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <Label htmlFor={`photo-${index}`}>{photoField.label}</Label>
                            {photoField.help_text ? <p className="text-xs text-koa">{photoField.help_text}</p> : null}
                          </div>
                          <input
                            id={`photo-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                handlePhotoUpload(index, file);
                              }
                            }}
                          />
                        </div>
                        {uploadingIndex === index && <p className="mt-2 text-xs text-koa">Uploading...</p>}
                        {uploadErrors[index] && <p className="mt-2 text-xs text-red-500">{uploadErrors[index]}</p>}
                        {photoUrls?.[index] && (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                            <img src={photoUrls[index] as string} alt="Uploaded preview" className="h-40 w-full object-cover" />
                          </div>
                        )}
                        {photoUrls?.[index] && (
                          <button
                            type="button"
                            className="mt-3 text-xs font-semibold text-slate-500 underline"
                            onClick={() => updatePhotoUrl(index, null)}
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {showNameField && (
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                          <input type="checkbox" className="h-4 w-4" {...register(`people.${index}.${SHOW_NAME_KEY}`)} />
                          <span>{showNameField.label}</span>
                        </label>
                      )}
                      {showPhotoField && (
                        <label
                          className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                            showPhotoDisabled ? 'cursor-not-allowed text-slate-400 opacity-60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            {...register(`people.${index}.${SHOW_PHOTO_KEY}`)}
                            disabled={showPhotoDisabled}
                          />
                          <span>{showPhotoField.label}</span>
                        </label>
                      )}
                    </div>
                    {showPhotoDisabled && showPhotoField && (
                      <p className="mt-2 text-xs text-koa">Upload a photo above to enable the photo option.</p>
                    )}
                    {personErrors?.[SHOW_NAME_KEY] && (
                      <p className="mt-2 text-xs text-red-500">{personErrors[SHOW_NAME_KEY].message}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => append(createPerson())}
            disabled={fields.length >= 30}
          >
            Add Person
          </Button>
          <p className="text-xs text-koa">You can add up to 30 people.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Ticket Packages</h2>
          <div className="space-y-4">
            {tickets.length ? (
              tickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
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

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Payment Preference</h2>
          <p className="text-sm text-koa">
            We are recording your preferred payment method. No payment will be collected yet.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <input type="radio" value="stripe" className="h-4 w-4" {...register('payment_method')} />
              <span>Stripe</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <input type="radio" value="paypal" className="h-4 w-4" {...register('payment_method')} />
              <span>PayPal</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <input type="radio" value="check" className="h-4 w-4" {...register('payment_method')} />
              <span>Mail-in check</span>
            </label>
          </div>
          {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method.message}</p>}
        </div>

        {activeQuestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Registration Questions</h2>
            <div className="grid gap-5">
              {activeQuestions.map((question) => {
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
          Submit Registration
        </Button>
      </form>
    </div>
  );
}
