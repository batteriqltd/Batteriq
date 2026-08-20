# Pesapal Card Payments — Setup & Testing

Visa / Mastercard payments via Pesapal API 3.0, added alongside the existing
M-Pesa (Daraja) flow. **M-Pesa is unchanged** — same route, same STK push, same
callback, same totals. Card payments are a separate, additive rail.

---

## 1. What was added

| Piece | File |
|---|---|
| Pesapal API client (auth, register IPN, submit order, get status) | `lib/pesapal.ts` |
| Card fee maths (2%, integer-cent, shared by server + checkout preview) | `lib/cardFee.ts` |
| Shared "mark order paid" used by **both** M-Pesa and Pesapal | `lib/orderPayments.ts` |
| Reconciles a Pesapal transaction against an order (idempotent) | `lib/pesapalSync.ts` |
| Start a card payment | `POST /api/pesapal/checkout` |
| IPN listener (server-to-server, source of truth) | `GET+POST /api/pesapal/ipn` |
| One-time IPN registration (admin only) | `GET+POST /api/pesapal/register-ipn` |
| Browser return page | `/checkout/pesapal/callback` |
| DB migration | `supabase/migrations/005_pesapal_card_payments.sql` |
| Card button asset | `public/payment-visa-mastercard.jpg` |

The only pre-existing M-Pesa file touched is `app/api/mpesa/callback/route.ts`,
where the "mark as paid" block was **moved verbatim** into
`lib/orderPayments.ts` so both payment rails run the same code (same DB update,
same admin push, same confirmation email + PDF receipt). Behaviour is
unchanged, plus it is now idempotent against duplicate Safaricom callbacks.

---

## 2. Environment variables

| Variable | Value | Where |
|---|---|---|
| `PESAPAL_ENVIRONMENT` | `live` (or `sandbox`) | `.env.local` + Vercel |
| `PESAPAL_CONSUMER_KEY` | your Pesapal consumer key | `.env.local` + Vercel |
| `PESAPAL_CONSUMER_SECRET` | your Pesapal consumer secret | `.env.local` + Vercel |
| `PESAPAL_IPN_ID` | returned by step 4 below | `.env.local` + Vercel |
| `NEXT_PUBLIC_PESAPAL_CARD_FEE_RATE` | `0.02` (= 2%) | `.env.local` + Vercel |
| `NEXT_PUBLIC_SITE_URL` | `https://batteriq.com` | already set |

`.env.local` is gitignored (`.gitignore` lines 28–33). The credentials are
**not** in source control and are never sent to the browser — only the fee rate
is public, and it is not a secret.

> ⚠️ **The credentials currently in `.env.local` are PRODUCTION credentials.**
> Verified by calling both endpoints: `cybqa.pesapal.com` (sandbox) rejects them
> with `invalid_consumer_key_or_secret_provided`; `pay.pesapal.com` (live)
> issues a token. `PESAPAL_ENVIRONMENT` is therefore set to `live`. Any card
> payment made against these is **real money on a real card**. See §6 for how to
> test safely.

Flipping between sandbox and production is an env change only — no code edit.

---

## 3. Run the database migration

Paste `supabase/migrations/005_pesapal_card_payments.sql` into the Supabase SQL
editor and run it. It is additive and safe to re-run:

* adds `pesapal_order_tracking_id`, `pesapal_merchant_reference`,
  `pesapal_payment_method`, `pesapal_confirmation_code`,
  `pesapal_status_description`
* adds `card_fee_rate`, `card_fee_kes`, `total_charged_kes`
* extends the `payment_method` CHECK to allow `pesapal_card`
  (also formally allows `sales_confirmation`, which the app already sends)
* adds two lookup indexes for the IPN

No existing column is renamed, repurposed or dropped.

**Do this before deploying** — the checkout route writes the new columns.

---

## 4. Register the IPN URL (one time per environment)

Pesapal needs a public HTTPS URL to notify. Deploy first, then — signed in to
`/admin` in the same browser — call:

```bash
curl -X POST https://batteriq.com/api/pesapal/register-ipn \
  -H "Content-Type: application/json" \
  --cookie "<your admin session cookie>" -d '{}'
```

Easiest alternative: open the browser devtools console on any `/admin` page and run

```js
await (await fetch('/api/pesapal/register-ipn', { method: 'POST' })).json()
```

The response (and the server log) contains:

```json
{ "environment": "live", "url": "https://batteriq.com/api/pesapal/ipn", "ipn_id": "…" }
```

Put that `ipn_id` into `PESAPAL_IPN_ID` in Vercel **and** `.env.local`, then
redeploy. `GET /api/pesapal/register-ipn` lists what is already registered, so
you never need to register twice.

---

## 5. The 2% card fee

Pesapal charges 2% on card transactions and, per management instruction, that
cost is passed to the customer. **Card payments only** — M-Pesa totals never
change.

* Computed **server-side** in `/api/pesapal/checkout` from the order value
  stored in the database. The browser only ever sends an order id, so a
  tampered client cannot change what is charged.
