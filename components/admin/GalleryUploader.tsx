'use client';

import { useState, useTransition } from 'react';
import { uploadGalleryImage } from '@/lib/actions/blob';
import { Button } from '@/components/ui/button';

type UploadResult = Awaited<ReturnType<typeof uploadGalleryImage>>;

interface UploadedItem {
  url: string;
  pathname: string;
  size: number;
}

export default function GalleryUploader() {
  const [uploads, setUploads] = useState<UploadedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setError(null);
    startTransition(async () => {
      const result: UploadResult = await uploadGalleryImage(data);
      if ('error' in result) {
        setError(result.error ?? 'Upload failed');
        return;
      }
      setError(null);
      setUploads((prev) => [...prev, result]);
    });
  };

  const copySnippet = async (url: string) => {
    const snippet = JSON.stringify({ src: url, alt: '' });
    try {
      await navigator.clipboard.writeText(snippet);
    } catch (err) {
      console.error('Unable to copy to clipboard', err);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div>
        <h3 className="text-lg font-semibold text-white">Upload to Gallery</h3>
        <p className="text-sm text-white/70">
          Upload images to Vercel Blob storage. Copy the generated snippet and paste it into the gallery JSON field.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-white/25">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          Choose Image
        </label>
        <Button type="button" variant="ghost" disabled>
          {isPending ? 'Uploading…' : '8MB max per image'}
        </Button>
      </div>
      {error && <p className="text-sm text-lava-400">{error}</p>}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((item) => (
            <div key={item.pathname} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sm text-white/80">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="break-all">
                  <p className="font-mono text-xs text-white/60">{item.pathname}</p>
                  <a href={item.url} className="text-ocean-200 hover:text-ocean-100" target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">{(item.size / 1024).toFixed(1)} KB</span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => copySnippet(item.url)}>
                    Copy JSON
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
