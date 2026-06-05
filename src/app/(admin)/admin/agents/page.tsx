import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AgentManagementClient } from '@/components/admin/agent-management-client'

export const metadata = {
  title: 'Agent Management — market.zone Admin',
}

export default function AdminAgentsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          Agent Management
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Create, suspend, and monitor all sales agents.
        </p>
      </div>
      <ErrorBoundary>
        <AgentManagementClient />
      </ErrorBoundary>
    </div>
  )
}
