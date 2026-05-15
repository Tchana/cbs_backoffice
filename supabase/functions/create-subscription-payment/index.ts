import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore Deno npm specifier is resolved at Edge runtime
import { createClient } from "npm:@supabase/supabase-js@2";

// Provided by the Supabase Edge Runtime.
// Declaring here satisfies TypeScript tooling outside Deno.
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const envOr = (name: string, fallback: string) =>
  Deno.env.get(name) || fallback;

function sanitizePhoneNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? digits.replace(/^0+/, "") : digits;
}

function normalizePhoneNumber(raw: string, countryDialCode: string) {
  const phone = sanitizePhoneNumber(raw);
  if (!phone) return "";
  const dial = countryDialCode.replace(/\D/g, "");
  if (dial && !phone.startsWith(dial) && phone.length <= 10) {
    return `${dial}${phone}`;
  }
  return phone;
}

function pawapayCustomerMessage() {
  return "CBS Subscription";
}

function generateDisplayReference(targetRole: string) {
  const prefix = targetRole === "library_user" ? "LIB" : "STUD";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }
  return `${prefix}-${suffix}`;
}

async function pawapayRequest(
  apiBase: string,
  token: string,
  path: string,
  init: RequestInit,
) {
  return await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "CBS-Subscription-EdgeFunction/1.0",
      ...(init.headers ?? {}),
    },
  });
}

