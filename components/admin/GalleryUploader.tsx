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

interface GalleryUploaderProps {
  onUploaded?: (item: UploadedItem) => void;
}

export default function GalleryUploader({ onUploaded }: GalleryUploaderProps) {
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
      onUploaded?.(result);
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
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Upload to Gallery</h3>
        <p className="text-sm text-slate-600">
          Upload images to Vercel Blob storage. Uploaded URLs are automatically added to your gallery list below.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-ocean-50 px-4 py-2 text-sm font-medium text-ocean-700 shadow-sm transition hover:bg-ocean-100">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          Choose Image
        </label>
        <Button type="button" variant="ghost" disabled>
          {isPending ? 'Uploading…' : '8MB max per image'}
        </Button>
      </div>
      {error && <p className="text-sm text-lava-500">{error}</p>}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((item) => (
            <div key={item.pathname} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="break-all">
                  <p className="font-mono text-xs text-slate-500">{item.pathname}</p>
                  <a href={item.url} className="text-ocean-600 hover:text-ocean-700" target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{(item.size / 1024).toFixed(1)} KB</span>
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
