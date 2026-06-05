import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SalesTable } from '@/components/sales/sales-table'

export const metadata = {
  title: 'Sales — market.zone',
}

export default function SalesPage() {
  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-orayn-navy">
          Sales
        </h1>
        <p className="text-sm text-orayn-gray mt-1">
          Claim leads, send demos, and close deals. All changes sync instantly.
        </p>
      </div>
      <ErrorBoundary>
        <SalesTable />
      </ErrorBoundary>
    </div>
  )
}
