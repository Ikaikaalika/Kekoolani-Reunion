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
import { optionalEmailSchema, requiredEmailSchema } from '@/lib/emailValidation';
import { uploadRegistrationImage } from '@/lib/actions/blob';
import type { RegistrationField } from '@/lib/registrationFields';
import { getParticipantAge, selectTicketForAge } from '@/lib/orderUtils';

const PRIMARY_NAME_KEY = 'full_name';
const PRIMARY_EMAIL_KEY = 'email';
const LINEAGE_KEY = 'lineage';
const LINEAGE_OTHER_KEY = 'lineage_other';
const AGE_KEY = 'age';
const ATTENDING_KEY = 'attending';
const SAME_CONTACT_KEY = 'same_contact';
const SHOW_NAME_KEY = 'show_name';
const SHOW_PHOTO_KEY = 'show_photo';
const PHOTO_UPLOAD_KEY = 'photo_upload';
const HONEYPOT_KEY = 'website' as const;
const TSHIRT_CATEGORY_KEY = 'tshirt_category';
const TSHIRT_STYLE_KEY = 'tshirt_style';
const TSHIRT_SIZE_KEY = 'tshirt_size';
const TSHIRT_QUANTITY_KEY = 'tshirt_quantity';
const ADDRESS_KEY = 'address';
const CONTACT_KEYS = ['email', 'phone', 'address'];
const CHECK_MAILING_ADDRESS = 'PO Box 10124, Hilo, HI 96721';

const ALWAYS_REQUIRED_KEYS = new Set([PRIMARY_NAME_KEY]);
const OPTIONAL_CHECKBOX_KEYS = new Set([SAME_CONTACT_KEY, SHOW_NAME_KEY, SHOW_PHOTO_KEY]);
const HIDDEN_KEYS = new Set([PHOTO_UPLOAD_KEY]);

const TSHIRT_ADULT_PRICE_CENTS = 2500;
const TSHIRT_YOUTH_PRICE_CENTS = 1500;
const getTshirtUnitPrice = (category?: string) => (category === 'youth' ? TSHIRT_YOUTH_PRICE_CENTS : TSHIRT_ADULT_PRICE_CENTS);
const TSHIRT_CATEGORIES = [
  { value: 'mens', label: "Men's" },
  { value: 'womens', label: "Women's" },
  { value: 'youth', label: 'Youth' }
];
const TSHIRT_STYLES: Record<string, string[]> = {
  mens: ['T-shirt', 'Long sleeve', 'Tank top'],
  womens: ['V-neck', 'Tank top', 'Crew neck'],
  youth: ['T-shirt', 'Long sleeve']
};
const TSHIRT_SIZES: Record<string, string[]> = {
  adult: ['S', 'M', 'L', 'XL', '2X', '3X', '4X', '5X'],
  youth: ['YS', 'YM', 'YL']
};
type TshirtTotals = { adultQty: number; youthQty: number; adultCents: number; youthCents: number };
const EMPTY_TSHIRT_TOTALS: TshirtTotals = { adultQty: 0, youthQty: 0, adultCents: 0, youthCents: 0 };
type AddressParts = {
  street: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const EMPTY_ADDRESS_PARTS: AddressParts = {
  street: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
  country: ''
};

const DEFAULT_TSHIRT_FIELDS: RegistrationField[] = [
  {
    id: TSHIRT_CATEGORY_KEY,
    field_key: TSHIRT_CATEGORY_KEY,
    label: 'T-shirt category',
    field_type: 'select',
    options: TSHIRT_CATEGORIES.map((option) => ({ value: option.value, label: option.label })),
    required: false,
    position: 70,
    scope: 'person',
    enabled: true,
    help_text: null,
    placeholder: null,
    locked: false,
    section: 'Participation'
  },
  {
    id: TSHIRT_STYLE_KEY,
    field_key: TSHIRT_STYLE_KEY,
    label: 'T-shirt style',
    field_type: 'select',
    options: [
      { value: 'T-shirt', label: 'T-shirt' },
      { value: 'Long sleeve', label: 'Long sleeve' },
      { value: 'Tank top', label: 'Tank top' },
      { value: 'V-neck', label: 'V-neck' },
      { value: 'Crew neck', label: 'Crew neck' }
    ],
    required: false,
    position: 71,
    scope: 'person',
    enabled: true,
    help_text: null,
    placeholder: null,
    locked: false,
    section: 'Participation'
  },
  {
    id: TSHIRT_SIZE_KEY,
    field_key: TSHIRT_SIZE_KEY,
    label: 'T-shirt size',
    field_type: 'select',
    options: [
      { value: 'YS', label: 'Youth S' },
      { value: 'YM', label: 'Youth M' },
      { value: 'YL', label: 'Youth L' },
      { value: 'S', label: 'S' },
      { value: 'M', label: 'M' },
      { value: 'L', label: 'L' },
      { value: 'XL', label: 'XL' },
      { value: '2X', label: '2X' },
      { value: '3X', label: '3X' },
      { value: '4X', label: '4X' },
      { value: '5X', label: '5X' }
    ],
    required: false,
    position: 72,
    scope: 'person',
    enabled: true,
    help_text: null,
    placeholder: null,
    locked: false,
    section: 'Participation'
  },
  {
    id: TSHIRT_QUANTITY_KEY,
    field_key: TSHIRT_QUANTITY_KEY,
    label: 'T-shirt quantity',
    field_type: 'number',
    options: [],
    required: false,
    position: 73,
    scope: 'person',
    enabled: true,
    help_text: null,
    placeholder: null,
    locked: false,
    section: 'Participation'
  }
];

type FormSchema = {
  tickets: { ticket_type_id: string; quantity: number }[];
  people: Array<Record<string, any>>;
  photo_urls?: Array<string | null>;
  tshirt_orders?: Array<{ category: string; style: string; size: string; quantity: number }>;
  payment_method: 'stripe' | 'paypal' | 'venmo' | 'check';
  check_mailing_address_confirm?: boolean;
  paypal_username?: string;
  venmo_username?: string;
  tshirt_only?: boolean;
  donation_amount?: number;
  donation_note?: string;
  website?: string;
};

type Ticket = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  priceFormatted: string;
  currency: string;
  inventory: number | null;
  age_min?: number | null;
  age_max?: number | null;
};

type Question = {
  id: string;
  prompt: string;
  field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  options: any;
  required: boolean;
  ticket_ids?: string[];
};

const isAgeBasedTicket = (ticket: Ticket) => typeof ticket.age_min === 'number' || typeof ticket.age_max === 'number';

function preprocessNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseCityStateZip(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return { city: '', state: '', zip: '' };
  const zipMatch = trimmed.match(/(?:^|\s)(\d{5}(?:-\d{4})?)$/);
  const zip = zipMatch?.[1] ?? '';
  const zipIndex = zipMatch?.index ?? trimmed.length;
  const withoutZip = zip ? trimmed.slice(0, zipIndex).trim().replace(/,\s*$/, '') : trimmed;
  const stateMatch = withoutZip.match(/(?:,\s*|\s+)([A-Za-z]{2})$/);
  const state = (stateMatch?.[1] ?? '').toUpperCase();
  const city = stateMatch ? withoutZip.slice(0, stateMatch.index).trim().replace(/,\s*$/, '') : withoutZip;

  return {
    city: city.trim(),
    state: state.trim(),
    zip: zip.trim()
  };
}

function looksLikeCityStateZip(line: string) {
  return /,/.test(line) || /\b\d{5}(?:-\d{4})?\b/.test(line);
}

function parseAddressParts(value: unknown): AddressParts {
  if (typeof value !== 'string') return { ...EMPTY_ADDRESS_PARTS };
  const raw = value.trim();
  if (!raw) return { ...EMPTY_ADDRESS_PARTS };

  const commaParts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length >= 3 && !raw.includes('\n')) {
    const stateZip = parseCityStateZip(commaParts.slice(2).join(', '));
    return {
      street: commaParts[0] ?? '',
      line2: '',
      city: commaParts[1] ?? '',
      state: stateZip.state,
      zip: stateZip.zip,
      country: ''
    };
  }

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { ...EMPTY_ADDRESS_PARTS };

  const [street, ...rest] = lines;
  const parts: AddressParts = { ...EMPTY_ADDRESS_PARTS, street };

  if (!rest.length) return parts;

  if (looksLikeCityStateZip(rest[0])) {
    const parsed = parseCityStateZip(rest[0]);
    parts.city = parsed.city;
    parts.state = parsed.state;
    parts.zip = parsed.zip;
    parts.country = rest[1] ?? '';
    return parts;
  }

  parts.line2 = rest[0] ?? '';
  if (rest[1]) {
    const parsed = parseCityStateZip(rest[1]);
    parts.city = parsed.city;
    parts.state = parsed.state;
    parts.zip = parsed.zip;
  }
  parts.country = rest[2] ?? '';
  return parts;
}

function formatAddressParts(parts: AddressParts) {
  const street = parts.street.trim();
  const line2 = parts.line2.trim();
  const city = parts.city.trim();
  const state = parts.state.trim().toUpperCase();
  const zip = parts.zip.trim();
  const country = parts.country.trim();
  const cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return [street, line2, cityStateZip, country].filter(Boolean).join('\n');
}

function buildFieldSchema(field: RegistrationField) {
  if (field.field_type === 'photo') {
    return null;
  }
  const isTshirtField =
    field.field_key === TSHIRT_CATEGORY_KEY ||
    field.field_key === TSHIRT_STYLE_KEY ||
    field.field_key === TSHIRT_SIZE_KEY ||
    field.field_key === TSHIRT_QUANTITY_KEY;
  const isEmailField = field.field_key === PRIMARY_EMAIL_KEY;
  const isAgeField = field.field_key === AGE_KEY;
  const required =
    !isTshirtField &&
    !isEmailField &&
    !isAgeField &&
    (ALWAYS_REQUIRED_KEYS.has(field.field_key) || field.required);
  const isOptionalCheckbox = OPTIONAL_CHECKBOX_KEYS.has(field.field_key);
  const requiredMessage = `${field.label} is required`;

  switch (field.field_type) {
    case 'textarea':
    case 'text':
    case 'select':
    case 'date':
    case 'phone': {
      const schema = z.string();
      if (required && !isOptionalCheckbox) {
        return schema.min(1, requiredMessage);
      }
      return schema.optional();
    }
    case 'email':
      if (required && !isOptionalCheckbox) {
        return requiredEmailSchema;
      }
      return optionalEmailSchema;
    case 'number': {
      const minValue = field.field_key === TSHIRT_QUANTITY_KEY ? 0 : 0;
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
  shape[ATTENDING_KEY] = z.boolean().optional();

  const lineageField = fieldMap.get(LINEAGE_KEY);
  const lineageOtherField = fieldMap.get(LINEAGE_OTHER_KEY);
  const tshirtCategoryField = fieldMap.get(TSHIRT_CATEGORY_KEY);
  const tshirtStyleField = fieldMap.get(TSHIRT_STYLE_KEY);
  const tshirtSizeField = fieldMap.get(TSHIRT_SIZE_KEY);
  const tshirtQuantityField = fieldMap.get(TSHIRT_QUANTITY_KEY);

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

    if (tshirtQuantityField) {
      const categoryValue = typeof data[TSHIRT_CATEGORY_KEY] === 'string' ? data[TSHIRT_CATEGORY_KEY].trim() : '';
      const styleValue = typeof data[TSHIRT_STYLE_KEY] === 'string' ? data[TSHIRT_STYLE_KEY].trim() : '';
      const sizeValue = typeof data[TSHIRT_SIZE_KEY] === 'string' ? data[TSHIRT_SIZE_KEY].trim() : '';
      const rawQuantity = data[TSHIRT_QUANTITY_KEY];
      const quantity = typeof rawQuantity === 'number' ? rawQuantity : 0;
      const hasCategory = Boolean(categoryValue) && Boolean(tshirtCategoryField);
      const hasStyle = Boolean(styleValue) && Boolean(tshirtStyleField);
      const hasSize = Boolean(sizeValue) && Boolean(tshirtSizeField);
      const hasQuantity = Number.isFinite(quantity) && quantity > 0;

      if ((hasCategory || hasStyle || hasSize) && !hasQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a T-shirt quantity',
          path: [TSHIRT_QUANTITY_KEY]
        });
      }

      if (hasQuantity && !hasCategory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a T-shirt category',
          path: [TSHIRT_CATEGORY_KEY]
        });
      }

      if (hasQuantity && !hasStyle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a T-shirt style',
          path: [TSHIRT_STYLE_KEY]
        });
      }

      if (hasQuantity && !hasSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a T-shirt size',
          path: [TSHIRT_SIZE_KEY]
        });
      }
    }
  });
}

const tshirtOrderSchema = z.object({
  category: z.enum(['mens', 'womens', 'youth']),
  style: z.string().min(1, 'Select a style'),
  size: z.string().min(1, 'Select a size'),
  quantity: z.preprocess(preprocessNumber, z.number().int().min(1, 'Quantity is required'))
});

