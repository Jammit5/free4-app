import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type Profile = {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type Free4Event = {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location_type: 'physical' | 'online'
  location_name?: string
  latitude?: number
  longitude?: number
  radius_km: number
  visibility: 'all_friends' | 'selected_friends' | 'groups' | 'overlap_only'
  auto_delete_after?: string
  created_at: string
  updated_at: string
}

export type FriendGroup = {
  id: string
  owner_id: string
  name: string
  created_at: string
}