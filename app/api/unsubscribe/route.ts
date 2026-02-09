import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { upsertSuppressedEmail } from '@/lib/emailSuppression';

function buildToken(email: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(email).digest('hex');
}

function isValidHexToken(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? '';
  const token = (searchParams.get('token') ?? '').trim();
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_JWT_SECRET || '';

  if (!email || !token || !secret) {
    return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
  }

  const expected = buildToken(email.toLowerCase(), secret);
  if (!isValidHexToken(token) || expected.length !== token.length) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 403 });
  }

  if (!crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(token, 'utf8'))) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 403 });
  }

  await upsertSuppressedEmail({
    email,
    reason: 'unsubscribe',
    source: 'self-serve',
    metadata: { ip: request.headers.get('x-forwarded-for') ?? null }
  });

  return NextResponse.json({ ok: true });
}
