'use client'

import { useEffect, useState } from 'react'
import MapBoxMapModal from './MapBoxMapModal'
import OSMMapModal from './OSMMapModal'

interface SmartMapModalProps {
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

export default function SmartMapModal(props: SmartMapModalProps) {
  const [useMapBox, setUseMapBox] = useState(false)

  useEffect(() => {
    // Check if MapBox token is configured
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    console.log('SmartMapModal - MapBox Token:', mapboxToken)
    console.log('SmartMapModal - Token length:', mapboxToken?.length)
    const hasValidMapBoxToken = mapboxToken && mapboxToken !== 'pk.your_mapbox_token_here'
    console.log('SmartMapModal - Using MapBox:', hasValidMapBoxToken)
    setUseMapBox(!!hasValidMapBoxToken)
  }, [])

  // Use MapBox if token is available, otherwise fallback to OSM
  return useMapBox ? (
    <MapBoxMapModal {...props} />
  ) : (
    <OSMMapModal {...props} />
  )
}