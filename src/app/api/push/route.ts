import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import webpush from 'web-push'

// VAPID keys - in production, these should be in environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80YM96Zl68G0-6FZDmUa5eVCyfUwKNh1y-k3_-mKh8W-FZRYHaMLq8-8'
const VAPID_PRIVATE_KEY = 'gSDwsDZYlkm6IXNF3vU8AEF3j4zJ1lJk7gOuFHVfv7A'

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:noreply@free4app.com', // Contact email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export async function POST(request: NextRequest) {
  try {
    const { userIds, type, data } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      )
    }

    console.log(`📬 Sending ${type} push notifications to ${userIds.length} users`)

    // Get push subscriptions for the specified users
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subscriptionsError) {
      console.error('Error fetching push subscriptions:', subscriptionsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('📬 No push subscriptions found for users:', userIds)
      return NextResponse.json(
        { message: 'No subscriptions found', sent: 0 },
        { status: 200 }
      )
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
          title: '🎉 Neue Matches!',
          body: `Du hast ${data?.matchCount || ''} neue Matches! Schau wer Zeit hat.`,
          tag: 'new-matches'
        }
        break

      case 'friend_request':
        notificationPayload = {
          ...notificationPayload,
          title: '👋 Neue Freundschaftsanfrage!',
          body: `${data?.fromUserName || 'Jemand'} möchte dein Freund werden.`,
          tag: 'friend-request',
          data: {
            url: '/?tab=friends',
            ...data
          }
        }
        break

      default:
        notificationPayload = {
          ...notificationPayload,
          title: 'Free4',
          body: data?.message || 'Du hast eine neue Benachrichtigung.'
        }
    }

    console.log('📬 Notification payload:', notificationPayload)

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = JSON.parse(subscription.subscription)
        
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        )
        
        console.log(`✅ Push notification sent to user: ${subscription.user_id}`)
        return { success: true, userId: subscription.user_id }
      } catch (error: any) {
        console.error(`❌ Failed to send push notification to user ${subscription.user_id}:`, error.message)
        
        // If the subscription is invalid, remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️ Removing invalid subscription for user: ${subscription.user_id}`)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', subscription.user_id)
        }
        
        return { success: false, userId: subscription.user_id, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`📬 Push notification results: ${successCount} sent, ${failureCount} failed`)

    return NextResponse.json({
      message: `Push notifications processed`,
      sent: successCount,
      failed: failureCount,
      details: results
    })

  } catch (error: any) {
    console.error('❌ Push notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send push notifications', details: error.message },
      { status: 500 }
    )
  }
}