async function resolvePawapayProvider(
  apiBase: string,
  token: string,
  phoneNumber: string,
  fallbackProvider: string,
) {
  if (fallbackProvider) return fallbackProvider;

  const predictRes = await pawapayRequest(apiBase, token, "/v2/predict-provider", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
  const predictBody = await predictRes.json().catch(() => ({}));
  const provider = (predictBody?.provider ?? predictBody?.data?.provider ?? "").toString().trim();
  if (predictRes.ok && provider) return provider;

  const failureMessage = predictBody?.failureReason?.failureMessage ??
    predictBody?.failureReason?.failureCode ??
    "Unable to detect mobile money provider for this phone number";
  throw new Error(failureMessage);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pawapayApiToken = Deno.env.get("PAWAPAY_API_TOKEN") ?? "";
    const pawapayApiBase = envOr("PAWAPAY_API_BASE_URL", "https://api.pawapay.io").replace(/\/$/, "");
    const pawapayDefaultProvider = (Deno.env.get("PAWAPAY_DEFAULT_PROVIDER") ?? "").trim();
    const pawapayCountryDialCode = envOr("PAWAPAY_PHONE_COUNTRY_CODE", "237");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !pawapayApiToken) {
      return json({ error: "Server misconfiguration" }, 500);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized", detail: userError?.message }, 401);

    const body = await req.json().catch(() => ({}));
    const planCode = (body?.planCode ?? "").toString().trim();
    if (!planCode) return json({ error: "planCode is required" }, 400);

    const metadata = user.user_metadata ?? {};
    const phoneNumber = normalizePhoneNumber(
      (body?.phoneNumber ?? body?.phone ?? metadata.phone ?? metadata.phone_number ?? "").toString(),
      pawapayCountryDialCode,
    );
    if (!phoneNumber) {
      return json({ error: "phoneNumber is required" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("id,code,name,target_role,duration_months,price_amount,currency,active")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();
    if (planError) return json({ error: planError.message }, 400);
    if (!plan) return json({ error: "Plan not found or inactive" }, 404);

    const depositId = crypto.randomUUID();
    const existingSubRes = await adminClient
      .from("user_subscriptions")
      .select("id,access_state")
      .eq("user_id", user.id)
      .eq("plan_id", plan.id)
      .eq("status", "active")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingSubRes.error) return json({ error: existingSubRes.error.message }, 400);

    let installmentId: string | null = null;
    let installmentNumber = 1;
    let amount = Number(plan.price_amount || 0);
    if (existingSubRes.data?.id) {
      const { error: ensureErr } = await adminClient.rpc(
        "ensure_subscription_installments",
        { p_subscription_id: existingSubRes.data.id },
      );
      if (ensureErr) return json({ error: ensureErr.message }, 400);

      const installmentRes = await adminClient
        .from("user_subscription_installments")
        .select("id,installment_number,amount_due,amount_paid,status")
        .eq("subscription_id", existingSubRes.data.id)
        .not("status", "in", "(paid,waived)")
        .order("installment_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (installmentRes.error) return json({ error: installmentRes.error.message }, 400);
      if (!installmentRes.data) {
        return json({ error: "No unpaid installments remain for this subscription" }, 400);
      }
      installmentId = installmentRes.data.id;
      installmentNumber = Number(installmentRes.data.installment_number || 1);
      amount = Number(installmentRes.data.amount_due || 0) - Number(installmentRes.data.amount_paid || 0);
    } else {
      const firstPlanInstallment = await adminClient
        .from("subscription_plan_installments")
        .select("installment_number,amount")
        .eq("plan_id", plan.id)
        .eq("active", true)
        .order("installment_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstPlanInstallment.error) return json({ error: firstPlanInstallment.error.message }, 400);
      if (firstPlanInstallment.data) {
        installmentNumber = Number(firstPlanInstallment.data.installment_number || 1);
        amount = Number(firstPlanInstallment.data.amount || plan.price_amount || 0);
      }
    }

    amount = Math.round(amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Selected installment has an invalid amount" }, 400);
    }

    let mmoProvider: string;
    try {
      mmoProvider = await resolvePawapayProvider(
        pawapayApiBase,
        pawapayApiToken,
        phoneNumber,
        pawapayDefaultProvider,
      );
    } catch (providerErr) {
      return json({ error: (providerErr as Error).message }, 400);
    }

    const displayReference = generateDisplayReference(plan.target_role);

    const pendingCheckoutPayload = {
      provider: "pawapay",
      mode: "deposit",
      reference: depositId,
      depositId,
      displayReference,
      phoneNumber,
      mmoProvider,
      amount,
      currency: plan.currency,
      planCode: plan.code,
      targetRole: plan.target_role,
      installmentId,
      installmentNumber,
    };

    const { data: tx, error: txError } = await adminClient
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount,
        currency: plan.currency,
        provider: "pawapay",
        provider_tx_ref: depositId,
        provider_status: "pending",
        checkout_payload: pendingCheckoutPayload,
      })
      .select("id,provider_tx_ref,provider_status,amount,currency")
      .single();
    if (txError) return json({ error: txError.message }, 400);

    const pawapayPayload = {
      depositId,
      clientReferenceId: displayReference,
      amount: String(amount),
      currency: plan.currency,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber,
          provider: mmoProvider,
        },
      },
      customerMessage: pawapayCustomerMessage(),
      metadata: [
        { userId: user.id },
        { planCode: plan.code },
        { planId: plan.id },
        { targetRole: plan.target_role },
        { installmentNumber: String(installmentNumber) },
        ...(installmentId ? [{ installmentId }] : []),
      ],
    };

    const pawapayRes = await pawapayRequest(pawapayApiBase, pawapayApiToken, "/v2/deposits", {
      method: "POST",
      body: JSON.stringify(pawapayPayload),
    });
    const pawapayBody = await pawapayRes.json().catch(() => ({}));
    const pawapayStatus = (pawapayBody?.status ?? "").toString().toUpperCase();
    if (!pawapayRes.ok || pawapayStatus === "REJECTED") {
      const failureMessage = pawapayBody?.failureReason?.failureMessage ??
        pawapayBody?.failureReason?.failureCode ??
        "pawaPay deposit request failed";
      await adminClient
        .from("payment_transactions")
        .update({
          provider_status: "failed",
          error_reason: failureMessage,
          raw_webhook_payload: { deposit_initialization: pawapayBody },
          processed_at: new Date().toISOString(),
        })
        .eq("id", tx.id);
      return json(
        {
          error: "Unable to initiate mobile money payment",
          detail: failureMessage,
        },
        400,
      );
    }

    const paymentPayload = {
      ...pendingCheckoutPayload,
      pawapayStatus,
      awaitingApproval: pawapayStatus === "ACCEPTED" || pawapayStatus === "DUPLICATE_IGNORED",
    };

    const { error: updateTxError } = await adminClient
      .from("payment_transactions")
      .update({ checkout_payload: paymentPayload })
      .eq("id", tx.id);
    if (updateTxError) return json({ error: updateTxError.message }, 400);

    return json({
      success: true,
      transaction: tx,
      payment: paymentPayload,
    });
  } catch (err) {
    return json({ error: (err as Error)?.message || "Internal server error" }, 500);
  }
});
