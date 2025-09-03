'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ImpressumModal from './ImpressumModal'
import ContactModal from './ContactModal'
import DataPrivacyModal from './DataPrivacyModal'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showNameTooltip, setShowNameTooltip] = useState(false)
  const [showImpressum, setShowImpressum] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showDataPrivacy, setShowDataPrivacy] = useState(false)

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setMessage('')

    try {
      // For local development, we need to force localhost redirect
      const redirectUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/auth/callback'
        : `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setGoogleLoading(false)
    }
  }

  const handleFacebookAuth = async () => {
    setFacebookLoading(true)
    setMessage('')

    try {
      // For local development, we need to force localhost redirect
      const redirectUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/auth/callback'
        : `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        }
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message)
      setFacebookLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage('Erfolgreich eingeloggt!')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0]
            }
          }
        })
        if (error) throw error
        setMessage('Account erstellt! Bitte bestätige deine E-Mail.')
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-sm rounded-lg p-8 border border-white/20 shadow-lg relative">
        {/* Question mark button - positioned at top right of white box */}
        <Link
          href="/was-ist-free4"
          className="group absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
          title="Was ist Free4?"
        >
          <HelpCircle className="h-7 w-7 text-blue-600 group-hover:text-blue-700" />
        </Link>
        
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Free4</h1>
          <p className="text-gray-600">Spontane Treffen mit deinen Freunden</p>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-black rounded-md shadow-md bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Mit Google anmelden
              </>
            )}
          </button>

          {/* Facebook Login - temporarily hidden until OAuth is configured
          <button
            type="button"
            onClick={handleFacebookAuth}
            disabled={facebookLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-black rounded-md shadow-md bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {facebookLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Mit Facebook anmelden
              </>
            )}
          </button>
          */}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/90 text-gray-500">oder</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                <span>Gib deinen Namen ein</span>
                <div className="inline-block ml-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowNameTooltip(!showNameTooltip)}
                    className="w-4 h-4 bg-gray-400 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-500"
                  >
                    ?
                  </button>
                  {showNameTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                      Du kannst hier eintragen was du möchtest. Aber wenn deine Freunde den Namen nicht kennen, akzeptieren sie deine Anfrage vielleicht nicht.
                      <div className="absolute top-full left-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dein Name (optional)"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-black rounded-md shadow-md text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            ) : (
              isLogin ? 'Anmelden' : 'Registrieren'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="bg-white border border-black rounded-md px-3 py-1 text-gray-900 hover:bg-gray-50 text-sm shadow-md"
            >
              {isLogin ? 'Noch kein Account? Registrieren' : 'Schon einen Account? Anmelden'}
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded ${
              message.includes('Erfolgreich') || message.includes('erstellt') 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>

      {/* Footer - positioned at bottom center */}
      <div className="fixed bottom-0 left-0 right-0">
        <div className="text-center py-4">
          <div className="space-x-6">
            <button
              onClick={() => setShowImpressum(true)}
              className="text-sm text-white/80 hover:text-white underline"
            >
              Impressum
            </button>
            <button
              onClick={() => setShowContact(true)}
              className="text-sm text-white/80 hover:text-white underline"
            >
              Kontakt
            </button>
            <button
              onClick={() => setShowDataPrivacy(true)}
              className="text-sm text-white/80 hover:text-white underline"
            >
              Datenschutz
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ImpressumModal 
        isOpen={showImpressum}
        onClose={() => setShowImpressum(false)}
        onOpenContact={() => setShowContact(true)}
      />
      <ContactModal 
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
      <DataPrivacyModal 
        isOpen={showDataPrivacy}
        onClose={() => setShowDataPrivacy(false)}
        onOpenContact={() => setShowContact(true)}
      />
    </div>
  )
}