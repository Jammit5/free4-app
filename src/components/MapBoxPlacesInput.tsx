'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Globe } from 'lucide-react'

interface PlaceSuggestion {
  id: string
  place_name: string
  text: string
  center: [number, number] // [longitude, latitude]
  place_type: string[]
  properties: {
    address?: string
  }
}

interface MapBoxPlacesInputProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect: (location: {
    name: string
    latitude: number
    longitude: number
    place_id: string
  }) => void
  onOpenMap: () => void
  placeholder?: string
  disabled?: boolean
}

export default function MapBoxPlacesInput({ 
  value, 
  onChange, 
  onLocationSelect, 
  onOpenMap,
  placeholder = "Ort eingeben...",
  disabled = false 
}: MapBoxPlacesInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortController = useRef<AbortController>()

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
      // Fallback to demo data if no MapBox token is configured
      console.log('MapBox token not configured, using demo data')
      const demoSuggestions: PlaceSuggestion[] = [
        {
          id: 'demo_1',
          place_name: 'Berlin, Deutschland',
          text: 'Berlin',
          center: [13.404954, 52.520008],
          place_type: ['place'],
          properties: {}
        },
        {
          id: 'demo_2', 
          place_name: 'München, Bayern, Deutschland',
          text: 'München',
          center: [11.576124, 48.137154],
          place_type: ['place'],
          properties: {}
        },
        {
          id: 'demo_3',
          place_name: 'Hamburg, Deutschland', 
          text: 'Hamburg',
          center: [9.993682, 53.551086],
          place_type: ['place'],
          properties: {}
        }
      ].filter(place => 
        place.place_name.toLowerCase().includes(query.toLowerCase())
      )
      
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate API delay
      setSuggestions(demoSuggestions)
      setShowSuggestions(demoSuggestions.length > 0)
      setLoading(false)
      return
    }

    setLoading(true)
    
    try {
      // MapBox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxToken}&` +
        `country=de,at,ch&` + // Focus on DACH region
        `types=place,postcode,locality,neighborhood,address,poi&` +
        `limit=5&` +
        `language=de`,
        {
          signal: abortController.current.signal
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.features || [])
        setShowSuggestions((data.features || []).length > 0)
      } else {
        console.error('MapBox Geocoding API error:', response.status)
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error searching places:', error)
        setSuggestions([])
        setShowSuggestions(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    
    // Set new timeout for search
    searchTimeout.current = setTimeout(() => {
      searchPlaces(newValue)
    }, 800) // 800ms delay for MapBox (less than OSM since it's more robust)
  }

  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    const locationName = suggestion.text
    onChange(locationName)
    setShowSuggestions(false)
    
    onLocationSelect({
      name: suggestion.place_name,
      latitude: suggestion.center[1], // MapBox returns [lng, lat]
      longitude: suggestion.center[0], // MapBox returns [lng, lat]
      place_id: suggestion.id
    })
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  const formatPlaceName = (placeName: string) => {
    // Shorten long place names for better display
    const parts = placeName.split(',').slice(0, 2)
    return parts.join(', ')
  }

  return (
    <div className="relative" ref={inputRef}>
      <div className="flex">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <MapPin size={16} className="text-gray-400" />
            )}
          </div>
        </div>
        
        <button
          type="button"
          onClick={onOpenMap}
          className="px-3 py-2 bg-blue-600 text-white border border-l-0 border-blue-600 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
          title="Auf Karte auswählen"
        >
          <Globe size={16} />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.id}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                <MapPin size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {formatPlaceName(suggestion.place_name)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* API Status Indicator */}
      {loading && (
        <div className="absolute z-10 w-full mt-1 bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="text-xs text-blue-600 flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
            MapBox wird durchsucht...
          </div>
        </div>
      )}
    </div>
  )
}