import { NextResponse } from 'next/server';
import { upsertSuppressedEmail } from '@/lib/emailSuppression';

type SnsEnvelope = {
  Type?: string;
  Message?: string;
  SubscribeURL?: string;
};

type SesNotification = {
  notificationType?: string;
  bounce?: {
    bouncedRecipients?: Array<{ emailAddress?: string }>;
  };
  complaint?: {
    complainedRecipients?: Array<{ emailAddress?: string }>;
  };
};

export async function POST(request: Request) {
  const payload = (await request.json()) as SnsEnvelope;
  const type = payload.Type;

  if (type === 'SubscriptionConfirmation' && payload.SubscribeURL) {
    try {
      await fetch(payload.SubscribeURL);
    } catch (error) {
      return NextResponse.json({ error: 'Failed to confirm subscription.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (type !== 'Notification' || !payload.Message) {
    return NextResponse.json({ ok: true });
  }

  let message: SesNotification | null = null;
  try {
    message = JSON.parse(payload.Message) as SesNotification;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid message format.' }, { status: 400 });
  }

  const notificationType = (message.notificationType || '').toLowerCase();
  const emails: string[] = [];

  if (notificationType === 'bounce') {
    for (const recipient of message.bounce?.bouncedRecipients ?? []) {
      if (recipient.emailAddress) emails.push(recipient.emailAddress);
    }
  }

  if (notificationType === 'complaint') {
    for (const recipient of message.complaint?.complainedRecipients ?? []) {
      if (recipient.emailAddress) emails.push(recipient.emailAddress);
    }
  }

  await Promise.all(
    emails.map((email) =>
      upsertSuppressedEmail({
        email,
        reason: notificationType || 'bounce',
        source: 'ses',
        metadata: message as Record<string, unknown>
      })
    )
  );

  return NextResponse.json({ ok: true });
}
