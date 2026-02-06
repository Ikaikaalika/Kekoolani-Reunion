import assert from 'node:assert/strict';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendEmail, shouldUseSendPulse, listPublicAssetsByExt } from '@/lib/email';

dotenv.config({ path: '.env.local' });

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return `https://${trimmed.replace(/\/+$/, '')}`;
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

const baseUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL || '') ||
  'http://localhost:3000';

const emailAssetsDir = 'email';
const pdfFiles = listPublicAssetsByExt(['.pdf'], emailAssetsDir);
const genealogyPageUrl = `${baseUrl.replace(/\/$/, '')}/#genealogy`;
const pdfLinksHtml = pdfFiles.length
  ? `<p><strong>Family record PDFs:</strong> <a href="${genealogyPageUrl}">View the genealogy section</a>.</p>`
  : '';
const pdfLinksText = pdfFiles.length ? `Family record PDFs: ${genealogyPageUrl}` : '';
const jadeImageUrl = `${baseUrl}/assets/${emailAssetsDir}/Jade.jpeg`;

const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_JWT_SECRET || '';
const buildUnsubscribeToken = (email: string) =>
  crypto.createHmac('sha256', unsubscribeSecret).update(email).digest('hex');
const buildUnsubscribeLink = (email: string) =>
  unsubscribeSecret ? `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${buildUnsubscribeToken(email)}` : '';
const buildUnsubscribeHtml = (email?: string | null) => {
  if (!email) {
    return '<p>If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.</p>';
  }
  const link = buildUnsubscribeLink(email);
  return link
    ? `<p>If you would like to opt out of reunion emails, please click <a href="${link}">unsubscribe</a> or email kokua@kekoolanireunion.com.</p>`
    : '<p>If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.</p>';
};
const buildUnsubscribeText = (email?: string | null) => {
  if (!email) {
    return 'If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.';
  }
  const link = buildUnsubscribeLink(email);
  return link
    ? `If you would like to opt out of reunion emails, please unsubscribe here: ${link} or email kokua@kekoolanireunion.com.`
    : 'If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.';
};

const formatCurrency = (valueCents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valueCents / 100);

const orderId = `TEST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`;
const paymentMethod = 'paypal';
const donationCents = 5000;

const people = [
  {
    full_name: 'Tyler Gee',
    attending: true,
    tshirt_quantity: 1,
    tshirt_category: 'mens',
    tshirt_style: 'crew',
    tshirt_size: 'L'
  },
  {
    full_name: 'Keiki Guest',
    attending: true,
    tshirt_quantity: 1,
    tshirt_category: 'youth',
    tshirt_style: 'crew',
    tshirt_size: 'M'
  }
];

const tshirtOrders = [
  {
    category: 'womens',
    style: 'v-neck',
    size: 'M',
    quantity: 1
  }
];

const orderItems = [
  { name: 'Adult Ticket (18+)', quantity: 2, unit_amount: 15000 },
  { name: 'Keiki Ticket (6-17)', quantity: 1, unit_amount: 7500 },
  { name: 'Reunion T-Shirt (Adult)', quantity: 2, unit_amount: 2500 },
  { name: 'Reunion T-Shirt (Youth)', quantity: 1, unit_amount: 1500 }
];

const totalCents =
  orderItems.reduce((sum, item) => sum + item.quantity * item.unit_amount, 0) + donationCents;
const formattedTotal = formatCurrency(totalCents);

const attendingPeople = people.filter((person) => person.attending);
const allNotAttending = attendingPeople.length === 0;
const tshirtOnly = false;

const tshirtLineItems: string[] = [];
people.forEach((person) => {
  const quantityRaw = person.tshirt_quantity;
  const quantity = typeof quantityRaw === 'number' ? quantityRaw : typeof quantityRaw === 'string' ? Number(quantityRaw) : 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  const name = typeof person.full_name === 'string' ? person.full_name : 'Participant';
  const category = typeof person.tshirt_category === 'string' ? person.tshirt_category : 'mens';
  const style = typeof person.tshirt_style === 'string' ? person.tshirt_style : '';
  const size = typeof person.tshirt_size === 'string' ? person.tshirt_size : '';
  const label = `${name} — ${category}${style ? ` ${style}` : ''}${size ? ` (${size})` : ''} × ${quantity}`;
  tshirtLineItems.push(label);
});

tshirtOrders.forEach((order) => {
  const quantityRaw = order?.quantity;
  const quantity = typeof quantityRaw === 'number' ? quantityRaw : typeof quantityRaw === 'string' ? Number(quantityRaw) : 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  const category = typeof order?.category === 'string' ? order.category : 'mens';
  const style = typeof order?.style === 'string' ? order.style : '';
  const size = typeof order?.size === 'string' ? order.size : '';
  const label = `Additional — ${category}${style ? ` ${style}` : ''}${size ? ` (${size})` : ''} × ${quantity}`;
  tshirtLineItems.push(label);
});

const tshirtListHtml = tshirtLineItems.length
  ? `<ul>${tshirtLineItems.map((line) => `<li>${line}</li>`).join('')}</ul>`
  : '<p>No T-shirt items listed.</p>';
const tshirtListText = tshirtLineItems.length ? tshirtLineItems.map((line) => `- ${line}`).join('\n') : 'No T-shirt items listed.';

const ticketSummary = orderItems.length ? orderItems.map((item) => `${item.quantity} × ${item.name}`).join('; ') : 'No tickets selected.';
const donationLine = donationCents > 0 ? `Donation: ${formatCurrency(donationCents)}` : '';
const orderSummaryHtml = `
<p><strong>Order details:</strong></p>
<ul>
  <li>Tickets: ${ticketSummary}</li>
  ${donationCents > 0 ? `<li>${donationLine}</li>` : ''}
  <li>Total attendees: ${attendingPeople.length}</li>
</ul>`;
const orderSummaryText = [
  'Order details:',
  `Tickets: ${ticketSummary}`,
  donationCents > 0 ? donationLine : '',
  `Total attendees: ${attendingPeople.length}`
]
  .filter(Boolean)
  .join('\n');

