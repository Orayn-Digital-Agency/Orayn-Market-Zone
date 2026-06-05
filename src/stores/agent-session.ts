'use client'

import { create } from 'zustand'
import type { Agent } from '@/types/supabase'

interface AgentSessionState {
  agentCode: string | null
  agentId: string | null
  fullName: string | null
  role: 'admin' | 'agent' | null
  agent: Agent | null
  unreadNotifications: number
  setSession: (data: {
    agentCode: string
    agentId: string
    fullName: string
    role: 'admin' | 'agent'
    agent: Agent
  }) => void
  setUnreadNotifications: (count: number) => void
  decrementUnread: (by?: number) => void
  clearSession: () => void
}

export const useAgentSession = create<AgentSessionState>((set) => ({
  agentCode: null,
  agentId: null,
  fullName: null,
  role: null,
  agent: null,
  unreadNotifications: 0,
  setSession: (data) =>
    set({
      agentCode: data.agentCode,
      agentId: data.agentId,
      fullName: data.fullName,
      role: data.role,
      agent: data.agent,
    }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  decrementUnread: (by = 1) =>
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - by),
    })),
  clearSession: () =>
    set({
      agentCode: null,
      agentId: null,
      fullName: null,
      role: null,
      agent: null,
      unreadNotifications: 0,
    }),
}))
