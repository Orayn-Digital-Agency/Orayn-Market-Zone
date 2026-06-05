import type { ReactNode } from 'react'

// This layout intentionally has no AppShell wrapper.
// The parent (admin)/layout.tsx in the route group already wraps
// all admin pages in AppShell. Adding it here causes a double sidebar.
export default function AdminInnerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