const orderLineItems = orderItems.map((item) => {
  const lineTotal = item.unit_amount * item.quantity;
  return {
    label: item.name,
    quantity: item.quantity,
    unit: formatCurrency(item.unit_amount),
    total: formatCurrency(lineTotal)
  };
});
const orderLineItemsHtml = orderLineItems.length
  ? `<ul>${orderLineItems.map((item) => `<li>${item.label} — ${item.quantity} × ${item.unit} = ${item.total}</li>`).join('')}</ul>`
  : '<p>No ticket or shirt line items.</p>';
const orderLineItemsText = orderLineItems.length
  ? orderLineItems.map((item) => `- ${item.label}: ${item.quantity} × ${item.unit} = ${item.total}`).join('\n')
  : 'No ticket or shirt line items.';

async function main() {
  console.log(`Email provider: ${useSendPulse ? 'SendPulse' : 'SES'}`);
  if (!useSendPulse) {
    console.log(`SES region: ${region}`);
  }
  console.log(`To: ${to}`);
  console.log(`From (receipt/pdf): ${receiptFromEmail} / ${pdfFromEmail}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`PDF links found: ${pdfFiles.length}`);

  const unsubscribeHtml = buildUnsubscribeHtml(to);
  const unsubscribeText = buildUnsubscribeText(to);

  const receiptSubject = 'Kekoʻolani Reunion Registration Receipt';
  const receiptHtml = `<p>Aloha Tyler,</p>
<p>Mahalo for registering for the Kekoʻolani Family Reunion.</p>
<p><strong>Order ID:</strong> ${orderId}<br/>
<strong>Total:</strong> ${formattedTotal}<br/>
<strong>Payment method:</strong> ${paymentMethod}</p>
<p><strong>Line items:</strong></p>
${orderLineItemsHtml}
${tshirtLineItems.length ? `<p><strong>Shirt order details:</strong></p>${tshirtListHtml}` : ''}
${orderSummaryHtml}
<p>We will follow up with any next steps as we get closer to the event.</p>
${unsubscribeHtml}
${pdfLinksHtml}
<p>Me ka haʻahaʻa,<br/>Kekoʻolani Reunion Team</p>`;
  const receiptText = `Aloha Tyler,\n\nMahalo for registering for the Kekoʻolani Family Reunion.\nOrder ID: ${orderId}\nTotal: ${formattedTotal}\nPayment method: ${paymentMethod}\n\nLine items:\n${orderLineItemsText}\n\n${tshirtLineItems.length ? `Shirt order details:\n${tshirtListText}\n\n` : ''}${orderSummaryText}\n\n${unsubscribeText}\n\n${pdfLinksText}\n\nMe ka haʻahaʻa,\nKekoʻolani Reunion Team`;

  await sendEmail({
    from: { name: fromName, email: receiptFromEmail },
    to: [{ email: to, name: 'Tyler Gee' }],
    subject: receiptSubject,
    html: receiptHtml,
    text: receiptText
  });
  console.log(`sent: ${receiptSubject}`);

  if (!tshirtOnly) {
    const thankYouSubject = allNotAttending
      ? 'Mahalo for ordering a shirt — Kekoʻolani Reunion'
      : 'Mahalo for registering — Kekoʻolani Reunion';
    const thankYouHtml = allNotAttending
      ? `<p>Aloha,</p>
<p>We will miss you at the reunion. Mahalo for ordering a shirt. Even if you do not plan to attend the reunion, could you please complete the family group record to keep our records updated. Please let me know if you have any questions.</p>
${pdfLinksHtml}
${unsubscribeHtml}
<p>Me ke aloha nui,</p>
<p>Jade Pumehana Silva</p>
<p><img src="${jadeImageUrl}" alt="Jade Pumehana Silva" style="max-width:240px; border-radius:12px;" /></p>`
      : `<p>Aloha,</p>
<p>Mahalo for registering to attend E hoʻi ka piko, our Kekoʻolani Reunion 2026! I am looking forward to our time together. In preparation for our reunion, could you please help update our family records by completing the family group record at the link below. If you have any questions, please let me know.</p>
${pdfLinksHtml}
${unsubscribeHtml}
<p>Me ke aloha nui,</p>
<p>Jade Pumehana Silva</p>
<p><img src="${jadeImageUrl}" alt="Jade Pumehana Silva" style="max-width:240px; border-radius:12px;" /></p>`;
    const thankYouText = allNotAttending
      ? `Aloha,\n\nWe will miss you at the reunion. Mahalo for ordering a shirt. Even if you do not plan to attend the reunion, could you please complete the family group record to keep our records updated. Please let me know if you have any questions.\n\n${pdfLinksText}\n\n${unsubscribeText}\n\nMe ke aloha nui,\nJade Pumehana Silva`
      : `Aloha,\n\nMahalo for registering to attend E hoʻi ka piko, our Kekoʻolani Reunion 2026! I am looking forward to our time together. In preparation for our reunion, could you please help update our family records by completing the family group record at the link below. If you have any questions, please let me know.\n\n${pdfLinksText}\n\n${unsubscribeText}\n\nMe ke aloha nui,\nJade Pumehana Silva`;

    await sendEmail({
      from: { name: fromName, email: pdfFromEmail },
      to: [{ email: to }],
      subject: thankYouSubject,
      html: thankYouHtml,
      text: thankYouText
    });
    console.log(`sent: ${thankYouSubject}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
