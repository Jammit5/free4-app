import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  // Get session cookie
  const sessionCookie = cookieStore.get('supabase-auth-token')
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: sessionCookie ? {
          Authorization: `Bearer ${sessionCookie.value}`
        } : {}
      }
    }
  )
}