function buildFormSchema(personSchema: z.ZodTypeAny) {
  return z
    .object({
      tickets: z.array(
        z.object({
          ticket_type_id: z.string(),
          quantity: z.coerce.number().int().min(0)
        })
      ),
      people: z.array(personSchema).min(1).max(30),
      photo_urls: z.array(z.string().url().nullable()).optional(),
      tshirt_orders: z.array(tshirtOrderSchema).optional(),
      payment_method: z.enum(['stripe', 'paypal', 'venmo', 'check']),
      check_mailing_address_confirm: z.boolean().optional(),
      paypal_username: z.string().optional(),
      venmo_username: z.string().optional(),
      tshirt_only: z.boolean().optional(),
      donation_amount: z.preprocess(preprocessNumber, z.number().min(0)).optional(),
      donation_note: z.string().optional(),
      website: z.string().optional()
    })
    .superRefine((data, ctx) => {
      const tshirtOnly = Boolean(data.tshirt_only);
      data.people.forEach((person, index) => {
        const email = typeof person?.[PRIMARY_EMAIL_KEY] === 'string' ? person[PRIMARY_EMAIL_KEY].trim() : '';
        if (index === 0 && !email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Primary contact email is required',
            path: ['people', index, PRIMARY_EMAIL_KEY]
          });
        }

        const attending = person?.[ATTENDING_KEY] !== false;
        const age = person?.[AGE_KEY];
        const hasAge = typeof age === 'number' && Number.isFinite(age);
        if (!tshirtOnly && attending && !hasAge) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Age is required for attending participants',
            path: ['people', index, AGE_KEY]
          });
        }
      });
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
        person[field.field_key] = field.field_key === TSHIRT_QUANTITY_KEY ? 0 : '';
        return;
      default:
        if (field.field_key === TSHIRT_CATEGORY_KEY) {
          person[field.field_key] = '';
          return;
        }
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
  if (!(ATTENDING_KEY in person)) {
    person[ATTENDING_KEY] = true;
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
  paypalHandle?: string | null;
  venmoHandle?: string | null;
  stripeEnabled?: boolean;
}

type PendingNavigation = { type: 'link'; href: string } | { type: 'back' } | null;

