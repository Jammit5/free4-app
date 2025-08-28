'use client'

import { useEffect, useState } from 'react'
import MapBoxPlacesInput from './MapBoxPlacesInput'
import OSMPlacesInput from './OSMPlacesInput'

interface SmartPlacesInputProps {
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

export default function SmartPlacesInput(props: SmartPlacesInputProps) {
  const [useMapBox, setUseMapBox] = useState(false)

  useEffect(() => {
    // Check if MapBox token is configured
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    const hasValidMapBoxToken = mapboxToken && mapboxToken !== 'pk.your_mapbox_token_here'
    setUseMapBox(!!hasValidMapBoxToken)
  }, [])

  // Use MapBox if token is available, otherwise fallback to OSM
  return useMapBox ? (
    <MapBoxPlacesInput {...props} />
  ) : (
    <OSMPlacesInput {...props} />
  )
}