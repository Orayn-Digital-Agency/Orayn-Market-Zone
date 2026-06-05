"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function AgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Agent route error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 bg-orayn-red-bg rounded-full flex items-center justify-center mb-5">
        <AlertTriangle size={26} className="text-orayn-red" />
      </div>
      <h2 className="font-sora text-xl font-bold text-orayn-navy mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-orayn-gray mb-6 max-w-sm">
        {error.message || "An unexpected error occurred loading this page. Please try again."}
      </p>
      <button onClick={reset} className="btn-primary flex items-center gap-2">
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  )
}
