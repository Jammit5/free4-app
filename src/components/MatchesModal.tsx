'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Heart, MapPin, Clock, User, Users } from 'lucide-react'
import type { Free4Event, Profile } from '@/lib/supabase'

interface MatchesModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
}

interface Match {
  myEvent: Free4Event
  friendEvent: Free4Event & { profile: Profile }
  overlapStart: string
  overlapEnd: string
  distance?: number
}

export default function MatchesModal({ isOpen, onClose, currentUser }: MatchesModalProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      findMatches()
    }
  }, [isOpen])

  const findMatches = async () => {
    setLoading(true)
    try {
      // Get all my current events
      const { data: myEvents } = await supabase
        .from('free4_events')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('end_time', new Date().toISOString()) // Only future/current events

      if (!myEvents) {
        setLoading(false)
        return
      }

      // Get all my friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .eq('status', 'accepted')

      if (!friendships) {
        setLoading(false)
        return
      }

      // Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === currentUser.id ? f.addressee_id : f.requester_id
      )

      if (friendIds.length === 0) {
        setLoading(false)
        return
      }

      // Get all friend events with profiles
      const { data: friendEvents } = await supabase
        .from('free4_events')
        .select(`
          *,
          profile:profiles(*)
        `)
        .in('user_id', friendIds)
        .gte('end_time', new Date().toISOString()) // Only future/current events
        .in('visibility', ['all_friends', 'overlap_only']) // Only visible events

      if (!friendEvents) {
        setLoading(false)
        return
      }

      // Find matches
      const foundMatches: Match[] = []

      for (const myEvent of myEvents) {
        for (const friendEvent of friendEvents) {
          const match = checkMatch(myEvent, friendEvent)
          if (match) {
            foundMatches.push(match)
          }
        }
      }

      setMatches(foundMatches)
    } catch (error) {
      console.error('Error finding matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkMatch = (myEvent: Free4Event, friendEvent: any): Match | null => {
    // Check time overlap (minimum 30 minutes)
    const myStart = new Date(myEvent.start_time)
    const myEnd = new Date(myEvent.end_time)
    const friendStart = new Date(friendEvent.start_time)
    const friendEnd = new Date(friendEvent.end_time)

    const overlapStart = new Date(Math.max(myStart.getTime(), friendStart.getTime()))
    const overlapEnd = new Date(Math.min(myEnd.getTime(), friendEnd.getTime()))

    // Check if there's at least 30 minutes overlap
    const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
    if (overlapMinutes < 30) {
      return null
    }

    // Check location compatibility
    const locationMatch = checkLocationMatch(myEvent, friendEvent)
    if (!locationMatch) {
      return null
    }

    return {
      myEvent,
      friendEvent,
      overlapStart: overlapStart.toISOString(),
      overlapEnd: overlapEnd.toISOString(),
      distance: locationMatch.distance
    }
  }

  const checkLocationMatch = (myEvent: Free4Event, friendEvent: any) => {
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
          return { distance: Math.round(distance * 100) / 100 }
        }
        
        return null
      }
      
      // Fallback to name-based matching for events without GPS coordinates
      const locationNamesMatch = myEvent.location_name?.toLowerCase().includes(friendEvent.location_name?.toLowerCase()) ||
                                 friendEvent.location_name?.toLowerCase().includes(myEvent.location_name?.toLowerCase())
      
      if (locationNamesMatch) {
        return { distance: 0.5 }
      }

      // Large radius = likely to overlap in same city
      const maxRadius = Math.max(myRadius, friendRadius)
      if (maxRadius >= 5) {
        return { distance: 2.5 }
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

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (start: string, end: string) => {
    const duration = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60)
    if (duration < 60) {
      return `${Math.round(duration)}min`
    } else {
      const hours = Math.floor(duration / 60)
      const minutes = Math.round(duration % 60)
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Heart size={20} className="mr-2 text-red-500" />
            Matches
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Suche nach Matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8">
              <Heart size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Matches gefunden
              </h3>
              <p className="text-gray-600 mb-4">
                Erstelle mehr Free4s oder füge mehr Freunde hinzu um Matches zu finden!
              </p>
              <div className="text-sm text-gray-500">
                <p>💡 Matches entstehen wenn:</p>
                <p>• Du und ein Freund zeitgleich (mind. 30min) Zeit habt</p>
                <p>• Eure Orte kompatibel sind (gleiche Stadt oder beide online)</p>
                <p>• Ihr beide für "Alle Freunde" sichtbar seid</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                🎉 {matches.length} Match{matches.length !== 1 ? 'es' : ''} gefunden! 
                Zeit für spontane Treffen.
              </p>
              
              {matches.map((match, index) => (
                <div key={index} className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg p-6 border border-pink-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* My Free4 */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-center mb-3">
                        <User size={16} className="mr-2 text-blue-600" />
                        <span className="font-medium text-blue-600">Dein Free4</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Free 4 {match.myEvent.title}
                      </h4>
                      {match.myEvent.description && (
                        <p className="text-sm text-gray-600 mb-2">{match.myEvent.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock size={14} className="mr-2" />
                        {formatTime(match.myEvent.start_time)} - {formatTime(match.myEvent.end_time)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={14} className="mr-2" />
                        {match.myEvent.location_type === 'online' 
                          ? 'Online' 
                          : match.myEvent.location_name || 'Vor Ort'
                        }
                        {match.myEvent.location_type === 'physical' && match.myEvent.radius_km && (
                          <span className="ml-1">
                            ({match.myEvent.radius_km === 0.1 ? 'Nur hier' : `${match.myEvent.radius_km}km`})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Friend Free4 */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-l-green-500">
                      <div className="flex items-center mb-3">
                        <div className="flex items-center">
                          {match.friendEvent.profile.avatar_url ? (
                            <img 
                              src={match.friendEvent.profile.avatar_url} 
                              alt="Friend" 
                              className="w-4 h-4 rounded-full object-cover mr-2"
                            />
                          ) : (
                            <Users size={16} className="mr-2 text-green-600" />
                          )}
                          <span className="font-medium text-green-600">
                            {match.friendEvent.profile.full_name}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Free 4 {match.friendEvent.title}
                      </h4>
                      {match.friendEvent.description && (
                        <p className="text-sm text-gray-600 mb-2">{match.friendEvent.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Clock size={14} className="mr-2" />
                        {formatTime(match.friendEvent.start_time)} - {formatTime(match.friendEvent.end_time)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={14} className="mr-2" />
                        {match.friendEvent.location_type === 'online' 
                          ? 'Online' 
                          : match.friendEvent.location_name || 'Vor Ort'
                        }
                        {match.friendEvent.location_type === 'physical' && match.friendEvent.radius_km && (
                          <span className="ml-1">
                            ({match.friendEvent.radius_km === 0.1 ? 'Nur hier' : `${match.friendEvent.radius_km}km`})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="mt-4 pt-4 border-t border-pink-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-700">
                        <Heart size={16} className="mr-2 text-red-500" />
                        <span className="font-medium">
                          Gemeinsame Zeit: {formatTime(match.overlapStart)} - {formatTime(match.overlapEnd)}
                        </span>
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          {formatDuration(match.overlapStart, match.overlapEnd)}
                        </span>
                      </div>
                      {match.distance !== undefined && (
                        <div className="text-xs text-gray-500">
                          ~{match.distance}km Entfernung
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}