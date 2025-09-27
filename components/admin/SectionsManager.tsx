'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DynamicSection, SectionType, SectionContentMap } from '@/lib/sections';
import { upsertSection, deleteSection } from '@/lib/actions/sections';

interface SectionsManagerProps {
  sections: DynamicSection[];
}

type SectionDraft<T extends SectionType = SectionType> = Omit<DynamicSection<T>, 'id'> & {
  id?: string;
  localId: string;
  isNew?: boolean;
};

type SectionContentState = {
  text: { body: string };
  photo_gallery: { images: Array<{ id: string; src: string; alt?: string | null }> };
  agenda: { items: Array<{ id: string; time: string; description: string }> };
  contact: {
    contacts: Array<{ id: string; name: string; role?: string | null; email?: string | null; phone?: string | null }>;
    note?: string | null;
  };
  faq: { faqs: Array<{ id: string; question: string; answer: string }> };
  cta: { body: string; buttonText?: string | null; buttonHref?: string | null };
  custom_html: { html: string };
};

const SECTION_TYPE_OPTIONS: Array<{ value: SectionType; label: string }> = [
  { value: 'text', label: 'Text block' },
  { value: 'photo_gallery', label: 'Photo gallery' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'contact', label: 'Contact list' },
  { value: 'faq', label: 'FAQ' },
  { value: 'cta', label: 'Call to action' },
  { value: 'custom_html', label: 'Custom HTML' }
];

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultContentForType<T extends SectionType>(type: T): SectionContentState[T] {
  switch (type) {
    case 'text':
      return { body: '' } as SectionContentState[T];
    case 'photo_gallery':
      return {
        images: [{ id: createId(), src: '', alt: '' }]
      } as SectionContentState[T];
    case 'agenda':
      return {
        items: [{ id: createId(), time: '', description: '' }]
      } as SectionContentState[T];
    case 'contact':
      return {
        contacts: [{ id: createId(), name: '', role: '', email: '', phone: '' }],
        note: ''
      } as SectionContentState[T];
    case 'faq':
      return {
        faqs: [{ id: createId(), question: '', answer: '' }]
      } as SectionContentState[T];
    case 'cta':
      return {
        body: '',
        buttonText: '',
        buttonHref: ''
      } as SectionContentState[T];
    case 'custom_html':
      return {
        html: ''
      } as SectionContentState[T];
    default:
      return { body: '' } as SectionContentState[T];
  }
}

function toContentState(section: SectionDraft): SectionContentState[SectionType] {
  switch (section.type) {
    case 'text':
      return { body: (section.content as SectionContentMap['text']).body };
    case 'photo_gallery':
      return {
        images: (section.content as SectionContentMap['photo_gallery']).images.map((item) => ({
          id: createId(),
          ...item
        }))
      };
    case 'agenda':
      return {
        items: (section.content as SectionContentMap['agenda']).items.map((item) => ({
          id: createId(),
          ...item
        }))
      };
    case 'contact':
      return {
        contacts: (section.content as SectionContentMap['contact']).contacts.map((contact) => ({
          id: createId(),
          ...contact
        })),
        note: (section.content as SectionContentMap['contact']).note ?? ''
      };
    case 'faq':
      return {
        faqs: (section.content as SectionContentMap['faq']).faqs.map((faq) => ({
          id: createId(),
          ...faq
        }))
      };
    case 'cta':
      return {
        body: (section.content as SectionContentMap['cta']).body,
        buttonText: (section.content as SectionContentMap['cta']).buttonText ?? '',
        buttonHref: (section.content as SectionContentMap['cta']).buttonHref ?? ''
      };
    case 'custom_html':
      return {
        html: (section.content as SectionContentMap['custom_html']).html
      };
    default:
      return { body: '' };
  }
}

function useSectionState(initial: SectionDraft) {
  const [type, setType] = useState<SectionType>(initial.type);
  const [title, setTitle] = useState(initial.title ?? '');
  const [position, setPosition] = useState<number>(initial.position ?? 0);
  const [published, setPublished] = useState<boolean>(initial.published);
  const [content, setContent] = useState<SectionContentState[SectionType]>(
    toContentState(initial)
  );

  const payload = useMemo(() => {
    const serializedContent = (() => {
      switch (type) {
        case 'text':
          return { body: ((content as SectionContentState['text']).body ?? '').trim() };
        case 'photo_gallery': {
          const { images } = content as SectionContentState['photo_gallery'];
          return {
            images: images
              .map((image) => ({ src: image.src.trim(), alt: image.alt?.trim() || null }))
              .filter((image) => image.src)
          };
        }
        case 'agenda': {
          const { items } = content as SectionContentState['agenda'];
          return {
            items: items
              .map((item) => ({ time: item.time.trim(), description: item.description.trim() }))
              .filter((item) => item.time || item.description)
          };
        }
        case 'contact': {
          const { contacts, note } = content as SectionContentState['contact'];
          return {
            contacts: contacts
              .map((contact) => ({
                name: contact.name.trim(),
                role: contact.role?.trim() || null,
                email: contact.email?.trim() || null,
                phone: contact.phone?.trim() || null
              }))
              .filter((contact) => contact.name),
            note: note?.trim() || null
          };
        }
        case 'faq': {
          const { faqs } = content as SectionContentState['faq'];
          return {
            faqs: faqs
              .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
              .filter((faq) => faq.question && faq.answer)
          };
        }
        case 'cta': {
          const { body, buttonText, buttonHref } = content as SectionContentState['cta'];
          return {
            body: body.trim(),
            buttonText: buttonText?.trim() || null,
            buttonHref: buttonHref?.trim() || null
          };
        }
        case 'custom_html':
          return { html: (content as SectionContentState['custom_html']).html };
        default:
          return {};
      }
    })();

    return {
      id: initial.id,
      type,
      title: title.trim() || null,
      position,
      published,
      content: serializedContent
    };
  }, [content, initial.id, position, published, title, type]);

  return {
    type,
    setType,
    title,
    setTitle,
    position,
    setPosition,
    published,
    setPublished,
    content,
    setContent,
    payload
  };
}

