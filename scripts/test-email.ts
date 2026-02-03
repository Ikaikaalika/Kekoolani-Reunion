import assert from 'node:assert/strict';
import { renderSesRawEmail, type EmailMessage } from '@/lib/email';

function asString(buffer: Buffer) {
  return buffer.toString('utf8');
}

function decodeBase64Body(raw: string, contentType: string) {
  const marker = `Content-Type: ${contentType}; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
  const start = raw.indexOf(marker);
  assert.ok(start >= 0, `missing ${contentType} marker`);
  const after = raw.slice(start + marker.length);
  const end = after.indexOf('\r\n\r\n');
  assert.ok(end >= 0, `missing terminator for ${contentType} base64`);
  const base64 = after.slice(0, end).replace(/\r?\n/g, '');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function maxLineLength(section: string) {
  return Math.max(...section.split('\r\n').map((line) => line.length));
}

function makeMessage(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    from: { name: 'Kekoʻolani Reunion', email: 'ohana@kekoolanireunion.com' },
    to: [{ name: 'Test Recipient', email: 'test@example.com' }],
    subject: 'Test Subject',
    html: '<p>Hello <strong>world</strong></p>',
    ...overrides
  };
}

// 1) multipart/alternative when no attachments
{
  const raw = asString(renderSesRawEmail(makeMessage()));
  assert.ok(raw.includes('MIME-Version: 1.0\r\n'));
  assert.ok(raw.includes('Content-Type: multipart/alternative; boundary="alt_'));
  assert.ok(raw.includes('Content-Type: text/plain; charset="UTF-8"'));
  assert.ok(raw.includes('Content-Type: text/html; charset="UTF-8"'));

  const decodedText = decodeBase64Body(raw, 'text/plain');
  assert.ok(decodedText.includes('Hello world'));

  const decodedHtml = decodeBase64Body(raw, 'text/html');
  assert.ok(decodedHtml.includes('<p>Hello'));
}

// 2) multipart/mixed when attachments exist, attachment headers present
{
  const attachmentContent = Buffer.from('pdf-bytes', 'utf8').toString('base64');
  const raw = asString(
    renderSesRawEmail(
      makeMessage({
        attachments: [{ filename: 'test.pdf', type: 'application/pdf', content: attachmentContent }]
      })
    )
  );
  assert.ok(raw.includes('Content-Type: multipart/mixed; boundary="mixed_'));
  assert.ok(raw.includes('Content-Disposition: attachment; filename="test.pdf"'));
  assert.ok(raw.includes('Content-Type: application/pdf; name="test.pdf"'));
  assert.ok(raw.includes(attachmentContent));
}

// 3) UTF-8 headers for non-ascii subject/from name
{
  const raw = asString(
    renderSesRawEmail(
      makeMessage({
        subject: 'Mahalo — Kekoʻolani',
        from: { name: 'Kekoʻolani Reunion', email: 'ohana@kekoolanireunion.com' }
      })
    )
  );
  assert.ok(raw.includes('Subject: =?UTF-8?B?'), 'expected encoded-word subject');
  assert.ok(raw.includes('From: =?UTF-8?B?'), 'expected encoded-word from name');
}

// 4) Base64 wrapping stays within 76 chars per line for attachments
{
  const large = Buffer.alloc(4096, 7).toString('base64');
  const raw = asString(
    renderSesRawEmail(
      makeMessage({
        attachments: [{ filename: 'blob.bin', type: 'application/octet-stream', content: large }]
      })
    )
  );
  const marker = 'Content-Transfer-Encoding: base64\r\n\r\n';
  const attachmentStart = raw.lastIndexOf(marker);
  assert.ok(attachmentStart >= 0, 'expected attachment base64 marker');
  const after = raw.slice(attachmentStart + marker.length);
  const end = after.indexOf('\r\n\r\n');
  assert.ok(end >= 0, 'expected end of attachment base64');
  const wrapped = after.slice(0, end);
  assert.ok(maxLineLength(wrapped) <= 76, 'expected base64 wrapped at <= 76 chars');
}

console.log('email self-test: ok');

