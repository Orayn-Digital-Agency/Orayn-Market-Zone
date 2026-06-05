'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface QuotaBarProps {
  current: number
  target: number
  floor: number
  loading?: boolean
}

export function QuotaBar({ current, target, floor, loading = false }: QuotaBarProps) {
  if (loading) {
    return (
      <div className="card space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
    )
  }

  const pct = Math.min(Math.round((current / target) * 100), 100)
  const floorPct = Math.round((floor / target) * 100)
  const atFloor = current < floor
  const atTarget = current >= target

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-orayn-navy">
          Monthly Quota Progress
        </p>
        <span className={`text-sm font-bold ${atTarget ? 'text-orayn-green' : atFloor ? 'text-orayn-red' : 'text-orayn-amber'}`}>
          {current} / {target} deals
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-orayn-mid rounded-full overflow-visible">
        {/* Filled portion */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            atTarget ? 'bg-orayn-green' : atFloor ? 'bg-orayn-red' : 'bg-orayn-gold'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Floor marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orayn-navy/40 rounded-full"
          style={{ left: `${floorPct}%` }}
          title={`Minimum: ${floor} deals`}
        />
      </div>

      <p className="text-xs text-orayn-gray">
        {atTarget
          ? 'Target reached. Keep going.'
          : atFloor
          ? `Below minimum (${floor} deals required). ${floor - current} more needed to avoid quota warning.`
          : `${target - current} more deal${target - current !== 1 ? 's' : ''} to hit target. Minimum is ${floor}.`}
      </p>
    </div>
  )
}
