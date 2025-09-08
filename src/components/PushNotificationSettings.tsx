'use client'

import { Bell, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    globallyEnabled,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications()

  if (!isSupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <BellOff className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt
          </span>
        </div>
      </div>
    )
  }

  const handleToggleSubscription = async () => {
    if (globallyEnabled) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${globallyEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
          {globallyEnabled ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Push-Benachrichtigungen</h3>
          <p className="text-sm text-gray-600">
            Erhalte Benachrichtigungen auf allen deinen Geräten
          </p>
        </div>
      </div>
      
      {!globallyEnabled && (
        <div>
          <button
            onClick={handleToggleSubscription}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {loading ? '...' : 'Aktivieren'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-700">
            Benachrichtigungen sind blockiert. Du kannst sie in den Browser-Einstellungen aktivieren.
          </p>
        </div>
      )}

      {globallyEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-3">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-700">
              Du erhältst auf allen deinen Geräten Benachrichtigungen über neue Matches und Freundschaftsanfragen.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-green-600">
              {isSubscribed ? 'Dieses Gerät ist registriert' : 'Dieses Gerät wird beim nächsten Laden automatisch registriert'}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={sendTestNotification}
                disabled={loading}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                Test-Benachrichtigung
              </button>
              <button
                onClick={handleToggleSubscription}
                disabled={loading}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 bg-red-100 text-red-700 hover:bg-red-200"
              >
                {loading ? '...' : 'Für alle Geräte deaktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}