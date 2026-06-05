import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SettingsClient } from '@/components/ui/settings-client'

export const metadata = {
  title: 'Settings — market.zone',
}

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          Settings
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Manage your account credentials.
        </p>
      </div>
      <SettingsClient email={user.email} agentCode={user.agent?.agent_code ?? null} />
    </div>
  )
}
