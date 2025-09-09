import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDebugLog } from '@/app/api/debug-logs/route'

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
  const maxDistanceScore = 50
  const distanceScore = Math.max(0, maxDistanceScore * (1 - distance / maxRadius))
  
  // Time overlap score (0-50 points): more overlap is better
  const maxTimeScore = 50
  const timeScore = Math.min(maxTimeScore, (overlapMinutes / 60) * 10) // 10 points per hour
  
  return Math.round(distanceScore + timeScore)
}

// Fast geographic pre-filtering using Euclidean distance approximation
function getRoughDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const degToKm = 111.32 // Rough conversion: 1 degree ≈ 111.32 km
  const dLat = Math.abs(lat2 - lat1) * degToKm
  const dLon = Math.abs(lon2 - lon1) * degToKm * Math.cos((lat1 + lat2) * Math.PI / 360)
  return Math.sqrt(dLat * dLat + dLon * dLon)
}

// Time-based pre-filtering
function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1)
  const e1 = new Date(end1)
  const s2 = new Date(start2)
  const e2 = new Date(end2)
  
  return s1 < e2 && s2 < e1
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Admin: Starting silent rebuild of all matches...')
    addDebugLog('🔧 Admin: Starting silent rebuild of all matches', 'admin')

    const startTime = Date.now()

    // Get all current Free4 events
    const { data: allEvents, error: eventsError } = await supabase
      .from('free4_events')
      .select(`
        *,
        profiles!free4_events_user_id_fkey (
          id, full_name, avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      throw eventsError
    }

    if (!allEvents || allEvents.length === 0) {
      console.log('No events found, nothing to process')
      return NextResponse.json({ 
        success: true, 
        message: 'No events found',
        stats: { processed: 0, matches: 0, timeMs: Date.now() - startTime }
      })
    }

    console.log(`📊 Processing ${allEvents.length} events for match calculation...`)

    // Clear all existing matches first
    const { error: clearError } = await supabase
      .from('matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (clearError) {
      console.error('Error clearing matches:', clearError)
      throw clearError
    }

    console.log('🗑️ Cleared all existing matches')

    // Get all friendships to determine who can match with whom
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')

    if (friendshipsError) throw friendshipsError

    // Create friendship lookup for fast access
    const friendshipLookup = new Set<string>()
    friendships?.forEach(friendship => {
      friendshipLookup.add(`${friendship.requester_id}-${friendship.addressee_id}`)
      friendshipLookup.add(`${friendship.addressee_id}-${friendship.requester_id}`)
    })

    console.log(`👥 Found ${friendships?.length || 0} friendships`)

    let totalMatches = 0
    let totalCalculations = 0
    let skippedByTime = 0
    let skippedByDistance = 0
    let skippedByFriendship = 0

    // Process all event pairs
    for (let i = 0; i < allEvents.length; i++) {
      const event1 = allEvents[i]
      
      for (let j = i + 1; j < allEvents.length; j++) {
        const event2 = allEvents[j]
        totalCalculations++

        // Skip if same user
        if (event1.user_id === event2.user_id) {
          continue
        }

        // Skip if not friends
        const areFriends = friendshipLookup.has(`${event1.user_id}-${event2.user_id}`)
        if (!areFriends) {
          skippedByFriendship++
          continue
        }

        // Time-based pre-filtering
        if (!hasTimeOverlap(event1.start_time, event1.end_time, event2.start_time, event2.end_time)) {
          skippedByTime++
          continue
        }

        // Skip online events (can't have geographic matches)
        if (event1.location_type === 'online' || event2.location_type === 'online') {
          continue
        }

        // Geographic pre-filtering with rough distance
        const roughDistance = getRoughDistance(
          event1.latitude, event1.longitude,
          event2.latitude, event2.longitude
        )
        const maxRadius = Math.max(event1.radius_km, event2.radius_km)
        
        if (roughDistance > maxRadius * 1.5) { // 50% buffer for approximation errors
          skippedByDistance++
          continue
        }

        // Calculate precise distance
        const distance = calculateDistance(
          event1.latitude, event1.longitude,
          event2.latitude, event2.longitude
        )

        // Check if within radius
        if (distance > maxRadius) {
          skippedByDistance++
          continue
        }

        // Calculate time overlap details
        const timeOverlap = calculateTimeOverlap(
          event1.start_time, event1.end_time,
          event2.start_time, event2.end_time
        )

        if (!timeOverlap.overlap || timeOverlap.minutes < 30) {
          continue
        }

        // Calculate match score
        const matchScore = calculateMatchScore(distance, timeOverlap.minutes, maxRadius)

        // Create bidirectional matches
        const matches = [
          {
            user_free4_id: event1.id,
            matched_free4_id: event2.id,
            distance_km: Math.round(distance * 100) / 100,
            overlap_start: timeOverlap.start,
            overlap_end: timeOverlap.end,
            overlap_duration_minutes: timeOverlap.minutes,
            match_score: matchScore,
            created_at: new Date().toISOString()
          },
          {
            user_free4_id: event2.id,
            matched_free4_id: event1.id,
            distance_km: Math.round(distance * 100) / 100,
            overlap_start: timeOverlap.start,
            overlap_end: timeOverlap.end,
            overlap_duration_minutes: timeOverlap.minutes,
            match_score: matchScore,
            created_at: new Date().toISOString()
          }
        ]

        // Insert matches
        const { error: insertError } = await supabase
          .from('matches')
          .insert(matches)

        if (insertError) {
          console.error('Error inserting match:', insertError)
        } else {
          totalMatches++
        }
      }
    }

    const processingTime = Date.now() - startTime

    const summary = {
      success: true,
      message: 'Silent match rebuild completed successfully',
      stats: {
        totalEvents: allEvents.length,
        totalCalculations,
        matchesFound: totalMatches,
        skippedByTime,
        skippedByDistance,
        skippedByFriendship,
        friendships: friendships?.length || 0,
        processingTimeMs: processingTime,
        efficiency: `${Math.round(((skippedByTime + skippedByDistance + skippedByFriendship) / totalCalculations) * 100)}% filtered`
      }
    }

    console.log('🎯 Silent match rebuild completed:', summary.stats)
    addDebugLog(`🎯 Silent match rebuild completed: ${totalMatches} matches found in ${processingTime}ms`, 'admin')

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ Admin match rebuild error:', error)
    addDebugLog(`❌ Admin match rebuild error: ${error.message}`, 'error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to rebuild matches',
        details: error.message 
      },
      { status: 500 }
    )
  }
}