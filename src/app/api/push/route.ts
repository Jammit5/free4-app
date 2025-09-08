import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

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

// VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

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
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No subscriptions found', sent: 0 },
        { status: 200 }
      )
    }

    // Filter subscriptions for users who have globally enabled push notifications
    const enabledSubscriptions = subscriptions.filter(sub => 
      sub.profiles?.push_notifications_enabled === true
    )

    if (enabledSubscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No enabled subscriptions found', sent: 0 },
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
        
        // If the subscription is invalid, remove it from database
        if (error.statusCode === 410 || error.statusCode === 404) {
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