function buildPayPalLink(baseLink: string, amountCents?: number | null) {
  if (!baseLink) return '';
  if (!amountCents || amountCents <= 0) return baseLink;
  const amount = (amountCents / 100).toFixed(2);

  try {
    const url = new URL(baseLink);
    const hostname = url.hostname.toLowerCase();
    const isPayPalMe = hostname.includes('paypal.me');
    const isPayPalComMe = hostname.includes('paypal.com') && url.pathname.toLowerCase().startsWith('/paypalme/');
    if (!isPayPalMe && !isPayPalComMe) {
      return baseLink;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const userParts = isPayPalComMe ? parts.slice(1) : parts;
    if (!userParts.length) {
      return baseLink;
    }
    const last = userParts[userParts.length - 1];
    const hasAmount = /^\d+(\.\d+)?$/.test(last);
    const username = hasAmount ? userParts.slice(0, -1).join('/') : userParts.join('/');
    url.pathname = isPayPalComMe ? `/paypalme/${username}/${amount}` : `/${username}/${amount}`;
    if (!url.searchParams.has('currencyCode')) {
      url.searchParams.set('currencyCode', 'USD');
    }
    return url.toString();
  } catch (error) {
    if (baseLink.includes('paypal.me') || baseLink.includes('/paypalme/')) {
      return `${baseLink.replace(/\/+$/, '')}/${amount}`;
    }
    return baseLink;
  }
}

function normalizeHandle(handle?: string | null) {
  if (typeof handle !== 'string') return '';
  return handle.trim().replace(/^@+/, '');
}

export default function RegisterForm({
  tickets,
  questions,
  registrationFields,
  paypalHandle,
  venmoHandle,
  stripeEnabled = false
}: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const allowNavigationRef = useRef(false);
  const isDirtyRef = useRef(false);
  const personFields = useMemo(() => {
    const fields = [...registrationFields];
    const fieldKeys = new Set(fields.map((field) => field.field_key));
    DEFAULT_TSHIRT_FIELDS.forEach((field) => {
      if (!fieldKeys.has(field.field_key)) {
        fields.push(field);
      }
    });
    return fields.filter((field) => field.scope === 'person' && field.enabled).sort((a, b) => a.position - b.position);
  }, [registrationFields]);
  const personFieldMap = useMemo(
    () => new Map(personFields.map((field) => [field.field_key, field] as const)),
    [personFields]
  );
  const coreFields = useMemo(
    () =>
      personFields.filter(
        (field) =>
          ![
            PHOTO_UPLOAD_KEY,
            SHOW_NAME_KEY,
            SHOW_PHOTO_KEY,
            TSHIRT_CATEGORY_KEY,
            TSHIRT_STYLE_KEY,
            TSHIRT_SIZE_KEY,
            TSHIRT_QUANTITY_KEY
          ].includes(field.field_key)
      ),
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
        quantity: 0
      })),
    [tickets]
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError: setFieldError,
    clearErrors,
    formState: { errors, isDirty }
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tickets: defaultTickets,
      people: [createPerson()],
      photo_urls: [],
      tshirt_orders: [],
      payment_method: 'check',
      check_mailing_address_confirm: false,
      paypal_username: '',
      venmo_username: '',
      tshirt_only: false,
      donation_amount: 0,
      donation_note: '',
      website: ''
    }
  });

  const { fields: participantFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control,
    name: 'people'
  });

  const {
    fields: tshirtFields,
    append: appendTshirt,
    remove: removeTshirt
  } = useFieldArray({
    control,
    name: 'tshirt_orders'
  });

  const people = useWatch({ control, name: 'people' });
  const quantities = watch('tickets');
  const photoUrls = watch('photo_urls') as Array<string | null> | undefined;
  const tshirtOrders = useWatch({ control, name: 'tshirt_orders' });
  const tshirtOnly = useWatch({ control, name: 'tshirt_only' });
  const donationAmount = watch('donation_amount');
  const paymentMethod = useWatch({ control, name: 'payment_method' });
  const formErrorMessages = useMemo(() => getFormErrorMessages(errors, formError), [errors, formError]);
  const peopleRecords = useMemo(
    () => (Array.isArray(people) ? (people as Record<string, unknown>[]) : []),
    [people]
  );
  const attendingPeople = useMemo(() => {
    if (tshirtOnly) return [];
    return peopleRecords.filter((person) => person[ATTENDING_KEY] !== false);
  }, [peopleRecords, tshirtOnly]);
  const ageBasedTickets = useMemo(() => tickets.filter(isAgeBasedTicket), [tickets]);
  const isTshirtTicket = (ticket: Ticket) => ticket.name.toLowerCase().includes('shirt');
  const tshirtAdultTicket = useMemo(() => {
    return (
      tickets.find((ticket) => {
        if (isAgeBasedTicket(ticket)) return false;
        return isTshirtTicket(ticket) && ticket.price_cents === TSHIRT_ADULT_PRICE_CENTS;
      }) ?? null
    );
  }, [tickets]);
  const tshirtYouthTicket = useMemo(() => {
    return (
      tickets.find((ticket) => {
        if (isAgeBasedTicket(ticket)) return false;
        return isTshirtTicket(ticket) && ticket.price_cents === TSHIRT_YOUTH_PRICE_CENTS;
      }) ?? null
    );
  }, [tickets]);
  const personTicketDetails = useMemo(() => {
    return peopleRecords.map((person) => {
      const age = getParticipantAge(person);
      if (age === null) {
        return { age: null, ticket: null };
      }
      return { age, ticket: selectTicketForAge(ageBasedTickets, age) };
    });
  }, [peopleRecords, ageBasedTickets]);
  const ageTicketCounts = useMemo(() => {
    const counts = new Map<string, number>();
    ageBasedTickets.forEach((ticket) => counts.set(ticket.id, 0));
    attendingPeople.forEach((person) => {
      const age = getParticipantAge(person);
      if (age === null) return;
      const ticket = selectTicketForAge(ageBasedTickets, age);
      if (!ticket) return;
      counts.set(ticket.id, (counts.get(ticket.id) ?? 0) + 1);
    });
    return counts;
  }, [ageBasedTickets, attendingPeople]);
  const additionalTshirtTotals = useMemo(() => {
    return (tshirtOrders ?? []).reduce<TshirtTotals>(
      (acc, order) => {
        const quantity = typeof order?.quantity === 'number' ? order.quantity : Number(order?.quantity ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0) return acc;
        const category = typeof order?.category === 'string' ? order.category : 'mens';
        if (category === 'youth') {
          acc.youthQty += quantity;
          acc.youthCents += quantity * TSHIRT_YOUTH_PRICE_CENTS;
        } else {
          acc.adultQty += quantity;
          acc.adultCents += quantity * TSHIRT_ADULT_PRICE_CENTS;
        }
        return acc;
      },
      { ...EMPTY_TSHIRT_TOTALS }
    );
  }, [tshirtOrders]);
  const participantTshirtTotals = useMemo(() => {
    return peopleRecords.reduce<TshirtTotals>(
      (acc, person) => {
        const raw = person[TSHIRT_QUANTITY_KEY];
        const quantity = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
        if (!Number.isFinite(quantity) || quantity <= 0) return acc;
        const category = typeof person[TSHIRT_CATEGORY_KEY] === 'string' ? person[TSHIRT_CATEGORY_KEY] : 'mens';
        if (category === 'youth') {
          acc.youthQty += quantity;
          acc.youthCents += quantity * TSHIRT_YOUTH_PRICE_CENTS;
        } else {
          acc.adultQty += quantity;
          acc.adultCents += quantity * TSHIRT_ADULT_PRICE_CENTS;
        }
        return acc;
      },
      { ...EMPTY_TSHIRT_TOTALS }
    );
  }, [peopleRecords]);
  const additionalTshirtQuantity = additionalTshirtTotals.adultQty + additionalTshirtTotals.youthQty;
  const totalTshirtQuantity =
    additionalTshirtTotals.adultQty +
    additionalTshirtTotals.youthQty +
    participantTshirtTotals.adultQty +
    participantTshirtTotals.youthQty;
  const totalTshirtCents = additionalTshirtTotals.adultCents + additionalTshirtTotals.youthCents + participantTshirtTotals.adultCents + participantTshirtTotals.youthCents;
  const additionalTshirtTotalCents = additionalTshirtTotals.adultCents + additionalTshirtTotals.youthCents;
  const totalTshirtAdultQty = additionalTshirtTotals.adultQty + participantTshirtTotals.adultQty;
  const totalTshirtYouthQty = additionalTshirtTotals.youthQty + participantTshirtTotals.youthQty;
  const derivedTickets = useMemo(
    () =>
      tickets.map((ticket) => {
        let quantity = 0;
        if (isAgeBasedTicket(ticket)) {
          quantity = ageTicketCounts.get(ticket.id) ?? 0;
        } else if (tshirtAdultTicket && ticket.id === tshirtAdultTicket.id) {
          quantity = totalTshirtAdultQty;
        } else if (tshirtYouthTicket && ticket.id === tshirtYouthTicket.id) {
          quantity = totalTshirtYouthQty;
        }
        return { ticket_type_id: ticket.id, quantity };
      }),
    [tickets, ageTicketCounts, tshirtAdultTicket, tshirtYouthTicket, totalTshirtAdultQty, totalTshirtYouthQty]
  );
  const selectedTicketIds = useMemo(
    () => derivedTickets.filter((item) => item.quantity > 0).map((item) => item.ticket_type_id),
    [derivedTickets]
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
  const ageTicketInventoryIssues = useMemo(() => {
    return ageBasedTickets
      .map((ticket) => {
        if (typeof ticket.inventory !== 'number') return null;
        const required = ageTicketCounts.get(ticket.id) ?? 0;
        if (required <= ticket.inventory) return null;
        return {
          id: ticket.id,
          name: ticket.name,
          required,
          inventory: ticket.inventory
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; required: number; inventory: number }>;
  }, [ageBasedTickets, ageTicketCounts]);

  useEffect(() => {
    if (!derivedTickets.length) return;
    const hasDiff =
      derivedTickets.length !== quantities.length ||
      derivedTickets.some((ticket, index) => {
        const current = quantities[index];
        return (
          !current || current.ticket_type_id !== ticket.ticket_type_id || current.quantity !== ticket.quantity
        );
      });
    if (!hasDiff) return;
    setValue('tickets', derivedTickets, { shouldValidate: true, shouldDirty: false });
  }, [derivedTickets, quantities, setValue]);

  useEffect(() => {
    if (!tshirtOrders?.length) return;
    tshirtOrders.forEach((order, index) => {
      const category = order?.category ?? 'mens';
      const styles = TSHIRT_STYLES[category] ?? [];
      const sizes = category === 'youth' ? TSHIRT_SIZES.youth : TSHIRT_SIZES.adult;
      if (styles.length && !styles.includes(order?.style ?? '')) {
        setValue(`tshirt_orders.${index}.style` as const, styles[0], { shouldValidate: true, shouldDirty: true });
      }
      if (sizes.length && !sizes.includes(order?.size ?? '')) {
        setValue(`tshirt_orders.${index}.size` as const, sizes[0], { shouldValidate: true, shouldDirty: true });
      }
    });
  }, [tshirtOrders, setValue]);

  useEffect(() => {
    if (!people?.length) return;
    people.forEach((person, index) => {
      const category = typeof person?.[TSHIRT_CATEGORY_KEY] === 'string' ? person[TSHIRT_CATEGORY_KEY] : '';
      const styles = TSHIRT_STYLES[category] ?? TSHIRT_STYLES.mens;
      const sizes = category === 'youth' ? TSHIRT_SIZES.youth : TSHIRT_SIZES.adult;
      const style = typeof person?.[TSHIRT_STYLE_KEY] === 'string' ? person[TSHIRT_STYLE_KEY] : '';
      const size = typeof person?.[TSHIRT_SIZE_KEY] === 'string' ? person[TSHIRT_SIZE_KEY] : '';

      if (style && !styles.includes(style)) {
        setValue(`people.${index}.${TSHIRT_STYLE_KEY}` as const, '', { shouldValidate: true, shouldDirty: true });
      }
      if (size && !sizes.includes(size)) {
        setValue(`people.${index}.${TSHIRT_SIZE_KEY}` as const, '', { shouldValidate: true, shouldDirty: true });
      }
    });
  }, [people, setValue]);

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

    if (!file.type.startsWith('image/')) {
      setUploadErrors((prev) => ({ ...prev, [index]: 'Only image files are allowed.' }));
      setUploadingIndex(null);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [index]: 'File must be 8MB or smaller.' }));
      setUploadingIndex(null);
      return;
    }

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

  const ticketById = useMemo(() => new Map(tickets.map((ticket) => [ticket.id, ticket])), [tickets]);
  const donationCentsRaw = typeof donationAmount === 'number' ? donationAmount : Number(donationAmount ?? 0);
  const donationCents = Number.isFinite(donationCentsRaw) ? Math.max(0, Math.round(donationCentsRaw * 100)) : 0;
  const ticketTotalCents = derivedTickets.reduce((sum, item) => {
    const ticket = ticketById.get(item.ticket_type_id);
    if (!ticket || isTshirtTicket(ticket)) return sum;
    return sum + ticket.price_cents * (Number.isFinite(item.quantity) ? item.quantity : 0);
  }, 0);
  const baseTotal = ticketTotalCents + totalTshirtCents;
  const totalCents = baseTotal + donationCents;
  const hasAgeTickets = ageBasedTickets.length > 0;
  const missingAgeEntry = attendingPeople.find((person) => getParticipantAge(person) === null);
  const unmatchedAgeEntry = attendingPeople.find((person) => {
    const age = getParticipantAge(person);
    if (age === null) return false;
    return !selectTicketForAge(ageBasedTickets, age);
  });
  const isZeroBalance = totalCents === 0;
  const paypalBaseLink = useMemo(() => {
    const trimmed = normalizeHandle(paypalHandle);
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://paypal.me/${trimmed}`;
  }, [paypalHandle]);
  const paypalLink = useMemo(() => buildPayPalLink(paypalBaseLink, totalCents), [paypalBaseLink, totalCents]);
  const venmoBaseLink = useMemo(() => {
    const trimmed = normalizeHandle(venmoHandle);
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://venmo.com/${trimmed}`;
  }, [venmoHandle]);

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    setLoading(true);
    try {
      if (data.website && data.website.trim()) {
        setFormError('Unable to submit registration. Please contact the reunion team.');
        setLoading(false);
        return;
      }
      if (attendingPeople.length > 0 && !hasAgeTickets) {
        setFormError('Registration tickets are not available yet. Please check back soon.');
        setLoading(false);
        return;
      }
      if (missingAgeEntry) {
        const missingIndex = peopleRecords.findIndex((person) => person === missingAgeEntry);
        if (missingIndex >= 0) {
          setFieldError(`people.${missingIndex}.${AGE_KEY}` as const, {
            type: 'manual',
            message: 'Age is required for attending participants'
          });
        }
        setFormError('Please enter an age for every attending participant.');
        setLoading(false);
        return;
      }
      if (unmatchedAgeEntry) {
        const age = getParticipantAge(unmatchedAgeEntry as Record<string, unknown>);
        setFormError(`No ticket is configured for age ${age}. Please contact the reunion team.`);
        setLoading(false);
        return;
      }
      if (ageTicketInventoryIssues.length) {
        setFormError(
          'Not enough tickets remain to cover the age-based requirements. Please adjust participant ages or contact the reunion team.'
        );
        setLoading(false);
        return;
      }
      const derivedTicketPayload = derivedTickets.filter((item) => item.quantity > 0);
      if (!derivedTicketPayload.length && totalTshirtQuantity === 0 && donationCents === 0) {
        setFormError('Select at least one ticket.');
        setLoading(false);
        return;
      }
      const rawValues = getValues();
      const primaryContact = data.people[0] ?? {};
      const purchaserName = typeof primaryContact[PRIMARY_NAME_KEY] === 'string' ? primaryContact[PRIMARY_NAME_KEY].trim() : '';
      const purchaserEmail = typeof primaryContact[PRIMARY_EMAIL_KEY] === 'string' ? primaryContact[PRIMARY_EMAIL_KEY].trim() : '';

      if (!purchaserName || !purchaserEmail) {
        if (!purchaserName) {
          setFieldError(`people.0.${PRIMARY_NAME_KEY}` as const, {
            type: 'manual',
            message: 'Primary contact name is required'
          });
        }
        if (!purchaserEmail) {
          setFieldError(`people.0.${PRIMARY_EMAIL_KEY}` as const, {
            type: 'manual',
            message: 'Primary contact email is required'
          });
        }
        setFormError('Primary contact name and email are required.');
        setLoading(false);
        return;
      }

      if (!isZeroBalance && data.payment_method === 'paypal' && !(data.paypal_username || '').trim()) {
        setFieldError('paypal_username', {
          type: 'manual',
          message: 'PayPal username is required'
        });
        setFormError('Please enter your PayPal username so we can confirm your payment.');
        setLoading(false);
        return;
      }
      if (!isZeroBalance && data.payment_method === 'venmo' && !(data.venmo_username || '').trim()) {
        setFieldError('venmo_username', {
          type: 'manual',
          message: 'Venmo username is required'
        });
        setFormError('Please enter your Venmo username so we can confirm your payment.');
        setLoading(false);
        return;
      }
      if (!isZeroBalance && data.payment_method === 'check' && !data.check_mailing_address_confirm) {
        setFieldError('check_mailing_address_confirm', {
          type: 'manual',
          message: 'Please confirm you have the mailing address'
        });
        setFormError('Please confirm you have the check mailing address before submitting.');
        setLoading(false);
        return;
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
            const rawPerson = (rawValues as any)?.people?.[index] ?? {};
            record.attending = rawPerson[ATTENDING_KEY] !== false;
            if (typeof record.refunded !== 'boolean') {
              record.refunded = false;
            }
            return record;
          }),
          photo_urls: data.photo_urls ?? [],
          tshirt_orders: data.tshirt_orders ?? [],
          tshirt_only: data.tshirt_only ?? false,
          donation_amount: donationCents ? donationCents / 100 : 0,
          donation_note: data.donation_note || null,
          check_mailing_address_confirm: Boolean(data.check_mailing_address_confirm),
          paypal_username: data.paypal_username?.trim() || null,
          venmo_username: data.venmo_username?.trim() || null,
          [HONEYPOT_KEY]: data.website || null
        }
      );

      const payload = {
        purchaser_name: purchaserName,
        purchaser_email: purchaserEmail,
        payment_method: data.payment_method,
        tickets: derivedTicketPayload,
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
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
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

      <form
        onSubmit={(event) => {
          clearErrors();
          setFormError(null);
          return onSubmit(event);
        }}
        className="card shadow-soft backdrop-soft space-y-8 p-8"
      >
        {formErrorMessages.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700" role="alert" aria-live="polite">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-2 space-y-1">
              {formErrorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-sand-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-black">Registration Type</h2>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4" {...register('tshirt_only')} />
            <span>
              T-shirt-only order (no reunion ticket required)
              <span className="mt-1 block text-xs text-koa">
                Choose this if you&apos;re only ordering shirts or already paid for reunion tickets.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-black">Participant Information</h2>
          <p className="text-sm text-koa">
            Start with the primary contact. Add each additional person below. Required fields are marked.
          </p>
          {tshirtOnly && <p className="text-xs text-koa">T-shirt-only order selected. Reunion tickets are optional.</p>}
        </div>

        <div className="space-y-6">
          {participantFields.map((field, index) => {
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
            const ticketDetail = personTicketDetails[index];
            const tshirtCategoryValue = (people?.[index]?.[TSHIRT_CATEGORY_KEY] as string | undefined) ?? '';
            const tshirtQuantityValue = people?.[index]?.[TSHIRT_QUANTITY_KEY] as number | string | undefined;
            const tshirtStyles = TSHIRT_STYLES[tshirtCategoryValue] ?? TSHIRT_STYLES.mens;
            const tshirtSizes = tshirtCategoryValue === 'youth' ? TSHIRT_SIZES.youth : TSHIRT_SIZES.adult;

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
              const isTshirtField = fieldItem.field_key === TSHIRT_SIZE_KEY || fieldItem.field_key === TSHIRT_QUANTITY_KEY;
              const isEmailField = fieldItem.field_key === PRIMARY_EMAIL_KEY;
              const isAgeField = fieldItem.field_key === AGE_KEY;
              const baseRequired =
                !isTshirtField &&
                (ALWAYS_REQUIRED_KEYS.has(fieldItem.field_key) ||
                  fieldItem.required ||
                  (fieldItem.field_key === LINEAGE_OTHER_KEY && showLineageOther));
              const isRequired = isEmailField
                ? index === 0
                : isAgeField
                ? !tshirtOnly && people?.[index]?.[ATTENDING_KEY] !== false
                : baseRequired;
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

              if (fieldItem.field_key === ADDRESS_KEY) {
                const currentAddress = typeof people?.[index]?.[ADDRESS_KEY] === 'string' ? people[index][ADDRESS_KEY] : '';
                const parts = parseAddressParts(currentAddress);
                const updateAddressPart = (key: keyof AddressParts, value: string) => {
                  const nextAddress = formatAddressParts({ ...parts, [key]: value });
                  setValue(fieldName as any, nextAddress, { shouldValidate: true, shouldDirty: true });
                };
                return (
                  <div key={`${fieldItem.field_key}-${index}`} className="space-y-2 md:col-span-2">
                    <Label htmlFor={`person-${index}-address-street`}>
                      {fieldItem.label}
                      {isRequired && <span className="ml-2 text-xs font-semibold text-red-500">Required</span>}
                    </Label>
                    <input type="hidden" {...register(fieldName as any)} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`person-${index}-address-street`}>Street Address</Label>
                        <Input
                          id={`person-${index}-address-street`}
                          placeholder="123 Main St"
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.street}
                          onChange={(event) => updateAddressPart('street', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`person-${index}-address-line2`}>Address Line 2 (Optional)</Label>
                        <Input
                          id={`person-${index}-address-line2`}
                          placeholder="Apt, suite, unit, building, floor, etc."
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.line2}
                          onChange={(event) => updateAddressPart('line2', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`person-${index}-address-city`}>City</Label>
                        <Input
                          id={`person-${index}-address-city`}
                          placeholder="Hilo"
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.city}
                          onChange={(event) => updateAddressPart('city', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`person-${index}-address-state`}>State</Label>
                        <Input
                          id={`person-${index}-address-state`}
                          placeholder="HI"
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.state}
                          onChange={(event) => updateAddressPart('state', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`person-${index}-address-zip`}>ZIP Code</Label>
                        <Input
                          id={`person-${index}-address-zip`}
                          placeholder="96720"
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.zip}
                          onChange={(event) => updateAddressPart('zip', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`person-${index}-address-country`}>Country (Optional)</Label>
                        <Input
                          id={`person-${index}-address-country`}
                          placeholder="USA"
                          readOnly={isReadOnly}
                          className={isReadOnly ? contactClass : ''}
                          value={parts.country}
                          onChange={(event) => updateAddressPart('country', event.target.value)}
                        />
                      </div>
                    </div>
                    {fieldItem.help_text && <p className="text-xs text-koa">{fieldItem.help_text}</p>}
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
                        ? fieldItem.field_key === TSHIRT_QUANTITY_KEY
                          ? 0
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
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-koa">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        {...register(`people.${index}.${ATTENDING_KEY}` as const)}
                      />
                      Attending in person
                    </label>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          removePerson(index);
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
                </div>

                {sectionGroups.map((section) => (
                  <div key={`${section.name}-${index}`} className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-black">{section.name}</h4>
                    <div className="grid gap-6 md:grid-cols-2">{section.fields.map((fieldItem) => renderField(fieldItem))}</div>
                  </div>
                ))}

                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-black">Participant T-shirt Order</h4>
                    <p className="mono text-xs uppercase tracking-[0.2em] text-koa">
                      Adults {formatCurrency(TSHIRT_ADULT_PRICE_CENTS)} · Youth {formatCurrency(TSHIRT_YOUTH_PRICE_CENTS)}
                    </p>
                  </div>
                  <p className="text-sm text-koa">All apparel is black cotton. Women&apos;s styles are lightweight.</p>
                  <div className="grid gap-3 text-sm text-koa md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="font-semibold text-black">Men&apos;s</p>
                      <p className="mt-1">T-shirt, Long sleeve, Tank top</p>
                      <p className="mt-1">Sizes S - 5X</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="font-semibold text-black">Women&apos;s</p>
                      <p className="mt-1">V-neck, Tank top, Crew neck</p>
                      <p className="mt-1">Sizes S - 5X, lightweight fabric</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="font-semibold text-black">Youth</p>
                      <p className="mt-1">T-shirt, Long sleeve</p>
                      <p className="mt-1">Sizes Youth S - L</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`people.${index}.${TSHIRT_CATEGORY_KEY}` as const)}
                      >
                        <option value="">Select a category</option>
                        {TSHIRT_CATEGORIES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {personErrors?.[TSHIRT_CATEGORY_KEY] && (
                        <p className="text-xs text-red-500">{personErrors[TSHIRT_CATEGORY_KEY].message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`people.${index}.${TSHIRT_STYLE_KEY}` as const)}
                      >
                        <option value="">Select a style</option>
                        {tshirtStyles.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                      {personErrors?.[TSHIRT_STYLE_KEY] && (
                        <p className="text-xs text-red-500">{personErrors[TSHIRT_STYLE_KEY].message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`people.${index}.${TSHIRT_SIZE_KEY}` as const)}
                      >
                        <option value="">Select a size</option>
                        {tshirtSizes.map((size) => (
                          <option key={size} value={size}>
                            {size.startsWith('Y') ? `Youth ${size.slice(1)}` : size}
                          </option>
                        ))}
                      </select>
                      {personErrors?.[TSHIRT_SIZE_KEY] && (
                        <p className="text-xs text-red-500">{personErrors[TSHIRT_SIZE_KEY].message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        className="w-full"
                        {...register(`people.${index}.${TSHIRT_QUANTITY_KEY}` as const, { valueAsNumber: true })}
                      />
                      {personErrors?.[TSHIRT_QUANTITY_KEY] && (
                        <p className="text-xs text-red-500">{personErrors[TSHIRT_QUANTITY_KEY].message}</p>
                      )}
                    </div>
                  </div>
                  {tshirtQuantityValue && Number(tshirtQuantityValue) > 0 && (
                    <p className="text-xs text-koa">
                      Subtotal: {formatCurrency(getTshirtUnitPrice(tshirtCategoryValue) * Number(tshirtQuantityValue))}
                    </p>
                  )}
                </div>

                {(photoField || showNameField || showPhotoField) && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-black">Who&apos;s Coming Display</h4>
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
                <div className="mt-6 rounded-2xl border border-slate-200 bg-sand-50 px-5 py-4">
                  <p className="mono text-xs uppercase tracking-[0.3em] text-koa">Ticket</p>
                  {tshirtOnly ? (
                    <p className="mt-2 text-sm text-koa">T-shirt-only order selected. Reunion tickets are optional.</p>
                  ) : people?.[index]?.[ATTENDING_KEY] === false ? (
                    <p className="mt-2 text-sm text-koa">Marked as not attending. No reunion ticket required.</p>
                  ) : !ticketDetail || ticketDetail.age === null ? (
                    <p className="mt-2 text-sm text-koa">Enter an age to see the ticket type and price.</p>
                  ) : ticketDetail?.ticket ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-sand-700">
                      <p className="font-semibold text-black">{ticketDetail.ticket.name}</p>
                      <p className="font-semibold">{ticketDetail.ticket.priceFormatted}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-red-500">
                      No ticket is configured for age {ticketDetail?.age}. Please contact the reunion team.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              const nextIndex = participantFields.length;
              appendPerson(createPerson());
            }}
            disabled={participantFields.length >= 30}
          >
            Add Person
          </Button>
          <p className="text-xs text-koa">You can add up to 30 people.</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-black">Additional T-Shirt Orders</h2>
            <p className="mono text-xs uppercase tracking-[0.2em] text-koa">
              Adults {formatCurrency(TSHIRT_ADULT_PRICE_CENTS)} · Youth {formatCurrency(TSHIRT_YOUTH_PRICE_CENTS)}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-koa md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-semibold text-black">Men&apos;s</p>
              <p className="mt-1">T-shirt, Long sleeve, Tank top</p>
              <p className="mt-1">Sizes S - 5X</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-semibold text-black">Women&apos;s</p>
              <p className="mt-1">V-neck, Tank top, Crew neck</p>
              <p className="mt-1">Sizes S - 5X, lightweight fabric</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-semibold text-black">Youth</p>
              <p className="mt-1">T-shirt, Long sleeve</p>
              <p className="mt-1">Sizes Youth S - L</p>
            </div>
          </div>
          <p className="text-sm text-koa">All apparel is black cotton.</p>
          <div className="space-y-4">
            {!tshirtFields.length && <p className="text-sm text-koa">No T-shirts added yet.</p>}
            {tshirtFields.map((field, index) => {
              const order = tshirtOrders?.[index];
              const category = order?.category ?? 'mens';
              const styles = TSHIRT_STYLES[category] ?? [];
              const sizes = category === 'youth' ? TSHIRT_SIZES.youth : TSHIRT_SIZES.adult;
              const orderErrors = errors.tshirt_orders?.[index] as Record<string, any> | undefined;
              return (
                <div key={field.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`tshirt_orders.${index}.category` as const)}
                      >
                        {TSHIRT_CATEGORIES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {orderErrors?.category && <p className="text-xs text-red-500">{orderErrors.category.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`tshirt_orders.${index}.style` as const)}
                      >
                        <option value="">Select a style</option>
                        {styles.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                      {orderErrors?.style && <p className="text-xs text-red-500">{orderErrors.style.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                        {...register(`tshirt_orders.${index}.size` as const)}
                      >
                        <option value="">Select a size</option>
                        {sizes.map((size) => (
                          <option key={size} value={size}>
                            {size.startsWith('Y') ? `Youth ${size.slice(1)}` : size}
                          </option>
                        ))}
                      </select>
                      {orderErrors?.size && <p className="text-xs text-red-500">{orderErrors.size.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        className="w-full"
                        {...register(`tshirt_orders.${index}.quantity` as const, { valueAsNumber: true })}
                      />
                      {orderErrors?.quantity && <p className="text-xs text-red-500">{orderErrors.quantity.message}</p>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-koa">
                      Subtotal: {formatCurrency(getTshirtUnitPrice(order?.category) * (order?.quantity ? Number(order.quantity) : 0))}
                    </p>
                    <button type="button" className="text-xs font-semibold text-red-500 underline" onClick={() => removeTshirt(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() =>
                  appendTshirt({
                    category: 'mens',
                    style: TSHIRT_STYLES.mens[0],
                    size: TSHIRT_SIZES.adult[0],
                    quantity: 1
                  })
                }
              >
                Add T-shirt
              </Button>
              {additionalTshirtQuantity > 0 && (
                <p className="text-sm text-koa">
                  Additional T-shirt total: {formatCurrency(additionalTshirtTotalCents)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black">Payment Preference</h2>
          <p className="text-sm text-koa">
            {stripeEnabled
              ? 'Stripe payments will be collected immediately. Other methods will be recorded so we can follow up.'
              : 'We are recording your preferred payment method. No payment will be collected yet.'}
          </p>
          <div className={`grid gap-3 ${stripeEnabled ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            {stripeEnabled && (
              <label
                className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                  isZeroBalance ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                <input
                  type="radio"
                  value="stripe"
                  className="h-4 w-4"
                  disabled={isZeroBalance}
                  {...register('payment_method')}
                />
                <span>Pay with Card (Transaction Fees Apply)</span>
              </label>
            )}
            <label
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                isZeroBalance ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input type="radio" value="paypal" className="h-4 w-4" disabled={isZeroBalance} {...register('payment_method')} />
              <span>PayPal</span>
            </label>
            <label
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                isZeroBalance ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input type="radio" value="venmo" className="h-4 w-4" disabled={isZeroBalance} {...register('payment_method')} />
              <span>Venmo</span>
            </label>
            <label
              className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                isZeroBalance ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input type="radio" value="check" className="h-4 w-4" disabled={isZeroBalance} {...register('payment_method')} />
              <span>Mail-in check</span>
            </label>
          </div>
          {isZeroBalance && <p className="text-xs text-koa">No payment is required for this registration.</p>}
          {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method.message}</p>}
          {paymentMethod === 'paypal' && !isZeroBalance && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-koa">
              <p className="font-semibold text-black">Pay with PayPal</p>
              <p className="mt-1">
                We will generate your PayPal link after you submit registration.
                {!paypalBaseLink ? ' PayPal link is not configured yet.' : ''}
              </p>
              <div className="mt-3 space-y-2">
                <Label htmlFor="paypal_username">Your PayPal username</Label>
                <Input id="paypal_username" placeholder="PayPal username" {...register('paypal_username')} />
                {errors.paypal_username && <p className="text-xs text-red-500">{errors.paypal_username.message}</p>}
              </div>
              {paypalBaseLink && (
                <a
                  href={paypalLink || paypalBaseLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-brandBlue underline"
                >
                  Open PayPal link for {formatCurrency(totalCents)}
                </a>
              )}
            </div>
          )}
          {paymentMethod === 'venmo' && !isZeroBalance && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-koa">
              <p className="font-semibold text-black">Pay with Venmo</p>
              <p className="mt-1">
                Use the Venmo handle below after you submit registration.
                {!venmoBaseLink ? ' Venmo link is not configured yet.' : ''}
              </p>
              <div className="mt-3 space-y-2">
                <Label htmlFor="venmo_username">Your Venmo username</Label>
                <Input id="venmo_username" placeholder="Venmo username" {...register('venmo_username')} />
                {errors.venmo_username && <p className="text-xs text-red-500">{errors.venmo_username.message}</p>}
              </div>
              {venmoBaseLink && (
                <a href={venmoBaseLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-brandBlue underline">
                  Open Venmo profile
                </a>
              )}
            </div>
          )}
          {paymentMethod === 'check' && !isZeroBalance && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-koa">
              <p className="font-semibold text-black">Mail-in Check Instructions</p>
              <p className="mt-1">
                Amount to mail: <span className="font-semibold text-black">{formatCurrency(totalCents)}</span>
              </p>
              <p className="mt-1">
                Mailing: <span className="font-semibold text-black">{CHECK_MAILING_ADDRESS}</span>
              </p>
              <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-sand-50 px-4 py-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4" {...register('check_mailing_address_confirm')} />
                <span>I have this mailing address and will mail the check for the amount above.</span>
              </label>
              {errors.check_mailing_address_confirm && (
                <p className="mt-2 text-xs text-red-500">{errors.check_mailing_address_confirm.message}</p>
              )}
            </div>
          )}
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

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-sand-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-black">Reunion Donation (Optional)</h2>
            {donationCents > 0 && <p className="text-sm font-semibold text-koa">{formatCurrency(donationCents)}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="donation_amount">Donation Amount (USD)</Label>
              <Input
                id="donation_amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                {...register('donation_amount' as const)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="donation_note">Donation Note (Optional)</Label>
              <Input
                id="donation_note"
                placeholder="Optional note or dedication"
                {...register('donation_note')}
              />
            </div>
          </div>
          <p className="text-xs text-koa">
            Additional funds support reunion expenses and the Kekoʻolani Trust fund for Waipiʻo land stewardship.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-deep px-6 py-4 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Total</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalCents)}</p>
        </div>

        {formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</p>}

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!hasAgeTickets && !tshirtOnly}
          className="w-full"
        >
          Submit Registration
        </Button>
        <p className="rounded-2xl border border-slate-200 bg-sand-50 px-4 py-3 text-sm text-koa">
          If you require financial assistance to come to the reunion, we would like to help! Please email Jade at{' '}
          <a className="font-semibold text-brandBlue underline" href="mailto:kokua@kekoolanireunion.com">
            kokua@kekoolanireunion.com
          </a>
          . If you would like to help please donate funds, if you would like to donate in other ways, like airline miles,
          please email Jade at{' '}
          <a className="font-semibold text-brandBlue underline" href="mailto:kokua@kekoolanireunion.com">
            kokua@kekoolanireunion.com
          </a>
          .
        </p>
        <div className="sr-only" aria-hidden="true">
          <Label htmlFor={HONEYPOT_KEY}>Leave this field blank</Label>
          <Input id={HONEYPOT_KEY} autoComplete="off" tabIndex={-1} {...register(HONEYPOT_KEY)} />
        </div>
      </form>
    </div>
  );
}

function getFormErrorMessages(errors: Record<string, any>, formError?: string | null) {
  const messages: string[] = [];

  const collect = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'object') {
      if (typeof value.message === 'string') {
        messages.push(value.message);
      }
      Object.values(value).forEach(collect);
    }
  };

  collect(errors);

  if (formError) {
    messages.unshift(formError);
  }

  return Array.from(new Set(messages));
}
