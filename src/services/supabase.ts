import { createClient } from '@supabase/supabase-js'

// Test if environment variables are loaded
//console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
//console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
    db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  // Add connection pooling
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})