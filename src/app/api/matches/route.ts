import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate time overlap between two events
function calculateTimeOverlap(start1: string, end1: string, start2: string, end2: string) {
  const s1 = new Date(start1)
  const e1 = new Date(end1)
  const s2 = new Date(start2)
  const e2 = new Date(end2)
  
  const overlapStart = new Date(Math.max(s1.getTime(), s2.getTime()))
  const overlapEnd = new Date(Math.min(e1.getTime(), e2.getTime()))
  
  if (overlapStart >= overlapEnd) {
    return { overlap: false, start: null, end: null, minutes: 0 }
  }
  
  const minutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
  return {
    overlap: true,
    start: overlapStart.toISOString(),
    end: overlapEnd.toISOString(),
    minutes: Math.round(minutes)
  }
}

// Calculate match score (0-100)
function calculateMatchScore(distance: number, overlapMinutes: number, maxRadius: number): number {
  // Distance score (0-50 points): closer is better
  const distanceScore = Math.max(0, 50 - (distance / maxRadius) * 50)
  
  // Time overlap score (0-50 points): longer overlap is better
  const maxOverlapScore = 50
  const timeScore = Math.min(maxOverlapScore, (overlapMinutes / 60) * 20) // 1 hour = 20 points
  
  return Math.round(distanceScore + timeScore)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    console.log(`🚀 POST /api/matches called for userId: ${userId}`)
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get the authorization header to validate the user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Create service client for DB operations (user already validated via JWT)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Manual JWT token validation (since auth.getUser() doesn't work server-side)
    let tokenUserId: string
    try {
      // JWT tokens have 3 parts separated by dots
      const [, payloadBase64] = token.split('.')
      if (!payloadBase64) {
        throw new Error('Invalid token format')
      }
      
      // Decode the payload
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())
      tokenUserId = payload.sub
      
      if (!tokenUserId || tokenUserId !== userId) {
        throw new Error('User ID mismatch')
      }
      
      console.log('🔐 Validated user from token:', tokenUserId)
    } catch (error) {
      console.error('❌ Token validation failed:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const currentTime = new Date().toISOString()
    console.log(`⏰ Current time: ${currentTime}`)
    
    // Get all user's Free4 events using service client (user already validated)
    console.log(`🔍 Searching for events with userId: ${userId}, after: ${currentTime}`)
    const { data: userEvents, error: userEventsError } = await serviceSupabase
      .from('free4_events')
      .select('*')
      .eq('user_id', userId)
      .gte('end_time', currentTime) // Only future events
    
    if (userEventsError) {
      console.error('❌ Error fetching user events:', userEventsError)
      return NextResponse.json({ error: 'Failed to fetch user events' }, { status: 500 })
    }

    console.log(`📅 Found ${userEvents?.length || 0} user events`)
    if (userEvents && userEvents.length > 0) {
      console.log('📝 User events:', userEvents.map(e => ({ id: e.id, title: e.title, end_time: e.end_time })))
    }

    if (!userEvents || userEvents.length === 0) {
      console.log('⚠️ No future events found for user')
      return NextResponse.json({ matches: [], message: 'No future events found' })
    }

    // Get user's friends
    const { data: friendships } = await serviceSupabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (!friendships || friendships.length === 0) {
      console.log('👥 No friends found')
      return NextResponse.json({ matches: [], message: 'No friends found' })
    }

    console.log(`👥 Found ${friendships.length} friendships`)
    const friendIds = friendships.map(f => 
      f.requester_id === userId ? f.addressee_id : f.requester_id
    )

    // Get all friend events
    const { data: friendEvents } = await serviceSupabase
      .from('free4_events')
      .select(`
        *,
        profile:profiles(*)
      `)
      .in('user_id', friendIds)
      .gte('end_time', new Date().toISOString()) // Only future events

    if (!friendEvents || friendEvents.length === 0) {
      console.log('📅 No friend events found')
      return NextResponse.json({ matches: [], message: 'No friend events found' })
    }

    console.log(`📅 Found ${friendEvents.length} friend events`)


    // Calculate all matches
    const allMatches = []

    for (const userEvent of userEvents) {
      // Skip events without location
      if (!userEvent.latitude || !userEvent.longitude) continue

      for (const friendEvent of friendEvents) {
        // Skip events without location
        if (!friendEvent.latitude || !friendEvent.longitude) continue

        // Calculate distance
        const distance = calculateDistance(
          userEvent.latitude,
          userEvent.longitude, 
          friendEvent.latitude,
          friendEvent.longitude
        )

        // Check if within radius (use larger radius for checking)
        const maxRadius = Math.max(userEvent.radius_km, friendEvent.radius_km)
        if (distance > maxRadius) continue

        // Calculate time overlap
        const timeOverlap = calculateTimeOverlap(
          userEvent.start_time,
          userEvent.end_time,
          friendEvent.start_time,
          friendEvent.end_time
        )

        if (!timeOverlap.overlap || timeOverlap.minutes < 30) continue // Minimum 30 min overlap

        // Calculate match score
        const matchScore = calculateMatchScore(distance, timeOverlap.minutes, maxRadius)
        
        // Calculate meeting point (midpoint between locations)
        const meetingLat = (userEvent.latitude + friendEvent.latitude) / 2
        const meetingLng = (userEvent.longitude + friendEvent.longitude) / 2

        // Create unidirectional match - only one per pair (consistent order)
        // Always use the smaller ID as user_free4_id for consistency
        const [smallerId, largerId] = [userEvent.id, friendEvent.id].sort()
        
        const match = {
          user_free4_id: smallerId,
          matched_free4_id: largerId,
          match_score: matchScore,
          overlap_start: timeOverlap.start,
          overlap_end: timeOverlap.end,
          overlap_duration_minutes: timeOverlap.minutes,
          distance_km: Math.round(distance * 100) / 100,
          meeting_point_lat: meetingLat,
          meeting_point_lng: meetingLng,
          status: 'active'
        }

        allMatches.push(match)
      }
    }


    console.log(`🔄 Found ${allMatches.length} potential matches`)

    if (allMatches.length === 0) {
      return NextResponse.json({ matches: [], message: 'No matches found' })
    }

    // Clear existing matches for this user (both directions)
    console.log('🗑️ Clearing existing matches...')
    const { error: deleteError } = await serviceSupabase
      .from('matches')
      .delete()
      .or(`user_free4_id.in.(${userEvents.map(e => e.id).join(',')}),matched_free4_id.in.(${userEvents.map(e => e.id).join(',')})`)

    if (deleteError) {
      console.error('Error deleting old matches:', deleteError)
    }

    // Insert new matches with upsert to handle duplicates
    console.log('💾 Inserting new matches...')
    console.log('📋 Matches to insert:', allMatches.map(m => ({
      user_free4_id: m.user_free4_id,
      matched_free4_id: m.matched_free4_id,
      match_score: m.match_score
    })))
    
    const { data: insertedMatches, error: insertError } = await serviceSupabase
      .from('matches')
      .upsert(allMatches, { 
        onConflict: 'user_free4_id,matched_free4_id',
        ignoreDuplicates: false 
      })
      .select()

    if (insertError) {
      console.error('Error upserting matches:', insertError)
      return NextResponse.json({ error: 'Failed to save matches' }, { status: 500 })
    }

    console.log(`✅ Successfully inserted ${insertedMatches?.length || 0} matches`)

    return NextResponse.json({ 
      matches: insertedMatches,
      message: `Found ${allMatches.length} matches`
    })

  } catch (error) {
    console.error('❌ POST Match calculation error:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET endpoint to retrieve existing matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Manual JWT token validation (same as POST route)
    let tokenUserId: string
    try {
      const [, payloadBase64] = token.split('.')
      if (!payloadBase64) {
        throw new Error('Invalid token format')
      }
      
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())
      tokenUserId = payload.sub
      
      if (!tokenUserId || tokenUserId !== userId) {
        throw new Error('User ID mismatch')
      }
      
      console.log('🔐 GET: Validated user from token:', tokenUserId)
    } catch (error) {
      console.error('❌ GET: Token validation failed:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Create authenticated Supabase client with the user's token
    const authenticatedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get user's Free4 events
    const { data: userEvents } = await authenticatedSupabase
      .from('free4_events')
      .select('id')
      .eq('user_id', userId)

    if (!userEvents || userEvents.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // Get matches using the view with proper RLS (bidirectional search)
    const userEventIds = userEvents.map(e => e.id)
    console.log(`🔍 GET: Searching for matches with user event IDs:`, userEventIds)
    
    const { data: matches, error } = await authenticatedSupabase
      .from('match_details')
      .select('*')
      .or(`user_free4_id.in.(${userEventIds.join(',')}),matched_free4_id.in.(${userEventIds.join(',')})`)
      .eq('status', 'active')
      .order('match_score', { ascending: false })
    
    console.log(`📊 GET: Found ${matches?.length || 0} matches for user ${userId}`)
    console.log(`📋 GET: Matches data:`, matches)

    if (error) {
      console.error('Failed to fetch matches:', error)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    return NextResponse.json({ matches: matches || [] })

  } catch (error) {
    console.error('❌ GET matches error:', error)
    console.error('❌ GET Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}