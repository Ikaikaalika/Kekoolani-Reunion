'use server';

import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { requireAdmin } from './requireAdmin';

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadGalleryImage(formData: FormData) {
  await requireAdmin();
  if (!blobToken) {
    return { error: 'Blob storage is not configured' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed' };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { error: 'File must be 8MB or smaller' };
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const objectName = `gallery/${new Date().getFullYear()}/${randomUUID()}.${safeExtension}`;

  try {
    const blob = await put(objectName, file, {
      access: 'public',
      addRandomSuffix: false,
      token: blobToken,
      contentType: file.type || 'application/octet-stream'
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: file.size
    };
  } catch (error) {
    console.error('[uploadGalleryImage]', error);
    return { error: 'Unable to upload image. Please try again.' };
  }
}

export async function uploadRegistrationImage(formData: FormData) {
  if (!blobToken) {
    return { error: 'Blob storage is not configured' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed' };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { error: 'File must be 8MB or smaller' };
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const objectName = `registrations/${new Date().getFullYear()}/${randomUUID()}.${safeExtension}`;

  try {
    const blob = await put(objectName, file, {
      access: 'public',
      addRandomSuffix: false,
      token: blobToken,
      contentType: file.type || 'application/octet-stream'
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: file.size
    };
  } catch (error) {
    console.error('[uploadRegistrationImage]', error);
    return { error: 'Unable to upload image. Please try again.' };
  }
}
