import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  // Verify user is authenticated (any agent or admin)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const service = createSupabaseServiceClient()

  // Fetch all active agents (code only — never full name to non-admin callers)
  const { data: agents } = await service
    .from('agents')
    .select('id, agent_code')
    .eq('is_active', true)

  // Fetch deal counts for this month
  const { data: deals } = await service
    .from('deals')
    .select('agent_id')
    .eq('payout_month', month)

  const countMap: Record<string, number> = {}
  for (const d of deals ?? []) {
    countMap[d.agent_id] = (countMap[d.agent_id] ?? 0) + 1
  }

  const result = (agents ?? [])
    .map((a: { id: string; agent_code: string }) => ({
      agent_code: a.agent_code,
      deals_this_month: countMap[a.id] ?? 0,
    }))
    .sort((a: { deals_this_month: number }, b: { deals_this_month: number }) => b.deals_this_month - a.deals_this_month)

  return NextResponse.json(result)
}
