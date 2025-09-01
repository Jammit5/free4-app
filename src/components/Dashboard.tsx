'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Free4Event, Profile } from '@/lib/supabase'
import { Plus, LogOut, Users, Calendar, MapPin, User, Heart, X, Copy, RefreshCw } from 'lucide-react'
import CreateEventModal from './CreateEventModal'
import FriendsModal from './FriendsModal'
import ProfileModal from './ProfileModal'
import ImpressumModal from './ImpressumModal'
import ContactModal from './ContactModal'
import DataPrivacyModal from './DataPrivacyModal'

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
  const [showDeleteToast, setShowDeleteToast] = useState(false)
  const [deletedEventTitle, setDeletedEventTitle] = useState('')
  const [showImpressum, setShowImpressum] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showDataPrivacy, setShowDataPrivacy] = useState(false)
  const matchCheckInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProfile()
    loadEvents()
    loadPendingRequestsCount()
  }, [user])

  useEffect(() => {
    if (events.length > 0) {
      // Load server-side matches after events are loaded
      loadServerSideMatches()
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
            // Free4 is completely in the past
            expiredEventIds.push(event.id)
          } else {
            // Free4 is current or in the future
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
    try {
      // Find the event title before deleting
      const eventToDelete = events.find(event => event.id === eventId)
      const eventTitle = eventToDelete?.title || 'Free4'

      const { error } = await supabase
        .from('free4_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      // Remove from local state
      setEvents(events.filter(event => event.id !== eventId))
      
      // Show delete toast
      setDeletedEventTitle(eventTitle)
      setShowDeleteToast(true)
      
      // Hide toast after 2 seconds with 0.5s fade animation
      setTimeout(() => {
        setShowDeleteToast(false)
      }, 2000)
    } catch (error: any) {
      console.error('Error deleting free4:', error)
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
      // Get the current session token (don't refresh proactively to avoid rate limits)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('No active session:', sessionError)
        return // Exit silently
      }

      // Call server-side matching API with retry on 401
      let response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      // Retry once on 401 (token might have expired during the call)
      if (response.status === 401) {
        console.log('🔄 POST got 401, refreshing token and retrying...')
        const { data: { session: retrySession }, error: retryError } = await supabase.auth.refreshSession()
        if (!retryError && retrySession) {
          response = await fetch('/api/matches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${retrySession.access_token}`
            },
            body: JSON.stringify({
              userId: user.id
            })
          })
        }
      }

      if (!response.ok) {
        console.error('Failed to calculate matches:', response.status, response.statusText)
        return
      }

      await response.json()
      
      // Now fetch the calculated matches
      await loadServerSideMatches()
    } catch (error) {
      // Silent error handling
    }
  }

  const loadServerSideMatches = async () => {
    try {
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshedSession) {
          console.error('Failed to refresh session:', refreshError)
          return // Exit silently - user might need to re-login
        }
        // Use refreshed session
      }
      
      const currentSession = session
      if (!currentSession) {
        console.log('No active session for loading matches')
        return // Exit silently
      }

      const response = await fetch(`/api/matches?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      })
      if (!response.ok) {
        console.error('Failed to load matches:', response.status, response.statusText)
        return // Exit silently on API error
      }

      const result = await response.json()

      // Transform server matches to the format expected by the UI
      const matches: {[eventId: string]: any[]} = {}

      // Transform server matches from match_details view (bidirectional)
      result.matches?.forEach((match: any) => {
        // Check which event belongs to current user
        const userEvents = events.map(e => e.id)
        const isUserFree4 = userEvents.includes(match.user_free4_id)
        const isMatchedFree4 = userEvents.includes(match.matched_free4_id)
        
        if (isUserFree4) {
          // Current user's event is user_free4_id
          if (!matches[match.user_free4_id]) {
            matches[match.user_free4_id] = []
          }
          
          matches[match.user_free4_id].push({
            friendEvent: {
              id: match.matched_free4_id,
              title: match.matched_title,
              start_time: match.matched_start_time,
              end_time: match.matched_end_time,
              location_name: match.matched_location_name,
              latitude: match.matched_latitude,
              longitude: match.matched_longitude,
              radius_km: match.matched_radius_km
            },
            profile: {
              full_name: match.matched_name,
              avatar_url: match.matched_avatar_url
            },
            overlapStart: match.overlap_start,
            overlapEnd: match.overlap_end,
            overlapDurationMinutes: match.overlap_duration_minutes,
            distance: match.distance_km,
            matchScore: match.match_score
          })
        } else if (isMatchedFree4) {
          // Current user's event is matched_free4_id
          if (!matches[match.matched_free4_id]) {
            matches[match.matched_free4_id] = []
          }
          
          matches[match.matched_free4_id].push({
            friendEvent: {
              id: match.user_free4_id,
              title: match.user_title,
              start_time: match.user_start_time,
              end_time: match.user_end_time,
              location_name: match.user_location_name,
              latitude: match.user_latitude,
              longitude: match.user_longitude,
              radius_km: match.user_radius_km
            },
            profile: {
              full_name: match.user_name,
              avatar_url: match.user_avatar_url
            },
            overlapStart: match.overlap_start,
            overlapEnd: match.overlap_end,
            overlapDurationMinutes: match.overlap_duration_minutes,
            distance: match.distance_km,
            matchScore: match.match_score
          })
        }
      })

      setEventMatches(matches)

    } catch (error) {
      // Silent error handling
    }
  }


  const getBorderColorForOverlap = (overlapMinutes: number) => {
    if (overlapMinutes <= 30) {
      return 'border-orange-400 hover:border-orange-600'
    } else {
      return 'border-green-400 hover:border-green-600'  
    }
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

  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    // Check if same day
    const sameDay = start.toDateString() === end.toDateString()
    
    if (sameDay) {
      // Same day: show date once, then start-end time
      const dateString = start.toLocaleDateString('de-DE', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      })
      const startTimeString = start.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      })
      const endTimeString = end.toLocaleTimeString('de-DE', {
        hour: '2-digit', 
        minute: '2-digit'
      })
      return `${dateString}, ${startTimeString} - ${endTimeString}`
    } else {
      // Different days: show full date/time for both
      return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`
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
        {/* Create New Free4 Button */}
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
                                  title={`${match.profile.full_name} - Free 4 ${match.friendEvent.title} (${match.overlapDurationMinutes} Min. Überschneidung)`}
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

      {/* Create Free4 Modal */}
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
        <div className="fixed inset-0 z-50" style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
        }}>
          {/* Header */}
          <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
            <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Calendar size={24} className="mr-2" />
                Treffen möglich!
              </h2>
              <button 
                onClick={() => setSelectedMatch(null)} 
                className="p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
                title="Zurück"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-2xl mx-auto px-4 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
              <div className="p-6">
                {/* Friend Profile */}
                <div className="text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mx-auto mb-4">
                    {selectedMatch.profile.avatar_url ? (
                      <img 
                        src={selectedMatch.profile.avatar_url} 
                        alt={selectedMatch.profile.full_name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedMatch.profile.full_name}
                  </h3>
                </div>

                {/* Friend's Free4 */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Free 4 {selectedMatch.friendEvent.title}
                  </h4>
                  {selectedMatch.friendEvent.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedMatch.friendEvent.description}
                    </p>
                  )}
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Calendar size={14} className="mr-2" />
                    {formatTimeRange(selectedMatch.friendEvent.start_time, selectedMatch.friendEvent.end_time)}
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
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <Calendar size={16} className="mr-2 text-blue-600" />
                    <span className="font-medium text-blue-700">Gemeinsame Zeit</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {formatTimeRange(selectedMatch.overlapStart, selectedMatch.overlapEnd)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedMatch.distance !== undefined && `~${selectedMatch.distance}km Entfernung`}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="w-full mt-6 py-3 px-4 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Delete Toast */}
      {showDeleteToast && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="bg-white border border-black rounded-lg shadow-lg px-6 py-4"
            style={{
              animation: 'fadeOut 2.5s ease-in-out forwards'
            }}
          >
            <p className="text-gray-900 font-medium">
              Free 4 {deletedEventTitle} wurde gelöscht!
            </p>
          </div>
        </div>
      )}

      {/* Footer - only show when no modals are open */}
      {!showCreateModal && !showFriendsModal && !showProfileModal && !selectedMatch && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="max-w-6xl mx-auto px-4 py-3 text-center">
            <div className="space-x-6">
              <button
                onClick={() => setShowImpressum(true)}
                className="text-sm text-white/80 hover:text-white underline"
              >
                Impressum
              </button>
              <button
                onClick={() => setShowContact(true)}
                className="text-sm text-white/80 hover:text-white underline"
              >
                Kontakt
              </button>
              <button
                onClick={() => setShowDataPrivacy(true)}
                className="text-sm text-white/80 hover:text-white underline"
              >
                Datenschutz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImpressumModal 
        isOpen={showImpressum}
        onClose={() => setShowImpressum(false)}
        onOpenContact={() => setShowContact(true)}
      />
      <ContactModal 
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
      <DataPrivacyModal 
        isOpen={showDataPrivacy}
        onClose={() => setShowDataPrivacy(false)}
        onOpenContact={() => setShowContact(true)}
      />

      <style jsx>{`
        @keyframes fadeOut {
          0% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}