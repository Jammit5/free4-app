import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

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

// Rough distance check for pre-filtering (much faster than Haversine)
function getRoughDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Simple Euclidean distance approximation (good enough for pre-filtering)
  const latDiff = Math.abs(lat1 - lat2)
  const lonDiff = Math.abs(lon1 - lon2)
  
  // Rough conversion: 1 degree ≈ 111km (at Berlin latitude ~52°)
  const latKm = latDiff * 111
  const lonKm = lonDiff * 111 * Math.cos(lat1 * Math.PI / 180)
  
  return Math.sqrt(latKm * latKm + lonKm * lonKm)
}

// Filter events by time and location relevance  
function filterRelevantEvents(userEvent: any, friendEvents: any[]): any[] {
  const userStart = new Date(userEvent.start_time)
  const userEnd = new Date(userEvent.end_time)
  const maxSearchRadius = 50 // km - generous search radius for pre-filtering
  
  return friendEvents.filter(friendEvent => {
    // 1. Time overlap check (quick)
    const friendStart = new Date(friendEvent.start_time)
    const friendEnd = new Date(friendEvent.end_time)
    
    if (userEnd <= friendStart || userStart >= friendEnd) {
      return false // No time overlap possible
    }
    
    // 2. Skip events without coordinates
    if (!friendEvent.latitude || !friendEvent.longitude) {
      return false
    }
    
    // 3. Rough geographic check (much faster than precise Haversine)
    const roughDistance = getRoughDistance(
      userEvent.latitude, userEvent.longitude,
      friendEvent.latitude, friendEvent.longitude
    )
    
    const combinedRadius = (userEvent.radius_km || 5) + (friendEvent.radius_km || 5)
    return roughDistance <= (combinedRadius + maxSearchRadius)
  })
}

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null
    
    // Try to parse JSON body, fallback to URL params if empty body
    try {
      const body = await request.json()
      userId = body.userId
    } catch (jsonError) {
      // If JSON parsing fails, try to get userId from URL params
      const url = new URL(request.url)
      userId = url.searchParams.get('userId')
    }
    
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required in body or query params' }, { status: 400 })
    }

    // Use same token-based authentication as GET route
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Manual JWT token validation (same as GET route)
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
      
    } catch (error) {
      console.error('POST: Token validation failed:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Create service client for DB operations (user already validated)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const currentTime = new Date().toISOString()
    
    // Get all user's Free4 events using service client (user already validated)
    const { data: userEvents, error: userEventsError } = await serviceSupabase
      .from('free4_events')
      .select('*')
      .eq('user_id', userId)
      .gte('end_time', currentTime) // Only future events
    
    if (userEventsError) {
      console.error('Error fetching user events:', userEventsError)
      return NextResponse.json({ error: 'Failed to fetch user events' }, { status: 500 })
    }


    if (!userEvents || userEvents.length === 0) {
      return NextResponse.json({ matches: [], message: 'No future events found' })
    }

    // Get user's friends
    const { data: friendships } = await serviceSupabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ matches: [], message: 'No friends found' })
    }

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
      return NextResponse.json({ matches: [], message: 'No friend events found' })
    }



    // Calculate all matches with optimized filtering
    const allMatches = []

    for (const userEvent of userEvents) {
      // Skip events without location
      if (!userEvent.latitude || !userEvent.longitude) {
        continue
      }

      // Pre-filter friend events by time and rough location
      const relevantFriendEvents = filterRelevantEvents(userEvent, friendEvents)

      for (const friendEvent of relevantFriendEvents) {
        
        // Note: Coordinate and rough time/distance checks already done in pre-filtering
        // Only precise calculations needed now

        // Calculate precise distance
        const distance = calculateDistance(
          userEvent.latitude,
          userEvent.longitude, 
          friendEvent.latitude,
          friendEvent.longitude
        )

        // Check if within radius (use larger radius for checking)
        const maxRadius = Math.max(userEvent.radius_km, friendEvent.radius_km)
        
        if (distance > maxRadius) {
          continue
        }

        // Calculate time overlap
        const timeOverlap = calculateTimeOverlap(
          userEvent.start_time,
          userEvent.end_time,
          friendEvent.start_time,
          friendEvent.end_time
        )

        if (!timeOverlap.overlap || timeOverlap.minutes < 30) {
          continue // Minimum 30 min overlap
        }

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


    if (allMatches.length === 0) {
      return NextResponse.json({ matches: [], message: 'No matches found' })
    }

    // Clear existing matches for this user (both directions)
    const { error: deleteError } = await serviceSupabase
      .from('matches')
      .delete()
      .or(`user_free4_id.in.(${userEvents.map(e => e.id).join(',')}),matched_free4_id.in.(${userEvents.map(e => e.id).join(',')})`)

    if (deleteError) {
      console.error('Error deleting old matches:', deleteError)
    }

    // Insert new matches with upsert to handle duplicates
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


    // Send push notifications for new matches (only if we have matches)
    if (insertedMatches && insertedMatches.length > 0) {
      try {
        await sendMatchNotifications(insertedMatches, serviceSupabase)
      } catch (pushError) {
        // Don't fail the main request if push notifications fail
      }
    }

    return NextResponse.json({ 
      matches: insertedMatches,
      message: `Found ${allMatches.length} matches`
    })

  } catch (error) {
    console.error('POST Match calculation error:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Function to send match notifications with deduplication and creator exclusion
async function sendMatchNotifications(insertedMatches: any[], serviceSupabase: any) {
  try {
    
    // Use the inserted matches directly, they already contain the needed data
    const matchDetails = insertedMatches

    if (!matchDetails || matchDetails.length === 0) {
      return
    }

    // Get event details separately for both user and matched events
    const allEventIds = [
      ...matchDetails.map(m => m.user_free4_id),
      ...matchDetails.map(m => m.matched_free4_id)
    ]

    
    const { data: eventDetails } = await serviceSupabase
      .from('free4_events')
      .select('id, user_id, created_at, title')
      .in('id', allEventIds)
    

    if (!eventDetails || eventDetails.length === 0) {
      return
    }

    // Create a map of event ID to event details for easy lookup
    const eventMap = new Map(eventDetails.map(event => [event.id, event]))

    // Process each match to determine who should get notifications
    const notificationsToSend: { matchId: string, userId: string, isCreator: boolean }[] = []
    
    for (const match of matchDetails) {
      const userEvent = eventMap.get(match.user_free4_id)
      const matchedEvent = eventMap.get(match.matched_free4_id)
      
      if (!userEvent || !matchedEvent) {
        continue
      }

      // Determine who created the most recent event (should be excluded from notification)
      const userEventTime = new Date(userEvent.created_at)
      const matchedEventTime = new Date(matchedEvent.created_at)
      const mostRecentCreatorId = userEventTime > matchedEventTime ? userEvent.user_id : matchedEvent.user_id


      // Add notifications for both users, marking the recent creator
      notificationsToSend.push({
        matchId: match.id,
        userId: userEvent.user_id,
        isCreator: userEvent.user_id === mostRecentCreatorId
      })
      
      notificationsToSend.push({
        matchId: match.id,
        userId: matchedEvent.user_id,
        isCreator: matchedEvent.user_id === mostRecentCreatorId
      })
    }

    // Filter out creators and check for already sent notifications
    const potentialNotifications = notificationsToSend.filter(notif => !notif.isCreator)
    
    if (potentialNotifications.length === 0) {
      return
    }

    // Check which notifications have already been sent
    const { data: alreadySent } = await supabase
      .from('match_notifications_sent')
      .select('match_id, user_id')
      .in('match_id', potentialNotifications.map(n => n.matchId))
      .in('user_id', potentialNotifications.map(n => n.userId))

    const alreadySentSet = new Set(
      (alreadySent || []).map(sent => `${sent.match_id}-${sent.user_id}`)
    )

    // Filter out already sent notifications
    const newNotifications = potentialNotifications.filter(notif => 
      !alreadySentSet.has(`${notif.matchId}-${notif.userId}`)
    )

    if (newNotifications.length === 0) {
      return
    }

    // Group notifications by user and count matches per user
    const userMatchCounts = new Map<string, number>()
    newNotifications.forEach(notif => {
      const current = userMatchCounts.get(notif.userId) || 0
      userMatchCounts.set(notif.userId, current + 1)
    })

    const userIdsToNotify = Array.from(userMatchCounts.keys())
    
    console.log(`📬 DEBUG: Sending match notifications to ${userIdsToNotify.length} users:`, userIdsToNotify)
    console.log(`📬 DEBUG: Match counts per user:`, Object.fromEntries(userMatchCounts))

    // Send push notifications
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: userIdsToNotify,
        type: 'new_matches',
        data: {
          matchCount: Array.from(userMatchCounts.values()).reduce((sum, count) => sum + count, 0)
        }
      })
    })

    if (response.ok) {
      
      // Track notifications as sent
      const notificationRecords = newNotifications.map(notif => ({
        match_id: notif.matchId,
        user_id: notif.userId,
        sent_at: new Date().toISOString()
      }))

      const { error: insertError } = await serviceSupabase
        .from('match_notifications_sent')
        .insert(notificationRecords)

      if (insertError) {
        console.error('Error tracking sent notifications:', insertError)
      }
    } else {
      console.error('Failed to send push notifications:', await response.text())
    }

  } catch (error) {
    console.error('Error in sendMatchNotifications:', error)
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
      
    } catch (error) {
      console.error('GET: Token validation failed:', error instanceof Error ? error.message : String(error))
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
    const { data: matches, error } = await authenticatedSupabase
      .from('match_details')
      .select('*')
      .or(`user_free4_id.in.(${userEventIds.join(',')}),matched_free4_id.in.(${userEventIds.join(',')})`)
      .eq('status', 'active')
      .order('match_score', { ascending: false })

    if (error) {
      console.error('Failed to fetch matches:', error)
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }

    return NextResponse.json({ matches: matches || [] })

  } catch (error) {
    console.error('GET matches error:', error)
    console.error('GET Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}