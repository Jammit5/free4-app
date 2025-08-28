'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Check } from 'lucide-react'

interface SimpleMapBoxModalProps {
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

export default function SimpleMapBoxModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation 
}: SimpleMapBoxModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleFallbackMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert click coordinates to lat/lng (Berlin area simulation)
    const latitude = 52.5 + (y / rect.height - 0.5) * 0.1
    const longitude = 13.4 + (x / rect.width - 0.5) * 0.1
    
    setSelectedLocation({
      latitude,
      longitude,
      name: `Berlin-Nähe bei ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    })
  }

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

  useEffect(() => {
    if (!isOpen) {
      setMapReady(false)
      return
    }

    const initMapBox = async () => {
      console.log('Starting MapBox initialization...')
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      
      if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
        console.log('No MapBox token, using fallback')
        setMapReady(true)
        return
      }

      console.log('MapBox token found, waiting for container...')

      // Simple timeout approach 
      setTimeout(async () => {
        if (!mapContainer.current) {
          console.error('Container still not ready, using fallback')
          setMapReady(true)
          return
        }

        console.log('Container ready, initializing MapBox...')

        try {
          const mapboxgl = (await import('mapbox-gl')).default
          mapboxgl.accessToken = mapboxToken

          const center: [number, number] = initialLocation 
            ? [initialLocation.longitude, initialLocation.latitude]
            : [13.404954, 52.520008] // Berlin

          console.log('Creating MapBox map...')

          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: center,
            zoom: 13
          })

          console.log('MapBox map created, waiting for load event...')

          map.current.on('click', (e: any) => {
            const { lng, lat } = e.lngLat
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
              name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            })
            
            new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .addTo(map.current)
          })

          map.current.on('load', () => {
            console.log('MapBox map loaded successfully!')
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            setMapReady(true)
          })

          map.current.on('error', (e: any) => {
            console.error('MapBox error:', e)
            setMapReady(true)
          })

          // 10 second timeout fallback
          timeoutRef.current = setTimeout(() => {
            console.warn('MapBox loading timeout, using fallback')
            setMapReady(true)
          }, 10000)

        } catch (error) {
          console.error('MapBox init error:', error)
          setMapReady(true)
        }
      }, 500) // 500ms delay
    }

    initMapBox()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      setMapReady(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin size={20} className="mr-2" />
            Ort auf Karte auswählen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col min-h-0">
          <p className="text-sm text-gray-600 mb-4">
            Klicke auf die Karte um einen Ort auszuwählen:
          </p>
          
          {/* Map Container */}
          <div className="w-full h-64 bg-gray-200 border border-gray-300 rounded-lg overflow-hidden relative flex-shrink-0">
            {/* Always render the map container div */}
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Karte wird geladen...</p>
                </div>
              </div>
            )}
            
            {mapReady && !map.current && (
              <div 
                onClick={handleFallbackMapClick}
                className="absolute inset-0 bg-gradient-to-br from-green-200 via-blue-200 to-green-300 cursor-crosshair relative overflow-hidden"
              >
                <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded text-xs font-medium shadow">
                  Berlin (Demo-Karte)
                </div>
                <div className="absolute bottom-4 right-4 bg-yellow-100 px-2 py-1 rounded text-xs font-medium shadow">
                  💡 Für echte Karte: MapBox Token hinzufügen
                </div>
                
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
            )}
          </div>

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
          <div className="flex justify-end space-x-3 mt-6 flex-shrink-0">
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