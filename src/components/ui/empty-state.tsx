import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-orayn-light rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-orayn-mid" />
      </div>
      <h3 className="font-sora text-base font-semibold text-orayn-navy mb-2">
        {title}
      </h3>
      <p className="text-sm text-orayn-gray max-w-xs leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
