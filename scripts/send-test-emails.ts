import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { sendEmail, shouldUseSendPulse, buildPdfAttachmentsFromPublicAssets, listPublicAssetsByExt } from '@/lib/email';

dotenv.config({ path: '.env.local' });

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const toArg = argValue('--to');
if (!toArg) {
  throw new Error('Usage: tsx scripts/send-test-emails.ts --to you@example.com');
}
const to = toArg;

const useSendPulse = shouldUseSendPulse();
const region = process.env.SES_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
if (!useSendPulse) {
  assert.ok(region, 'Missing SES_REGION (or AWS_REGION/AWS_DEFAULT_REGION).');
}

const receiptFromEmail = process.env.RECEIPT_FROM_EMAIL || 'ohana@kekoolanireunion.com';
const pdfFromEmail = process.env.PDF_FROM_EMAIL || receiptFromEmail;
const fromName = process.env.EMAIL_FROM_NAME || 'Kekoʻolani Reunion';

const emailAssetsDir = 'email';
const pdfFiles = listPublicAssetsByExt(['.pdf'], emailAssetsDir);
const pdfAttachments = buildPdfAttachmentsFromPublicAssets(pdfFiles, emailAssetsDir);

async function sendScenario(opts: {
  subject: string;
  html: string;
  text: string;
  includeAttachments?: boolean;
}) {
  await sendEmail({
    from: { name: fromName, email: pdfFromEmail },
    to: [{ email: to }],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: !useSendPulse && opts.includeAttachments && pdfAttachments.length ? pdfAttachments : undefined
  });
  console.log(`sent: ${opts.subject}`);
}

async function main() {
  console.log(`Email provider: ${useSendPulse ? 'SendPulse' : 'SES'}`);
  if (!useSendPulse) {
    console.log(`SES region: ${region}`);
  }
  console.log(`To: ${to}`);
  console.log(`From (receipt/pdf): ${receiptFromEmail} / ${pdfFromEmail}`);
  console.log(`PDF attachments found: ${pdfFiles.length}`);

  // Scenario 1: registration receipt
  await sendScenario({
    subject: 'TEST — Registration Receipt (Kekoʻolani Reunion)',
    html: `<p>Aloha Tyler,</p><p>This is a <strong>test</strong> registration receipt email.</p><p>Order ID: TEST-REG-001</p>`,
    text: `Aloha Tyler,\n\nThis is a test registration receipt email.\nOrder ID: TEST-REG-001`
  });

  // Scenario 2: thank-you (attending) with PDFs
  await sendScenario({
    subject: 'TEST — Mahalo for registering — Kekoʻolani Reunion',
    html: `<p>Aloha,</p><p>This is a <strong>test</strong> thank-you email (attending).</p>${
      pdfFiles.length
        ? `<p>Attached PDFs:</p><ul>${pdfFiles.map((file) => `<li>${file}</li>`).join('')}</ul>`
        : `<p>(No PDFs found in public/assets/email)</p>`
    }`,
    text: `Aloha,\n\nThis is a test thank-you email (attending).\n\nAttached PDFs:\n${pdfFiles.length ? pdfFiles.map((f) => `- ${f}`).join('\n') : '(none found)'}`,
    includeAttachments: true
  });

  // Scenario 3: t-shirt-only receipt (no thank-you in app logic)
  await sendScenario({
    subject: 'TEST — T-shirt Order Receipt (Kekoʻolani Reunion)',
    html: `<p>Aloha Tyler,</p><p>This is a <strong>test</strong> t-shirt-only receipt email.</p><p>Order ID: TEST-TSHIRT-001</p>`,
    text: `Aloha Tyler,\n\nThis is a test t-shirt-only receipt email.\nOrder ID: TEST-TSHIRT-001`
  });

  // Scenario 4: thank-you (not attending) with PDFs (covers alternate copy path)
  await sendScenario({
    subject: 'TEST — Mahalo for ordering a shirt — Kekoʻolani Reunion',
    html: `<p>Aloha,</p><p>This is a <strong>test</strong> thank-you email (not attending).</p>${
      pdfFiles.length
        ? `<p>Attached PDFs:</p><ul>${pdfFiles.map((file) => `<li>${file}</li>`).join('')}</ul>`
        : `<p>(No PDFs found in public/assets/email)</p>`
    }`,
    text: `Aloha,\n\nThis is a test thank-you email (not attending).\n\nAttached PDFs:\n${pdfFiles.length ? pdfFiles.map((f) => `- ${f}`).join('\n') : '(none found)'}`,
    includeAttachments: true
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
