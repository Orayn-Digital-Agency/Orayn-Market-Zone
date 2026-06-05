import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSupabaseServerClient(): Promise<any> {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            )
          } catch { /* Server Component - ignore */ }
        },
      },
    }
  )
}

/**
 * Service role client — bypasses RLS completely.
 * Uses @supabase/supabase-js createClient directly (not @supabase/ssr)
 * to avoid cookie-handling complexity with admin operations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseServiceClient(): any {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}
