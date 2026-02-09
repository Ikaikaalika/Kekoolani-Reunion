import { z } from 'zod';

const EMAIL_LOCAL_PART_REGEX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const EMAIL_LABEL_REGEX = /^[A-Za-z0-9-]+$/;

const COMMON_TLD_TYPOS: Record<string, string> = {
  cim: 'com',
  ckm: 'com',
  cmm: 'com',
  cmn: 'com',
  cm: 'com',
  cmo: 'com',
  cnm: 'com',
  cpm: 'com',
  cpn: 'com',
  coml: 'com',
  comn: 'com',
  comm: 'com',
  conm: 'com',
  con: 'com',
  dom: 'com',
  fom: 'com',
  iom: 'com',
  kom: 'com',
  nom: 'com',
  om: 'com',
  rom: 'com',
  tom: 'com',
  vom: 'com',
  xom: 'com',
  met: 'net',
  nete: 'net',
  netr: 'net',
  nett: 'net',
  ney: 'net',
  nrt: 'net',
  nte: 'net',
  nt: 'net',
  ntw: 'net',
  og: 'org',
  oeg: 'org',
  ofg: 'org',
  oig: 'org',
  oirg: 'org',
  ord: 'org',
  orf: 'org',
  orgg: 'org',
  orgt: 'org',
  or: 'org',
  otg: 'org',
  prg: 'org',
  qrg: 'org',
  rrg: 'org',
  ogr: 'org'
};

type EmailValidationResult = {
  isValid: boolean;
  message?: string;
};

export function validateEmailAddress(value: unknown): EmailValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, message: 'Email is required' };
  }

  const email = value.trim().toLowerCase();
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  if (email.length > 254) {
    return { isValid: false, message: 'Email is too long' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  if (localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  if (!EMAIL_LOCAL_PART_REGEX.test(localPart)) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  if (!domain.includes('.')) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  const labels = domain.split('.');
  if (labels.some((label) => !label || label.length > 63)) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  for (const label of labels) {
    if (!EMAIL_LABEL_REGEX.test(label) || label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false, message: 'Enter a valid email address' };
    }
  }

  const tld = labels[labels.length - 1] ?? '';
  if (!/^[a-z]{2,24}$/.test(tld)) {
    return { isValid: false, message: 'Enter a valid email address' };
  }

  const tldSuggestion = COMMON_TLD_TYPOS[tld];
  if (tldSuggestion) {
    return { isValid: false, message: `Email domain looks mistyped. Did you mean .${tldSuggestion}?` };
  }

  return { isValid: true };
}

export const requiredEmailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().superRefine((value, ctx) => {
    const result = validateEmailAddress(value);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message ?? 'Enter a valid email address'
      });
    }
  })
);

export const optionalEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  },
  z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const result = validateEmailAddress(value);
      if (!result.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.message ?? 'Enter a valid email address'
        });
      }
    })
);

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
