'use client'

import { useState } from 'react'
import { X, Mail, Send } from 'lucide-react'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!privacyAccepted) {
      setSubmitMessage('Bitte akzeptieren Sie den Datenschutzhinweis.')
      return
    }

    setLoading(true)
    setSubmitMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      })

      if (response.ok) {
        setSubmitMessage('Ihre Nachricht wurde erfolgreich gesendet!')
        setName('')
        setEmail('')
        setMessage('')
        setPrivacyAccepted(false)
        setTimeout(() => {
          onClose()
          setSubmitMessage('')
        }, 2000)
      } else {
        throw new Error('Fehler beim Senden der Nachricht')
      }
    } catch (error) {
      setSubmitMessage('Fehler beim Senden der Nachricht. Bitte versuchen Sie es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Mail size={24} className="mr-2" />
            Kontakt
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
      <main className="max-w-2xl mx-auto px-4 py-8 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
          <div className="p-8">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  placeholder="Ihr Name"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  placeholder="ihre@email.de"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">
                  Nachricht
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 resize-vertical"
                  placeholder="Ihre Nachricht..."
                />
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">
                  Datenschutzhinweis zum Kontaktformular
                </h4>
                <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                  Die im Kontaktformular eingegebenen Daten (Name, E-Mail-Adresse, Nachricht) werden 
                  ausschließlich zur Bearbeitung Ihrer Anfrage verwendet. Ihre Daten werden nicht an 
                  Dritte weitergegeben und nach Erledigung der Anfrage gelöscht, sofern keine gesetzlichen 
                  Aufbewahrungspflichten bestehen.
                </p>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border border-black rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-700">
                    Ich habe den Datenschutzhinweis gelesen und stimme zu
                  </span>
                </label>
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`p-4 rounded-lg border ${
                  submitMessage.includes('erfolgreich') 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {submitMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !privacyAccepted}
                className="w-full py-4 px-6 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Absenden</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Schließen
              </button>

            </form>
            
          </div>
        </div>
      </main>
    </div>
  )
}