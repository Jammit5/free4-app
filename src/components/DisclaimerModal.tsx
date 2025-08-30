'use client'

import { AlertTriangle, X } from 'lucide-react'

interface DisclaimerModalProps {
  isOpen: boolean
  onAccept: () => void
  onDecline: () => void
}

export default function DisclaimerModal({ isOpen, onAccept, onDecline }: DisclaimerModalProps) {
  if (!isOpen) return null

  const handleDecline = () => {
    window.location.href = 'https://google.com'
  }

  return (
    <div className="fixed inset-0 z-50" style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <AlertTriangle size={24} className="mr-2 text-red-500" />
            Wichtiger Hinweis
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
          <div className="p-8">
            {/* Warning Content */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-red-800 mb-4">
                  ACHTUNG!
                </h3>
                <div className="text-red-700 text-left space-y-3">
                  <p className="font-medium">
                    DIESE APP UND WEBSEITE BEFINDEN SICH IN ENTWICKLUNG!
                  </p>
                  <p>
                    ALLE DATEN SIND AKTUELL NOCH EINSEHBAR VOM ENTWICKLER (siehe Impressum)!
                  </p>
                  <p className="font-medium text-red-800">
                    BENUTZUNG AUF EIGENE VERANTWORTUNG!
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-8">
                <p>
                  Diese Anwendung befindet sich derzeit in der Entwicklungsphase. 
                  Durch die Nutzung erklären Sie sich mit den oben genannten Bedingungen einverstanden.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={onAccept}
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md border border-green-700 text-lg"
              >
                Gelesen, verstanden und akzeptiert!
              </button>
              
              <button
                onClick={handleDecline}
                className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-md border border-red-700 text-lg"
              >
                Ups. Na dann warte ich lieber noch.
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}