# Stripe Connect Setup (Kekoʻolani Reunion)

Use these steps to enable Stripe Connect and Checkout for the reunion site.

## 1) Get the Stripe Connect client ID
1. Open Stripe Dashboard.
2. Go to **Settings → Connect**.
3. Under **Platform settings**, copy the **Client ID** (looks like `ca_...`).

## 2) Set required environment variables
Add these to `.env.local` and to your Vercel project environment variables:

```
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CHECKOUT_ENABLED=true
NEXT_PUBLIC_APP_URL=https://kekoolanireunion.com
```

Notes:
- Use **live** keys for production; use `sk_test_...` in test mode.
- `NEXT_PUBLIC_APP_URL` must be the public base URL used for redirects.

## 3) Add the Stripe OAuth redirect URI
1. Stripe Dashboard → **Settings → Connect**.
2. Find **OAuth settings / Redirects**.
3. Add this redirect URI (exact):

```
https://kekoolanireunion.com/api/stripe/callback
```

4. Save.

## 4) Add the same env vars in Vercel
1. Vercel Project → **Settings → Environment Variables**.
2. Add the same four variables above for **Production** (and Preview if desired).
3. Redeploy.

## 5) Connect Stripe from the admin
1. Visit `/admin/sections`.
2. Under **Payment Links**, click **Connect Stripe**.
3. Complete the Stripe OAuth flow.
4. On return, the `acct_...` ID is saved automatically.

## 6) Verify
- Refresh `/admin/sections` and confirm an `acct_...` account ID is shown.
- Run a registration with Stripe payment; it should open Stripe Checkout.