function SaveButton({ label = 'Save Section' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

function DangerButton({ label = 'Delete' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" loading={pending}>
      {label}
    </Button>
  );
}

function SectionEditor({ draft, onRemoveLocal }: { draft: SectionDraft; onRemoveLocal?: () => void }) {
  const state = useSectionState(draft);

  const switchType = (next: SectionType) => {
    state.setType(next);
    state.setContent(defaultContentForType(next));
  };

  const payloadString = useMemo(() => JSON.stringify(state.payload), [state.payload]);

  const renderBody = () => {
    switch (state.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              rows={6}
              value={(state.content as SectionContentState['text']).body}
              onChange={(event) =>
                state.setContent({ body: event.target.value } as SectionContentState['text'])
              }
            />
          </div>
        );
      case 'photo_gallery': {
        const gallery = state.content as SectionContentState['photo_gallery'];
        return (
          <div className="space-y-4">
            {gallery.images.map((image, index) => (
              <div key={image.id} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    value={image.src}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        images: gallery.images.map((item) =>
                          item.id === image.id ? { ...item, src: value } : item
                        )
                      }));
                    }}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alt text</Label>
                  <Input
                    value={image.alt ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        images: gallery.images.map((item) =>
                          item.id === image.id ? { ...item, alt: value } : item
                        )
                      }));
                    }}
                    placeholder="ʻOhana photo description"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      state.setContent((prev) => ({
                        images: gallery.images.filter((item) => item.id !== image.id)
                      }))
                    }
                    disabled={gallery.images.length <= 1}
                  >
                    Remove image
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                state.setContent((prev) => ({
                  images: [...(prev as SectionContentState['photo_gallery']).images, { id: createId(), src: '', alt: '' }]
                }))
              }
            >
              Add image
            </Button>
          </div>
        );
      }
      case 'agenda': {
        const agenda = state.content as SectionContentState['agenda'];
        return (
          <div className="space-y-4">
            {agenda.items.map((item) => (
              <div key={item.id} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Time / Day</Label>
                  <Input
                    value={item.time}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        items: agenda.items.map((current) =>
                          current.id === item.id ? { ...current, time: value } : current
                        )
                      }));
                    }}
                    placeholder="Friday · July 10, 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        items: agenda.items.map((current) =>
                          current.id === item.id ? { ...current, description: value } : current
                        )
                      }));
                    }}
                    placeholder="Hoʻolauna & genealogy sharing"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      state.setContent((prev) => ({
                        items: agenda.items.filter((current) => current.id !== item.id)
                      }))
                    }
                    disabled={agenda.items.length <= 1}
                  >
                    Remove item
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                state.setContent((prev) => ({
                  items: [...agenda.items, { id: createId(), time: '', description: '' }]
                }))
              }
            >
              Add agenda item
            </Button>
          </div>
        );
      }
      case 'contact': {
        const contact = state.content as SectionContentState['contact'];
        return (
          <div className="space-y-4">
            {contact.contacts.map((item) => (
              <div key={item.id} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={item.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        contacts: contact.contacts.map((current) =>
                          current.id === item.id ? { ...current, name: value } : current
                        ),
                        note: contact.note
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={item.role ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        contacts: contact.contacts.map((current) =>
                          current.id === item.id ? { ...current, role: value } : current
                        ),
                        note: contact.note
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={item.email ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        contacts: contact.contacts.map((current) =>
                          current.id === item.id ? { ...current, email: value } : current
                        ),
                        note: contact.note
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={item.phone ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      state.setContent((prev) => ({
                        contacts: contact.contacts.map((current) =>
                          current.id === item.id ? { ...current, phone: value } : current
                        ),
                        note: contact.note
                      }));
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      state.setContent((prev) => ({
                        contacts: contact.contacts.filter((current) => current.id !== item.id),
                        note: contact.note
                      }))
                    }
                    disabled={contact.contacts.length <= 1}
                  >
                    Remove contact
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                state.setContent((prev) => ({
                  contacts: [...contact.contacts, { id: createId(), name: '', role: '', email: '', phone: '' }],
                  note: contact.note
                }))
              }
            >
              Add contact
            </Button>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                rows={3}
                value={contact.note ?? ''}
                onChange={(event) =>
                  state.setContent({ contacts: contact.contacts, note: event.target.value })
                }
              />
            </div>
          </div>
        );
      }
      case 'faq': {
        const faq = state.content as SectionContentState['faq'];
        return (
          <div className="space-y-4">
            {faq.faqs.map((item) => (
              <div key={item.id} className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={item.question}
                  onChange={(event) => {
                    const value = event.target.value;
                    state.setContent((prev) => ({
                      faqs: faq.faqs.map((current) =>
                        current.id === item.id ? { ...current, question: value } : current
                      )
                    }));
                  }}
                />
                <Label>Answer</Label>
                <Textarea
                  rows={3}
                  value={item.answer}
                  onChange={(event) => {
                    const value = event.target.value;
                    state.setContent((prev) => ({
                      faqs: faq.faqs.map((current) =>
                        current.id === item.id ? { ...current, answer: value } : current
                      )
                    }));
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    state.setContent((prev) => ({
                      faqs: faq.faqs.filter((current) => current.id !== item.id)
                    }))
                  }
                  disabled={faq.faqs.length <= 1}
                >
                  Remove FAQ
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                state.setContent((prev) => ({
                  faqs: [...faq.faqs, { id: createId(), question: '', answer: '' }]
                }))
              }
            >
              Add FAQ
            </Button>
          </div>
        );
      }
      case 'cta': {
        const cta = state.content as SectionContentState['cta'];
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                rows={4}
                value={cta.body}
                onChange={(event) => state.setContent({ ...cta, body: event.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Button label</Label>
                <Input
                  value={cta.buttonText ?? ''}
                  onChange={(event) => state.setContent({ ...cta, buttonText: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Button link</Label>
                <Input
                  value={cta.buttonHref ?? ''}
                  onChange={(event) => state.setContent({ ...cta, buttonHref: event.target.value })}
                  placeholder="https://"
                />
              </div>
            </div>
          </div>
        );
      }
      case 'custom_html': {
        const custom = state.content as SectionContentState['custom_html'];
        return (
          <div className="space-y-2">
            <Label>HTML</Label>
            <Textarea
              rows={6}
              value={custom.html}
              onChange={(event) => state.setContent({ html: event.target.value })}
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form action={upsertSection} className="space-y-4">
        <input type="hidden" name="payload" value={payloadString} readOnly />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Section title</Label>
            <Input value={state.title} onChange={(event) => state.setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={state.type}
              onChange={(event) => switchType(event.target.value as SectionType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-ocean-500 focus:outline-none"
              name="type-selector"
            >
              {SECTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Input
              type="number"
              min={0}
              value={state.position}
              onChange={(event) => state.setPosition(Number(event.target.value))}
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.published}
              onChange={(event) => state.setPublished(event.target.checked)}
            />
            Visible on homepage
          </label>
        </div>

        {renderBody()}

        <div className="flex items-center justify-end">
          <SaveButton label={draft.isNew ? 'Create section' : 'Save section'} />
        </div>
      </form>
      <form
        action={draft.id ? deleteSection : async () => onRemoveLocal?.()}
        onSubmit={(event) => {
          if (!draft.id) {
            event.preventDefault();
            onRemoveLocal?.();
          }
        }}
      >
        <input type="hidden" name="id" value={draft.id ?? ''} />
        <DangerButton label={draft.id ? 'Delete section' : 'Discard'} />
      </form>
    </div>
  );
}

export default function SectionsManager({ sections }: SectionsManagerProps) {
  const [drafts, setDrafts] = useState<SectionDraft[]>(
    sections.map((section) => ({ ...section, localId: section.id }))
  );

  const addSection = () => {
    setDrafts((prev) => [
      ...prev,
      {
        localId: createId(),
        id: undefined,
        type: 'text',
        title: 'New Section',
        position: prev.length ? Math.max(...prev.map((item) => item.position)) + 1 : 0,
        published: true,
        content: { body: '' } as SectionContentMap['text'],
        isNew: true
      }
    ]);
  };

  const removeLocalDraft = (localId: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.localId !== localId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Homepage Sections</h2>
          <p className="text-sm text-slate-600">
            Arrange custom blocks to extend your landing page beyond the default content.
          </p>
        </div>
        <Button type="button" onClick={addSection}>
          Add section
        </Button>
      </div>
      <div className="space-y-6">
        {drafts.map((draft) => (
          <SectionEditor key={draft.localId} draft={draft} onRemoveLocal={() => removeLocalDraft(draft.localId)} />
        ))}
        {!drafts.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No custom sections yet. Use “Add section” to create your first block.
          </div>
        )}
      </div>
    </div>
  );
}
