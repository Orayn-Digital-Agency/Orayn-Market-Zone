import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AdminLeadsClient } from '@/components/admin/admin-leads-client'

export const metadata = {
  title: 'All Leads — market.zone Admin',
}

export default function AdminLeadsPage() {
  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          All Leads
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Full pipeline visibility. You can see agent names and manually release any lead.
        </p>
      </div>
      <ErrorBoundary>
        <AdminLeadsClient />
      </ErrorBoundary>
    </div>
  )
}
