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
  }) => void
  initialLocation?: {
    latitude: number
    longitude: number
  }
}

export default function MapBoxMapModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation 
}: MapBoxMapModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const initializeMap = () => {
      setLoading(true)
      setMapError(false)

      // Use a direct timeout to let React finish rendering
      setTimeout(() => {
        console.log('Checking container after timeout...')
        console.log('Container ref:', mapContainer.current)
        console.log('Container exists:', !!mapContainer.current)
        
        if (!mapContainer.current) {
          console.error('Container still not ready, falling back to demo map')
          setMapError(true)
          setLoading(false)
          return
        }

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
          console.log('MapBox token not configured, using fallback map')
          setMapError(true)
          setLoading(false)
          return
        }

      try {
        console.log('Starting MapBox initialization...')
        console.log('MapBox token:', mapboxToken ? 'Token present' : 'No token')
        
        mapboxgl.accessToken = mapboxToken

        // Default center: Berlin
        const defaultCenter: [number, number] = [13.404954, 52.520008]
        const center: [number, number] = initialLocation 
          ? [initialLocation.longitude, initialLocation.latitude]
          : defaultCenter

        console.log('Creating map with center:', center)

        if (mapContainer.current && !map.current) {
          console.log('Container found, creating MapBox map...')
          
          try {
            map.current = new mapboxgl.Map({
              container: mapContainer.current,
              style: 'mapbox://styles/mapbox/streets-v12',
              center: center,
              zoom: 13
            })

            console.log('MapBox map instance created, waiting for load event...')
          } catch (mapError) {
            console.error('Error creating MapBox map instance:', mapError)
            setMapError(true)
            setLoading(false)
            return
          }

          // Add click event listener
          map.current.on('click', async (e: any) => {
            const { lng, lat } = e.lngLat
            
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
              name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            })

            // Add marker for selected location
            new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .addTo(map.current)

            // Reverse geocoding with MapBox
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
                `access_token=${mapboxToken}&` +
                `language=de`
              )

              if (response.ok) {
                const data = await response.json()
                if (data.features && data.features[0]) {
                  setSelectedLocation({
                    latitude: lat,
                    longitude: lng,
                    name: data.features[0].place_name
                  })
                }
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error)
            }
          })

          map.current.on('load', () => {
            console.log('MapBox map loaded successfully')
            // Clear the timeout since MapBox loaded successfully
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            setLoading(false)
          })

          map.current.on('error', (e: any) => {
            console.error('MapBox map error:', e.error)
            setMapError(true)
            setLoading(false)
          })

          // Fallback timeout in case map doesn't load
          timeoutRef.current = setTimeout(() => {
            if (loading) {
              console.warn('MapBox loading timeout, using fallback')
              setLoading(false)
            }
            timeoutRef.current = null
          }, 10000) // 10 second timeout
        } else {
          console.log('Container or map conditions not met:', {
            hasContainer: !!mapContainer.current,
            hasMap: !!map.current,
            containerElement: mapContainer.current
          })
          
          // Reset map reference if it exists but container is missing
          if (!mapContainer.current && map.current) {
            console.log('Resetting map reference...')
            map.current = null
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.error('Error loading MapBox:', error)
        setMapError(true)
        setLoading(false)
      }
    }

    initializeMap()

    return () => {
      // Clean up timeout
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

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        name: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin size={20} className="mr-2" />
            Ort auf Karte auswählen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Klicke auf die Karte um einen Ort auszuwählen:
          </p>
          
          {/* Map Container */}
          <div className="w-full h-80 bg-gray-200 border border-gray-300 rounded-lg overflow-hidden">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">MapBox wird geladen...</p>
                </div>
              </div>
            ) : mapError ? (
              // Fallback demo map when MapBox is not configured
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
            ) : (
              <div ref={mapContainer} className="w-full h-full" />
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

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <MapPin size={16} className="text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  Ausgewählter Ort:
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-900 bg-white border border-black rounded-md hover:bg-gray-50 shadow-md"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="px-4 py-2 bg-white border border-black text-gray-900 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md"
            >
              <Check size={16} className="mr-2" />
              Ort verwenden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}