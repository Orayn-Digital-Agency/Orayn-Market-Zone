// @ts-nocheck
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { NotificationsPageClient } from '@/components/layout/notifications-page-client'

export const metadata = {
  title: 'Notifications — market.zone',
}

export default async function NotificationsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  // agent may be null for admin account - use user.id as fallback
  const agentId = user.agent?.id ?? user.id

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          Notifications
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Lead updates, auto-releases, and payout confirmations.
        </p>
      </div>
      <NotificationsPageClient agentId={agentId} />
    </div>
  )
}
