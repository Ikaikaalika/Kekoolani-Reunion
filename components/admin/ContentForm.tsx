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
  type LodgingLink,
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
type TextItem = { id: string; text: string };
type CostFormItem = CostItem & { id: string; notesText: string };
type LodgingLinkItem = LodgingLink & { id: string };

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
  const costs = (extras.costs.length ? extras.costs : DEFAULT_EXTRAS.costs).map((item) => ({
    ...item,
    id: createId(),
    notesText: item.notes?.join('\n') ?? ''
  }));

  return {
    gallery: (extras.gallery.length ? extras.gallery : DEFAULT_EXTRAS.gallery).map((item) => ({ ...item, id: createId() })),
    costs,
    costIntro: extras.cost_intro ?? DEFAULT_EXTRAS.cost_intro ?? '',
    costTotal: extras.cost_total ?? DEFAULT_EXTRAS.cost_total ?? '',
    paypalHandle: extras.paypal_handle ?? DEFAULT_EXTRAS.paypal_handle ?? '',
    lodging: (extras.lodging.length ? extras.lodging : DEFAULT_EXTRAS.lodging).map((text) => ({ id: createId(), text })),
    lodgingLinks: (extras.lodging_links.length ? extras.lodging_links : DEFAULT_EXTRAS.lodging_links).map((item) => ({
      ...item,
      id: createId()
    })),
    lodgingHotelsHeading: extras.lodging_hotels_heading ?? DEFAULT_EXTRAS.lodging_hotels_heading ?? '',
    lodgingHotels: (extras.lodging_hotels.length ? extras.lodging_hotels : DEFAULT_EXTRAS.lodging_hotels).map((text) => ({ id: createId(), text })),
    transportation: (extras.transportation.length ? extras.transportation : DEFAULT_EXTRAS.transportation).map((text) => ({ id: createId(), text })),
    genealogy: (extras.genealogy.length ? extras.genealogy : DEFAULT_EXTRAS.genealogy).map((text) => ({ id: createId(), text })),
    genealogyImage: extras.genealogy_image ?? DEFAULT_EXTRAS.genealogy_image ?? { src: '', alt: '' }
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
  costs: CostFormItem[];
  costIntro: string;
  costTotal: string;
  paypalHandle: string;
  lodging: TextItem[];
  lodgingLinks: LodgingLinkItem[];
  lodgingHotelsHeading: string;
  lodgingHotels: TextItem[];
  transportation: TextItem[];
  genealogy: TextItem[];
  genealogyImage: GalleryItem;
}): SiteExtras {
  const gallery = params.gallery
    .map(({ src, alt }) => ({ src: src.trim(), alt: alt?.trim() ?? null }))
    .filter((item) => item.src);

  const costs = params.costs
    .map(({ label, detail, notesText }) => {
      const notes = notesText
        .split('\n')
        .map((note) => note.trim())
        .filter(Boolean);
      return {
        label: label.trim(),
        detail: detail.trim(),
        notes: notes.length ? notes : undefined
      };
    })
    .filter((item) => item.label && item.detail);

  const costIntro = params.costIntro.trim();
  const costTotal = params.costTotal.trim();
  const paypalHandle = params.paypalHandle.trim();

  const lodging = params.lodging.map((item) => item.text.trim()).filter(Boolean);
  const lodgingLinks = params.lodgingLinks
    .map(({ label, href }) => ({ label: label.trim(), href: href.trim() }))
    .filter((item) => item.label && item.href);
  const lodgingHotelsHeading = params.lodgingHotelsHeading.trim();
  const lodgingHotels = params.lodgingHotels.map((item) => item.text.trim()).filter(Boolean);
  const transportation = params.transportation.map((item) => item.text.trim()).filter(Boolean);
  const genealogy = params.genealogy.map((item) => item.text.trim()).filter(Boolean);
  const genealogyImage = params.genealogyImage?.src?.trim()
    ? { src: params.genealogyImage.src.trim(), alt: params.genealogyImage.alt?.trim() ?? null }
    : null;

  return {
    gallery,
    costs,
    cost_intro: costIntro || DEFAULT_EXTRAS.cost_intro,
    cost_total: costTotal || DEFAULT_EXTRAS.cost_total,
    paypal_handle: paypalHandle || DEFAULT_EXTRAS.paypal_handle,
    lodging,
    lodging_links: lodgingLinks,
    lodging_hotels_heading: lodgingHotelsHeading || DEFAULT_EXTRAS.lodging_hotels_heading,
    lodging_hotels: lodgingHotels,
    transportation,
    genealogy,
    genealogy_image: genealogyImage
  };
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-sand-900">{title}</h3>
      {description ? <p className="text-sm text-koa">{description}</p> : null}
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
  const [costs, setCosts] = useState<CostFormItem[]>(initialExtras.costs);
  const [costIntro, setCostIntro] = useState(initialExtras.costIntro);
  const [costTotal, setCostTotal] = useState(initialExtras.costTotal);
  const [paypalHandle, setPayPalHandle] = useState(initialExtras.paypalHandle);
  const [lodging, setLodging] = useState<TextItem[]>(initialExtras.lodging);
  const [lodgingLinks, setLodgingLinks] = useState<LodgingLinkItem[]>(initialExtras.lodgingLinks);
  const [lodgingHotelsHeading, setLodgingHotelsHeading] = useState(initialExtras.lodgingHotelsHeading);
  const [lodgingHotels, setLodgingHotels] = useState<TextItem[]>(initialExtras.lodgingHotels);
  const [transportation, setTransportation] = useState<TextItem[]>(initialExtras.transportation);
  const [genealogy, setGenealogy] = useState<TextItem[]>(initialExtras.genealogy);
  const [genealogyImage, setGenealogyImage] = useState<GalleryItem>(initialExtras.genealogyImage);
  const [isSubmitting, startTransition] = useTransition();

  const schedulePayload = useMemo(() => JSON.stringify(toSchedulePayload(schedule)), [schedule]);
  const extrasPayload = useMemo(
    () =>
      JSON.stringify(
        toExtrasPayload({
          gallery,
          costs,
          costIntro,
          costTotal,
          paypalHandle,
          lodging,
          lodgingLinks,
          lodgingHotelsHeading,
          lodgingHotels,
          transportation,
          genealogy,
          genealogyImage
        })
      ),
    [
      gallery,
      costs,
      costIntro,
      costTotal,
      paypalHandle,
      lodging,
      lodgingLinks,
      lodgingHotelsHeading,
      lodgingHotels,
      transportation,
      genealogy,
      genealogyImage
    ]
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

  const addCostItem = () => setCosts((prev) => [...prev, { id: createId(), label: '', detail: '', notesText: '' }]);
  const updateCostItem = (id: string, key: 'label' | 'detail' | 'notesText', value: string) =>
    setCosts((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const removeCostItem = (id: string) => setCosts((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addLodgingItem = () => setLodging((prev) => [...prev, { id: createId(), text: '' }]);
  const updateLodgingItem = (id: string, text: string) => setLodging((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removeLodgingItem = (id: string) => setLodging((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addLodgingLink = () => setLodgingLinks((prev) => [...prev, { id: createId(), label: '', href: '' }]);
  const updateLodgingLink = (id: string, key: 'label' | 'href', value: string) =>
    setLodgingLinks((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  const removeLodgingLink = (id: string) =>
    setLodgingLinks((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addLodgingHotel = () => setLodgingHotels((prev) => [...prev, { id: createId(), text: '' }]);
  const updateLodgingHotel = (id: string, text: string) =>
    setLodgingHotels((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removeLodgingHotel = (id: string) =>
    setLodgingHotels((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addTransportationItem = () => setTransportation((prev) => [...prev, { id: createId(), text: '' }]);
  const updateTransportationItem = (id: string, text: string) =>
    setTransportation((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removeTransportationItem = (id: string) =>
    setTransportation((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addGenealogyParagraph = () => setGenealogy((prev) => [...prev, { id: createId(), text: '' }]);
  const updateGenealogyParagraph = (id: string, text: string) =>
    setGenealogy((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  const removeGenealogyParagraph = (id: string) =>
    setGenealogy((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  return (
    <form action={handleSubmit} className="space-y-10">
      <input type="hidden" name="schedule_json" value={schedulePayload} />
      <input type="hidden" name="gallery_json" value={extrasPayload} />
      <input type="hidden" name="about_html" value={aboutHtml} />

      <section className="card shadow-soft space-y-6 p-6">
        <SectionTitle title="Homepage Sections" description="Toggle default sections on or off. Use the Sections tab for custom layouts." />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_schedule" defaultChecked={site.show_schedule} className="h-4 w-4 rounded border-sand-300" />
            Show schedule section
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_gallery" defaultChecked={site.show_gallery} className="h-4 w-4 rounded border-sand-300" />
            Show welcome carousel
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_purpose" defaultChecked={site.show_purpose} className="h-4 w-4 rounded border-sand-300" />
            Show genealogy section
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_costs" defaultChecked={site.show_costs} className="h-4 w-4 rounded border-sand-300" />
            Show cost block
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_logistics" defaultChecked={site.show_logistics} className="h-4 w-4 rounded border-sand-300" />
            Show lodging + transportation
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-koa">
            <input type="checkbox" name="show_committees" defaultChecked={site.show_committees} className="h-4 w-4 rounded border-sand-300" />
            Show registration call-to-action
          </label>
        </div>
      </section>

      <section className="card shadow-soft space-y-6 p-6">
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
          <Label htmlFor="aboutText">Welcome Message</Label>
          <Textarea
            id="aboutText"
            rows={6}
            value={aboutText}
            onChange={(event) => setAboutText(event.target.value)}
            placeholder="Share the welcome message and overview details. Use blank lines to create new paragraphs."
          />
          <p className="text-xs text-koa">Paragraph breaks will be preserved; no HTML required.</p>
        </div>
      </section>

      <section className="card shadow-soft space-y-6 p-6">
        <SectionTitle
          title="Weekend Schedule"
          description="Outline each day's highlights. Add time blocks and agenda items in the order you want them displayed."
        />
        <div className="space-y-5">
          {schedule.map((entry, index) => (
            <div key={entry.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="grid flex-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.25em] text-koa">Day / Time</Label>
                    <Input
                      value={entry.time}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, (current) => ({ ...current, time: event.target.value }))
                      }
                      placeholder="Friday - July 10, 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.25em] text-koa">Title</Label>
                    <Input
                      value={entry.title}
                      onChange={(event) =>
                        updateScheduleEntry(entry.id, (current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Welcome & Family Genealogy"
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
                      placeholder="10:30a Genealogy sharing & kids activities"
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

      <section className="card shadow-soft space-y-6 p-6">
        <SectionTitle
          title="Welcome Carousel"
          description="Manage the image carousel that sits under the welcome message. Upload new images or paste existing URLs."
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
            <div key={item.id} className="grid gap-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 md:grid-cols-[2fr,2fr,auto]">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.25em] text-koa">Image URL</Label>
                <Input
                  value={item.src}
                  onChange={(event) => updateGalleryItem(item.id, 'src', event.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.25em] text-koa">Alt Text</Label>
                <Input
                  value={item.alt ?? ''}
                  onChange={(event) => updateGalleryItem(item.id, 'alt', event.target.value)}
                  placeholder="Waipio Valley lookout"
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
          Add carousel image
        </Button>
      </section>

      <section className="card shadow-soft space-y-6 p-6">
        <SectionTitle
          title="Genealogy"
          description="Update the genealogy message and the photo placeholder shown on the homepage."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Photo URL</Label>
            <Input
              value={genealogyImage.src}
              onChange={(event) => setGenealogyImage((prev) => ({ ...prev, src: event.target.value }))}
              placeholder="/assets/NawaiandEmily.png"
            />
          </div>
          <div className="space-y-2">
            <Label>Photo Alt Text</Label>
            <Input
              value={genealogyImage.alt ?? ''}
              onChange={(event) => setGenealogyImage((prev) => ({ ...prev, alt: event.target.value }))}
              placeholder="Nawai and Emily Kekoʻolani"
            />
          </div>
        </div>
        <div className="space-y-3">
          {genealogy.map((item) => (
            <div key={item.id} className="space-y-2">
              <Textarea
                rows={3}
                value={item.text}
                onChange={(event) => updateGenealogyParagraph(item.id, event.target.value)}
                placeholder="Share the genealogy story or next steps."
              />
              <Button type="button" variant="ghost" onClick={() => removeGenealogyParagraph(item.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addGenealogyParagraph}>
          Add paragraph
        </Button>
      </section>

      <section className="card shadow-soft space-y-6 p-6">
        <SectionTitle
          title="Logistics and Planning"
          description="Manage cost, lodging, and transportation details shown on the homepage."
        />
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-sand-900">Cost</h4>
            <div className="space-y-2">
              <Label>Intro Text</Label>
              <Textarea
                rows={2}
                value={costIntro}
                onChange={(event) => setCostIntro(event.target.value)}
                placeholder="We are trying our best to keep the cost as low as possible."
              />
            </div>
            <div className="space-y-4">
              {costs.map((item) => (
                <div key={item.id} className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.25em] text-koa">Label</Label>
                      <Input
                        value={item.label}
                        onChange={(event) => updateCostItem(item.id, 'label', event.target.value)}
                        placeholder="Meals"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.25em] text-koa">Detail</Label>
                      <Input
                        value={item.detail}
                        onChange={(event) => updateCostItem(item.id, 'detail', event.target.value)}
                        placeholder="$25.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.25em] text-koa">Notes (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={item.notesText}
                      onChange={(event) => updateCostItem(item.id, 'notesText', event.target.value)}
                      placeholder="Lunch: Friday, Saturday, Sunday"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => removeCostItem(item.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addCostItem}>
              Add cost item
            </Button>
            <div className="space-y-2">
              <Label>Total Cost Text</Label>
              <Input
                value={costTotal}
                onChange={(event) => setCostTotal(event.target.value)}
                placeholder="Total cost each person: $60.00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sand-900">Payment Links</h4>
            <div className="space-y-2">
              <Label htmlFor="paypal_handle">PayPal Handle</Label>
              <Input
                id="paypal_handle"
                value={paypalHandle}
                onChange={(event) => setPayPalHandle(event.target.value)}
                placeholder="yourname"
              />
              <p className="text-xs text-koa">Use your PayPal.me handle (no https://). Example: <span className="font-semibold">kekoolani</span>.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sand-900">Lodging</h4>
            <p className="text-sm text-koa">The first paragraph appears above the links; additional paragraphs appear below.</p>
            <div className="space-y-3">
              {lodging.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Textarea
                    rows={2}
                    value={item.text}
                    onChange={(event) => updateLodgingItem(item.id, event.target.value)}
                    placeholder="Hotel: Hilo Hawaiian Hotel has offered us a group rate."
                  />
                  <Button type="button" variant="ghost" onClick={() => removeLodgingItem(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addLodgingItem}>
              Add lodging paragraph
            </Button>
            <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
              <h5 className="font-semibold text-sand-900">Lodging Links</h5>
              <div className="space-y-3">
                {lodgingLinks.map((link) => (
                  <div key={link.id} className="grid gap-3 md:grid-cols-[2fr,2fr,auto]">
                    <Input
                      value={link.label}
                      onChange={(event) => updateLodgingLink(link.id, 'label', event.target.value)}
                      placeholder="Information for Hilo Hawaiian Hotel group rate"
                    />
                    <Input
                      value={link.href}
                      onChange={(event) => updateLodgingLink(link.id, 'href', event.target.value)}
                      placeholder="https://"
                    />
                    <Button type="button" variant="ghost" onClick={() => removeLodgingLink(link.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={addLodgingLink}>
                Add lodging link
              </Button>
            </div>
            <div className="space-y-3">
              <Label>Hotel List Heading</Label>
              <Input
                value={lodgingHotelsHeading}
                onChange={(event) => setLodgingHotelsHeading(event.target.value)}
                placeholder="We also have other hotels in Hilo:"
              />
              <div className="space-y-2">
                {lodgingHotels.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Input
                      value={item.text}
                      onChange={(event) => updateLodgingHotel(item.id, event.target.value)}
                      placeholder="Grand Nani Loa"
                    />
                    <Button type="button" variant="ghost" onClick={() => removeLodgingHotel(item.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={addLodgingHotel}>
                Add hotel
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sand-900">Transportation</h4>
            <div className="space-y-3">
              {transportation.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Textarea
                    rows={2}
                    value={item.text}
                    onChange={(event) => updateTransportationItem(item.id, event.target.value)}
                    placeholder="Transportation from the Waipiʻo lookout into the valley will be provided."
                  />
                  <Button type="button" variant="ghost" onClick={() => removeTransportationItem(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addTransportationItem}>
              Add transportation note
            </Button>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
