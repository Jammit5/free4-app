'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Check } from 'lucide-react'
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

interface OSMMapModalProps {
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

export default function OSMMapModal({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation 
}: OSMMapModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number
    longitude: number
    name: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (isOpen) {
      setLoading(true)
      // Simulate map loading
      setTimeout(() => setLoading(false), 1000)
    }
  }, [isOpen])

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    })

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
        longitude: selectedLocation.longitude
      })
      onClose()
    }
  }

  if (!isOpen) return null

  // Default center: Berlin
  const defaultCenter: [number, number] = [52.520008, 13.404954]
  const center: [number, number] = initialLocation 
    ? [initialLocation.latitude, initialLocation.longitude]
    : defaultCenter

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
                center={center}
                zoom={13}
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
                {selectedLocation && (
                  <Marker 
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-medium">Ausgewählter Ort</div>
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
              className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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