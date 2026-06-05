'use client'

import { useEffect, useCallback } from 'react'
import { X, Bell, CheckCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useAgentSession } from '@/stores/agent-session'
import { timeAgo } from '@/lib/format'
import type { Notification } from '@/types/supabase'
import { toast } from 'sonner'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  agentId: string
}

const NOTIF_LABELS: Record<string, string> = {
  new_lead: 'New Lead Available',
  auto_released: 'Lead Auto-Released',
  payout_processed: 'Payout Processed',
  early_payout_approved: 'Early Payout Approved',
  early_payout_denied: 'Early Payout Denied',
}

export function NotificationPanel({ open, onClose, agentId }: NotificationPanelProps) {
  const queryClient = useQueryClient()
  const { setUnreadNotifications } = useAgentSession()

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', agentId],
    queryFn: async () => {
      if (!agentId) return []
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: open && !!agentId,
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
      if (!agentId) return
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

  const handleNotifClick = useCallback(
    (notif: Notification) => {
      if (!notif.is_read) {
        markReadMutation.mutate(notif.id)
      }
    },
    [markReadMutation]
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-modal
                       z-50 flex flex-col"
            role="dialog"
            aria-label="Notifications"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-orayn-mid flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-orayn-navy" />
                <h2 className="font-sora text-lg font-bold text-orayn-navy">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="badge bg-orayn-gold text-orayn-dark">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="flex items-center gap-1 text-xs text-orayn-navy font-semibold
                               hover:text-orayn-gold transition-colors disabled:opacity-50"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-orayn-gray hover:text-orayn-navy hover:bg-orayn-light
                             transition-colors focus:outline-none focus:ring-2 focus:ring-orayn-gold"
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-3 w-3/4" />
                        <div className="skeleton h-3 w-full" />
                        <div className="skeleton h-2 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="w-14 h-14 bg-orayn-light rounded-full flex items-center justify-center mb-4">
                    <Bell size={24} className="text-orayn-mid" />
                  </div>
                  <p className="font-sora text-base font-semibold text-orayn-navy mb-1">
                    No notifications yet
                  </p>
                  <p className="text-sm text-orayn-gray">
                    New leads, auto-releases, and payout confirmations will appear here.
                  </p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleNotifClick(notif)}
                        className={`
                          w-full text-left px-6 py-4 border-b border-orayn-mid
                          hover:bg-orayn-light transition-colors duration-150
                          ${!notif.is_read ? 'border-l-2 border-l-orayn-gold' : ''}
                        `}
                      >
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
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
