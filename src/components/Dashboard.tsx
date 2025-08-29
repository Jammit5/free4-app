'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Free4Event, Profile } from '@/lib/supabase'
import { Plus, LogOut, Users, Calendar, MapPin, User, Heart, X, Copy, RefreshCw } from 'lucide-react'
import CreateEventModal from './CreateEventModal'
import FriendsModal from './FriendsModal'
import ProfileModal from './ProfileModal'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<Free4Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Free4Event | null>(null)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [eventMatches, setEventMatches] = useState<any>({})
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isRefreshingMatches, setIsRefreshingMatches] = useState(false)
  const matchCheckInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProfile()
    loadEvents()
    loadPendingRequestsCount()
  }, [user])

  useEffect(() => {
    if (events.length > 0) {
      findMatchesForEvents()
    }
  }, [events])

  // Set up 5-minute interval for match checking
  useEffect(() => {
    const startMatchInterval = () => {
      // Clear any existing interval
      if (matchCheckInterval.current) {
        clearInterval(matchCheckInterval.current)
      }
      
      // Set up new interval (5 minutes = 300000ms)
      matchCheckInterval.current = setInterval(() => {
        if (events.length > 0) {
          console.log('🔄 Automatic match check (5min interval)')
          findMatchesForEvents()
        }
      }, 300000) // 5 minutes
    }

    if (events.length > 0) {
      startMatchInterval()
    }

    // Cleanup interval on unmount
    return () => {
      if (matchCheckInterval.current) {
        clearInterval(matchCheckInterval.current)
      }
    }
  }, [events.length > 0]) // Only restart when events become available

  const loadPendingRequestsCount = async () => {
    try {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending')

      setPendingRequestsCount(count || 0)
    } catch (error) {
      console.error('Error loading pending requests count:', error)
    }
  }

  const loadProfile = async () => {
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create profile if it doesn't exist
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null
          })
          .select()
          .single()
        
        profile = newProfile
      }

      setProfile(profile)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadEvents = async () => {
    try {
      // First, get all events to check for expired ones
      const { data: allEvents } = await supabase
        .from('free4_events')
        .select('*')
        .eq('user_id', user.id)

      if (allEvents) {
        const now = new Date()
        const expiredEventIds = []
        const activeEvents = []

        // Check each event if it's completely in the past
        for (const event of allEvents) {
          const endTime = new Date(event.end_time)
          if (endTime < now) {
            // Event is completely in the past
            expiredEventIds.push(event.id)
          } else {
            // Event is current or in the future
            activeEvents.push(event)
          }
        }

        // Delete expired events
        if (expiredEventIds.length > 0) {
          console.log(`Deleting ${expiredEventIds.length} expired Free4 events`)
          await supabase
            .from('free4_events')
            .delete()
            .in('id', expiredEventIds)
        }

        // Sort active events by start time
        activeEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        setEvents(activeEvents)
      } else {
        setEvents([])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Möchtest du dieses Event wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('free4_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      // Remove from local state
      setEvents(events.filter(event => event.id !== eventId))
    } catch (error: any) {
      console.error('Error deleting event:', error)
      alert('Fehler beim Löschen: ' + error.message)
    }
  }

  const handleEditEvent = (event: Free4Event) => {
    setEditingEvent(event)
    setShowCreateModal(true)
  }

  const handleCopyEvent = (event: Free4Event) => {
    // Create a copy of the event with the same data but no ID
    const copiedEvent: Free4Event = {
      ...event,
      id: '', // Will be set when saved
      created_at: new Date().toISOString()
    }
    
    setEditingEvent(copiedEvent)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingEvent(null)
  }

  const handleManualMatchCheck = async () => {
    setIsRefreshingMatches(true)
    try {
      console.log('🔄 Manual match check triggered')
      await findMatchesForEvents()
    } finally {
      setIsRefreshingMatches(false)
    }
  }

  const findMatchesForEvents = async () => {
    try {
      console.log('🔍 Starting match search for user:', user.id)
      
      // Get all my friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      console.log('👥 Found friendships:', friendships?.length || 0, friendships)
      
      if (!friendships || friendships.length === 0) {
        console.log('❌ No friends found, skipping match search')
        return
      }

      // Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
      
      console.log('👥 Friend IDs:', friendIds)

      // Debug: Let's see ALL events in the database to understand what's there
      const { data: allEvents, error: allEventsError } = await supabase
        .from('free4_events')
        .select(`
          id,
          title,
          user_id,
          start_time,
          end_time,
          visibility,
          created_at
        `)
        .order('created_at', { ascending: false })
      
      console.log('🗂️ ALL EVENTS in database:', allEvents?.length || 0)
      console.log('❌ All events query error:', allEventsError)
      
      allEvents?.forEach((event, index) => {
        console.log(`  ${index + 1}. 📅 "${event.title}" by user ${event.user_id} - ID: ${event.id} - visibility: ${event.visibility} - created: ${event.created_at}`)
      })
      
      // Also check for specific user events
      const { data: currentUserEvents } = await supabase
        .from('free4_events')
        .select('*')
        .eq('user_id', user.id)
        
      const { data: friendEventsForDebug } = await supabase
        .from('free4_events')
        .select('*')
        .in('user_id', friendIds)
        
      console.log('👤 Current user events:', currentUserEvents?.length || 0, currentUserEvents)
      console.log('👥 Friend events (by ID):', friendEventsForDebug?.length || 0, friendEventsForDebug)

      // Get all friend events with profiles
      const currentTime = new Date().toISOString()
      console.log('⏰ Current time filter:', currentTime)
      console.log('🔍 Looking for events from user IDs:', friendIds)
      
      // First, let's see ALL friend events (without filters)
      const { data: allFriendEvents, error: allError } = await supabase
        .from('free4_events')
        .select(`
          *,
          profile:profiles(*)
        `)
        .in('user_id', friendIds)
        
      console.log('📅 ALL friend events (no filters):', allFriendEvents?.length || 0, allFriendEvents)
      console.log('❌ Query error:', allError)
      
      // Now apply filters step by step
      const { data: futureFriendEvents } = await supabase
        .from('free4_events')
        .select(`
          *,
          profile:profiles(*)
        `)
        .in('user_id', friendIds)
        .gte('end_time', currentTime)
        
      console.log('⏰ Friend events in future:', futureFriendEvents?.length || 0, futureFriendEvents)
      
      const { data: friendEvents, error: finalError } = await supabase
        .from('free4_events')
        .select(`
          *,
          profile:profiles(*)
        `)
        .in('user_id', friendIds)
        .gte('end_time', currentTime)
        .in('visibility', ['all_friends', 'overlap_only'])
      
      console.log('👀 Friend events with visibility filter:', friendEvents?.length || 0, friendEvents)
      console.log('❌ Final query error:', finalError)

      if (!friendEvents) return

      // Find matches for each of my events
      const matches: {[eventId: string]: any[]} = {}
      
      console.log('🔍 Checking matches for my events:', events.length)

      events.forEach(myEvent => {
        console.log(`\n📅 Checking event: "${myEvent.title}" (${myEvent.start_time} - ${myEvent.end_time})`)
        const eventMatches: any[] = []
        
        friendEvents.forEach(friendEvent => {
          console.log(`  👤 Checking against friend event: "${friendEvent.title}" (${friendEvent.start_time} - ${friendEvent.end_time})`)
          const match = checkEventMatch(myEvent, friendEvent)
          if (match) {
            console.log('  ✅ MATCH FOUND!', match)
            eventMatches.push({
              friendEvent,
              profile: friendEvent.profile,
              overlapStart: match.overlapStart,
              overlapEnd: match.overlapEnd,
              distance: match.distance
            })
          } else {
            console.log('  ❌ No match')
          }
        })

        if (eventMatches.length > 0) {
          console.log(`  🎉 Total matches for "${myEvent.title}":`, eventMatches.length)
          matches[myEvent.id] = eventMatches
        } else {
          console.log(`  😕 No matches for "${myEvent.title}"`)
        }
      })

      setEventMatches(matches)
    } catch (error) {
      console.error('Error finding matches:', error)
    }
  }

  const checkEventMatch = (myEvent: Free4Event, friendEvent: Free4Event) => {
    // Check time overlap (minimum 30 minutes)
    const myStart = new Date(myEvent.start_time)
    const myEnd = new Date(myEvent.end_time)
    const friendStart = new Date(friendEvent.start_time)
    const friendEnd = new Date(friendEvent.end_time)

    const overlapStart = new Date(Math.max(myStart.getTime(), friendStart.getTime()))
    const overlapEnd = new Date(Math.min(myEnd.getTime(), friendEnd.getTime()))

    const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
    if (overlapMinutes < 30) return null

    // Check location compatibility
    const locationMatch = checkLocationMatch(myEvent, friendEvent)
    if (!locationMatch) return null

    return {
      overlapStart: overlapStart.toISOString(),
      overlapEnd: overlapEnd.toISOString(),
      overlapDurationMinutes: Math.round(overlapMinutes),
      distance: locationMatch.distance
    }
  }

  const getBorderColorForOverlap = (overlapMinutes: number) => {
    if (overlapMinutes <= 30) {
      return 'border-orange-400 hover:border-orange-600'
    } else {
      return 'border-green-400 hover:border-green-600'  
    }
  }

  const checkLocationMatch = (myEvent: Free4Event, friendEvent: Free4Event) => {
    // Both online events always match
    if (myEvent.location_type === 'online' && friendEvent.location_type === 'online') {
      return { distance: 0 }
    }

    // One online, one physical - no match
    if (myEvent.location_type !== friendEvent.location_type) {
      return null
    }

    // Both physical events
    if (myEvent.location_type === 'physical' && friendEvent.location_type === 'physical') {
      const myRadius = myEvent.radius_km || 2
      const friendRadius = friendEvent.radius_km || 2
      
      // If both events have GPS coordinates, use accurate distance calculation
      if (myEvent.latitude && myEvent.longitude && friendEvent.latitude && friendEvent.longitude) {
        const distance = calculateDistance(
          myEvent.latitude, myEvent.longitude,
          friendEvent.latitude, friendEvent.longitude
        )
        
        // Check if events are within each other's radius
        const maxAllowedDistance = myRadius + friendRadius
        if (distance <= maxAllowedDistance) {
          return { distance: Math.round(distance * 100) / 100 } // Round to 2 decimal places
        }
        
        return null
      }
      
      // Fallback to name-based matching for events without GPS coordinates
      const locationNamesMatch = myEvent.location_name?.toLowerCase().includes(friendEvent.location_name?.toLowerCase()) ||
                                 friendEvent.location_name?.toLowerCase().includes(myEvent.location_name?.toLowerCase())
      
      if (locationNamesMatch) {
        return { distance: 0.5 } // Estimated distance for name matches
      }

      // Large radius = likely to overlap in same city
      const maxRadius = Math.max(myRadius, friendRadius)
      if (maxRadius >= 5) {
        return { distance: 2.5 } // Estimated city-wide distance
      }
    }

    return null
  }

  // Calculate distance between two GPS coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in kilometers
    return distance
  }

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180)
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatEventDateTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    const startDate = start.toLocaleDateString('de-DE')
    const endDate = end.toLocaleDateString('de-DE')
    
    const weekday = start.toLocaleDateString('de-DE', { weekday: 'long' })
    const dateStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const startTimeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    const endTimeStr = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    
    // If same day, show: "Montag, 28.08.2024 • 12:00 - 13:00 Uhr"
    if (startDate === endDate) {
      return `${weekday}, ${dateStr} • ${startTimeStr} - ${endTimeStr} Uhr`
    } else {
      // If different days, show both dates
      const endDateStr = end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      return `${weekday}, ${dateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr} Uhr`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Free4</h1>
            <p className="text-sm text-gray-600">Hey {profile?.full_name || 'User'}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleManualMatchCheck}
              disabled={isRefreshingMatches}
              className="p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-50"
              title="Matches manuell prüfen (Test)"
            >
              <RefreshCw size={16} className={isRefreshingMatches ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
              title="Mein Profil"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profil" 
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <User size={20} />
              )}
            </button>
            <button 
              onClick={() => setShowFriendsModal(true)}
              className="relative p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
              title="Freunde"
            >
              <Users size={20} />
              {pendingRequestsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </div>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
              title="Abmelden"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Create New Event Button */}
        <div className="mb-8">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-medium py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors border border-black shadow-md"
          >
            <Plus size={20} />
            <span>Free 4 ...</span>
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar size={20} className="mr-2" />
            Meine Free4s
          </h2>

          {events.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 text-center border border-white/20">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Noch keine Free4s
              </h3>
              <p className="text-gray-600 mb-4">
                Erstelle dein erstes Free4 und lass deine Freunde wissen, wann du Zeit hast!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event.id} className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/20 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Free 4 {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-gray-600 mt-1">{event.description}</p>
                      )}
                      
                      <div className="flex items-center mt-3 text-sm text-gray-600">
                        <Calendar size={16} className="mr-2" />
                        <span>
                          {formatEventDateTime(event.start_time, event.end_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center mt-2 text-sm text-gray-600">
                        <MapPin size={16} className="mr-2" />
                        <span>
                          {event.location_name || (event.location_type === 'online' ? 'Online' : 'Unbekannt')}
                          {event.location_type === 'physical' && event.radius_km && (
                            <span className="ml-1">
                              ({event.radius_km === 0.1 ? 'Nur hier' : `${event.radius_km}km Radius`})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Show Matches */}
                      {eventMatches[event.id] && eventMatches[event.id].length > 0 && (
                        <div className="mt-3 flex items-center">
                          <div className="flex space-x-2">
                            {eventMatches[event.id].slice(0, 4).map((match, index) => {
                              const borderColor = getBorderColorForOverlap(match.overlapDurationMinutes || 30)
                              return (
                                <button
                                  key={index}
                                  onClick={() => setSelectedMatch(match)}
                                  className="relative"
                                  title={`${match.profile.full_name} - Free 4 ${match.friendEvent.title} (${match.overlapDurationMinutes || 30} Min. Überschneidung)`}
                                >
                                  {match.profile.avatar_url ? (
                                    <img 
                                      src={match.profile.avatar_url} 
                                      alt={match.profile.full_name}
                                      className={`w-20 h-20 rounded-full object-cover border-2 ${borderColor}`}
                                    />
                                  ) : (
                                    <div className={`w-20 h-20 rounded-full bg-gray-300 border-2 ${borderColor} flex items-center justify-center`}>
                                      <User size={32} className="text-gray-600" />
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                            {eventMatches[event.id].length > 4 && (
                              <div className="w-20 h-20 rounded-full bg-gray-400 flex items-center justify-center text-lg text-white font-medium">
                                +{eventMatches[event.id].length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:ml-4">
                      <button 
                        onClick={() => handleEditEvent(event)}
                        className="bg-white border border-black rounded-lg px-3 py-1 text-gray-900 hover:bg-gray-50 text-sm shadow-md w-full sm:w-auto"
                      >
                        Bearbeiten
                      </button>
                      <button 
                        onClick={() => handleCopyEvent(event)}
                        className="bg-white border border-black rounded-lg px-3 py-1 text-gray-900 hover:bg-gray-50 text-sm shadow-md flex items-center justify-center space-x-1 w-full sm:w-auto"
                        title="Free4 kopieren"
                      >
                        <Copy size={12} />
                        <span>Kopieren</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-white border border-black rounded-lg px-3 py-1 text-gray-900 hover:bg-gray-50 text-sm shadow-md w-full sm:w-auto"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Event Modal */}
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onEventCreated={loadEvents}
        editEvent={editingEvent}
      />

      {/* Friends Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        currentUser={user}
        onRequestsUpdated={loadPendingRequestsCount}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={user}
        profile={profile}
        onProfileUpdated={loadProfile}
      />

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Heart size={20} className="mr-2 text-red-500" />
                Match gefunden!
              </h2>
              <button 
                onClick={() => setSelectedMatch(null)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Friend Profile */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mx-auto mb-3">
                  {selectedMatch.profile.avatar_url ? (
                    <img 
                      src={selectedMatch.profile.avatar_url} 
                      alt={selectedMatch.profile.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User size={32} />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMatch.profile.full_name}
                </h3>
              </div>

              {/* Friend's Free4 */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Free 4 {selectedMatch.friendEvent.title}
                </h4>
                {selectedMatch.friendEvent.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedMatch.friendEvent.description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar size={14} className="mr-2" />
                  {formatDateTime(selectedMatch.friendEvent.start_time)} - {formatDateTime(selectedMatch.friendEvent.end_time)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={14} className="mr-2" />
                  {selectedMatch.friendEvent.location_type === 'online' 
                    ? 'Online' 
                    : selectedMatch.friendEvent.location_name || 'Vor Ort'
                  }
                  {selectedMatch.friendEvent.location_type === 'physical' && selectedMatch.friendEvent.radius_km && (
                    <span className="ml-1">
                      ({selectedMatch.friendEvent.radius_km === 0.1 ? 'Nur hier' : `${selectedMatch.friendEvent.radius_km}km`})
                    </span>
                  )}
                </div>
              </div>

              {/* Match Info */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center mb-2">
                  <Heart size={16} className="mr-2 text-red-500" />
                  <span className="font-medium text-red-700">Gemeinsame Zeit</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {formatDateTime(selectedMatch.overlapStart)} - {formatDateTime(selectedMatch.overlapEnd)}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedMatch.distance !== undefined && `~${selectedMatch.distance}km Entfernung`}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedMatch(null)}
                className="w-full mt-6 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}