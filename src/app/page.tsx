'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import Dashboard from '@/components/Dashboard'
import DisclaimerModal from '@/components/DisclaimerModal'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)

  useEffect(() => {
    // Check if disclaimer was already accepted in this session
    const accepted = sessionStorage.getItem('disclaimerAccepted')
    if (accepted === 'true') {
      setDisclaimerAccepted(true)
    } else {
      // Show disclaimer after 1 second
      const timer = setTimeout(() => {
        setShowDisclaimer(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    // Only load user data if disclaimer is accepted
    if (!disclaimerAccepted) return

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [disclaimerAccepted])

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true)
    setShowDisclaimer(false)
    sessionStorage.setItem('disclaimerAccepted', 'true')
  }

  const handleDisclaimerDecline = () => {
    // Will redirect to Google via DisclaimerModal component
  }

  // Show disclaimer if not yet accepted
  if (!disclaimerAccepted) {
    return (
      <div className="min-h-screen">
        <DisclaimerModal 
          isOpen={showDisclaimer}
          onAccept={handleDisclaimerAccept}
          onDecline={handleDisclaimerDecline}
        />
        {!showDisclaimer && (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Free4 wird geladen...</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {user ? (
        <Dashboard user={user} />
      ) : (
        <AuthForm />
      )}
    </div>
  )
}
