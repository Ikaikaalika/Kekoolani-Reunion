import fs from 'fs';
import path from 'path';

type SendPulseAttachment = {
  content: string;
  filename: string;
  type?: string;
};

type SendPulseEmail = {
  from: { name: string; email: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  text?: string;
  attachments?: SendPulseAttachment[];
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const id = process.env.SENDPULSE_API_ID;
  const secret = process.env.SENDPULSE_API_SECRET;
  if (!id || !secret) {
    throw new Error('SendPulse credentials are not configured.');
  }

  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret
    })
  });

  if (!response.ok) {
    throw new Error(`SendPulse auth failed (${response.status}).`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };
  return data.access_token;
}

export async function sendSendPulseEmail(message: SendPulseEmail) {
  const token = await getAccessToken();
  const response = await fetch('https://api.sendpulse.com/smtp/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ email: message })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendPulse send failed (${response.status}): ${body}`);
  }

  return response.json();
}

export function listPublicAssetsByExt(extensions: string[], subdir = '') {
  const assetsDir = path.join(process.cwd(), 'public', 'assets', subdir);
  const extSet = new Set(extensions.map((ext) => ext.toLowerCase()));
  try {
    return fs
      .readdirSync(assetsDir)
      .filter((file) => extSet.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    return [];
  }
}

export function buildPdfAttachmentsFromPublicAssets(files: string[], subdir = '') {
  if (!files.length) return [];
  const assetsDir = path.join(process.cwd(), 'public', 'assets', subdir);
  return files.map((file) => {
    const buffer = fs.readFileSync(path.join(assetsDir, file));
    return {
      content: buffer.toString('base64'),
      filename: file,
      type: 'application/pdf'
    } satisfies SendPulseAttachment;
  });
}
