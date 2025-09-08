import { NextRequest, NextResponse } from 'next/server'

// In-memory log storage (will reset on server restart)
let debugLogs: Array<{ timestamp: string; message: string; level: string }> = []

export function addDebugLog(message: string, level: 'info' | 'error' | 'debug' = 'info') {
  const timestamp = new Date().toISOString()
  debugLogs.unshift({ timestamp, message, level })
  
  // Keep only last 50 logs
  if (debugLogs.length > 50) {
    debugLogs = debugLogs.slice(0, 50)
  }
  
  console.log(`[DEBUG-${level.toUpperCase()}] ${message}`)
}

export async function GET(request: NextRequest) {
  try {
    // Only allow access for Jammit user
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (userId !== '9ebc731a-0b10-470b-a7ec-82084405f7d9') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      logs: debugLogs,
      count: debugLogs.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch debug logs', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Only allow access for Jammit user  
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (userId !== '9ebc731a-0b10-470b-a7ec-82084405f7d9') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    debugLogs = []
    return NextResponse.json({ message: 'Debug logs cleared' })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to clear debug logs', details: error.message },
      { status: 500 }
    )
  }
}