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
    const snippet = url;
    try {
      await navigator.clipboard.writeText(snippet);
    } catch (err) {
      console.error('Unable to copy to clipboard', err);
    }
  };

  return (
    <div className="card shadow-soft space-y-4 p-6">
      <div>
        <h3 className="text-lg font-semibold text-sand-900">Upload to Gallery</h3>
        <p className="text-sm text-koa">
          Upload images to Vercel Blob storage. Uploaded URLs are automatically added to your gallery list below.
          You can also copy an image URL to reuse elsewhere.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-brandBlue/10 px-4 py-2 text-sm font-semibold text-brandBlue shadow-soft transition hover:bg-brandBlue/20">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          Choose Image
        </label>
        <Button type="button" variant="ghost" disabled>
          {isPending ? 'Uploading...' : '8MB max per image'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((item) => (
            <div key={item.pathname} className="rounded-2xl border border-sand-200 bg-sand-50 p-3 text-sm text-koa">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="break-all">
                  <p className="font-mono text-xs text-koa">{item.pathname}</p>
                  <a href={item.url} className="text-brandBlue hover:text-brandBlueDark" target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-koa">{(item.size / 1024).toFixed(1)} KB</span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => copySnippet(item.url)}>
                    Copy Image URL
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
