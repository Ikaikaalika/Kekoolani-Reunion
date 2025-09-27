'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import GalleryUploader from '@/components/admin/GalleryUploader';
import {
  parseSchedule,
  parseExtras,
  aboutHtmlToText,
  textToAboutHtml,
  SITE_DEFAULTS,
  DEFAULT_EXTRAS,
  type ScheduleEntry,
  type GalleryItem,
  type CostItem,
  type CommitteeItem,
  type SiteExtras
} from '@/lib/siteContent';

interface ContentFormProps {
  site: {
    hero_title: string;
    hero_subtitle: string | null;
    event_dates: string | null;
    location: string | null;
    about_html: string | null;
    schedule_json: unknown;
    gallery_json: unknown;
    show_schedule: boolean;
    show_gallery: boolean;
    show_purpose: boolean;
    show_costs: boolean;
    show_logistics: boolean;
    show_committees: boolean;
  };
  action: (formData: FormData) => Promise<void>;
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2, 9)}`;
}

type ScheduleFormEntry = ScheduleEntry & { id: string };
type GalleryFormItem = GalleryItem & { id: string };
type PurposeItem = { id: string; text: string };
type LogisticsItem = { id: string; text: string };
type CostFormItem = CostItem & { id: string };
type CommitteeFormItem = CommitteeItem & { id: string };

function normalizeSchedule(entries: ScheduleEntry[]): ScheduleFormEntry[] {
  const list = entries.length ? entries : SITE_DEFAULTS.schedule;
  return list.map((entry) => ({
    id: createId(),
    time: entry.time,
    title: entry.title,
    items: entry.items ? [...entry.items] : undefined,
    description: entry.description ?? null
  }));
}

function normalizeExtras(extras: SiteExtras) {
  return {
    gallery: (extras.gallery.length ? extras.gallery : DEFAULT_EXTRAS.gallery).map((item) => ({ ...item, id: createId() })),
    purpose: (extras.purpose.length ? extras.purpose : DEFAULT_EXTRAS.purpose).map((text) => ({ id: createId(), text })),
    costs: (extras.costs.length ? extras.costs : DEFAULT_EXTRAS.costs).map((item) => ({ ...item, id: createId() })),
    logistics: (extras.logistics.length ? extras.logistics : DEFAULT_EXTRAS.logistics).map((text) => ({ id: createId(), text })),
    committees: (extras.committees.length ? extras.committees : DEFAULT_EXTRAS.committees).map((item) => ({ ...item, id: createId() }))
  };
}

function toSchedulePayload(schedule: ScheduleFormEntry[]): ScheduleEntry[] {
  return schedule
    .map(({ time, title, items, description }) => ({
      time: time.trim(),
      title: title.trim(),
      items: items?.map((item) => item.trim()).filter(Boolean),
      description: description?.trim() ?? null
    }))
    .filter((entry) => entry.time || entry.title);
}

function toExtrasPayload(params: {
  gallery: GalleryFormItem[];
  purpose: PurposeItem[];
  costs: CostFormItem[];
  logistics: LogisticsItem[];
  committees: CommitteeFormItem[];
}): SiteExtras {
  const gallery = params.gallery
    .map(({ src, alt }) => ({ src: src.trim(), alt: alt?.trim() ?? null }))
    .filter((item) => item.src);

  const purpose = params.purpose.map((item) => item.text.trim()).filter(Boolean);

  const costs = params.costs
    .map(({ label, detail }) => ({ label: label.trim(), detail: detail.trim() }))
    .filter((item) => item.label && item.detail);

  const logistics = params.logistics.map((item) => item.text.trim()).filter(Boolean);

  const committees = params.committees
    .map(({ name, leads, notes }) => ({
      name: name.trim(),
      leads: leads.trim(),
      notes: notes?.trim() ?? undefined
    }))
    .filter((item) => item.name && item.leads);

  return {
    gallery,
    purpose,
    costs,
    logistics,
    committees
  };
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

export default function ContentForm({ site, action }: ContentFormProps) {
  const initialSchedule = useMemo(() => normalizeSchedule(parseSchedule(site.schedule_json)), [site.schedule_json]);
  const initialExtras = useMemo(() => normalizeExtras(parseExtras(site.gallery_json)), [site.gallery_json]);
  const initialAbout = useMemo(() => aboutHtmlToText(site.about_html), [site.about_html]);

  const [aboutText, setAboutText] = useState(initialAbout);
  const [schedule, setSchedule] = useState<ScheduleFormEntry[]>(initialSchedule);
  const [gallery, setGallery] = useState<GalleryFormItem[]>(initialExtras.gallery);
  const [purpose, setPurpose] = useState<PurposeItem[]>(initialExtras.purpose);
  const [costs, setCosts] = useState<CostFormItem[]>(initialExtras.costs);
  const [logistics, setLogistics] = useState<LogisticsItem[]>(initialExtras.logistics);
  const [committees, setCommittees] = useState<CommitteeFormItem[]>(initialExtras.committees);
  const [isSubmitting, startTransition] = useTransition();

  const schedulePayload = useMemo(() => JSON.stringify(toSchedulePayload(schedule)), [schedule]);
  const extrasPayload = useMemo(
    () =>
      JSON.stringify(
        toExtrasPayload({
          gallery,
          purpose,
          costs,
          logistics,
          committees
        })
      ),
    [gallery, purpose, costs, logistics, committees]
  );
  const aboutHtml = useMemo(() => textToAboutHtml(aboutText), [aboutText]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
    });
  };

  const addScheduleEntry = () => {
    setSchedule((prev) => [
      ...prev,
      {
        id: createId(),
        time: '',
        title: '',
        items: ['']
      }
    ]);
  };

  const updateScheduleEntry = (id: string, updater: (entry: ScheduleFormEntry) => ScheduleFormEntry) => {
    setSchedule((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)));
  };

  const removeScheduleEntry = (id: string) => {
    setSchedule((prev) => (prev.length > 1 ? prev.filter((entry) => entry.id !== id) : prev));
  };

  const addScheduleItem = (id: string) => {
    updateScheduleEntry(id, (entry) => ({
      ...entry,
      items: [...(entry.items ?? []), '']
    }));
  };

  const updateScheduleItem = (entryId: string, itemIndex: number, value: string) => {
    updateScheduleEntry(entryId, (entry) => {
      const items = [...(entry.items ?? [])];
      items[itemIndex] = value;
      return { ...entry, items };
    });
  };

  const removeScheduleItem = (entryId: string, itemIndex: number) => {
    updateScheduleEntry(entryId, (entry) => {
      const items = [...(entry.items ?? [])];
      items.splice(itemIndex, 1);
      return { ...entry, items };
    });
  };

  const addGalleryItem = (item?: { src: string; alt?: string | null }) => {
    setGallery((prev) => [
      ...prev,
      {
        id: createId(),
        src: item?.src ?? '',
        alt: item?.alt ?? ''
      }
    ]);
  };

  const updateGalleryItem = (id: string, key: 'src' | 'alt', value: string) => {
    setGallery((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeGalleryItem = (id: string) => {
    setGallery((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const addPurposeItem = () => setPurpose((prev) => [...prev, { id: createId(), text: '' }]);
  const updatePurposeItem = (id: string, text: string) => setPurpose((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removePurposeItem = (id: string) => setPurpose((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addCostItem = () => setCosts((prev) => [...prev, { id: createId(), label: '', detail: '' }]);
  const updateCostItem = (id: string, key: 'label' | 'detail', value: string) =>
    setCosts((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const removeCostItem = (id: string) => setCosts((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addLogisticsItem = () => setLogistics((prev) => [...prev, { id: createId(), text: '' }]);
  const updateLogisticsItem = (id: string, text: string) => setLogistics((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removeLogisticsItem = (id: string) => setLogistics((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addCommitteeItem = () =>
    setCommittees((prev) => [...prev, { id: createId(), name: '', leads: '', notes: '' }]);
  const updateCommitteeItem = (id: string, key: 'name' | 'leads' | 'notes', value: string) =>
    setCommittees((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const removeCommitteeItem = (id: string) => setCommittees((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  return (
    <form action={handleSubmit} className="space-y-10">
      <input type="hidden" name="schedule_json" value={schedulePayload} />
      <input type="hidden" name="gallery_json" value={extrasPayload} />
      <input type="hidden" name="about_html" value={aboutHtml} />

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle title="Homepage Sections" description="Toggle default sections on or off. Use the Sections tab for custom layouts." />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_schedule" defaultChecked={site.show_schedule} className="h-4 w-4 rounded border-slate-300" />
            Show weekend schedule
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_gallery" defaultChecked={site.show_gallery} className="h-4 w-4 rounded border-slate-300" />
            Show photo gallery
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_purpose" defaultChecked={site.show_purpose} className="h-4 w-4 rounded border-slate-300" />
            Show reunion purpose highlights
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_costs" defaultChecked={site.show_costs} className="h-4 w-4 rounded border-slate-300" />
            Show cost outline
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_logistics" defaultChecked={site.show_logistics} className="h-4 w-4 rounded border-slate-300" />
            Show logistics notes
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="show_committees" defaultChecked={site.show_committees} className="h-4 w-4 rounded border-slate-300" />
            Show committee roster
          </label>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle title="Hero Details" description="This content appears at the top of the public page." />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input id="hero_title" name="hero_title" defaultValue={site.hero_title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
            <Input id="hero_subtitle" name="hero_subtitle" defaultValue={site.hero_subtitle ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_dates">Event Dates</Label>
            <Input id="event_dates" name="event_dates" defaultValue={site.event_dates ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Locations</Label>
            <Input id="location" name="location" defaultValue={site.location ?? ''} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aboutText">About This Reunion</Label>
          <Textarea
            id="aboutText"
            rows={6}
            value={aboutText}
            onChange={(event) => setAboutText(event.target.value)}
            placeholder="Share the purpose, history, and goals for this ʻohana gathering. Use blank lines to create new paragraphs."
          />
          <p className="text-xs text-slate-500">Paragraph breaks will be preserved; no HTML required.</p>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Weekend Schedule"
          description="Outline each day’s highlights. Add time blocks and agenda items in the order you want them displayed."
        />
        <div className="space-y-5">
          {schedule.map((entry, index) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="grid flex-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.25em] text-slate-500">Day / Time</Label>
                    <Input
                      value={entry.time}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, (current) => ({ ...current, time: event.target.value }))
                      }
                      placeholder="Friday · July 10, 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.25em] text-slate-500">Title</Label>
                    <Input
                      value={entry.title}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, (current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Hoʻolauna & ʻOhana Genealogy"
                    />
                  </div>
                </div>
                {schedule.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => removeScheduleEntry(entry.id)}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {(entry.items && entry.items.length ? entry.items : ['']).map((item, itemIndex) => (
                  <div key={`${entry.id}-item-${itemIndex}`} className="flex gap-3">
                    <Input
                      value={item}
                      onChange={(event) => updateScheduleItem(entry.id, itemIndex, event.target.value)}
                      placeholder="10:30a Genealogy sharing & keiki activities"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeScheduleItem(entry.id, itemIndex)}
                      disabled={(entry.items?.length ?? 0) <= 1 && !item}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => addScheduleItem(entry.id)}>
                  Add agenda item
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addScheduleEntry}>
          Add another day
        </Button>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Gallery & Visual Story"
          description="Add up to three images to display on the public page. Use the uploader to host new media or paste existing URLs."
        />
        <GalleryUploader
          onUploaded={(item) =>
            setGallery((prev) => [
              ...prev,
              {
                id: createId(),
                src: item.url,
                alt: ''
              }
            ])
          }
        />
        <div className="space-y-4">
          {gallery.map((item, index) => (
            <div key={item.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[2fr,2fr,auto]">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.25em] text-slate-500">Image URL</Label>
                <Input
                  value={item.src}
                  onChange={(event) => updateGalleryItem(item.id, 'src', event.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.25em] text-slate-500">Alt Text</Label>
                <Input
                  value={item.alt ?? ''}
                  onChange={(event) => updateGalleryItem(item.id, 'alt', event.target.value)}
                  placeholder="Waipiʻo Valley lookout"
                />
              </div>
              <div className="flex items-end justify-end">
                {gallery.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => removeGalleryItem(item.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={() => addGalleryItem()}>
          Add gallery slot
        </Button>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Purpose & Logistics"
          description="Keep these lists clear and friendly—what does ʻohana need to know to prepare?"
        />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Purpose statements</h4>
            <div className="space-y-3">
              {purpose.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <Input
                    value={item.text}
                    onChange={(event) => updatePurposeItem(item.id, event.target.value)}
                    placeholder="Mahalo our kūpuna for anchoring us in aloha ʻohana."
                  />
                  <Button type="button" variant="ghost" onClick={() => removePurposeItem(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addPurposeItem}>
              Add purpose point
            </Button>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900">Cost outline</h4>
            <div className="space-y-3">
              {costs.map((item) => (
                <div key={item.id} className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={item.label}
                    onChange={(event) => updateCostItem(item.id, 'label', event.target.value)}
                    placeholder="Three lunches (Fri–Sun)"
                  />
                  <div className="flex gap-3">
                    <Input
                      value={item.detail}
                      onChange={(event) => updateCostItem(item.id, 'detail', event.target.value)}
                      placeholder="$30 per person"
                    />
                    <Button type="button" variant="ghost" onClick={() => removeCostItem(item.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addCostItem}>
              Add cost line
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Logistics notes</h4>
          <div className="space-y-3">
            {logistics.map((item) => (
              <div key={item.id} className="flex gap-3">
                <Input
                  value={item.text}
                  onChange={(event) => updateLogisticsItem(item.id, event.target.value)}
                  placeholder="Off-island ʻohana to arrange airfare and lodging."
                />
                <Button type="button" variant="ghost" onClick={() => removeLogisticsItem(item.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={addLogisticsItem}>
            Add logistics note
          </Button>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="Planning Committees"
          description="Document who is leading each kōmike so ʻohana know where to kōkua."
        />
        <div className="space-y-4">
          {committees.map((item) => (
            <div key={item.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[2fr,2fr,2fr,auto]">
              <Input
                value={item.name}
                onChange={(event) => updateCommitteeItem(item.id, 'name', event.target.value)}
                placeholder="Kākau Inoa / Registration"
              />
              <Input
                value={item.leads}
                onChange={(event) => updateCommitteeItem(item.id, 'leads', event.target.value)}
                placeholder="Jade & Alika Gee"
              />
              <Input
                value={item.notes ?? ''}
                onChange={(event) => updateCommitteeItem(item.id, 'notes', event.target.value)}
                placeholder="Online form, shirt orders, payment flow"
              />
              <div className="flex items-end justify-end">
                <Button type="button" variant="ghost" onClick={() => removeCommitteeItem(item.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addCommitteeItem}>
          Add committee
        </Button>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
