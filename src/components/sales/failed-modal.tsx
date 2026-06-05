'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Modal } from '@/components/ui/modal'
import type { Lead, LossReason } from '@/types/supabase'
import { toast } from 'sonner'
import { XCircle } from 'lucide-react'

interface FailedModalProps {
  open: boolean
  onClose: () => void
  lead: Lead
  agentId: string
}

const LOSS_REASONS: { value: LossReason; label: string }[] = [
  { value: 'price_too_high',        label: 'Price too high' },
  { value: 'not_interested',        label: 'Not interested' },
  { value: 'no_response',           label: 'No response' },
  { value: 'went_with_competitor',  label: 'Went with a competitor' },
  { value: 'other',                 label: 'Other' },
]

const schema = z.object({
  lossReason: z.enum(
    ['price_too_high', 'not_interested', 'no_response', 'went_with_competitor', 'other'],
    { errorMap: () => ({ message: 'Select a reason' }) }
  ),
})

type FormValues = z.infer<typeof schema>

export function FailedModal({ open, onClose, lead, agentId }: FailedModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const failMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const supabase = createSupabaseBrowserClient()

      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'lost', loss_reason: values.lossReason })
        .eq('id', lead.id)
      if (leadError) throw leadError

      await supabase.from('activity_log').insert({
        agent_id: agentId,
        lead_id: lead.id,
        action: 'lost',
        metadata: { loss_reason: values.lossReason },
      })
    },
    onSuccess: () => {
      toast.error('Lead marked as failed', {
        description: `${lead.business_name} has been archived.`,
      })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['activity-log'] })
      reset()
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Failed to update lead', { description: err.message })
    },
  })

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Mark as Failed" maxWidth="max-w-sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-orayn-red-bg rounded-lg">
          <XCircle size={20} className="text-orayn-red flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-orayn-red">{lead.business_name}</p>
            <p className="text-xs text-orayn-gray mt-0.5">
              This lead will be archived and removed from your active pipeline.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((v) => failMutation.mutate(v))}
          noValidate
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="lossReason"
              className="block text-sm font-semibold text-orayn-text mb-1.5"
            >
              Reason for failure
            </label>
            <select
              id="lossReason"
              {...register('lossReason')}
              className={`input-field ${errors.lossReason ? 'input-error' : ''}`}
              defaultValue=""
            >
              <option value="" disabled>
                Select a reason...
              </option>
              {LOSS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.lossReason && (
              <p className="text-xs text-orayn-red mt-1">{errors.lossReason.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={failMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={failMutation.isPending}
              className="btn-danger flex items-center gap-2"
            >
              {failMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Marking...
                </>
              ) : (
                'Mark as Failed'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
