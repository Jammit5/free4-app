import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Admin stats API called')

    // Get user email from session (this would be better with proper auth)
    // For now, we'll rely on client-side verification in the modal
    
    // Query 1: Total Users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (usersError) {
      console.error('Error fetching total users:', usersError)
      throw usersError
    }

    // Query 2: Active Users (24 hours) - users with events or matches in last 24h
    // We'll check for users who have created events or have matches in the last 24 hours
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    
    const { data: activeUsersData, error: activeUsersError } = await supabase
      .rpc('get_active_users_count', { 
        hours_ago: 24 
      })
    
    // If the stored procedure doesn't exist, let's use a simpler approach
    let activeUsers = 0
    if (activeUsersError || !activeUsersData) {
      console.log('Using fallback method for active users')
      // Fallback: users who created events in last 24h
      const { data: recentEvents, error: recentEventsError } = await supabase
        .from('free4_events')
        .select('user_id')
        .gte('created_at', twentyFourHoursAgo.toISOString())
      
      if (!recentEventsError && recentEvents) {
        // Count unique user IDs
        const uniqueUserIds = new Set(recentEvents.map(event => event.user_id))
        activeUsers = uniqueUserIds.size
      }
    } else {
      activeUsers = activeUsersData || 0
    }

    // Query 3: Total Events
    const { count: totalEvents, error: eventsError } = await supabase
      .from('free4_events')
      .select('*', { count: 'exact', head: true })
    
    if (eventsError) {
      console.error('Error fetching total events:', eventsError)
      throw eventsError
    }

    // Query 4: Total Matches (unique match pairs)
    // Each match appears twice in the matches table (bidirectional), so we need to count unique pairs
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('user_free4_id, matched_free4_id')
    
    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      throw matchesError
    }

    // Count unique match pairs (avoid double counting bidirectional matches)
    const uniqueMatches = new Set()
    matchesData?.forEach(match => {
      const pair = [match.user_free4_id, match.matched_free4_id].sort().join('-')
      uniqueMatches.add(pair)
    })
    
    const totalMatches = uniqueMatches.size

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalEvents: totalEvents || 0,
      totalMatches: totalMatches || 0
    }

    console.log('📊 Admin stats calculated:', stats)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error: any) {
    console.error('❌ Admin stats API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch admin statistics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}