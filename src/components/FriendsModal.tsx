'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Users, UserPlus, Mail, Check, X as XIcon, Share2, Copy, User } from 'lucide-react'
import type { Profile, Friendship } from '@/lib/supabase'

interface FriendsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
  onRequestsUpdated?: () => void
}

export default function FriendsModal({ isOpen, onClose, currentUser, onRequestsUpdated }: FriendsModalProps) {
  const [searchEmail, setSearchEmail] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [friends, setFriends] = useState<(Friendship & { profile: Profile })[]>([])
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { profile: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [showInviteSuccess, setShowInviteSuccess] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      loadPendingRequests()
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadFriends = async () => {
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id(*),
          addressee:profiles!addressee_id(*)
        `)
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .eq('status', 'accepted')

      if (friendships) {
        const friendsWithProfiles = friendships.map(friendship => ({
          ...friendship,
          profile: friendship.requester_id === currentUser.id 
            ? friendship.addressee 
            : friendship.requester
        }))
        setFriends(friendsWithProfiles)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const { data: requests } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id(*)
        `)
        .eq('addressee_id', currentUser.id)
        .eq('status', 'pending')

      if (requests) {
        const requestsWithProfiles = requests.map(request => ({
          ...request,
          profile: request.requester
        }))
        setPendingRequests(requestsWithProfiles)
      }
    } catch (error) {
      console.error('Error loading pending requests:', error)
    }
  }

  // Normalize search phone number and get last 9 digits
  const normalizeSearchPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '')
    // Get last 9 digits for matching
    return digits.length >= 9 ? digits.slice(-9) : digits
  }

  const searchUser = async () => {
    const email = searchEmail.trim()
    const phone = searchPhone.trim()
    
    if ((!email && !phone) || email === currentUser.email) return

    setSearchLoading(true)
    setSearchResult(null)

    try {
      if (email && phone) {
        // Search by both email and phone (using last 9 digits)
        const normalizedPhone = normalizeSearchPhone(phone)
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.eq.${email.toLowerCase()},phone_number.ilike.%${normalizedPhone}`)
        
        const profile = profiles?.[0]
        
        if (profile && !error) {
          // Rest of the logic...
          const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(
              `and(requester_id.eq.${currentUser.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUser.id})`
            )
            .single()

          setSearchResult({
            ...profile,
            friendship_status: existingFriendship?.status || null,
            is_requester: existingFriendship?.requester_id === currentUser.id
          } as any)
        } else {
          // User not found
          setSearchResult({ email: email || searchEmail, not_found: true, search_type: 'email' } as any)
        }
      } else if (email) {
        // Search by email only
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase())
          .single()

        if (profile && !error) {
          const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(
              `and(requester_id.eq.${currentUser.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUser.id})`
            )
            .single()

          setSearchResult({
            ...profile,
            friendship_status: existingFriendship?.status || null,
            is_requester: existingFriendship?.requester_id === currentUser.id
          } as any)
        } else {
          setSearchResult({ email: email, not_found: true, search_type: 'email' } as any)
        }
      } else if (phone) {
        // Search by phone only (using last 9 digits)
        const normalizedPhone = normalizeSearchPhone(phone)
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('phone_number', `%${normalizedPhone}`)
        
        const profile = profiles?.[0] // Take first match
        
        if (profile && !error && profiles.length > 0) {
          const { data: existingFriendship } = await supabase
            .from('friendships')
            .select('*')
            .or(
              `and(requester_id.eq.${currentUser.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUser.id})`
            )
            .single()

          setSearchResult({
            ...profile,
            friendship_status: existingFriendship?.status || null,
            is_requester: existingFriendship?.requester_id === currentUser.id
          } as any)
        } else {
          setSearchResult({ phone_number: phone, not_found: true, search_type: 'phone' } as any)
        }
      }

    } catch (error) {
      console.error('Error searching user:', error)
      // Always show appropriate message based on search type
      if (phone && !email) {
        setSearchResult({ phone_number: phone, not_found: true, search_type: 'phone' } as any)
      } else {
        setSearchResult({ email: email || searchEmail, not_found: true, search_type: 'email' } as any)
      }
    } finally {
      setSearchLoading(false)
      // Clear search fields after search for easier next search
      setSearchEmail('')
      setSearchPhone('')
    }
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUser.id,
          addressee_id: friendId,
          status: 'pending'
        })

      if (error) throw error

      // Send push notification for friend request
      try {
        const response = await fetch('/api/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userIds: [friendId],
            type: 'friend_request',
            data: {
              fromUserId: currentUser.id,
              fromUserName: profile?.full_name || 'Jemand'
            }
          })
        })
        
        if (response.ok) {
          console.log('📬 Friend request notification sent')
        }
      } catch (pushError) {
        console.log('❌ Failed to send friend request notification:', pushError)
        // Don't fail the main request if push notification fails
      }

      // Update search result to show pending status
      setSearchResult(prev => prev ? { ...prev, friendship_status: 'pending', is_requester: true } : null)
    } catch (error: any) {
      console.error('Error sending friend request:', error)
      console.error('Error sending friend request:', error.message)
    }
  }

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', friendshipId)

      if (error) throw error

      // Reload data
      loadFriends()
      loadPendingRequests()
      onRequestsUpdated?.()
    } catch (error: any) {
      console.error('Error responding to request:', error)
      console.error('Error responding to friend request:', error.message)
    }
  }

  const removeFriend = async (friendshipId: string) => {
    if (removeConfirmId !== friendshipId) {
      setRemoveConfirmId(friendshipId)
      return
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error

      // Remove from local state immediately
      setFriends(friends.filter(friend => friend.id !== friendshipId))
      setRemoveConfirmId(null)
      onRequestsUpdated?.()
    } catch (error: any) {
      console.error('Error removing friend:', error)
      // Error will be shown in UI instead of alert
    }
  }

  const generateInviteText = (email: string) => {
    const userName = profile?.full_name || 'Ein Freund'
    const appUrl = window.location.origin
    return `Hey! ${userName} benutzt Free4 um sich Möglichkeiten für spontane Treffen anzeigen zu lassen. Wenn du auch zu Free4 kommst, könnt ihr euch gegenseitig bei euren eingetragenen freien Zeiten sehen und euch verabreden. Bist du dabei? Schöne Grüße von ${userName} und Free4 → ${appUrl}`
  }

  const handleInvite = async (email: string) => {
    try {
      const inviteText = generateInviteText(email)
      const userName = profile?.full_name || 'Ein Freund'
      const subject = `${userName} würde dich gerne zu Free4 einladen`
      
      // Copy to clipboard first
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteText)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = inviteText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      // Show success message
      setShowInviteSuccess(true)
      setTimeout(() => setShowInviteSuccess(false), 3000)
      
      // Try Web Share API first (works best on mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: subject,
            text: inviteText,
            url: window.location.origin
          })
          return // Success, exit function
        } catch (shareError) {
          // Share was cancelled or failed, continue to fallback
        }
      }
      
      // If native share fails or isn't available, the UI will show manual options
      
    } catch (error) {
      console.log('Einladung wurde in die Zwischenablage kopiert')
    }
  }
  
  const handleManualShare = (platform: string, email: string) => {
    const inviteText = generateInviteText(email)
    const userName = profile?.full_name || 'Ein Freund'
    const subject = `${userName} würde dich gerne zu Free4 einladen`
    
    switch (platform) {
      case 'email':
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inviteText)}`
        window.open(mailtoUrl, '_blank')
        break
      case 'gmail':
        // Multiple Gmail URL formats to try
        const shortText = `Hey! ${userName} nutzt Free4 für spontane Treffen und möchte dich einladen. Komm dazu: ${window.location.origin}`
        
        // Try the simplest possible Gmail URL that should preserve labels
        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortText)}`
        
        console.log('Gmail URL:', gmailUrl)
        window.open(gmailUrl, '_blank')
        break
      case 'whatsapp':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`
        window.open(whatsappUrl, '_blank')
        break
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{
      background: '#0ea5e9'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-4xl font-bold text-gray-900 flex items-center">
            <Users size={32} className="mr-2" />
            Freunde
          </h2>
          <button 
            onClick={onClose} 
            className="p-3 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
            title="Zurück"
          >
            <X size={26} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">

        <div className="p-6 space-y-6">
          {/* Add Friend Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserPlus size={16} className="mr-2" />
              Freund hinzufügen
            </h3>
            <div className="flex space-x-2">
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                  placeholder="Email-Adresse eingeben..."
                  className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
                <input
                  type="tel"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                  placeholder="oder Telefonnummer eingeben..."
                  className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suche funktioniert auch ohne Ländercode (z.B. 0176... oder 176...)
                </p>
              </div>
              <button
                onClick={searchUser}
                disabled={searchLoading || (!searchEmail.trim() && !searchPhone.trim())}
                className="p-2 bg-white border border-black text-gray-900 shadow-md rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {searchLoading ? 'Suche...' : 'Suchen'}
              </button>
            </div>

            {/* Search Result */}
            {searchResult && (
              <div className="p-4 border border-white/20 rounded-lg">
                {searchResult.not_found ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Mail size={16} className="mr-2" />
                      <span>
                        {searchResult.search_type === 'phone' 
                          ? 'Die Nummer wurde im System nicht gefunden, oder dein(e) Freund(in) hat sie nicht eingetragen =(' 
                          : 'Kein Benutzer mit dieser Email gefunden'}
                      </span>
                    </div>
                    {searchResult.search_type === 'email' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            console.log('Invite button clicked for:', searchResult.email)
                            console.log('Has navigator.share:', !!navigator.share)
                            // Check if it's mobile (where native share works better)
                            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                            console.log('Is mobile device:', isMobile)
                            
                            if (navigator.share && isMobile) {
                              handleInvite(searchResult.email)
                            } else {
                              setShowShareOptions(searchResult.email)
                            }
                          }}
                          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md text-sm font-medium flex items-center justify-center space-x-2"
                        >
                          <Share2 size={16} />
                          <span>Zu Free4 einladen!</span>
                        </button>
                        
                        {/* Manual Share Options (Desktop) */}
                        {showShareOptions === searchResult.email && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                handleManualShare('gmail', searchResult.email)
                                setShowShareOptions(null)
                              }}
                              className="py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium"
                            >
                              📧 Gmail
                            </button>
                            <button
                              onClick={() => {
                                handleManualShare('email', searchResult.email)
                                setShowShareOptions(null)
                              }}
                              className="py-2 px-3 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-medium"
                            >
                              ✉️ E-Mail
                            </button>
                            <button
                              onClick={() => {
                                handleManualShare('whatsapp', searchResult.email)
                                setShowShareOptions(null)
                              }}
                              className="py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium"
                            >
                              💬 WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail size={16} className="mr-2 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{searchResult.full_name}</p>
                        <p className="text-sm text-gray-600">{searchResult.email}</p>
                      </div>
                    </div>
                    <div>
                      {searchResult.friendship_status === 'accepted' && (
                        <span className="text-green-600 flex items-center">
                          <Check size={16} className="mr-1" />
                          Bereits befreundet
                        </span>
                      )}
                      {searchResult.friendship_status === 'pending' && (
                        <span className="text-yellow-600">
                          {searchResult.is_requester ? 'Anfrage gesendet' : 'Anfrage erhalten'}
                        </span>
                      )}
                      {!searchResult.friendship_status && (
                        <button
                          onClick={() => sendFriendRequest(searchResult.id)}
                          className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 text-sm"
                        >
                          Freundschaftsanfrage senden
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Offene Anfragen</h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border border-white/20 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0">
                        {request.profile.avatar_url ? (
                          <img 
                            src={request.profile.avatar_url} 
                            alt={request.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{request.profile.full_name}</p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={() => respondToRequest(request.id, true)}
                        className="p-3 text-green-600 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
                        title="Freundschaftsanfrage annehmen"
                      >
                        <Check size={26} />
                      </button>
                      <button
                        onClick={() => respondToRequest(request.id, false)}
                        className="p-3 text-red-600 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
                        title="Freundschaftsanfrage ablehnen"
                      >
                        <XIcon size={26} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Meine Freunde ({friends.length})</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Users size={48} className="mx-auto mb-4 text-gray-400" />
                <p>Noch keine Freunde hinzugefügt</p>
                <p className="text-sm">Suche nach Email-Adressen um Freunde hinzuzufügen!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id}>
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0">
                          {friend.profile.avatar_url ? (
                            <img 
                              src={friend.profile.avatar_url} 
                              alt={friend.profile.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{friend.profile.full_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        className={`w-8 h-8 flex items-center justify-center border shadow-md rounded-lg flex-shrink-0 ${
                          removeConfirmId === friend.id 
                            ? 'bg-red-500 border-red-600 text-white hover:bg-red-600'
                            : 'bg-red-500 border-red-600 text-white hover:bg-red-600'
                        }`}
                        title={removeConfirmId === friend.id ? 'Wirklich entfernen?' : 'Freund entfernen'}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Remove confirmation message */}
                    {removeConfirmId === friend.id && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 mb-2">
                          Freundschaft mit {friend.profile.full_name} wirklich beenden?
                        </p>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setRemoveConfirmId(null)}
                            className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 text-sm"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={() => removeFriend(friend.id)}
                            className="px-4 py-2 bg-red-500 border border-red-600 text-white shadow-md rounded-md hover:bg-red-600 text-sm"
                          >
                            Ja, beenden
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Success Toast */}
      {showInviteSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="bg-green-500 text-white rounded-lg shadow-lg px-6 py-4 max-w-sm mx-4"
            style={{
              animation: 'fadeOut 3.5s ease-in-out forwards'
            }}
          >
            <div className="flex items-center space-x-2">
              <Copy size={16} />
              <p className="font-medium">
                Einladung in Zwischenablage kopiert!
              </p>
            </div>
            <p className="text-sm mt-1 text-green-100">
              Teile sie über WhatsApp, SMS oder E-Mail
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeOut {
          0% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}