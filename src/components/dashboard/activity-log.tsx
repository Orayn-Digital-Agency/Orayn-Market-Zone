// @ts-nocheck
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { timeAgo } from '@/lib/format'
import { ActivityItemSkeleton } from '@/components/ui/skeleton'
import {
  MousePointerClick,
  Phone,
  MonitorPlay,
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ActivityAction } from '@/types/supabase'

const ACTION_CONFIG: Record<
  ActivityAction,
  { label: string; icon: React.ReactNode; color: string }
> = {
  claimed:           { label: 'Claimed a lead',      icon: <MousePointerClick size={14} />, color: 'text-blue-600' },
  contacted:         { label: 'Contacted prospect',  icon: <Phone size={14} />,             color: 'text-orayn-navy' },
  demo_sent:         { label: 'Sent demo URL',        icon: <MonitorPlay size={14} />,       color: 'text-orayn-amber' },
  stage_updated:     { label: 'Updated stage',        icon: <ArrowRight size={14} />,        color: 'text-orayn-gray' },
  closed:            { label: 'Closed a deal',        icon: <CheckCircle size={14} />,       color: 'text-orayn-green' },
  lost:              { label: 'Marked as failed',     icon: <XCircle size={14} />,           color: 'text-orayn-red' },
  auto_released:     { label: 'Lead auto-released',   icon: <RotateCcw size={14} />,         color: 'text-orayn-gray' },
  manually_released: { label: 'Lead released',        icon: <RotateCcw size={14} />,         color: 'text-orayn-gray' },
}

const PREVIEW_COUNT = 4

interface ActivityLogProps {
  agentId: string
}

export function ActivityLog({ agentId }: ActivityLogProps) {
  const [expanded, setExpanded] = useState(false)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-log', agentId],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, leads(business_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: !!agentId,
  })

  const hasMore = logs.length > PREVIEW_COUNT
  const visibleLogs = expanded ? logs : logs.slice(0, PREVIEW_COUNT)

  return (
    <div className="card flex flex-col">
      <h3 className="font-sora text-base font-semibold text-orayn-navy mb-4">
        Recent Activity
      </h3>

      {isLoading ? (
        <div className="divide-y divide-orayn-mid">
          {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-orayn-gray py-4 text-center">
          No activity yet. Claim a lead to get started.
        </p>
      ) : (
        <>
          {/* Scrollable list — max height when expanded */}
          <div
            className={`overflow-y-auto transition-all duration-300 ${
              expanded ? 'max-h-80' : 'max-h-none'
            }`}
          >
            <ul className="divide-y divide-orayn-mid">
              {visibleLogs.map((log) => {
                const config = ACTION_CONFIG[log.action as ActivityAction] ?? {
                  label: log.action,
                  icon: <ArrowRight size={14} />,
                  color: 'text-orayn-gray',
                }
                const businessName =
                  (log as { leads?: { business_name: string } }).leads?.business_name

                return (
                  <li key={log.id} className="flex items-start gap-3 py-3">
                    <div
                      className={`w-7 h-7 rounded-full bg-orayn-light flex items-center
                                  justify-center flex-shrink-0 mt-0.5 ${config.color}`}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-orayn-text">
                        {config.label}
                        {businessName && (
                          <span className="text-orayn-navy font-semibold">
                            {' '}— {businessName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-orayn-gray mt-0.5">
                        {timeAgo(log.created_at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Toggle button — only visible when there are more than 4 items */}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orayn-gold
                         hover:text-orayn-gold/80 transition-colors self-center"
            >
              {expanded ? (
                <>
                  <ChevronUp size={13} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  {logs.length - PREVIEW_COUNT} more
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
