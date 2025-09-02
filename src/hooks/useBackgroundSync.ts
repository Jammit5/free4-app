'use client'

import { useEffect } from 'react'

export function useBackgroundSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const registerBackgroundSync = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready
          
          // Register background sync for matches
          await registration.sync.register('background-matches-sync')
          console.log('Background sync registered for matches')
          
          // Set up periodic sync (every 5 minutes when app is idle)
          const setupPeriodicSync = () => {
            if (document.hidden) {
              registration.sync.register('background-matches-sync')
                .catch(err => console.log('Periodic background sync failed:', err))
            }
          }

          // Listen for when the app becomes hidden/visible
          document.addEventListener('visibilitychange', setupPeriodicSync)
          
          return () => {
            document.removeEventListener('visibilitychange', setupPeriodicSync)
          }
        } catch (error) {
          console.log('Background sync not supported:', error)
        }
      }
    }

    registerBackgroundSync()
  }, [])

  const triggerSync = async (tag: string = 'background-matches-sync') => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register(tag)
        console.log(`Manual sync triggered: ${tag}`)
        return true
      } catch (error) {
        console.log('Manual sync failed:', error)
        return false
      }
    }
    return false
  }

  return {
    triggerSync
  }
}