'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Check } from 'lucide-react'
import mapboxgl from 'mapbox-gl'

interface MapBoxMapModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: {
    name: string
    latitude: number
    longitude: number
    radius: number
  }) => void
  initialLocation?: {
    latitude: number
    longitude: number
    radius?: number
  }
  userLocation?: {
    latitude: number
    longitude: number
    name?: string
  }
}

export default function MapBoxMapModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation,
  userLocation 
}: MapBoxMapModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [radius, setRadius] = useState(initialLocation?.radius || 1.0) // Default 1km or from initialLocation
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const markerRef = useRef<any>(null)
  const userLocationMarkerRef = useRef<any>(null)
  const radiusLayerId = 'radius-circle'

  // Function to create radius circle
  const createRadiusCircle = (center: [number, number], radiusKm: number) => {
    if (!map.current) return

    const radiusInMeters = radiusKm * 1000
    const points = 64
    const coords = []

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2
      const dx = radiusInMeters * Math.cos(angle)
      const dy = radiusInMeters * Math.sin(angle)

      // Convert meters to degrees (approximate)
      const deltaLat = dy / 111320
      const deltaLng = dx / (111320 * Math.cos(center[1] * Math.PI / 180))

      coords.push([center[0] + deltaLng, center[1] + deltaLat])
    }
    coords.push(coords[0]) // Close the polygon

    // Remove existing radius circle
    if (map.current.getSource(radiusLayerId)) {
      map.current.removeLayer(radiusLayerId)
      map.current.removeSource(radiusLayerId)
    }

    // Add new radius circle
    map.current.addSource(radiusLayerId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      }
    })

    map.current.addLayer({
      id: radiusLayerId,
      type: 'fill',
      source: radiusLayerId,
      paint: {
        'fill-color': '#00ff00',
        'fill-opacity': 0.2
      }
    })
  }

  useEffect(() => {
    if (!isOpen) return

    const initializeMap = async () => {
      console.log('Starting map initialization...')
      
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
        console.log('MapBox token not configured, using fallback map')
        setMapError(true)
        setLoading(false)
        return
      }

      setLoading(true)
      setMapError(false)

      // Wait for container to be ready
      let attempts = 0
      while (!mapContainer.current && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!mapContainer.current) {
        console.error('Container not available after waiting')
        setMapError(true)
        setLoading(false)
        return
      }

      try {
        console.log('Starting MapBox initialization...')
        mapboxgl.accessToken = mapboxToken

        const defaultCenter: [number, number] = [13.404954, 52.520008]
        const center: [number, number] = initialLocation 
          ? [initialLocation.longitude, initialLocation.latitude]
          : defaultCenter

        if (!map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: center,
            zoom: 13,
            language: 'de'
          })

          // Add click event listener
          map.current.on('click', async (e: any) => {
            const { lng, lat } = e.lngLat
            
            if (markerRef.current) {
              markerRef.current.remove()
            }

            markerRef.current = new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .addTo(map.current)

            createRadiusCircle([lng, lat], radius)
            
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
              name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            })

            // Reverse geocoding - try different approaches for German names
            try {
              // Try multiple API calls to get best German result
              let bestLocationName = `${lat.toFixed(6)}, ${lng.toFixed(6)}` // fallback
              
              // Approach 1: Standard reverse geocoding
              const response1 = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=de`
              )
              
              // Approach 2: Try without language parameter
              const response2 = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`
              )
              
              const responses = [
                { name: 'with language=de', response: response1 },
                { name: 'without language', response: response2 }
              ]
              
              for (const {name, response} of responses) {
                if (response.ok) {
                  const data = await response.json()
                  
                  if (data.features && data.features.length > 0) {
                    const feature = data.features[0]
                    const locationName = feature.text || feature.place_name
                    
                    // Use first valid location name we get
                    if (locationName && locationName.length > 10) { // More than coordinates
                      bestLocationName = locationName
                      break
                    }
                  }
                }
              }
              
              // If we still have Dutch names, manually correct known street names
              if (bestLocationName.includes('Onder de Linden')) {
                bestLocationName = bestLocationName.replace('Onder de Linden', 'Unter den Linden')
              }
              
              // Clean up the location name
              const locationName = bestLocationName
                .replace(/, Deutschland$/, '')
                .replace(/, Germany$/, '')
                .replace(/, Berlin$/, '')
              
              setSelectedLocation({
                latitude: lat,
                longitude: lng,
                name: locationName
              })
            } catch (error) {
              console.error('Reverse geocoding error:', error)
              // Fallback to coordinates
              setSelectedLocation({
                latitude: lat,
                longitude: lng,
                name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              })
            }
          })

          map.current.on('load', () => {
            console.log('MapBox map loaded successfully')
            
            // Add user location marker if available
            if (userLocation) {
              const userEl = document.createElement('div')
              userEl.className = 'user-location-marker'
              userEl.style.width = '20px'
              userEl.style.height = '20px'
              userEl.style.borderRadius = '50%'
              userEl.style.backgroundColor = '#3B82F6'
              userEl.style.border = '3px solid white'
              userEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
              userEl.style.cursor = 'pointer'
              userEl.title = userLocation.name || 'Deine Position'
              
              userLocationMarkerRef.current = new mapboxgl.Marker(userEl)
                .setLngLat([userLocation.longitude, userLocation.latitude])
                .addTo(map.current)
            }
            
            setLoading(false)
          })

          map.current.on('error', (e: any) => {
            console.error('MapBox map error:', e.error)
            setMapError(true)
            setLoading(false)
          })
        }
      } catch (error) {
        console.error('Error loading MapBox:', error)
        setMapError(true)
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(initializeMap, 100)

    return () => {
      clearTimeout(timeoutId)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [isOpen, initialLocation])

  // Update radius circle when radius changes
  useEffect(() => {
    if (selectedLocation && map.current && !loading && !mapError) {
      createRadiusCircle([selectedLocation.longitude, selectedLocation.latitude], radius)
    }
  }, [radius, selectedLocation, loading, mapError])

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        name: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius: radius
      })
      onClose()
    }
  }

  const handleFallbackMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert click coordinates to fake lat/lng (for demo when no MapBox token)
    const latitude = 52.5 + (y / rect.height - 0.5) * 0.1
    const longitude = 13.4 + (x / rect.width - 0.5) * 0.1
    
    setSelectedLocation({
      latitude,
      longitude,
      name: `Demo Ort bei ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin size={20} className="mr-2" />
            Ort auf Karte auswählen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left side: Map and info */}
          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-sm text-gray-600 mb-4">
              Klicke auf die Karte um einen Ort auszuwählen:
            </p>
            
            {/* Map Container */}
            <div className="w-full h-96 bg-gray-200 border border-gray-300 rounded-lg overflow-hidden relative">
              {/* Always render the MapBox container */}
              <div ref={mapContainer} className="w-full h-full" />
              
              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">MapBox wird geladen...</p>
                  </div>
                </div>
              )}
              
              {/* Fallback demo map overlay when MapBox fails */}
              {mapError && (
                <div className="absolute inset-0 w-full h-full z-20">
                  <div 
                    onClick={handleFallbackMapClick}
                    className="w-full h-full bg-gradient-to-br from-green-200 via-blue-200 to-green-300 cursor-crosshair relative overflow-hidden"
                  >
                    {/* Demo Map Pattern */}
                    <div className="absolute inset-0 opacity-30">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-px h-full bg-gray-400"
                          style={{ left: `${i * 5}%` }}
                        />
                      ))}
                      {[...Array(16)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full h-px bg-gray-400"
                          style={{ top: `${i * 6.25}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* Demo Labels */}
                    <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded text-xs font-medium shadow">
                      Demo Karte (MapBox Token benötigt)
                    </div>
                    <div className="absolute bottom-4 right-4 bg-yellow-100 px-2 py-1 rounded text-xs font-medium shadow">
                      💡 Füge MapBox Token hinzu für echte Karte
                    </div>
                    
                    {/* Selected Location Marker */}
                    {selectedLocation && (
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{
                          left: `${((selectedLocation.longitude - 13.35) / 0.1 + 0.5) * 100}%`,
                          top: `${(-(selectedLocation.latitude - 52.5) / 0.1 + 0.5) * 100}%`
                        }}
                      >
                        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MapBox Token Help */}
            {mapError && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <div className="font-medium">💡 MapBox Token benötigt</div>
                  <div className="mt-1 text-xs">
                    Erstelle einen kostenlosen MapBox Account und füge den Token zur .env.local hinzu:
                    <br />
                    <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=dein_token</code>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Location Info with inline button */}
            {selectedLocation && (
              <div className="mt-4 flex items-stretch gap-4">
                <div className="flex-1 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <MapPin size={16} className="text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">
                      Ausgewählter Ort:
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {selectedLocation.name}
                  </p>
                </div>
                
                {/* Use Location Button */}
                <button
                  onClick={handleConfirm}
                  disabled={!selectedLocation}
                  className="flex-1 px-4 py-2 bg-white border border-black text-gray-900 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
                >
                  <Check size={16} className="mr-2" />
                  Ort verwenden
                </button>
              </div>
            )}
          </div>

          {/* Right side: Vertical Radius Slider */}
          {selectedLocation && (
            <div className="w-20 bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center py-6">
              <div className="flex flex-col items-center h-full">
                <span className="text-xs text-gray-600 mb-2">
                  20 km
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className="w-2 h-64 bg-gray-200 rounded-lg appearance-none cursor-pointer vertical-slider"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <span className="text-xs text-gray-600 mt-2 writing-mode-vertical">
                  0.1 km
                </span>
                <div className="mt-4 text-center">
                  <span className="text-xs font-medium text-gray-700">
                    {radius === 0.1 ? 'Nur hier' : `${radius} km`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}