import type { LeadStatus, ServiceTier } from '@/types/supabase'

const STATUS_STYLES: Record<LeadStatus, string> = {
  uncontacted: 'bg-orayn-light text-orayn-gray',
  contacted:   'bg-blue-50 text-blue-700',
  demo_sent:   'bg-orayn-amber-bg text-orayn-amber',
  negotiating: 'bg-purple-50 text-purple-700',
  closed:      'bg-orayn-green-bg text-orayn-green',
  lost:        'bg-orayn-red-bg text-orayn-red',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  uncontacted: 'Uncontacted',
  contacted:   'Contacted',
  demo_sent:   'Demo Sent',
  negotiating: 'Negotiating',
  closed:      'Closed',
  lost:        'Lost',
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

const TIER_STYLES: Record<ServiceTier, string> = {
  Starter:  'bg-orayn-light text-orayn-navy',
  Business: 'bg-blue-50 text-blue-700',
  Premium:  'bg-purple-50 text-purple-700',
  Platform: 'bg-orayn-amber-bg text-orayn-amber',
}

export function TierBadge({ tier }: { tier: ServiceTier }) {
  return (
    <span className={`badge ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  )
}

export function WebQualityBadge({ quality }: { quality: string | null }) {
  if (!quality) return <span className="text-xs text-orayn-gray">—</span>
  const styles: Record<string, string> = {
    Poor:      'bg-orayn-red-bg text-orayn-red',
    Good:      'bg-orayn-amber-bg text-orayn-amber',
    Excellent: 'bg-orayn-green-bg text-orayn-green',
  }
  return (
    <span className={`badge ${styles[quality] ?? 'bg-orayn-light text-orayn-gray'}`}>
      {quality}
    </span>
  )
}
