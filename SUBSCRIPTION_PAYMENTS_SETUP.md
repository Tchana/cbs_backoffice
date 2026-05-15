# pawaPay Installment Subscription Setup

This checklist deploys the installment subscription flow:

- Mobile app collects the customer's mobile money number and starts a pawaPay deposit from the app.
- pawaPay calls `payment-webhook`.
- The webhook verifies the deposit server-to-server.
- The matching installment is marked paid.
- Access starts as `full`, can be manually changed to `downgraded` or `suspended`, and is never automatically suspended for a missed payment.

## 1) Run DB migrations

Run the Supabase migrations in order, including:

1. `supabase/migrations/016_trimester_subscription_payments_and_entitlements.sql`
2. `supabase/migrations/017_paid_access_rls_gating.sql`
3. `supabase/migrations/018_webhook_logs_and_subscription_non_overlap.sql`
4. `supabase/migrations/019_flutterwave_installments_and_access_states.sql`

Verify that these exist:

- `subscription_plan_installments`
- `user_subscription_installments`
- `v_subscription_receivables`
- `record_subscription_installment_payment(...)`
- `set_subscription_access_state(...)`

## 2) Deploy Edge Functions

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy create-subscription-payment
npx supabase functions deploy payment-webhook
```

JWT settings:

- `create-subscription-payment`: JWT verification ON
- `payment-webhook`: JWT verification OFF

## 3) Configure Function Secrets

Set these Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAWAPAY_API_TOKEN`
- `PAWAPAY_API_BASE_URL` (use `https://api.sandbox.pawapay.io` for sandbox)
- `PAWAPAY_DEFAULT_PROVIDER` (optional fallback, e.g. `MTN_MOMO_CMR`; otherwise pawaPay predicts from the phone number)
- `PAWAPAY_PHONE_COUNTRY_CODE` (optional dial prefix for local numbers, default `237`)

In the pawaPay Dashboard, configure the deposit callback URL as:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook
```

The webhook verifies every notification by calling pawaPay `GET /v2/deposits/{depositId}` before updating local records.

## 4) Admin Installment Setup

In the backoffice, open `Subscriptions`.

- Use `Plan Installment Schedules` to define installment number, amount, and due offset in days.
- New subscriptions generate user installment rows from the active schedule.
- Existing generated user installment rows are kept for accounting consistency.

## 5) Expected Access Behavior

- First successful installment creates an active subscription and grants `full` access.
- Owing and overdue amounts appear in the backoffice receivables view.
- Missed due dates do not automatically suspend the user.
- Admins can manually set access to `downgraded`, `full`, or `suspended`.
- `downgraded` users can view allowed content but cannot submit assignments.
- `suspended` users lose paid content access.

## 6) Smoke Tests

1. Start a subscription checkout from the mobile app.
2. Approve the mobile money prompt on the phone (stay in the app while it confirms).
3. Confirm `payment_transactions.provider_status = succeeded`.
4. Confirm one `user_subscription_installments` row is marked `paid`.
5. Confirm `v_subscription_receivables` shows correct due, paid, owing, and next due values.
6. In backoffice, downgrade the subscription and confirm mobile assignment submission is disabled.
7. Restore full access and confirm submission is enabled again.
8. Suspend manually and confirm paid content access is blocked.
