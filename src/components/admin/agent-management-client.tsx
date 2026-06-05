'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateWAT } from '@/lib/format'
import type { Agent } from '@/types/supabase'
import { toast } from 'sonner'
import {
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

const createAgentSchema = z.object({
  fullName: z.string().min(2, 'Enter the agent full name'),
  email: z.string().email('Enter a valid email address'),
  agentCode: z
    .string()
    .regex(/^AGENT-\d{3}$/, 'Format must be AGENT-001, AGENT-002, etc.'),
})

type CreateAgentValues = z.infer<typeof createAgentSchema>

interface AgentWithStats extends Agent {
  deals_this_month: number
  all_time_deals: number
}

export function AgentManagementClient() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<Agent | null>(null)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents')
      if (!res.ok) throw new Error('Failed to fetch agents')
      return res.json() as Promise<AgentWithStats[]>
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAgentValues>({
    resolver: zodResolver(createAgentSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateAgentValues) => {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create agent')
      return data
    },
    onSuccess: () => {
      toast.success('Agent created', {
        description: 'An invite email has been sent to the agent.',
      })
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
      reset()
      setCreateOpen(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to create agent', { description: err.message })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ agentId, isActive }: { agentId: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update agent')
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'Agent reactivated' : 'Agent suspended')
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
      setSuspendTarget(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to update agent', { description: err.message })
    },
  })

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-orayn-gray">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} total
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} />
          Create Agent
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-orayn-mid rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-orayn-mid">
                <th className="table-header">Agent Code</th>
                <th className="table-header">Full Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Status</th>
                <th className="table-header">Deals This Month</th>
                <th className="table-header">All-Time Deals</th>
                <th className="table-header">Joined</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={8} />
                ))
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Users}
                      title="No agents yet"
                      description="Create your first agent to get started. They will receive an invite email."
                      action={
                        <button
                          onClick={() => setCreateOpen(true)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <UserPlus size={16} />
                          Create First Agent
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-orayn-mid last:border-0 hover:bg-orayn-light/40 transition-colors"
                  >
                    <td className="table-cell">
                      <span className="font-mono text-sm font-bold text-orayn-gold">
                        {agent.agent_code}
                      </span>
                    </td>
                    <td className="table-cell font-semibold text-orayn-navy">
                      {agent.full_name}
                    </td>
                    <td className="table-cell text-orayn-gray text-sm">
                      {agent.email}
                    </td>
                    <td className="table-cell">
                      {agent.is_active ? (
                        <span className="badge bg-orayn-green-bg text-orayn-green flex items-center gap-1 w-fit">
                          <CheckCircle size={11} />
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-orayn-red-bg text-orayn-red flex items-center gap-1 w-fit">
                          <XCircle size={11} />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="table-cell font-semibold text-orayn-navy text-center">
                      {agent.deals_this_month}
                    </td>
                    <td className="table-cell font-semibold text-orayn-navy text-center">
                      {agent.all_time_deals}
                    </td>
                    <td className="table-cell text-orayn-gray text-xs">
                      {formatDateWAT(agent.created_at, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          if (agent.is_active) {
                            setSuspendTarget(agent)
                          } else {
                            toggleActiveMutation.mutate({
                              agentId: agent.id,
                              isActive: true,
                            })
                          }
                        }}
                        disabled={toggleActiveMutation.isPending}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors
                          ${agent.is_active
                            ? 'text-orayn-red hover:text-orayn-red/80'
                            : 'text-orayn-green hover:text-orayn-green/80'
                          } disabled:opacity-50`}
                      >
                        {agent.is_active ? (
                          <>
                            <ToggleRight size={14} />
                            Suspend
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={14} />
                            Reactivate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Agent Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset() }} title="Create Agent">
        <form
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          noValidate
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-orayn-text mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              {...register('fullName')}
              className={`input-field ${errors.fullName ? 'input-error' : ''}`}
              placeholder="e.g. Adaeze Okonkwo"
            />
            {errors.fullName && (
              <p className="text-xs text-orayn-red mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-orayn-text mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              placeholder="agent@example.com"
            />
            {errors.email && (
              <p className="text-xs text-orayn-red mt-1">{errors.email.message}</p>
            )}
            <p className="text-xs text-orayn-gray mt-1">
              An invite email will be sent to this address.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-orayn-text mb-1.5">
              Agent Code
            </label>
            <input
              type="text"
              {...register('agentCode')}
              className={`input-field font-mono ${errors.agentCode ? 'input-error' : ''}`}
              placeholder="AGENT-004"
            />
            {errors.agentCode && (
              <p className="text-xs text-orayn-red mt-1">{errors.agentCode.message}</p>
            )}
            <p className="text-xs text-orayn-gray mt-1">
              Format: AGENT-001. This code identifies the agent in the Sales tab and leaderboard.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCreateOpen(false); reset() }}
              disabled={createMutation.isPending}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create and Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Suspend confirmation */}
      <ConfirmModal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) {
            toggleActiveMutation.mutate({ agentId: suspendTarget.id, isActive: false })
          }
        }}
        title="Suspend Agent"
        description={`Are you sure you want to suspend ${suspendTarget?.full_name} (${suspendTarget?.agent_code})? They will lose access immediately and will not be able to sign in.`}
        confirmLabel="Suspend Agent"
        loading={toggleActiveMutation.isPending}
      />
    </>
  )
}
