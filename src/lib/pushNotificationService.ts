import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { addDebugLog } from '@/app/api/debug-logs/route'

// Service role client for server-side operations
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// VAPID configuration function
function configureWebPush() {
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured')
  }

  webpush.setVapidDetails(
    'mailto:noreply@free4app.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export async function sendPushNotifications(userIds: string[], type: string, data: any = {}) {
  try {
    // Configure VAPID keys at runtime
    configureWebPush()
    
    console.log(`📬 DEBUG: Push service called with type: ${type}, userIds:`, userIds)
    addDebugLog(`📬 Push service called with type: ${type}, userIds: [${userIds.join(', ')}]`, 'info')

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('userIds array is required')
    }

    // Get push subscriptions for users who have globally enabled notifications
    const { data: subscriptions, error: subscriptionsError } = await serviceSupabase
      .from('push_subscriptions')
      .select(`
        *,
        profiles!push_subscriptions_user_id_fkey(push_notifications_enabled)
      `)
      .in('user_id', userIds)

    if (subscriptionsError) {
      console.error('Error fetching push subscriptions:', subscriptionsError)
      throw new Error('Failed to fetch subscriptions')
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`📬 No push subscriptions found for users: ${JSON.stringify(userIds)}`)
      addDebugLog(`📬 No push subscriptions found for users: [${userIds.join(', ')}]`, 'info')
      return { sent: 0, failed: 0, message: 'No subscriptions found' }
    }

    // Filter subscriptions for users who have globally enabled push notifications
    const enabledSubscriptions = subscriptions.filter(sub => 
      sub.profiles?.push_notifications_enabled === true
    )

    if (enabledSubscriptions.length === 0) {
      console.log(`📬 No enabled push subscriptions found for users: ${JSON.stringify(userIds)}`)
      addDebugLog(`📬 No enabled push subscriptions found for users: [${userIds.join(', ')}]`, 'info')
      return { sent: 0, failed: 0, message: 'No enabled subscriptions found' }
    }

    // Create notification payload based on type
    let notificationPayload: any = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: type,
      data: {
        url: '/',
        ...data
      },
      actions: [
        {
          action: 'view',
          title: 'Öffnen',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Schließen'
        }
      ]
    }

    switch (type) {
      case 'new_matches':
        notificationPayload = {
          ...notificationPayload,
          title: 'Free4 - neues Match!',
          body: 'Du hast ein neues Match! Schau nach wer Zeit hat!',
          tag: 'new-matches'
        }
        break

      case 'friend_request':
        notificationPayload = {
          ...notificationPayload,
          title: '👋 Neue Freundschaftsanfrage!',
          body: 'Du hast eine neue Freundschaftsanfrage erhalten!',
          tag: 'friend-request',
          data: {
            url: '/?tab=friends',
            ...data
          }
        }
        break

      case 'friend_accepted':
        notificationPayload = {
          ...notificationPayload,
          title: '🎉 Freundschaft bestätigt!',
          body: 'Ihr seid jetzt befreundet!',
          tag: 'friend-accepted',
          data: {
            url: '/?tab=friends',
            ...data
          }
        }
        break

      case 'test':
        notificationPayload = {
          ...notificationPayload,
          title: '🧪 Free4 Test',
          body: data?.message || 'Push notifications are working! 🎉',
          tag: 'test-notification'
        }
        break

      default:
        notificationPayload = {
          ...notificationPayload,
          title: 'Free4',
          body: data?.message || 'Du hast eine neue Benachrichtigung.'
        }
    }

    // Send notifications to all enabled subscriptions
    const sendPromises = enabledSubscriptions.map(async (subscription) => {
      try {
        const pushSubscription = JSON.parse(subscription.subscription)
        
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        )
        
        return { success: true, userId: subscription.user_id }
      } catch (error: any) {
        console.error(`❌ Failed to send push notification to user ${subscription.user_id}:`, error.message)
        
        // Note: We no longer delete subscriptions for 410/404 errors to keep profile settings accurate
        // Subscriptions are only deleted when user accounts are deleted
        
        return { success: false, userId: subscription.user_id, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`📬 Push notifications sent: ${successCount} success, ${failureCount} failed`)
    addDebugLog(`📬 Push notifications sent: ${successCount} success, ${failureCount} failed`, 'info')

    return {
      message: `Push notifications processed`,
      sent: successCount,
      failed: failureCount,
      details: results
    }

  } catch (error: any) {
    console.error('❌ Push notification error:', error)
    addDebugLog(`❌ Push notification error: ${error.message}`, 'error')
    throw error
  }
}