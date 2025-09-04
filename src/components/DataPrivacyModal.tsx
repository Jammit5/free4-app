'use client'

import { X, Shield, Mail } from 'lucide-react'

interface DataPrivacyModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenContact?: () => void
}

export default function DataPrivacyModal({ isOpen, onClose, onOpenContact }: DataPrivacyModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield size={24} className="mr-2" />
            Datenschutzerklärung
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
      <main className="max-w-4xl mx-auto px-4 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
          <div className="p-8">
            
            <div className="prose prose-gray max-w-none">
              
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  1. Verantwortlicher
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-600">
                    <p><strong>Benjamin Lange</strong></p>
                    <p>Höchste Str. 12</p>
                    <p>10249 Berlin</p>
                    <p><strong>E-Mail:</strong> jammit@gmail.com</p>
                    {onOpenContact && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            onClose()
                            onOpenContact()
                          }}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                        >
                          <Mail size={14} className="mr-1" />
                          Kontakt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  2. Erhebung und Speicherung personenbezogener Daten
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Beim Besuch dieser Website werden keine personenbezogenen Daten gespeichert, außer 
                    technisch notwendige Daten, die Ihr Browser automatisch übermittelt (z. B. IP-Adresse, 
                    Datum und Uhrzeit des Abrufs, Browsertyp). Diese Daten werden ausschließlich zur 
                    Sicherstellung des Betriebs der Website genutzt und nicht ausgewertet.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  3. Kontaktformular
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Wenn Sie über das Kontaktformular Anfragen stellen, werden die dort eingegebenen 
                    Daten (Name, E-Mail-Adresse, Nachricht) ausschließlich zur Bearbeitung Ihrer 
                    Anfrage verwendet.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) 
                      bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Kommunikation).
                    </p>
                  </div>
                  <p>
                    Ihre Daten werden gelöscht, sobald Ihre Anfrage erledigt ist, sofern keine 
                    gesetzlichen Aufbewahrungspflichten bestehen.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  4. Verwendung von Mapbox
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Unsere App nutzt den Kartendienst Mapbox (Mapbox Inc., 740 15th Street NW, 5th Floor, 
                    Washington, DC 20005, USA), um interaktive Karten darzustellen.
                  </p>
                  
                  <p>
                    Beim Aufruf von Karteninhalten werden technisch bedingt Daten an die Server von Mapbox 
                    übertragen. Dazu gehören insbesondere:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Ihre IP-Adresse,</li>
                    <li>Informationen zu Ihrem Endgerät und Browser (z. B. Gerätetyp, Betriebssystem, Version),</li>
                    <li>technische Nutzungsdaten (Zeitpunkt, abgerufene Inhalte).</li>
                  </ul>
                  
                  <p>Diese Daten sind erforderlich, um die Kartendarstellung bereitzustellen.</p>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 text-sm">
                      <strong>Standortfunktionen:</strong> Sofern Sie Standortfunktionen unserer App nutzen 
                      (z. B. zur Anzeige Ihrer aktuellen Position oder zur Auswahl eines Treffpunktes), kann 
                      es zusätzlich zur Übermittlung von Standortdaten (Koordinaten) an Mapbox kommen – 
                      insbesondere dann, wenn wir Geocoding-Dienste einsetzen. Wenn lediglich ein von der App 
                      berechneter Marker gesetzt wird, werden diese Daten nicht an Mapbox weitergegeben.
                    </p>
                  </div>
                  
                  <p>
                    Die Verarbeitung durch Mapbox kann auch auf Servern in den USA erfolgen. Mit Mapbox 
                    besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO (Standard-DPA). 
                    Zusätzlich bestehen Standardvertragsklauseln der EU-Kommission zur Sicherstellung eines 
                    angemessenen Datenschutzniveaus. Weitere Informationen finden Sie in der Datenschutzerklärung von 
                    Mapbox: <a 
                      href="https://www.mapbox.com/legal/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      https://www.mapbox.com/legal/privacy
                    </a>
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  5. Hosting-Anbieter (Vercel)
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Wir hosten unsere App bei Vercel (Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA). 
                    Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO, der Bestandteil 
                    der Nutzungsbedingungen ist.
                  </p>
                  <p>
                    Beim Aufruf unserer Website werden technisch notwendige Daten an Vercel übertragen, 
                    um die Website bereitzustellen. Diese umfassen insbesondere Ihre IP-Adresse, 
                    Datum und Uhrzeit des Zugriffs sowie technische Informationen zu Ihrem Browser.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  6. Backend-Dienstleister (Supabase)
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Wir nutzen Supabase (Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992) 
                    als Backend-Dienstleister für Authentifizierung und Datenbank-Hosting. Dabei werden 
                    personenbezogene Daten (z. B. E-Mail-Adresse, Anmeldedaten, Nutzereinträge) im 
                    Auftrag verarbeitet.
                  </p>
                  <p>
                    Mit Supabase besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO. 
                    Weitere Informationen finden Sie unter <a 
                      href="https://supabase.com/legal/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      https://supabase.com/legal/privacy
                    </a>.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  7. E-Mail-Dienst (Resend)
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Für den Versand von Kontaktformular-Nachrichten nutzen wir den E-Mail-Dienst Resend 
                    (Resend, Inc., 2093 Philadelphia Pike #3221, Claymont, DE 19703, USA). Dabei werden 
                    die von Ihnen im Formular eingegebenen Daten (z. B. Name, E-Mail-Adresse, Nachricht) 
                    an Resend übermittelt und ausschließlich zum Zweck des E-Mail-Versands verarbeitet.
                  </p>
                  <p>
                    Mit Resend besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO. 
                    Weitere Informationen finden Sie unter <a 
                      href="https://resend.com/legal/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      https://resend.com/legal/privacy
                    </a>.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  8. Cookies und Tracking
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Unsere App verwendet <strong>ausschließlich technisch notwendige Cookies</strong>, die für 
                    den ordnungsgemäßen Betrieb der Website erforderlich sind. Dazu gehören:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Authentifizierungs-Tokens (Session-Management)</li>
                    <li>Technische Einstellungen (z.B. Sprache, Darstellung)</li>
                    <li>Sicherheitsbezogene Daten (CSRF-Schutz)</li>
                  </ul>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm">
                      <strong>Keine Einwilligung erforderlich:</strong> Gemäß Art. 6 Abs. 1 lit. f DSGVO 
                      und § 25 Abs. 2 Nr. 2 TTDSG ist für technisch notwendige Cookies keine Einwilligung 
                      des Nutzers erforderlich. Daher verwenden wir keinen Cookie-Banner.
                    </p>
                  </div>
                  
                  <p>
                    <strong>Analytics ohne Cookies:</strong> Wir nutzen Vercel Analytics und Speed Insights 
                    zur anonymen Performance-Messung. Diese Tools arbeiten vollständig ohne Cookies und 
                    sammeln nur aggregierte, nicht personenbezogene Daten zur Website-Optimierung.
                  </p>
                  
                  <p>
                    Wir verwenden <strong>keine</strong> Marketing-Cookies, Tracking-Cookies oder 
                    Cookies von Drittanbietern für Werbezwecke.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  9. Weitergabe von Daten
                </h3>
                <div className="text-gray-600">
                  <p>
                    Abgesehen von der oben beschriebenen Nutzung von Mapbox, Vercel, Supabase und Resend erfolgt 
                    keine Weitergabe Ihrer personenbezogenen Daten an Dritte.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  10. Ihre Rechte
                </h3>
                <div className="text-gray-600 space-y-4">
                  <p>Sie haben jederzeit das Recht auf:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Auskunft über die gespeicherten Daten (Art. 15 DSGVO)</li>
                    <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
                    <li>Löschung (Art. 17 DSGVO)</li>
                    <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                    <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
                    <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  </ul>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm">
                      Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an die oben angegebenen 
                      Kontaktdaten.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  11. Beschwerderecht
                </h3>
                <div className="text-gray-600">
                  <p>
                    Sie haben zudem das Recht, sich bei einer Datenschutzaufsichtsbehörde über die 
                    Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
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