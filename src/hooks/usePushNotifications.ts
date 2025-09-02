'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | null
  isSubscribed: boolean
  subscription: PushSubscription | null
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    isSubscribed: false,
    subscription: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSupport()
  }, [])

  const checkSupport = async () => {
    if (typeof window === 'undefined') return

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    const permission = isSupported ? Notification.permission : null

    let isSubscribed = false
    let subscription = null

    if (isSupported && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        subscription = await registration.pushManager.getSubscription()
        isSubscribed = !!subscription
      } catch (err) {
        console.log('Error checking push subscription:', err)
      }
    }

    setState({
      isSupported,
      permission,
      isSubscribed,
      subscription
    })
  }

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      setError('Push notifications are not supported on this device')
      return false
    }

    if (state.permission === 'granted') {
      return true
    }

    setLoading(true)
    setError(null)

    try {
      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission }))
      
      if (permission === 'granted') {
        return true
      } else {
        setError('Permission denied for notifications')
        return false
      }
    } catch (err) {
      setError('Failed to request notification permission')
      return false
    } finally {
      setLoading(false)
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!state.isSupported) {
      setError('Push notifications are not supported')
      return false
    }

    // First request permission
    const hasPermission = await requestPermission()
    if (!hasPermission) return false

    setLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      
      // VAPID public key - you would generate this for production
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80YM96Zl68G0-6FZDmUa5eVCyfUwKNh1y-k3_-mKh8W-FZRYHaMLq8-8'
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: JSON.stringify(subscription.toJSON()),
            created_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (dbError) {
          console.error('Error saving push subscription:', dbError)
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription
      }))

      console.log('Push notification subscription successful')
      return true
    } catch (err) {
      console.error('Error subscribing to push notifications:', err)
      setError('Failed to subscribe to notifications')
      return false
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    if (!state.subscription) {
      return true
    }

    setLoading(true)
    setError(null)

    try {
      await state.subscription.unsubscribe()

      // Remove subscription from database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }))

      console.log('Push notification unsubscribed')
      return true
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err)
      setError('Failed to unsubscribe from notifications')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Test notification
  const sendTestNotification = () => {
    if (state.permission === 'granted') {
      new Notification('Free4 Test', {
        body: 'Push notifications are working! 🎉',
        icon: '/icon-192x192.png',
        tag: 'test-notification'
      })
    }
  }

  return {
    ...state,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}