'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, MapPin, Clock, Users } from 'lucide-react'
import type { Free4Event } from '@/lib/supabase'
import SmartPlacesInput from './SmartPlacesInput'
import SmartMapModal from './SmartMapModal'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onEventCreated: () => void
  editEvent?: Free4Event | null
}

export default function CreateEventModal({ isOpen, onClose, onEventCreated, editEvent }: CreateEventModalProps) {
  const [title, setTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('12:00')
  const [duration, setDuration] = useState(60) // minutes
  const [locationType, setLocationType] = useState<'physical' | 'online'>('physical')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState(2)
  const [visibility, setVisibility] = useState<'all_friends' | 'selected_friends' | 'groups' | 'overlap_only'>('all_friends')
  const [loading, setLoading] = useState(false)
  const [showMapsModal, setShowMapsModal] = useState(false)
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const commonTitles = ['Coffee', 'Lunch', 'Dinner', 'Spazieren', 'Sport', 'Kino', 'Bier', 'Spielen']

  // Function to get user's current location and set it as default
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser')
      return
    }

    setIsGettingLocation(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        )
      })

      const { latitude, longitude } = position.coords

      // Reverse geocode to get a human-readable location name
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=de`
        )
        
        if (response.ok) {
          const data = await response.json()
          const locationName = data.locality || data.city || data.principalSubdivision || 'Aktuelle Position'
          
          setLocationName(locationName)
          setLatitude(latitude)
          setLongitude(longitude)
          setRadiusKm(1) // Default to 1km radius for current location
        } else {
          // Fallback: just use coordinates
          setLocationName('Aktuelle Position')
          setLatitude(latitude)
          setLongitude(longitude)
          setRadiusKm(1)
        }
      } catch (geocodeError) {
        // Fallback: just use coordinates without location name
        setLocationName('Aktuelle Position')
        setLatitude(latitude)
        setLongitude(longitude)
        setRadiusKm(1)
      }

    } catch (error: any) {
      console.log('Error getting location:', error.message)
      // Don't show error to user, just silently fail
    } finally {
      setIsGettingLocation(false)
    }
  }

  const resetForm = () => {
    // Set default values for new events
    const now = new Date()
    
    // Smart date/time logic: Default to 12:00, but if it's after 12:00, use tomorrow
    let defaultDate = now
    const currentHour = now.getHours()
    
    // If it's after 12:00 (noon), set date to tomorrow
    if (currentHour >= 12) {
      defaultDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
    }
    
    const defaultDateString = defaultDate.toISOString().split('T')[0]
    setTitle('')
    setCustomTitle('')
    setDescription('')
    setStartDate(defaultDateString)
    setStartTime('12:00')
    setDuration(60)
    setLocationType('physical')
    setLocationName('')
    setLatitude(null)
    setLongitude(null)
    setRadiusKm(2)
    setVisibility('all_friends')
  }

  // Load event data when editing, or get current location for new events
  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        const isCustomTitle = !commonTitles.includes(editEvent.title)
        setTitle(isCustomTitle ? 'custom' : editEvent.title)
        setCustomTitle(isCustomTitle ? editEvent.title : '')
        setDescription(editEvent.description || '')
        
        const startDateTime = new Date(editEvent.start_time)
        setStartDate(startDateTime.toISOString().split('T')[0])
        // Round to nearest 15-minute interval for editing
        const hours = startDateTime.getHours()
        const minutes = startDateTime.getMinutes()
        const roundedMinutes = Math.round(minutes / 15) * 15
        const formattedTime = `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`
        setStartTime(formattedTime)
        
        const endDateTime = new Date(editEvent.end_time)
        const durationMs = endDateTime.getTime() - startDateTime.getTime()
        setDuration(Math.round(durationMs / (1000 * 60))) // Convert to minutes
        
        setLocationType(editEvent.location_type)
        setLocationName(editEvent.location_name || '')
        setLatitude(editEvent.latitude || null)
        setLongitude(editEvent.longitude || null)
        setRadiusKm(editEvent.radius_km || 2)
        setVisibility(editEvent.visibility)
      } else {
        // Reset form completely when creating new event
        resetForm()
        // Automatically get current location for new events
        if (locationType === 'physical') {
          getCurrentLocation()
        }
      }
    }
  }, [isOpen, editEvent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate end time
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)

      // Validate that event is not in the past (only for new events)
      if (!editEvent && startDateTime < new Date()) {
        throw new Error('Du kannst keine Termine in der Vergangenheit erstellen!')
      }

      // For copied events, ensure date/time has been changed
      if (editEvent && editEvent.id === '') {
        const originalStart = new Date(editEvent.start_time)
        const originalStartDate = originalStart.toISOString().split('T')[0]
        const originalHours = originalStart.getHours()
        const originalMinutes = originalStart.getMinutes()
        const originalTime = `${originalHours.toString().padStart(2, '0')}:${originalMinutes.toString().padStart(2, '0')}`
        
        const isDateTimeUnchanged = startDate === originalStartDate && startTime === originalTime
        
        if (isDateTimeUnchanged) {
          throw new Error('Bitte ändere das Datum oder die Uhrzeit für den kopierten Free4!')
        }
      }

      // Check for complete overlap with existing events (for new events or copies)
      if (!editEvent || (editEvent && editEvent.id === '')) {
        const { data: existingEvents, error: fetchError } = await supabase
          .from('free4_events')
          .select('start_time, end_time')
          .eq('user_id', user.id)

        if (fetchError) throw fetchError

        // Check if new event is completely within any existing event
        const isCompletelyOverlapping = existingEvents?.some(existing => {
          const existingStart = new Date(existing.start_time)
          const existingEnd = new Date(existing.end_time)
          
          return startDateTime >= existingStart && endDateTime <= existingEnd
        })

        if (isCompletelyOverlapping) {
          throw new Error('Du hast hier schon einen Free4 geplant!')
        }
      }

      const eventTitle = title === 'custom' ? customTitle : title
      const eventData = {
        title: eventTitle,
        description: description || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location_type: locationType,
        location_name: locationName || null,
        latitude: latitude,
        longitude: longitude,
        radius_km: locationType === 'physical' ? (radiusKm === 0.1 ? 0 : Math.round(radiusKm)) : null,
        visibility,
      }

      let error
      if (editEvent && editEvent.id !== '') {
        // Update existing event
        ({ error } = await supabase
          .from('free4_events')
          .update(eventData)
          .eq('id', editEvent.id))
      } else {
        // Create new event (including copied events with empty ID)
        ({ error } = await supabase
          .from('free4_events')
          .insert({
            user_id: user.id,
            ...eventData
          }))
      }

      if (error) throw error

      // Trigger automatic re-matching after creating/updating a Free4
      try {
        // Proactive session refresh before POST request
        await supabase.auth.getSession()
        
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        if (token) {
          await fetch('/api/matches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: user.id
            })
          })
        }
      } catch (matchError) {
        // Silent error handling - Free4 was created successfully
      }

      resetForm()
      onEventCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating event:', error)
      console.error('Error creating Free4:', error.message)
      
      // Show error toast to user
      setErrorMessage(error.message)
      setShowErrorToast(true)
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowErrorToast(false)
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (location: {
    name: string
    latitude: number
    longitude: number
    place_id?: string
    radius?: number
  }) => {
    setLocationName(location.name)
    setLatitude(location.latitude)
    setLongitude(location.longitude)
    if (location.radius !== undefined) {
      setRadiusKm(location.radius)
    }
  }

  const handleOpenMap = () => {
    setShowMapsModal(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{
      background: '#0ea5e9'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-4xl font-bold text-gray-900">
            {editEvent ? 'Free4 bearbeiten' : 'Free 4 ...'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-3 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
            title="Zurück"
          >
            <X size={26} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-black">

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Free 4 was?
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {commonTitles.map((titleOption) => (
                <button
                  key={titleOption}
                  type="button"
                  onClick={() => setTitle(titleOption)}
                  className={`p-3 rounded-lg border text-sm font-medium shadow-md ${
                    title === titleOption
                      ? 'bg-cyan-500 text-white border-black shadow-lg'
                      : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                  }`}
                >
                  {titleOption}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTitle('custom')}
                className={`p-3 rounded-lg border text-sm font-medium shadow-md ${
                  title === 'custom'
                    ? 'bg-cyan-500 text-white border-black shadow-lg'
                    : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                }`}
              >
                Eigenes...
              </button>
            </div>
            
            {title === 'custom' && (
              <input
                type="text"
                placeholder="Eigenen Titel eingeben..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                required
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. 'Mit der Family' oder 'Lust auf Rocket League?'"
              className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              rows={2}
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-2" />
                Datum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={editEvent ? undefined : new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ab frühestens
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Uhrzeit wählen</option>
                  {Array.from({ length: 24 * 4 }, (_, i) => {
                    const totalMinutes = i * 15
                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60
                    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                    return (
                      <option key={timeString} value={timeString}>
                        {timeString} Uhr
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zeitraum
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value={30}>30 Min</option>
                  <option value={60}>1 Std</option>
                  <option value={90}>1,5 Std</option>
                  <option value={120}>2 Std</option>
                  <option value={180}>3 Std</option>
                  <option value={240}>4 Std</option>
                  <option value={480}>8 Std</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin size={16} className="inline mr-2" />
              Wo?
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setLocationType('physical')
                  // If switching back to physical and no location is set, get current location
                  if (!locationName && !isGettingLocation) {
                    getCurrentLocation()
                  }
                }}
                className={`p-3 rounded-lg border text-sm font-medium shadow-md ${
                  locationType === 'physical'
                    ? 'bg-cyan-500 text-white border-black shadow-lg'
                    : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                }`}
              >
                Vor Ort
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationType('online')
                  setLocationName('') // Clear location when switching to online
                  setLatitude(null)
                  setLongitude(null)
                }}
                className={`p-3 rounded-lg border text-sm font-medium shadow-md ${
                  locationType === 'online'
                    ? 'bg-cyan-500 text-white border-black shadow-lg'
                    : 'bg-white text-gray-900 border-black hover:bg-gray-50'
                }`}
              >
                Online
              </button>
            </div>

            {locationType === 'physical' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <SmartPlacesInput
                      value={locationName}
                      onChange={setLocationName}
                      onLocationSelect={handleLocationSelect}
                      onOpenMap={handleOpenMap}
                      placeholder={isGettingLocation ? "Ermittele aktuelle Position..." : "z.B. Starbucks Mitte, Tiergarten, etc."}
                      disabled={isGettingLocation}
                    />
                    {isGettingLocation && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm whitespace-nowrap">
                    Umkreis: {radiusKm === 0.1 ? '0' : Math.round(radiusKm)} km
                  </span>
                </div>
                
                {!editEvent && locationName === '' && !isGettingLocation && (
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    📍 Aktuelle Position verwenden
                  </button>
                )}
              </div>
            )}
          </div>


          {/* Visibility - Hidden for now, defaults to 'all_friends' */}
          {/* 
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users size={16} className="inline mr-2" />
              Sichtbar für
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="all_friends">Alle Freunde</option>
              <option value="overlap_only">Nur bei Überschneidung anzeigen</option>
              <option value="selected_friends">Ausgewählte Freunde (später)</option>
              <option value="groups">Gruppen (später)</option>
            </select>
          </div>
          */}


          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-black bg-white text-gray-900 rounded-lg hover:bg-gray-50 shadow-md"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !title || (title === 'custom' && !customTitle) || !startTime || !startDate || (locationType === 'physical' && !locationName)}
              className="px-6 py-2 bg-white border border-black text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow-md"
            >
              {loading 
                ? (editEvent ? 'Speichere...' : 'Erstelle...') 
                : (editEvent ? 'Free4 speichern' : 'Free4 erstellen')
              }
            </button>
          </div>
        </form>
        </div>
      </main>
      
      {/* Smart Map Modal (MapBox or OSM) */}
      <SmartMapModal
        isOpen={showMapsModal}
        onClose={() => setShowMapsModal(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={latitude && longitude ? { latitude, longitude, radius: radiusKm } : undefined}
        userLocation={latitude && longitude ? { latitude, longitude, name: locationName } : undefined}
      />

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="bg-white border border-black rounded-lg shadow-lg px-6 py-4"
            style={{
              animation: 'fadeOut 3.5s ease-in-out forwards'
            }}
          >
            <p className="text-gray-900 font-medium">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

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