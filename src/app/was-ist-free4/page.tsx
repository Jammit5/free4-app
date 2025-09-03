import Link from 'next/link'
import { X } from 'lucide-react'

export default function WasIstFree4() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 relative">
          {/* Close Button - positioned top right inside white box */}
          <Link 
            href="/"
            className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            Was ist Free4?
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl font-semibold text-blue-600 mb-6 text-center">
              Schluss mit der Verabredungsqual!
            </p>

            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                Du kennst das - Du fragst in deiner Chat-Gruppe "Hey, wer hat Donnerstagabend Zeit für Kino?" Dann kommen 47 Nachrichten – die Hälfte kann nicht, möchte einen anderen Film sehen, in einem anderen Kino, an einem anderen Tag, drei diskutieren lieber über den Film, und am Ende gehst du doch alleine oder gar nicht.
              </p>
              
              <p>
                Oder du fragst alle deine Freunde separat, aber leider hat gerade dann niemand Zeit oder Bock auf den Film, wann und wo es dir passt und nach der 5. Absage hast du keine Lust mehr zu fragen.
              </p>

              <p className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                Free4 macht das anders: Du sagst einfach, wann du Zeit hast, für was, und wo für dich passt. Deine Freunde machen dasselbe. Die App zeigt euch, wenn sich eure freien Zeiten und der Ort überschneiden. Kein Gruppenchat-Chaos, keine peinlichen Absagen, keine FOMO. Nur Möglichkeiten.
              </p>

              <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">
                Wie funktioniert's?
              </h2>

              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    🎬 <span className="ml-2">Spontan-Modus</span>
                  </h3>
                  <p>
                    Du hast Donnerstagabend von 19-23 Uhr Zeit und Lust auf... irgendwas? Erstell ein Free4! Lisa, Max und Jana haben zur gleichen Zeit auch ein Free4 erstellt? Perfekt! Ihr seht gegenseitig, woran ihr gedacht habt und dass ihr Zeit habt. Was ihr daraus macht – Kino, Pizza, Mario Kart-Marathon – entscheidet ihr selbst.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    ☕ <span className="ml-2">Mikroabenteuer</span>
                  </h3>
                  <p>
                    Samstagnachmittag, 2 Stunden frei, aber alle sind "beschäftigt"? Free4 zeigt dir: Tom hat auch gerade ein 2-Stunden-Fenster. Spontaner Kaffee? Spaziergang? Oder doch lieber zusammen online Zocken? Egal – die Option ist da!
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    🎮 <span className="ml-2">Der Freundeskreis-Radar</span>
                  </h3>
                  <p>
                    Du erstellst ein Free4 für Freitagabend. Die App zeigt dir: 3 deiner Freunde sind auch frei, aber du hättest nie daran gedacht, sie zu fragen. Neue Konstellationen, unerwartete Treffen, frische Dynamik!
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200 mt-8">
                <p className="text-indigo-800 font-medium">
                  <strong>Free4 ist wie ein sozialer Seismograph:</strong> Er zeigt dir die versteckten Überschneidungen in eurem Chaos aus Kalendern, Jobs und Netflix-Marathons. Und dabei kann keiner deine Daten sehen, außer deine Freunde, die du selber akzeptierst und mit deinem Free4 matchen. Wie und ob ihr euch dann verabredet ist euch überlassen. Kein Druck, keine Verpflichtungen – nur sanfte Stupser des Universums, die sagen: "Hey, ihr könntet was zusammen machen... wenn ihr wollt."
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">
                Was kostet Free4?
              </h2>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <p className="text-green-800">
                  Im Moment, <strong>nichts</strong>. Und das soll für das Basis Konto auch so bleiben. Nein, es wird auch keine Werbung geben. Dafür aber ein Premium Konto, mit vielen nützlichen Extras, wie zum Beispiel eine unbegrenzte Anzahl Freunde, die Möglichkeit Kontakte zu importieren und Kalender Integration, für <strong>12 Euro IM JAHR</strong>. Also gerade mal 1 Euro im Monat. Das ist wahrscheinlich weniger, als Ihr bei eurem nächsten Treffen als Trinkgeld ausgeben würdet. Und die Server bezahlen sich leider nicht selber.
                </p>
              </div>

              <div className="text-center mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-lg font-medium text-gray-800">
                  Also, probiere es aus, erstelle deine Free4s und lade deine Freunde dazu ein das Gleiche zu tun. Viel Spaß beim Treffen!
                </p>
              </div>

              {/* CTA Button - moved inside white box */}
              <div className="text-center mt-8">
                <Link 
                  href="/"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Jetzt Free4 ausprobieren
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}