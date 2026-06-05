'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Eye, EyeOff, User, Key } from 'lucide-react'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

interface SettingsClientProps {
  email: string
  agentCode: string | null
}

export function SettingsClient({ email, agentCode }: SettingsClientProps) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(values: PasswordFormValues) {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: values.currentPassword,
    })

    if (signInError) {
      setLoading(false)
      toast.error('Current password is incorrect')
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: values.newPassword,
    })
    setLoading(false)

    if (error) {
      toast.error('Failed to update password', { description: error.message })
      return
    }

    toast.success('Password updated successfully')
    reset()
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-orayn-mid">
          <div className="w-10 h-10 bg-orayn-navy rounded-full flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-orayn-text text-sm">{email}</p>
            {agentCode && (
              <p className="text-xs text-orayn-gold font-semibold">{agentCode}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-orayn-gray">
          Your account is managed by your admin. Contact your admin to update your email address or agent code.
        </p>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <Key size={16} className="text-orayn-navy" />
          <h2 className="font-sora text-base font-semibold text-orayn-navy">
            Change Password
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {(
            [
              { id: 'currentPassword', label: 'Current password', show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
              { id: 'newPassword',     label: 'New password',     show: showNew,     toggle: () => setShowNew((v) => !v) },
              { id: 'confirmPassword', label: 'Confirm new password', show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
            ] as const
          ).map(({ id, label, show, toggle }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-semibold text-orayn-text mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  id={id}
                  type={show ? 'text' : 'password'}
                  autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
                  {...register(id)}
                  className={`input-field pr-10 ${errors[id] ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-orayn-gray hover:text-orayn-navy transition-colors"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors[id] && (
                <p className="text-xs text-orayn-red mt-1">{errors[id]?.message}</p>
              )}
            </div>
          ))}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
