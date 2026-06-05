'use client'

import { Modal } from '@/components/ui/modal'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  variant?: 'danger' | 'warning'
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  variant = 'danger',
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex items-start gap-3 mb-6">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
            ${variant === 'danger' ? 'bg-orayn-red-bg' : 'bg-orayn-amber-bg'}`}
        >
          <AlertTriangle
            size={20}
            className={variant === 'danger' ? 'text-orayn-red' : 'text-orayn-amber'}
          />
        </div>
        <p className="text-sm text-orayn-gray leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  )
}
