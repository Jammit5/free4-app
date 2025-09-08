'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | null
  isSubscribed: boolean
  subscription: PushSubscription | null
  globallyEnabled: boolean
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: null,
    isSubscribed: false,
    subscription: null,
    globallyEnabled: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSupport()
    checkDatabaseSubscription()
    checkGlobalPreference()
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

    setState(prev => ({
      ...prev,
      isSupported,
      permission,
      isSubscribed,
      subscription
    }))
  }

  const getDeviceId = () => {
    // Create a unique device identifier based on browser fingerprint
    const userAgent = navigator.userAgent
    const screen = `${window.screen.width}x${window.screen.height}`
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return btoa(`${userAgent}-${screen}-${timezone}`).substring(0, 20)
  }

  const checkGlobalPreference = async () => {
    if (typeof window === 'undefined') return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications_enabled')
        .eq('id', user.id)
        .single()

      if (profile) {
        setState(prev => ({
          ...prev,
          globallyEnabled: profile.push_notifications_enabled || false
        }))
      }
    } catch (err) {
      console.log('Error checking global preference:', err)
    }
  }

  const checkDatabaseSubscription = async () => {
    if (typeof window === 'undefined') return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const deviceId = getDeviceId()
      const { data: dbSubscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .single()

      if (dbSubscription) {
        // We have a database subscription for this device, but need to check if browser subscription exists
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready
            const browserSubscription = await registration.pushManager.getSubscription()
            
            if (!browserSubscription) {
              // Database has subscription but browser doesn't - recreate browser subscription
              console.log('📬 Database subscription found but browser subscription missing, recreating...')
              const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
              
              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              })

              // Update database with new subscription
              await supabase
                .from('push_subscriptions')
                .update({
                  subscription: JSON.stringify(newSubscription.toJSON()),
                  device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    timestamp: new Date().toISOString()
                  }
                })
                .eq('user_id', user.id)
                .eq('device_id', deviceId)

              setState(prev => ({
                ...prev,
                isSubscribed: true,
                subscription: newSubscription
              }))
              
              console.log('📬 Browser subscription recreated successfully')
            } else {
              // Both database and browser subscriptions exist
              setState(prev => ({
                ...prev,
                isSubscribed: true,
                subscription: browserSubscription
              }))
              console.log('📬 Both database and browser subscriptions found')
            }
          } catch (err) {
            console.log('Error recreating browser subscription:', err)
            // If we can't recreate, clean up database
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', user.id)
              .eq('device_id', deviceId)
          }
        }
      }
    } catch (err) {
      console.log('Error checking database subscription:', err)
    }
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
      
      // VAPID public key from environment variables
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const deviceId = getDeviceId()
        
        // Use exactly the original schema
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: JSON.stringify(subscription.toJSON())
          }, {
            onConflict: 'user_id'
          })

        // IMPORTANT: Also update the global preference in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ push_notifications_enabled: true })
          .eq('id', user.id)

        if (dbError) {
          console.error('Error saving push subscription:', dbError)
        } else if (profileError) {
          console.error('Error updating profile push preference:', profileError)
        } else {
          console.log('✅ Push subscription and global preference saved successfully')
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
        globallyEnabled: true
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
    setLoading(true)
    setError(null)

    try {
      // Unsubscribe browser subscription if it exists
      if (state.subscription) {
        await state.subscription.unsubscribe()
      }

      // Remove ALL subscriptions for this user and disable globally
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Remove all device subscriptions for this user
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)

        // Set global preference to disabled
        await supabase
          .from('profiles')
          .update({ push_notifications_enabled: false })
          .eq('id', user.id)
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
        globallyEnabled: false
      }))

      console.log('Push notifications disabled for all devices')
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
    sendTestNotification,
    checkGlobalPreference
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