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
    radius?: number
  }) => void
  initialLocation?: {
    latitude: number
    longitude: number
  }
  initialRadius?: number
}

export default function SimpleMapBoxModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation,
  initialRadius
}: SimpleMapBoxModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [radius, setRadius] = useState<number>(1)
  const [mapReady, setMapReady] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const marker = useRef<any>(null)
  const circle = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    
    if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
      // Fallback names for demo
      return `Ort in Berlin-Nähe`
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=poi,address,place`
      )
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        return feature.place_name || feature.text || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  const handleFallbackMapClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Convert click coordinates to lat/lng (Berlin area simulation)
    const latitude = 52.5 + (y / rect.height - 0.5) * 0.1
    const longitude = 13.4 + (x / rect.width - 0.5) * 0.1
    
    const locationName = await reverseGeocode(latitude, longitude)
    
    setSelectedLocation({
      latitude,
      longitude,
      name: locationName
    })
    
    // Set radius to 1 km
    setRadius(1)
  }

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

  // Function to update circle on map
  const updateCircle = (map: any, lat: number, lng: number, radiusKm: number) => {
    if (!map) return
    
    // Remove existing circle
    if (circle.current) {
      try {
        map.removeLayer(circle.current.id)
        if (circle.current.strokeId) {
          map.removeLayer(circle.current.strokeId)
        }
        map.removeSource(circle.current.id)
      } catch (e) {
        // Layer/source might not exist
      }
    }

    try {
      const circleId = `radius-circle-${Date.now()}`
      
      // Calculate circle polygon points with latitude correction
      const radiusInMeters = radiusKm * 1000
      const points = []
      const steps = 64
      
      // Latitude correction for spherical projection
      const latCorrection = Math.cos(lat * Math.PI / 180)
      
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * 2 * Math.PI
        const dx = (radiusInMeters * Math.cos(angle)) / (111320 * latCorrection) // longitude correction
        const dy = (radiusInMeters * Math.sin(angle)) / 110540 // latitude
        points.push([lng + dx, lat + dy])
      }
      points.push(points[0]) // Close the polygon
      
      // Add circle source and layer
      map.addSource(circleId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [points]
          }
        }
      })

      map.addLayer({
        id: circleId,
        type: 'fill',
        source: circleId,
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.2
        }
      })

      map.addLayer({
        id: `${circleId}-stroke`,
        type: 'line',
        source: circleId,
        paint: {
          'line-color': '#ff0000',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      circle.current = { id: circleId, strokeId: `${circleId}-stroke` }
    } catch (error) {
      console.warn('Could not add circle to map:', error)
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

          map.current.on('click', async (e: any) => {
            const { lng, lat } = e.lngLat
            
            // Remove existing marker
            if (marker.current) {
              marker.current.remove()
            }
            
            // Add new marker
            marker.current = new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .addTo(map.current)
            
            // Get location name via reverse geocoding
            const locationName = await reverseGeocode(lat, lng)
            
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
              name: locationName
            })
            
            // Set radius to 1 km and update circle
            setRadius(1)
            updateCircle(map.current, lat, lng, 1)
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
      if (marker.current) {
        marker.current.remove()
        marker.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      circle.current = null
      setMapReady(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin size={20} className="mr-2" />
            Ort und Umkreis auswählen
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 flex min-h-0 gap-6">
          {/* Map Container */}
          <div className="flex-1 flex flex-col">
            <p className="text-sm text-gray-600 mb-4">
              Klicke auf die Karte um einen Ort auszuwählen. Verwende den Slider um den Umkreis zu ändern:
            </p>
            
            <div className="w-full h-96 bg-gray-200 border border-gray-300 rounded-lg overflow-hidden relative flex-shrink-0">
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
                    <>
                      {/* Marker */}
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                        style={{
                          left: `${((selectedLocation.longitude - 13.35) / 0.1 + 0.5) * 100}%`,
                          top: `${(-(selectedLocation.latitude - 52.5) / 0.1 + 0.5) * 100}%`
                        }}
                      >
                        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Radius Circle */}
                      <div
                        className="absolute border-2 border-red-500 bg-red-500 bg-opacity-20 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                        style={{
                          left: `${((selectedLocation.longitude - 13.35) / 0.1 + 0.5) * 100}%`,
                          top: `${(-(selectedLocation.latitude - 52.5) / 0.1 + 0.5) * 100}%`,
                          width: `${Math.max(radius * 8, 10)}px`,
                          height: `${Math.max(radius * 8, 10)}px`
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

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

          {/* Umkreis Control Sidebar */}
          <div className="w-80 flex-shrink-0 bg-gray-50 rounded-lg p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Umkreis einstellen</h3>
            
            {/* Umkreis Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Umkreis</label>
                <span className="text-lg font-bold text-blue-600">{radius.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={radius}
                onChange={(e) => {
                  const newRadius = parseFloat(e.target.value)
                  setRadius(newRadius)
                  if (selectedLocation) {
                    updateCircle(map.current, selectedLocation.latitude, selectedLocation.longitude, newRadius)
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1 km</span>
                <span>20 km</span>
              </div>
            </div>

            {/* Quick Umkreis Buttons */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 block mb-2">Schnellauswahl</label>
              <div className="grid grid-cols-2 gap-2">
                {[0.1, 1, 2, 5, 10, 20].map((quickRadius) => (
                  <button
                    key={quickRadius}
                    type="button"
                    onClick={() => {
                      setRadius(quickRadius)
                      if (selectedLocation) {
                        updateCircle(map.current, selectedLocation.latitude, selectedLocation.longitude, quickRadius)
                      }
                    }}
                    className={`px-3 py-2 text-sm rounded border ${
                      Math.abs(radius - quickRadius) < 0.1
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {quickRadius === 0.1 ? '100m' : `${quickRadius} km`}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Location Info */}
            {selectedLocation && (
              <div className="p-4 bg-white rounded-lg border">
                <div className="flex items-center mb-2">
                  <MapPin size={16} className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">
                    Ausgewählter Ort:
                  </span>
                </div>
                <p className="text-sm text-blue-700 mb-2 font-medium">
                  {selectedLocation.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
              <p className="text-sm text-blue-800">
                <strong>Tipp:</strong> Beim Klick auf die Karte wird automatisch 1 km Umkreis gesetzt. Verwende den Slider oder die Buttons um ihn zu ändern.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}