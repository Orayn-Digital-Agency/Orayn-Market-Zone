import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { AppShell } from '@/components/layout/app-shell'

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  )
}
