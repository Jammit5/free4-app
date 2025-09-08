import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotifications } from '@/lib/pushNotificationService'

export async function POST(request: NextRequest) {
  try {
    const { userIds, type, data } = await request.json()
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      )
    }

    // Use the shared push notification service
    const result = await sendPushNotifications(userIds, type, data)
    
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Push notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send push notifications', details: error.message },
      { status: 500 }
    )
  }
}