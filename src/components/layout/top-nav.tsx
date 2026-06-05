'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useAgentSession } from '@/stores/agent-session'
import { NotificationPanel } from '@/components/layout/notification-panel'
import type { AuthUser } from '@/lib/auth'
import { toast } from 'sonner'

interface TopNavProps {
  user: AuthUser
}

export function TopNav({ user }: TopNavProps) {
  const router = useRouter()
  const { unreadNotifications, agentCode, role } = useAgentSession()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  const displayCode = agentCode ?? (role === 'admin' ? 'ADMIN' : '—')

  return (
    <>
      <header className="h-16 bg-white border-b border-orayn-mid flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30">
        {/* Left: page context on mobile */}
        <div className="sm:hidden">
          <span className="font-sora text-lg font-bold text-orayn-gold">ORAYN</span>
        </div>
        <div className="hidden sm:block" />

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg
                       text-orayn-gray hover:text-orayn-navy hover:bg-orayn-light
                       transition-colors duration-150 focus:outline-none focus:ring-2
                       focus:ring-orayn-gold"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-orayn-gold text-orayn-dark
                               text-xs font-bold rounded-full min-w-[16px] h-4 flex
                               items-center justify-center px-1 leading-none">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                         hover:bg-orayn-light transition-colors duration-150
                         focus:outline-none focus:ring-2 focus:ring-orayn-gold"
            >
              <div className="w-7 h-7 bg-orayn-navy rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold font-sora">
                  {displayCode.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-semibold text-orayn-text hidden sm:block">
                {displayCode}
              </span>
              <ChevronDown size={14} className="text-orayn-gray hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border
                              border-orayn-mid rounded-card shadow-modal z-50 py-1">
                <div className="px-4 py-2 border-b border-orayn-mid">
                  <p className="text-xs text-orayn-gray">Signed in as</p>
                  <p className="text-sm font-semibold text-orayn-text truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-orayn-gold font-semibold mt-0.5">
                    {displayCode}
                    {role === 'admin' && (
                      <span className="ml-1 text-orayn-amber">(Admin)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm
                             text-orayn-red hover:bg-orayn-red-bg transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification slide-in panel */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        agentId={user.agent?.id ?? ''}
      />
    </>
  )
}
