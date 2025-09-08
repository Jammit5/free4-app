'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Check, Plus, Minus } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)
const useMap = dynamic(
  () => import('react-leaflet').then(mod => mod.useMap),
  { ssr: false }
)
const useMapEvents = dynamic(
  () => import('react-leaflet').then(mod => mod.useMapEvents),
  { ssr: false }
)

interface OSMMapModalProps {
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
  initialRadius?: number
  userLocation?: {
    latitude: number
    longitude: number
    name?: string
  }
}

export default function OSMMapModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation,
  userLocation 
}: OSMMapModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(userLocation ? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    name: userLocation.name || 'Deine Position'
  } : null)
  const [radius, setRadius] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Force re-render when centering

  // Helper function to calculate zoom level to fit circle on map
  const getZoomForRadius = (radiusKm: number): number => {
    // Calculate zoom to ensure the entire circle fits in the map view
    // Map container is 320px height (h-80), we want circle to fit with padding
    
    const paddingFactor = 1.5 // Add padding so circle doesn't touch edges
    const circleDiameter = radiusKm * 2 * paddingFactor
    
    // Base zoom calculation: each zoom level roughly doubles the scale
    // At zoom 13: ~1km visible height
    // At zoom 12: ~2km visible height  
    // At zoom 11: ~4km visible height
    let baseZoom = 13
    let visibleArea = 1.0 // km
    
    // Find zoom level where circle fits
    while (visibleArea < circleDiameter && baseZoom > 1) {
      baseZoom--
      visibleArea *= 2
    }
    
    // Ensure reasonable bounds
    return Math.max(3, Math.min(18, baseZoom))
  }

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    setIsClient(true)
    if (isOpen) {
      setLoading(true)
      // Simulate map loading
      setTimeout(() => setLoading(false), 1000)
    }
  }, [isOpen])

  // Update map center and zoom when radius changes
  useEffect(() => {
    if (selectedLocation && isClient && !loading) {
      // Force re-render with new zoom level
      setMapKey(prev => prev + 1)
    }
  }, [radius, selectedLocation, isClient, loading])

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    })

    // Auto-center map and adjust zoom (force re-render with new center)
    setMapKey(prev => prev + 1)

    // Reverse geocoding mit Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&` +
        `lat=${lat}&` +
        `lon=${lng}&` +
        `addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Free4App/1.0 (contact@free4app.com)'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.display_name) {
          setSelectedLocation({
            latitude: lat,
            longitude: lng,
            name: data.display_name
          })
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
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

  if (!isOpen) return null

  // Default center: Berlin
  const defaultCenter: [number, number] = [52.520008, 13.404954]
  const center: [number, number] = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : initialLocation 
    ? [initialLocation.latitude, initialLocation.longitude]
    : defaultCenter

  // Calculate zoom based on radius
  const zoom = selectedLocation ? getZoomForRadius(radius) : 13

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
                  <p className="text-sm text-gray-600">Karte wird geladen...</p>
                </div>
              </div>
            ) : isClient ? (
              <MapContainer
                key={mapKey}
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                eventHandlers={{
                  click: (e) => {
                    const { lat, lng } = e.latlng
                    handleMapClick(lat, lng)
                  }
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* User Location Marker (blue) - only show if not selected */}
                {userLocation && selectedLocation?.latitude !== userLocation.latitude && (
                  <Marker 
                    position={[userLocation.latitude, userLocation.longitude]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-medium text-blue-600">📍 Deine Position</div>
                        <div className="text-gray-600 text-xs mt-1">
                          {userLocation.name || `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {/* Selected Location Marker (red) */}
                {selectedLocation && (
                  <Marker 
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-medium text-red-600">📌 Ausgewählter Ort</div>
                        <div className="text-gray-600 text-xs mt-1">
                          {selectedLocation.name}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Initialisiere Karte...</p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Umkreis Controls - under map */}
          {selectedLocation && isMobile && (
            <div className="mt-4 flex justify-center items-center space-x-4">
              <button
                onClick={() => setRadius(Math.max(0.1, radius - 0.5))}
                className="p-3 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50"
                disabled={radius <= 0.1}
              >
                <Minus size={26} />
              </button>
              <div className="text-center px-4">
                <div className="text-lg font-semibold text-gray-900">
                  {radius === 0.1 ? 'Nur hier' : `${radius} km`}
                </div>
                <div className="text-xs text-gray-600">Umkreis</div>
              </div>
              <button
                onClick={() => setRadius(Math.min(20, radius + 0.5))}
                className="p-3 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50"
                disabled={radius >= 20}
              >
                <Plus size={26} />
              </button>
            </div>
          )}

          {/* Desktop Umkreis Slider */}
          {selectedLocation && !isMobile && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Umkreis</span>
                <span className="text-sm text-gray-600">
                  {radius === 0.1 ? 'Nur hier' : `${radius} km`}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
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
                {selectedLocation.name}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className={`${isMobile ? 'p-3' : 'px-4 py-2'} bg-white border border-black text-green-600 shadow-md rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              title={isMobile ? 'Ort verwenden' : undefined}
            >
              <Check size={isMobile ? 26 : 16} className={isMobile ? '' : 'mr-2'} />
              {!isMobile && 'Ort verwenden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}