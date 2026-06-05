import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-orayn-navy',
  iconBg = 'bg-orayn-light',
}: MetricCardProps) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-orayn-gray">
          {title}
        </p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p className="font-sora text-2xl font-bold text-orayn-navy leading-none">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-orayn-gray">{subtitle}</p>
      )}
    </div>
  )
}
