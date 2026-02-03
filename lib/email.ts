import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

export type EmailAttachment = {
  content: string;
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
};

export type EmailAddress = { name?: string; email: string };

export type EmailMessage = {
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

function encodeHeaderUtf8(value: string) {
  const asciiSafe = /^[\x20-\x7E]*$/.test(value);
  if (asciiSafe) return value;
  const encoded = Buffer.from(value, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

function quoteIfNeeded(value: string) {
  if (!value) return value;
  const needsQuotes = /[",<>@;]/.test(value);
  if (!needsQuotes) return value;
  return `"${value.replace(/(["\\])/g, '\\$1')}"`;
}

function formatAddress(address: EmailAddress) {
  const email = address.email.trim();
  const name = typeof address.name === 'string' ? address.name.trim() : '';
  if (!name) return email;
  return `${encodeHeaderUtf8(quoteIfNeeded(name))} <${email}>`;
}

function wrapBase64(value: string, lineLength = 76) {
  const normalized = value.replace(/\s+/g, '');
  const lines: string[] = [];
  for (let index = 0; index < normalized.length; index += lineLength) {
    lines.push(normalized.slice(index, index + lineLength));
  }
  return lines.join('\r\n');
}

function base64EncodeUtf8(value: string) {
  return wrapBase64(Buffer.from(value, 'utf8').toString('base64'));
}

function getSesClient() {
  const region = process.env.SES_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error('SES region is not configured. Set SES_REGION or AWS_REGION.');
  }
  return new SESClient({ region });
}

function buildRawEmail(message: EmailMessage) {
  const hasAttachments = Boolean(message.attachments?.length);
  const mixedBoundary = `mixed_${crypto.randomUUID()}`;
  const altBoundary = `alt_${crypto.randomUUID()}`;

  const from = formatAddress(message.from);
  const to = message.to.map(formatAddress).join(', ');
  const subject = encodeHeaderUtf8(message.subject);

  const headers: string[] = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0'
  ];

  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  } else {
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  }

  const plainText = message.text ?? message.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const textPart = [
    `Content-Type: text/plain; charset="UTF-8"`,
    'Content-Transfer-Encoding: base64',
    '',
    base64EncodeUtf8(plainText),
    ''
  ].join('\r\n');

  const htmlPart = [
    `Content-Type: text/html; charset="UTF-8"`,
    'Content-Transfer-Encoding: base64',
    '',
    base64EncodeUtf8(message.html),
    ''
  ].join('\r\n');

  const alternativeBody = [
    `--${altBoundary}`,
    textPart,
    `--${altBoundary}`,
    htmlPart,
    `--${altBoundary}--`,
    ''
  ].join('\r\n');

  const bodyLines: string[] = [];

  if (hasAttachments) {
    bodyLines.push(`--${mixedBoundary}`);
    bodyLines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    bodyLines.push('');
    bodyLines.push(alternativeBody);

    for (const attachment of message.attachments ?? []) {
      const contentType = attachment.type || 'application/octet-stream';
      const disposition = attachment.disposition ?? 'attachment';
      bodyLines.push(`--${mixedBoundary}`);
      bodyLines.push(`Content-Type: ${contentType}; name="${attachment.filename}"`);
      bodyLines.push(`Content-Disposition: ${disposition}; filename="${attachment.filename}"`);
      if (attachment.contentId) {
        bodyLines.push(`Content-ID: <${attachment.contentId}>`);
      }
      bodyLines.push('Content-Transfer-Encoding: base64');
      bodyLines.push('');
      bodyLines.push(wrapBase64(attachment.content));
      bodyLines.push('');
    }

    bodyLines.push(`--${mixedBoundary}--`);
    bodyLines.push('');
  } else {
    bodyLines.push(alternativeBody);
  }

  const raw = `${headers.join('\r\n')}\r\n\r\n${bodyLines.join('\r\n')}`;
  return Buffer.from(raw);
}

export function renderSesRawEmail(message: EmailMessage) {
  return buildRawEmail(message);
}

export async function sendSesEmail(message: EmailMessage) {
  const client = getSesClient();
  const raw = buildRawEmail(message);
  const command = new SendRawEmailCommand({
    RawMessage: { Data: raw }
  });
  return client.send(command);
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

export function buildPdfAttachmentsFromPublicAssets(files: string[], subdir = ''): EmailAttachment[] {
  if (!files.length) return [];
  const assetsDir = path.join(process.cwd(), 'public', 'assets', subdir);
  return files.map((file) => {
    const buffer = fs.readFileSync(path.join(assetsDir, file));
    return {
      content: buffer.toString('base64'),
      filename: file,
      type: 'application/pdf'
    };
  });
}

function getImageMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export function buildInlineImageAttachmentFromPublicAsset(
  filename: string,
  subdir = '',
  contentId = 'inline-image'
): EmailAttachment | null {
  try {
    const assetsDir = path.join(process.cwd(), 'public', 'assets', subdir);
    const buffer = fs.readFileSync(path.join(assetsDir, filename));
    return {
      content: buffer.toString('base64'),
      filename,
      type: getImageMimeType(filename),
      disposition: 'inline',
      contentId
    };
  } catch (error) {
    return null;
  }
}
