import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test('unsubscribe endpoint accepts valid token', async ({ request }) => {
  const email = 'unsubscribe-test@example.com';
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_JWT_SECRET || '';
  expect(secret).not.toBe('');
  const token = crypto.createHmac('sha256', secret).update(email).digest('hex');

  const response = await request.get(`/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBeTruthy();
});

test('unsubscribe endpoint rejects malformed token', async ({ request }) => {
  const response = await request.get('/api/unsubscribe?email=unsubscribe-test@example.com&token=badtoken');
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error).toBe('Invalid token.');
});

test('ses webhook accepts bounce notifications', async ({ request }) => {
  const payload = {
    Type: 'Notification',
    Message: JSON.stringify({
      notificationType: 'Bounce',
      bounce: {
        bouncedRecipients: [{ emailAddress: 'bounce-test@example.com' }]
      }
    })
  };

  const response = await request.post('/api/ses/webhook', { data: payload });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBeTruthy();
});