* Integer-cent maths (`lib/cardFee.ts`), so subtotal + fee always sums exactly
  to the total — displayed, stored and charged.
* Rate lives in one place: `NEXT_PUBLIC_PESAPAL_CARD_FEE_RATE`. It is
  `NEXT_PUBLIC_` so the checkout preview uses the same number the server
  charges; the authoritative amount is still recomputed server-side.
* Shown to the customer **before** they pay — on the card option tile, in the
  order summary (desktop + mobile), and on the pay button.

Stored on the order, alongside — never overwriting — the existing fields:

| Column | Meaning |
|---|---|
| `total_kes` | order value, unchanged, identical to what an M-Pesa customer pays |
| `card_fee_kes` | the passed-on fee (NULL for M-Pesa orders) |
| `card_fee_rate` | rate used at the time, e.g. `0.0200` |
| `total_charged_kes` | `total_kes + card_fee_kes` — what Pesapal collected |

Example on a KES 1,000 order: subtotal `1,000.00` + fee `20.00` = charged
`1,020.00`, while Batteriq revenue stays `1,000.00`.

### ⚠️ Decision needed from management

**If a card order is refunded, does the customer get the 2% fee back?** Pesapal
does not return its cut on a refund, so refunding the full `total_charged_kes`
costs Batteriq the fee, while refunding only `total_kes` leaves the customer
2% out of pocket. The data supports either — both amounts are stored — but the
policy is not implemented. Please confirm the answer and it can be wired in.

---

## 6. Testing end to end

### Safest order of testing

1. **Verify credentials + IPN wiring first, without charging a card.**
   As an admin: `GET /api/pesapal/register-ipn`. A 200 with an environment and
   a list proves auth and connectivity work.

2. **Test the fee maths without paying.** On `/checkout`, select
   *Pay by Card — Visa or Mastercard* and confirm the breakdown adds up and
   that switching back to M-Pesa removes the fee entirely.

3. **Sandbox rehearsal (recommended).** Ask Pesapal for **sandbox** credentials,
   then in a preview deployment set `PESAPAL_ENVIRONMENT=sandbox` with those
   keys, register the sandbox IPN, and run a full payment with Pesapal's test
   cards. Nothing in the code changes.

4. **Live smoke test.** With the production credentials, place a real order for
   the smallest possible amount on a real card, then refund it in the Pesapal
   dashboard. This is the only way to prove the live rail end to end.

### What to check on a completed payment

- Customer is redirected to Pesapal, pays, and lands on
  `/checkout/pesapal/callback` showing **Payment Successful** with the
  subtotal / fee / total breakdown.
- The cart is cleared **only** after success (a failed payment returns the
  customer to a full basket).
- `/admin/orders` shows the order as **paid**, method `Visa / Mastercard`, with
  `+KES x card fee · KES y charged` under the amount.
- `/admin/orders/<id>` shows order value, fee, total charged, the card type and
  the Pesapal tracking id.
- Customer receives the payment-confirmed email with card wording, a *Card
  Payment Reference*, and the fee line in the totals.
- Admin push alert fires as **💳 Card Payment Received**.

### Confirm M-Pesa still works (do this too)

Place a normal `mpesa_now` order and pay it. The STK push, waiting screen with
the 60-second timer, the STK query polling, the Paybill fallback on failure and
the confirmation email must all behave exactly as before. The only change on
that path is that the mark-as-paid block now lives in `lib/orderPayments.ts`.

### Failure paths worth exercising

| Scenario | Expected |
|---|---|
| Customer cancels on the Pesapal page | Returns to `/checkout?payment=cancelled`, cart intact, order left pending |
| Card declined | Callback page shows *Payment Not Completed* with the Pesapal reason; order marked `failed` |
| Pesapal down / auth failure | Checkout shows a friendly error pointing at M-Pesa and WhatsApp; never hangs |
| IPN delivered twice | Second one is a no-op — no duplicate receipt, no duplicate push |
| IPN arrives before the customer returns | Callback page reads the already-paid order and shows success |
| Customer closes the browser after paying | IPN still marks the order paid and emails the receipt |

---

## 7. Security notes

- Consumer key/secret are server-side only, read from env, never logged and
  never bundled into client JavaScript.
- The IPN endpoint **never trusts the notification body** — it re-fetches the
  status from Pesapal with `GetTransactionStatus` before writing anything.
- IPN processing is idempotent: the paid update only matches rows that are not
  already paid, so repeats cannot double-send receipts.
- An already-paid order can never be downgraded by a late or stale
  notification, and a stale notification from an abandoned earlier attempt
  cannot fail a live one.
- The amount Pesapal reports is compared against what we expected; a mismatch
  is logged loudly and recorded on the order rather than silently accepted.
- The callback page re-checks with Pesapal server-side, so editing the URL
  cannot produce a fake success screen.
- Card details are entered on Pesapal's hosted page — Batteriq never receives a
  card number and stays out of PCI-DSS scope.
- `/api/pesapal/checkout` is rate limited to 5 attempts per IP per minute.
