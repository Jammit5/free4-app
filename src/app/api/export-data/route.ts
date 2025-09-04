import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get authenticated user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Collect all user data for GDPR Art. 20 compliance
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        export_reason: 'GDPR Art. 20 - Right to data portability'
      },
      user_profile: null,
      events: [],
      friendships: [],
      matches: [],
      push_subscriptions: []
    }

    // 1. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile && !profileError) {
      exportData.user_profile = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        name_changed_at: profile.name_changed_at
      }
    }

    // 2. Get user events
    const { data: events, error: eventsError } = await supabase
      .from('free4_events')
      .select('*')
      .eq('user_id', user.id)

    if (events && !eventsError) {
      exportData.events = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
        latitude: event.latitude,
        longitude: event.longitude,
        location_name: event.location_name,
        radius_km: event.radius_km,
        created_at: event.created_at,
        updated_at: event.updated_at
      }))
    }

    // 3. Get friendships
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select(`
        *,
        requester_profile:requester_id(full_name, email),
        addressee_profile:addressee_id(full_name, email)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (friendships && !friendshipsError) {
      exportData.friendships = friendships.map(friendship => ({
        id: friendship.id,
        status: friendship.status,
        created_at: friendship.created_at,
        updated_at: friendship.updated_at,
        role: friendship.requester_id === user.id ? 'requester' : 'addressee',
        friend_name: friendship.requester_id === user.id 
          ? friendship.addressee_profile?.full_name 
          : friendship.requester_profile?.full_name,
        friend_email: friendship.requester_id === user.id 
          ? friendship.addressee_profile?.email 
          : friendship.requester_profile?.email
      }))
    }

    // 4. Get matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        user1_profile:user1_id(full_name, email),
        user2_profile:user2_id(full_name, email),
        user1_event:user1_event_id(title, start_time, end_time, location_name),
        user2_event:user2_event_id(title, start_time, end_time, location_name)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (matches && !matchesError) {
      exportData.matches = matches.map(match => ({
        id: match.id,
        distance_km: match.distance_km,
        overlap_minutes: match.overlap_minutes,
        score: match.score,
        meeting_point_lat: match.meeting_point_lat,
        meeting_point_lng: match.meeting_point_lng,
        created_at: match.created_at,
        role: match.user1_id === user.id ? 'user1' : 'user2',
        match_partner: match.user1_id === user.id 
          ? match.user2_profile?.full_name 
          : match.user1_profile?.full_name,
        my_event: match.user1_id === user.id 
          ? match.user1_event 
          : match.user2_event,
        partner_event: match.user1_id === user.id 
          ? match.user2_event 
          : match.user1_event
      }))
    }

    // 5. Get push subscriptions
    const { data: pushSubs, error: pushError } = await supabase
      .from('push_subscriptions')
      .select('user_id, created_at')
      .eq('user_id', user.id)

    if (pushSubs && !pushError) {
      exportData.push_subscriptions = pushSubs.map(sub => ({
        user_id: sub.user_id,
        created_at: sub.created_at,
        status: 'active'
      }))
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `free4-data-export-${timestamp}.json`

    // Return JSON data as downloadable file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}