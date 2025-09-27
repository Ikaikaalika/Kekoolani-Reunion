'use client';

import { useFormStatus } from 'react-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContentFormProps {
  site: {
    hero_title: string;
    hero_subtitle: string | null;
    event_dates: string | null;
    location: string | null;
    about_html: string | null;
    schedule_json: any;
    gallery_json: any;
  };
  action: (formData: FormData) => Promise<void>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Changes
    </Button>
  );
}

export default function ContentForm({ site, action }: ContentFormProps) {
  const schedule = useMemo(() => JSON.stringify(site.schedule_json ?? [], null, 2), [site.schedule_json]);
  const gallery = useMemo(() => JSON.stringify(site.gallery_json ?? [], null, 2), [site.gallery_json]);

  return (
    <form action={action} className="space-y-6">
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
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={site.location ?? ''} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="about_html">About (HTML)</Label>
        <Textarea id="about_html" name="about_html" rows={6} defaultValue={site.about_html ?? ''} />
        <p className="text-xs text-white/60">Accepts HTML for rich formatting.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="schedule_json">Schedule (JSON)</Label>
          <Textarea id="schedule_json" name="schedule_json" rows={10} defaultValue={schedule} className="font-mono text-xs" />
          <p className="text-xs text-white/60">Array of objects: time, title, description.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gallery_json">Gallery (JSON)</Label>
          <Textarea id="gallery_json" name="gallery_json" rows={10} defaultValue={gallery} className="font-mono text-xs" />
          <p className="text-xs text-white/60">Array of objects: src, alt.</p>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
