'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseBrowserClient(): any {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
