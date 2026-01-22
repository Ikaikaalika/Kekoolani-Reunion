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

const personSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required'),
    age: z.string().min(1, 'Age is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    lineage: z.string().min(1, 'Select a lineage'),
    lineage_other: z.string().optional(),
    attendance_days: z.array(z.string()).min(1, 'Select at least one day'),
    tshirt_size: z.string().min(1, 'Select a T-shirt size'),
    tshirt_quantity: z.coerce.number().int().min(1, 'Enter a quantity'),
    email: z.string().email('Email is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Mailing address is required'),
    same_contact: z.boolean().optional(),
    show_name: z.boolean().default(true),
    show_photo: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    if (data.lineage === 'Other / Not listed' && !data.lineage_other?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please share your lineage details',
        path: ['lineage_other']
      });
    }
    if (!data.show_name && !data.show_photo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select name or photo for the Who's Coming section",
        path: ['show_name']
      });
    }
  });

type PersonForm = z.infer<typeof personSchema>;

const formSchema = z.object({
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

const LINEAGE_OPTIONS = ['Nawai', 'Katherine', 'Amy', 'Charles', 'Myra', 'Winifred', 'Henry', 'Royden', 'Other / Not listed'];

const PARTICIPATION_DAYS = [
  { value: 'Friday', label: 'Friday (July 10)' },
  { value: 'Saturday', label: 'Saturday (July 11)' },
  { value: 'Sunday', label: 'Sunday (July 12)' }
];

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const createEmptyPerson = (): PersonForm => ({
  full_name: '',
  age: '',
  relationship: '',
  lineage: '',
  lineage_other: '',
  attendance_days: [],
  tshirt_size: '',
  tshirt_quantity: 1,
  email: '',
  phone: '',
  address: '',
  same_contact: false,
  show_name: true,
  show_photo: false
});

interface RegisterFormProps {
  tickets: Ticket[];
  questions: Question[];
  presetTicket?: string;
}

type PendingNavigation = { type: 'link'; href: string } | { type: 'back' } | null;

export default function RegisterForm({ tickets, questions, presetTicket }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const allowNavigationRef = useRef(false);
  const isDirtyRef = useRef(false);

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
      people: [createEmptyPerson()],
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

    people?.forEach((person, index) => {
      if (index === 0) return;
      if (!person?.same_contact) return;

      const updates: Array<{ field: keyof PersonForm; value: string }> = [
        { field: 'email', value: primary.email || '' },
        { field: 'phone', value: primary.phone || '' },
        { field: 'address', value: primary.address || '' }
      ];

      updates.forEach(({ field, value }) => {
        const currentValue = person[field] as string | undefined;
        if (currentValue !== value) {
          setValue(`people.${index}.${field}`, value, { shouldValidate: true, shouldDirty: true });
        }
      });
    });
  }, [people, setValue]);

  useEffect(() => {
    if (!people?.length) return;
    people.forEach((person, index) => {
      const hasPhoto = Boolean(photoUrls?.[index]);
      if (!hasPhoto && person?.show_photo) {
        setValue(`people.${index}.show_photo`, false, { shouldValidate: true, shouldDirty: true });
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
      const primaryContact = data.people[0];
      const answers = questions.reduce<Record<string, unknown>>(
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
          people: data.people.map((person) => ({
            full_name: person.full_name,
            age: person.age,
            relationship: person.relationship,
            lineage: person.lineage,
            lineage_other: person.lineage_other || null,
            attendance_days: person.attendance_days ?? [],
            tshirt_size: person.tshirt_size,
            tshirt_quantity: person.tshirt_quantity,
            email: person.email,
            phone: person.phone,
            address: person.address,
            same_contact: person.same_contact ?? false,
            show_name: person.show_name ?? true,
            show_photo: person.show_photo ?? false
          })),
          photo_urls: data.photo_urls ?? [],
          donation_note: data.donation_note || null
        }
      );

      const payload = {
        purchaser_name: primaryContact.full_name,
        purchaser_email: primaryContact.email,
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
            Start with the primary contact. Add each additional person below. All fields are required.
          </p>
        </div>

        <div className="space-y-6">
          {fields.map((field, index) => {
            const personErrors = errors.people?.[index];
            const sameContact = Boolean(people?.[index]?.same_contact);
            const personLabel = index === 0 ? 'Primary Contact' : `Participant ${index + 1}`;
            const contactClass = sameContact ? 'bg-slate-100 text-slate-500' : '';
            const hasPhoto = Boolean(photoUrls?.[index]);
            const showPhotoDisabled = !hasPhoto;

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

                {index > 0 && (
                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4" {...register(`people.${index}.same_contact`)} />
                    <span>Use primary contact information (email, phone, mailing address).</span>
                  </label>
                )}

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-full-name`}>Full Name (Last, First, Middle)</Label>
                    <Input
                      id={`person-${index}-full-name`}
                      placeholder="Last, First Middle"
                      {...register(`people.${index}.full_name`)}
                    />
                    {personErrors?.full_name && (
                      <p className="text-xs text-red-500">{personErrors.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-age`}>Age</Label>
                    <Input
                      id={`person-${index}-age`}
                      type="number"
                      min={0}
                      placeholder="Age"
                      {...register(`people.${index}.age`)}
                    />
                    {personErrors?.age && <p className="text-xs text-red-500">{personErrors.age.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-relationship`}>Relationship to Nawai & Emily</Label>
                    <Input
                      id={`person-${index}-relationship`}
                      placeholder="Grandchild, great-grandchild, etc."
                      {...register(`people.${index}.relationship`)}
                    />
                    {personErrors?.relationship && (
                      <p className="text-xs text-red-500">{personErrors.relationship.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-lineage`}>Lineage (Parent/Grandparent Line)</Label>
                    <select
                      id={`person-${index}-lineage`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                      {...register(`people.${index}.lineage`)}
                    >
                      <option value="">Select a lineage</option>
                      {LINEAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {personErrors?.lineage && (
                      <p className="text-xs text-red-500">{personErrors.lineage.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`person-${index}-lineage-other`}>Lineage (if Other)</Label>
                    <Input
                      id={`person-${index}-lineage-other`}
                      placeholder="Share your lineage details"
                      {...register(`people.${index}.lineage_other`)}
                    />
                    {personErrors?.lineage_other && (
                      <p className="text-xs text-red-500">{personErrors.lineage_other.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Label>Days of Participation</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PARTICIPATION_DAYS.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          value={day.value}
                          className="h-4 w-4"
                          {...register(`people.${index}.attendance_days`)}
                        />
                        <span>{day.label}</span>
                      </label>
                    ))}
                  </div>
                  {personErrors?.attendance_days && (
                    <p className="text-xs text-red-500">{personErrors.attendance_days.message}</p>
                  )}
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-tshirt-size`}>T-shirt Size</Label>
                    <select
                      id={`person-${index}-tshirt-size`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40"
                      {...register(`people.${index}.tshirt_size`)}
                    >
                      <option value="">Select a size</option>
                      {TSHIRT_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    {personErrors?.tshirt_size && (
                      <p className="text-xs text-red-500">{personErrors.tshirt_size.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`person-${index}-tshirt-quantity`}>T-shirt Quantity</Label>
                    <Input
                      id={`person-${index}-tshirt-quantity`}
                      type="number"
                      min={1}
                      {...register(`people.${index}.tshirt_quantity`, { valueAsNumber: true })}
                    />
                    {personErrors?.tshirt_quantity && (
                      <p className="text-xs text-red-500">{personErrors.tshirt_quantity.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-black">Contact Information</h4>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`person-${index}-email`}>Email</Label>
                      <Input
                        id={`person-${index}-email`}
                        type="email"
                        placeholder="ohana@kekoolani.com"
                        readOnly={sameContact}
                        className={contactClass}
                        {...register(`people.${index}.email`)}
                      />
                      {personErrors?.email && <p className="text-xs text-red-500">{personErrors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`person-${index}-phone`}>Phone</Label>
                      <Input
                        id={`person-${index}-phone`}
                        placeholder="808-555-1234"
                        readOnly={sameContact}
                        className={contactClass}
                        {...register(`people.${index}.phone`)}
                      />
                      {personErrors?.phone && <p className="text-xs text-red-500">{personErrors.phone.message}</p>}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`person-${index}-address`}>Mailing Address</Label>
                    <Textarea
                      id={`person-${index}-address`}
                      rows={3}
                      placeholder="Street, City, State, Zip"
                      readOnly={sameContact}
                      className={contactClass}
                      {...register(`people.${index}.address`)}
                    />
                    {personErrors?.address && (
                      <p className="text-xs text-red-500">{personErrors.address.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-black">Participant Photo</h4>
                  <p className="mt-1 text-xs text-koa">Upload one photo for this participant.</p>
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {photoUrls?.[index] ? (
                        <img src={photoUrls[index] ?? ''} alt={`${personLabel} photo`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No photo</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-brandBlue/10 px-4 py-2 text-sm font-medium text-brandBlue shadow-sm transition hover:bg-brandBlue/20">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingIndex === index}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (!file) return;
                            handlePhotoUpload(index, file);
                            event.currentTarget.value = '';
                          }}
                        />
                        {photoUrls?.[index] ? 'Replace photo' : 'Upload photo'}
                      </label>
                      {photoUrls?.[index] && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-500 underline"
                          onClick={() => updatePhotoUrl(index, null)}
                        >
                          Remove photo
                        </button>
                      )}
                      <span className="text-xs text-koa">{uploadingIndex === index ? 'Uploading...' : '8MB max'}</span>
                    </div>
                  </div>
                  {uploadErrors[index] && <p className="mt-2 text-xs text-red-500">{uploadErrors[index]}</p>}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-black">Who&apos;s Coming Display</h4>
                  <p className="mt-1 text-xs text-koa">
                    Choose how this participant appears on the Who&apos;s Coming section of the homepage.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input type="checkbox" className="h-4 w-4" {...register(`people.${index}.show_name`)} />
                      <span>Show name</span>
                    </label>
                    <label
                      className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ${
                        showPhotoDisabled ? 'cursor-not-allowed text-slate-400 opacity-60' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={showPhotoDisabled}
                        {...register(`people.${index}.show_photo`)}
                      />
                      <span>Show photo</span>
                    </label>
                  </div>
                  {showPhotoDisabled && (
                    <p className="mt-2 text-xs text-koa">Upload a photo above to enable the photo option.</p>
                  )}
                  {personErrors?.show_name && (
                    <p className="mt-2 text-xs text-red-500">{personErrors.show_name.message}</p>
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
            onClick={() => append(createEmptyPerson())}
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
          Submit Registration
        </Button>
      </form>
    </div>
  );
}
