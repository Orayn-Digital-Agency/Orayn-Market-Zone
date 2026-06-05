'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useAgentSession } from '@/stores/agent-session'
import { timeAgo } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { Notification } from '@/types/supabase'
import { toast } from 'sonner'
import { Bell, CheckCheck, Circle } from 'lucide-react'

const NOTIF_LABELS: Record<string, string> = {
  new_lead:              'New Lead Available',
  auto_released:         'Lead Auto-Released',
  payout_processed:      'Payout Processed',
  early_payout_approved: 'Early Payout Approved',
  early_payout_denied:   'Early Payout Denied',
}

export function NotificationsPageClient({ agentId }: { agentId: string }) {
  const queryClient = useQueryClient()
  const { setUnreadNotifications } = useAgentSession()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', agentId],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!agentId,
  })

  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', agentId] })
      const unread = notifications.filter((n) => !n.is_read).length
      setUnreadNotifications(Math.max(0, unread - 1))
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('agent_id', agentId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', agentId] })
      setUnreadNotifications(0)
      toast.success('All notifications marked as read')
    },
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orayn-mid">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-orayn-text">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 text-xs font-semibold text-orayn-navy
                       hover:text-orayn-gold transition-colors disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Lead updates, auto-releases, and payout confirmations will appear here."
        />
      ) : (
        <ul>
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`
                flex items-start gap-4 px-6 py-4 border-b border-orayn-mid last:border-0
                transition-colors cursor-pointer hover:bg-orayn-light/60
                ${!notif.is_read ? 'border-l-2 border-l-orayn-gold bg-orayn-light/30' : ''}
              `}
              onClick={() => {
                if (!notif.is_read) markReadMutation.mutate(notif.id)
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {notif.is_read ? (
                  <Circle size={8} className="text-orayn-mid mt-1" />
                ) : (
                  <div className="w-2 h-2 bg-orayn-gold rounded-full mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm ${
                      notif.is_read
                        ? 'text-orayn-gray'
                        : 'text-orayn-navy font-semibold'
                    }`}
                  >
                    {NOTIF_LABELS[notif.type] ?? notif.type}
                  </p>
                  <span className="text-xs text-orayn-gray flex-shrink-0">
                    {timeAgo(notif.created_at)}
                  </span>
                </div>
                <p className="text-sm text-orayn-gray mt-0.5 leading-snug">
                  {notif.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
