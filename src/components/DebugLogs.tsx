'use client'

import { useState, useEffect, useRef } from 'react'
import { Bug, X, Trash2, RefreshCw } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface DebugLogsProps {
  user: User
}

interface DebugLog {
  timestamp: string
  message: string
  level: string
}

export default function DebugLogs({ user }: DebugLogsProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Only show for Jammit - but check after state initialization
  const isJammit = user.id === '9ebc731a-0b10-470b-a7ec-82084405f7d9'
  
  if (!isJammit) {
    return null
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug-logs?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch debug logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    try {
      const response = await fetch(`/api/debug-logs?userId=${user.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setLogs([])
      }
    } catch (error) {
      console.error('Failed to clear debug logs:', error)
    }
  }

  useEffect(() => {
    if (showLogs) {
      fetchLogs()
      intervalRef.current = setInterval(fetchLogs, 2000) // Auto-refresh every 2 seconds
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } else {
      // Clear interval when modal is closed
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [showLogs, user.id])

  return (
    <>
      {/* Debug Button */}
      <button
        onClick={() => setShowLogs(true)}
        className="fixed bottom-4 left-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Debug Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium">Debug Logs</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={clearLogs}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No debug logs found</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded text-xs font-mono ${
                        log.level === 'error'
                          ? 'bg-red-50 border-red-200'
                          : log.level === 'debug'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      } border`}
                    >
                      <div className="text-gray-500 mb-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div className="break-all">{log.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}