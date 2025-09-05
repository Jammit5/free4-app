'use client'

import { X, FileText, Mail } from 'lucide-react'

interface ImpressumModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenContact?: () => void
}

export default function ImpressumModal({ isOpen, onClose, onOpenContact }: ImpressumModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText size={24} className="mr-2" />
            Impressum
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
            title="Zurück"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
          <div className="p-8">
            
            <div className="prose prose-gray max-w-none">
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Angaben gemäß § 5 TMG
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-600">
                    <p><strong>Benjamin Lange</strong></p>
                    <p>Höchste Str. 12</p>
                    <p>10249 Berlin</p>
                    <p>Deutschland</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Kontakt
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-600 space-y-3">
                    <p><strong>E-Mail:</strong> jammit@gmail.com</p>
                    {onOpenContact && (
                      <div>
                        <button
                          onClick={() => {
                            onClose()
                            onOpenContact()
                          }}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md text-sm font-medium"
                        >
                          <Mail size={16} className="mr-2" />
                          Kontaktformular öffnen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-600">
                    <p><strong>Benjamin Lange</strong></p>
                    <p>Höchste Str. 12</p>
                    <p>10249 Berlin</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Haftung für Inhalte
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen 
                    Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind 
                    wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder 
                    gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, 
                    die auf eine rechtswidrige Tätigkeit hinweisen.
                  </p>
                  <p>
                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach 
                    den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung 
                    ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung 
                    möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir 
                    diese Inhalte umgehend entfernen.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Entwicklungsstatus
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-yellow-800">
                    <p className="font-medium mb-2">
                      Diese Anwendung befindet sich in der Entwicklungsphase.
                    </p>
                    <p className="text-sm">
                      Alle eingegebenen Daten können vom Entwickler eingesehen werden. 
                      Die Nutzung erfolgt auf eigene Verantwortung. Es wird keine Gewähr 
                      für die Funktionalität oder den Schutz der Daten übernommen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Datenschutz
                </h3>
                <div className="text-gray-600">
                  <p>
                    Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. 
                    Da sich diese Anwendung in der Entwicklung befindet, können eingegebene Daten 
                    zu Debugging- und Entwicklungszwecken vom Entwickler eingesehen werden.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50 font-medium"
              >
                Schließen
              </button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  )
}