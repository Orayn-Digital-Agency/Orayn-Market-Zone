"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TableProperties,
  Bell,
  Settings,
  ShieldCheck,
  Users,
  List,
  DollarSign,
  X,
} from "lucide-react"
import type { UserRole } from "@/lib/auth"
import { useAgentSession } from "@/stores/agent-session"

interface MobileTabBarProps {
  role: UserRole
}

export function MobileTabBar({ role }: MobileTabBarProps) {
  const pathname = usePathname()
  const { unreadNotifications } = useAgentSession()
  const [adminOpen, setAdminOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setAdminOpen(false)
      }
    }
    if (adminOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [adminOpen])

  const agentTabs = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/sales",     label: "Sales",     icon: <TableProperties size={20} /> },
    {
      href: "/notifications",
      label: "Alerts",
      icon: <Bell size={20} />,
      badge: unreadNotifications,
    },
    { href: "/settings",  label: "Settings",  icon: <Settings size={20} /> },
  ]

  const adminNavTabs = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/sales",     label: "Sales",     icon: <TableProperties size={20} /> },
    {
      href: "/notifications",
      label: "Alerts",
      icon: <Bell size={20} />,
      badge: unreadNotifications,
    },
  ]

  const adminMenuItems = [
    { href: "/admin/agents", label: "Agent Management", icon: <Users size={16} /> },
    { href: "/admin/leads",  label: "All Leads",         icon: <List size={16} /> },
    { href: "/admin/payouts",label: "Payouts",           icon: <DollarSign size={16} /> },
  ]

  const tabs = role === "admin" ? adminNavTabs : agentTabs

  const isAdminActive = adminMenuItems.some((item) => pathname.startsWith(item.href))

  return (
    <>
      {/* Admin popup menu */}
      {role === "admin" && adminOpen && (
        <div
          ref={popupRef}
          className="fixed bottom-20 right-3 z-50 bg-orayn-dark border border-white/10
                     rounded-xl shadow-2xl overflow-hidden w-52 animate-in slide-in-from-bottom-2
                     duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Admin
            </span>
            <button
              onClick={() => setAdminOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {adminMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAdminOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors
                    ${isActive
                      ? "bg-orayn-gold/10 text-orayn-gold"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <span className={isActive ? "text-orayn-gold" : "text-white/50"}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orayn-gold" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="bg-orayn-dark border-t border-white/10 flex items-center justify-around px-2 h-16 safe-area-pb">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg min-w-[52px]
                transition-colors duration-150 relative
                ${isActive ? "text-orayn-gold" : "text-white/50 hover:text-white/80"}`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
              {"badge" in tab &&
                typeof tab.badge === "number" &&
                tab.badge > 0 && (
                  <span className="absolute -top-0.5 right-1 bg-orayn-gold text-orayn-dark
                                   text-xs font-bold rounded-full min-w-[14px] h-[14px]
                                   flex items-center justify-center px-0.5 leading-none">
                    {(tab.badge as number) > 9 ? "9+" : (tab.badge as number)}
                  </span>
                )}
            </Link>
          )
        })}

        {/* Admin button (only for admin role) */}
        {role === "admin" && (
          <button
            onClick={() => setAdminOpen((v) => !v)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg min-w-[52px]
              transition-colors duration-150 relative
              ${isAdminActive || adminOpen ? "text-orayn-gold" : "text-white/50 hover:text-white/80"}`}
          >
            <ShieldCheck size={20} />
            <span className="text-xs font-medium">Admin</span>
            {isAdminActive && (
              <span className="absolute -top-0.5 right-1 w-2 h-2 rounded-full bg-orayn-gold" />
            )}
          </button>
        )}
      </nav>
    </>
  )
}
