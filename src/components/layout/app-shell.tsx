'use client'

import { useEffect } from 'react'
import type { AuthUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { useAgentSession } from '@/stores/agent-session'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useQueryClient } from '@tanstack/react-query'

interface AppShellProps {
  user: AuthUser
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const { setSession, setUnreadNotifications } = useAgentSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user.agent) {
      setSession({
        agentCode: user.agent.agent_code,
        agentId: user.agent.id,
        fullName: user.agent.full_name,
        role: user.role,
        agent: user.agent,
      })
    }
  }, [user, setSession])

  // Load initial unread notification count
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    async function loadUnread() {
      if (!user.agent) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.agent.id)
        .eq('is_read', false)
      setUnreadNotifications(count ?? 0)
    }
    loadUnread()
  }, [user, setUnreadNotifications])

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user.agent) return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`notifications:${user.agent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `agent_id=eq.${user.agent.id}`,
        },
        () => {
          setUnreadNotifications(
            useAgentSession.getState().unreadNotifications + 1
          )
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, setUnreadNotifications, queryClient])

  return (
    <div className="flex h-screen overflow-hidden bg-orayn-light">
      {/* Desktop sidebar */}
      <div className="hidden sm:flex">
        <Sidebar role={user.role} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileTabBar role={user.role} />
      </div>
    </div>
  )
}
