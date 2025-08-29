'use client'

import { useEffect, useState } from 'react'
import SimpleMapBoxModal from './SimpleMapBoxModal'
import OSMMapModal from './OSMMapModal'

interface SmartMapModalProps {
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

export default function SmartMapModal(props: SmartMapModalProps) {
  const [useMapBox, setUseMapBox] = useState(false)

  useEffect(() => {
    // Check if MapBox token is configured
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    const hasValidMapBoxToken = mapboxToken && mapboxToken !== 'pk.your_mapbox_token_here'
    setUseMapBox(!!hasValidMapBoxToken)
  }, [])

  // Use MapBox if token is available, otherwise fallback to OSM
  return useMapBox ? (
    <SimpleMapBoxModal {...props} />
  ) : (
    <OSMMapModal {...props} />
  )
}