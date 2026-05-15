import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno npm specifier is resolved at Edge runtime
import { createClient } from "npm:@supabase/supabase-js@2";

// Provided by the Supabase Edge Runtime.
// Declaring here satisfies TypeScript tooling outside Deno.
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, signature, signature-input, signature-date, content-digest",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const envOr = (name: string, fallback: string) =>
  Deno.env.get(name) || fallback;

function mapPawapayStatus(statusRaw: string) {
  const status = statusRaw.toUpperCase();
  if (status === "COMPLETED") return "succeeded";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED" || status === "CANCELED") return "cancelled";
  return "pending";
}

async function readWebhookBody(req: Request) {
  const rawBody = await req.text();
  return { rawBody, body: JSON.parse(rawBody || "{}") as Record<string, unknown> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pawapayApiToken = Deno.env.get("PAWAPAY_API_TOKEN") ?? "";
    const pawapayApiBase = envOr("PAWAPAY_API_BASE_URL", "https://api.pawapay.io").replace(/\/$/, "");
    if (!supabaseUrl || !supabaseServiceKey || !pawapayApiToken) {
      return json({ error: "Server misconfiguration" }, 500);
    }

    const { body } = await readWebhookBody(req);
    const depositId = (body.depositId ?? "").toString().trim();
    const callbackStatus = (body.status ?? "").toString().trim();
    const eventId = `pawapay.deposit:${depositId}:${callbackStatus || "unknown"}`;
    if (!depositId) {
      return json({ error: "Missing required field: depositId" }, 400);
    }

    const verifyRes = await fetch(`${pawapayApiBase}/v2/deposits/${depositId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${pawapayApiToken}`,
        "User-Agent": "CBS-Subscription-EdgeFunction/1.0",
      },
    });
    const verification = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok) {
      return json({ error: "Unable to verify pawaPay deposit", detail: verification }, 400);
    }

    const searchStatus = (verification?.status ?? "").toString().toUpperCase();
    if (searchStatus !== "FOUND") {
      return json({ error: "pawaPay deposit not found", detail: verification }, 404);
    }

    const verifiedData = (verification?.data ?? {}) as Record<string, unknown>;
    const verifiedDepositId = (verifiedData?.depositId ?? "").toString();
    if (verifiedDepositId !== depositId) {
      return json({ error: "pawaPay verification deposit id mismatch" }, 400);
    }

    const mappedStatus = mapPawapayStatus((verifiedData?.status ?? callbackStatus ?? "").toString());

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Normalized webhook log (for support/debugging).
    // Best-effort insert; do not fail the webhook if logging fails.
    try {
      await adminClient.from("payment_webhook_events").insert({
        event_id: eventId,
        tx_ref: depositId,
        status: mappedStatus,
        received_at: new Date().toISOString(),
        signature_valid: true,
        raw_payload: { notification: body, verification },
      });
    } catch (_) {}

    const { data: tx, error: txError } = await adminClient
      .from("payment_transactions")
      .select("id,user_id,plan_id,amount,currency,provider_status,provider_event_id,checkout_payload")
      .eq("provider_tx_ref", depositId)
      .maybeSingle();
    if (txError) return json({ error: txError.message }, 400);
    if (!tx) return json({ error: "Unknown transaction reference" }, 404);

    if (tx.provider_event_id && tx.provider_event_id === eventId && mappedStatus !== "succeeded") {
      return json({ success: true, message: "Duplicate event ignored" });
    }

    const verifiedAmount = Math.round(Number(verifiedData?.amount ?? verifiedData?.requestedAmount ?? 0));
    const verifiedCurrency = (verifiedData?.currency ?? "").toString();
    if (mappedStatus === "succeeded") {
      if (verifiedAmount !== Number(tx.amount) || verifiedCurrency !== tx.currency) {
        return json({ error: "pawaPay verification amount or currency mismatch" }, 400);
      }
    }

    const failureReason = verifiedData?.failureReason as Record<string, unknown> | undefined;
    const { error: updateError } = await adminClient
      .from("payment_transactions")
      .update({
        provider_status: mappedStatus,
        provider_event_id: eventId,
        raw_webhook_payload: { notification: body, verification },
        processed_at: new Date().toISOString(),
        error_reason: mappedStatus === "failed"
          ? (failureReason?.failureMessage ?? failureReason?.failureCode ?? "Payment failed")
          : null,
      })
      .eq("id", tx.id);
    if (updateError) return json({ error: updateError.message }, 400);

    if (mappedStatus === "succeeded") {
      const checkoutPayload = (tx.checkout_payload ?? {}) as Record<string, unknown>;
      const { error: paymentErr } = await adminClient.rpc(
        "record_subscription_installment_payment",
        {
          p_user_id: tx.user_id,
          p_plan_id: tx.plan_id,
          p_payment_tx_id: tx.id,
          p_amount: Number(tx.amount),
          p_currency: tx.currency,
          p_installment_id: checkoutPayload.installmentId ?? null,
          p_installment_number: checkoutPayload.installmentNumber ?? null,
        },
      );
      if (paymentErr) return json({ error: paymentErr.message }, 400);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error)?.message || "Internal server error" }, 500);
  }
});
