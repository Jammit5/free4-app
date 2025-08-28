'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Globe } from 'lucide-react'

interface PlaceSuggestion {
  place_id: string
  display_name: string
  name: string
  lat: string
  lon: string
  type: string
  importance: number
}

interface OSMPlacesInputProps {
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

export default function OSMPlacesInput({ 
  value, 
  onChange, 
  onLocationSelect, 
  onOpenMap,
  placeholder = "Ort eingeben...",
  disabled = false 
}: OSMPlacesInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    
    try {
      // Nominatim API für Ortssuche
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=de,at,ch&` + // Fokus auf DACH-Region
        `q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Free4App/1.0 (contact@free4app.com)' // Höflicher User-Agent
          }
        }
      )

      if (response.ok) {
        const data: PlaceSuggestion[] = await response.json()
        // Filtere nach relevanten Orten (Städte, Stadtteile, Straßen, POIs)
        const filteredData = data.filter(place => 
          place.type && (
            place.type.includes('city') ||
            place.type.includes('town') ||
            place.type.includes('village') ||
            place.type.includes('suburb') ||
            place.type.includes('neighbourhood') ||
            place.type.includes('amenity') ||
            place.type.includes('shop') ||
            place.type.includes('restaurant') ||
            place.type === 'house' ||
            place.type === 'building'
          )
        ).slice(0, 5)

        setSuggestions(filteredData)
        setShowSuggestions(filteredData.length > 0)
      } else {
        console.error('Nominatim API error:', response.status)
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Error searching places:', error)
      setSuggestions([])
      setShowSuggestions(false)
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
    
    // Set new timeout for search (1.5 seconds to be respectful to Nominatim)
    searchTimeout.current = setTimeout(() => {
      searchPlaces(newValue)
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    const locationName = suggestion.name || suggestion.display_name.split(',')[0]
    onChange(locationName)
    setShowSuggestions(false)
    
    onLocationSelect({
      name: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      place_id: suggestion.place_id
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

  const formatDisplayName = (displayName: string) => {
    // Kürze lange Ortsnamen für bessere Darstellung
    const parts = displayName.split(',').slice(0, 3)
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
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center">
                <MapPin size={16} className="text-gray-400 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.name || suggestion.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {formatDisplayName(suggestion.display_name)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Rate Limit Hinweis */}
      {loading && (
        <div className="absolute z-10 w-full mt-1 bg-blue-50 border border-blue-200 rounded-md p-2">
          <div className="text-xs text-blue-600">
            💡 OpenStreetMap wird durchsucht...
          </div>
        </div>
      )}
    </div>
  )
}