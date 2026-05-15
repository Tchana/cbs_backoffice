#!/usr/bin/env node

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
};

const url = getArg("--url");
const depositId = getArg("--deposit-id");
const status = getArg("--status", "COMPLETED");
const amount = getArg("--amount", "100");
const currency = getArg("--currency", "XAF");

if (!url || !depositId) {
  console.error(
    "Usage: node scripts/send-test-webhook.mjs --url <FUNCTION_URL> --deposit-id <UUID> [--status COMPLETED] [--amount 100] [--currency XAF]"
  );
  process.exit(1);
}

// Simulates a pawaPay deposit callback. The Edge Function still verifies the
// deposit with pawaPay /v2/deposits/{depositId}, so use a real deposit id from
// sandbox/production when testing end-to-end.
const payload = {
  depositId,
  status,
  amount,
  requestedAmount: amount,
  currency,
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text);
