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
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('00')
  const [duration, setDuration] = useState(60) // minutes
  const [locationType, setLocationType] = useState<'physical' | 'online'>('physical')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState(2)
  const [visibility, setVisibility] = useState<'all_friends' | 'selected_friends' | 'groups' | 'overlap_only'>('all_friends')
  const [loading, setLoading] = useState(false)
  const [showMapsModal, setShowMapsModal] = useState(false)

  const commonTitles = ['Coffee', 'Lunch', 'Dinner', 'Spazieren', 'Sport', 'Kino', 'Bier', 'Online-Zocken']

  const resetForm = () => {
    // Set default values for new events
    const now = new Date()
    
    // Smart date/time logic: Default to 12:00, but if it's after 11:30, use tomorrow
    let defaultDate = now
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()
    
    // If it's after 11:30 (23:30), set date to tomorrow
    if (currentHour >= 23 || (currentHour === 23 && currentMinutes >= 30)) {
      defaultDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
    }
    
    const defaultDateString = defaultDate.toISOString().split('T')[0]
    const defaultHour = '12' // Always 12:00
    
    setTitle('')
    setCustomTitle('')
    setDescription('')
    setStartDate(defaultDateString)
    setStartHour(defaultHour)
    setStartMinute('00')
    setDuration(60)
    setLocationType('physical')
    setLocationName('')
    setLatitude(null)
    setLongitude(null)
    setRadiusKm(2)
    setVisibility('all_friends')
  }

  // Load event data when editing
  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        const isCustomTitle = !commonTitles.includes(editEvent.title)
        setTitle(isCustomTitle ? 'custom' : editEvent.title)
        setCustomTitle(isCustomTitle ? editEvent.title : '')
        setDescription(editEvent.description || '')
        
        const startDateTime = new Date(editEvent.start_time)
        setStartDate(startDateTime.toISOString().split('T')[0])
        setStartHour(startDateTime.getHours().toString().padStart(2, '0'))
        
        // Round to nearest 15-minute interval for editing
        const minutes = startDateTime.getMinutes()
        const roundedMinutes = Math.round(minutes / 15) * 15
        setStartMinute(roundedMinutes.toString().padStart(2, '0'))
        
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
      const startDateTime = new Date(`${startDate}T${startHour}:${startMinute}`)
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)

      // Validate that event is not in the past (only for new events)
      if (!editEvent && startDateTime < new Date()) {
        throw new Error('Du kannst keine Termine in der Vergangenheit erstellen!')
      }

      // For copied events, ensure date/time has been changed
      if (editEvent && editEvent.id === '') {
        const originalStart = new Date(editEvent.start_time)
        const originalStartDate = originalStart.toISOString().split('T')[0]
        const originalStartHour = originalStart.getHours().toString().padStart(2, '0')
        const originalStartMinute = originalStart.getMinutes().toString().padStart(2, '0')
        
        const isDateTimeUnchanged = startDate === originalStartDate && 
                                   startHour === originalStartHour && 
                                   startMinute === originalStartMinute
        
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
        radius_km: locationType === 'physical' ? radiusKm : null,
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

      resetForm()
      onEventCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating event:', error)
      alert('Fehler beim Erstellen des Events: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (location: {
    name: string
    latitude: number
    longitude: number
    place_id?: string
  }) => {
    setLocationName(location.name)
    setLatitude(location.latitude)
    setLongitude(location.longitude)
  }

  const handleOpenMap = () => {
    setShowMapsModal(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {editEvent ? 'Free4 bearbeiten' : 'Free 4 ...'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stunde
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Stunde wählen</option>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return (
                      <option key={hour} value={hour}>
                        {hour}:00
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minute
                </label>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="00">:00</option>
                  <option value="15">:15</option>
                  <option value="30">:30</option>
                  <option value="45">:45</option>
                </select>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dauer
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value={30}>30 Minuten</option>
              <option value={60}>1 Stunde</option>
              <option value={90}>1,5 Stunden</option>
              <option value={120}>2 Stunden</option>
              <option value={180}>3 Stunden</option>
              <option value={240}>4 Stunden</option>
              <option value={480}>8 Stunden</option>
            </select>
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
                onClick={() => setLocationType('physical')}
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
              <SmartPlacesInput
                value={locationName}
                onChange={setLocationName}
                onLocationSelect={handleLocationSelect}
                onOpenMap={handleOpenMap}
                placeholder="z.B. Starbucks Mitte, Tiergarten, etc."
              />
            )}
          </div>

          {/* Radius for physical locations */}
          {locationType === 'physical' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximaler Radius (km)
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value={0.1}>Nur hier (100m)</option>
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km (ganze Stadt)</option>
                <option value={50}>50 km (weiter Umkreis)</option>
              </select>
            </div>
          )}

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users size={16} className="inline mr-2" />
              Sichtbar für
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="all_friends">Alle Freunde</option>
              <option value="overlap_only">Nur bei Überschneidung anzeigen</option>
              <option value="selected_friends">Ausgewählte Freunde (später)</option>
              <option value="groups">Gruppen (später)</option>
            </select>
          </div>


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
              disabled={loading || !title || (title === 'custom' && !customTitle) || !startHour || !startDate || (locationType === 'physical' && !locationName)}
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
      
      {/* Smart Map Modal (MapBox or OSM) */}
      <SmartMapModal
        isOpen={showMapsModal}
        onClose={() => setShowMapsModal(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={latitude && longitude ? { latitude, longitude } : undefined}
      />
    </div>
  )
}