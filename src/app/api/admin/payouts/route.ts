// @ts-nocheck
import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json(
      { error: "month parameter required" },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Call MONTHLY_PAYOUT_SUMMARY database function
  const { data, error } = await service.rpc("monthly_payout_summary", {
    p_month: month,
  });

  if (error) {
    // Fallback: compute manually if function not available
    const { data: deals, error: dealsError } = await service
      .from("deals")
      .select("agent_id, commission_amount")
      .eq("payout_month", month);

    if (dealsError)
      return NextResponse.json({ error: dealsError.message }, { status: 500 });

    const { data: agents } = await service.from("agents").select("*");
    const { data: payouts } = await service
      .from("payouts")
      .select("*")
      .eq("month", month);

    const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));
    const payoutMap = new Map((payouts ?? []).map((p) => [p.agent_id, p]));

    const counts: Record<string, { commission: number; deals: number }> = {};
    for (const d of deals ?? []) {
      if (!counts[d.agent_id]) counts[d.agent_id] = { commission: 0, deals: 0 };
      counts[d.agent_id].commission += d.commission_amount ?? 0;
      counts[d.agent_id].deals++;
    }

    const result = Object.entries(counts).map(([agentId, c]) => {
      const agent = agentMap.get(agentId);
      const payout = payoutMap.get(agentId);
      return {
        agent_id: agentId,
        agent_code: agent?.agent_code ?? "—",
        full_name: agent?.full_name ?? "—",
        total_deals: c.deals,
        total_commission: c.commission,
        payout_status: payout?.status ?? "pending",
        paid_at: payout?.paid_at ?? null,
      };
    });

    return NextResponse.json(result);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json()) as {
    agent_id: string;
    month: string;
    total_commission: number;
  };

  const service = createSupabaseServiceClient();

  // Upsert payout record
  const { error } = await service.from("payouts").upsert(
    {
      agent_id: body.agent_id,
      month: body.month,
      total_commission: body.total_commission,
      status: "paid",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "agent_id,month" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Update all deals for this agent/month to payout_status = paid
  await service
    .from("deals")
    .update({ payout_status: "paid" })
    .eq("agent_id", body.agent_id)
    .eq("payout_month", body.month);

  // Send notification to agent
  await service.from("notifications").insert({
    agent_id: body.agent_id,
    type: "payout_processed",
    title: "Payout Processed",
    message: `Your commission for ${body.month} has been paid. Total: ${body.total_commission.toLocaleString("en-NG", { style: "currency", currency: "NGN" })}.`,
    is_read: false,
  });

  return NextResponse.json({ success: true });
}
