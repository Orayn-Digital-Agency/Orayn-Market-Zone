// @ts-nocheck
'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy } from 'lucide-react'
import { currentMonthWAT } from '@/lib/format'

interface LeaderboardProps {
  currentAgentCode: string
}

interface LeaderboardEntry {
  agent_code: string
  deals_this_month: number
}

export function Leaderboard({ currentAgentCode }: LeaderboardProps) {
  const month = currentMonthWAT()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', month],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?month=${month}`)
      if (!res.ok) return []
      return res.json() as Promise<LeaderboardEntry[]>
    },
  })

  const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-700']

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-orayn-gold" />
        <h3 className="font-sora text-base font-semibold text-orayn-navy">
          Leaderboard
        </h3>
        <span className="text-xs text-orayn-gray ml-auto">{month}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-orayn-gray text-center py-4">
          No activity recorded this month yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, idx) => {
            const isMe = entry.agent_code === currentAgentCode
            return (
              <li
                key={entry.agent_code}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg
                  ${isMe ? 'bg-orayn-light border border-orayn-gold/30' : 'hover:bg-orayn-light'}`}
              >
                <span
                  className={`text-sm font-bold w-5 text-center
                    ${idx < 3 ? MEDAL_COLORS[idx] : 'text-orayn-gray'}`}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-orayn-text flex-1">
                  {entry.agent_code}
                  {isMe && (
                    <span className="ml-2 text-xs text-orayn-gold font-normal">(you)</span>
                  )}
                </span>
                <span className="text-sm font-bold text-orayn-navy">
                  {entry.deals_this_month}{' '}
                  <span className="text-xs font-normal text-orayn-gray">deals</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
