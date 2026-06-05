import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PayoutsDashboardClient } from '@/components/admin/payouts-dashboard-client'

export const metadata = {
  title: 'Payouts — market.zone Admin',
}

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          Payouts
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Monthly commission summaries. Mark payouts as paid after transferring to agents.
        </p>
      </div>
      <ErrorBoundary>
        <PayoutsDashboardClient />
      </ErrorBoundary>
    </div>
  )
}
