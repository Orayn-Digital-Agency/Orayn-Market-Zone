import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

// Paystack sends all events as POST with a JSON body and an
// X-Paystack-Signature header containing an HMAC-SHA512 hash of the
// raw body signed with your Paystack secret key.
// We MUST verify this signature before processing anything.
async function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Paystack Webhook] PAYSTACK_WEBHOOK_SECRET is not set");
    return false;
  }
  const expectedHash = createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return expectedHash === signatureHeader;
}

export async function POST(request: Request): Promise<Response> {
  // Read raw body as text so we can verify the HMAC before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const isValid = await verifyPaystackSignature(rawBody, signature);
  if (!isValid) {
    // Return 400 to signal to Paystack this webhook should not be retried
    // with the same payload (it's a genuine signature mismatch, not a
    // transient error that would benefit from a retry).
    console.warn("[Paystack Webhook] Invalid signature — request rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    console.error("[Paystack Webhook] Failed to parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process charge.success events. Acknowledge all others with 200
  // so Paystack does not retry them endlessly.
  if (event.event !== "charge.success") {
    return NextResponse.json({
      ok: true,
      processed: false,
      event: event.event,
    });
  }

  const reference = event.data?.reference;
  if (!reference) {
    console.error("[Paystack Webhook] charge.success event missing reference");
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Uses createSupabaseServiceClient (returns any) — consistent with all other
  // API routes in this codebase. The service role bypasses RLS so we can
  // read and write deals regardless of which agent owns them.
  const supabase = createSupabaseServiceClient();

  // Find the deal by paystack_reference.
  const { data: deals, error: findError } = await supabase
    .from("deals")
    .select("id, agent_id, deal_amount, payment_confirmed")
    .eq("paystack_reference", reference)
    .limit(1);

  if (findError) {
    console.error(
      "[Paystack Webhook] Error querying deals:",
      findError.message,
    );
    // Return 500 so Paystack retries — this is a transient DB error.
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!deals || deals.length === 0) {
    // No matching deal. This can happen if the reference was for a direct
    // payment not tied to a deal, or the deal was deleted.
    // Return 200 to prevent Paystack retrying.
    console.warn(
      `[Paystack Webhook] No deal found with reference: ${reference}`,
    );
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: "No matching deal",
    });
  }

  const deal = deals[0];

  // Idempotency guard: if payment was already confirmed, do nothing.
  if (deal.payment_confirmed) {
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: "Already confirmed",
    });
  }

  // Mark the deal as payment confirmed.
  const confirmedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("deals")
    .update({
      payment_confirmed: true,
      payment_confirmed_at: confirmedAt,
    })
    .eq("id", deal.id);

  if (updateError) {
    console.error(
      "[Paystack Webhook] Error updating deal:",
      updateError.message,
    );
    return NextResponse.json(
      { error: "Failed to update deal" },
      { status: 500 },
    );
  }

  // Insert a notification for the agent.
  // Paystack sends event.data.amount in kobo (NGN * 100), so divide by 100.
  // deal.deal_amount is stored as NGN integer directly — no division needed.
  const amountNgn = event.data?.amount
    ? (event.data.amount / 100).toLocaleString("en-NG")
    : deal.deal_amount.toLocaleString("en-NG");

  const { error: notifError } = await supabase.from("notifications").insert({
    agent_id: deal.agent_id,
    type: "payment_confirmed",
    title: "Payment Confirmed",
    message: `Client payment of NGN ${amountNgn} has been confirmed via Paystack (ref: ${reference}). You may now begin work on the finalized site. The 40% delivery invoice will be due on completion.`,
    is_read: false,
  });

  if (notifError) {
    // Non-fatal: the deal update already succeeded. Log and continue.
    console.error(
      "[Paystack Webhook] Failed to insert notification:",
      notifError.message,
    );
  }

  console.log(
    `[Paystack Webhook] Payment confirmed for deal ${deal.id}, reference ${reference}`,
  );

  return NextResponse.json({ ok: true, processed: true, deal_id: deal.id });
}

// Paystack webhook event shape
interface PaystackWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    customer?: {
      email?: string;
    };
    metadata?: Record<string, unknown>;
  };
}
