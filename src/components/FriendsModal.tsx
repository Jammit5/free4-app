'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Users, UserPlus, Mail, Check, X as XIcon } from 'lucide-react'
import type { Profile, Friendship } from '@/lib/supabase'

interface FriendsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
  onRequestsUpdated?: () => void
}

export default function FriendsModal({ isOpen, onClose, currentUser, onRequestsUpdated }: FriendsModalProps) {
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [friends, setFriends] = useState<(Friendship & { profile: Profile })[]>([])
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { profile: Profile })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      loadPendingRequests()
    }
  }, [isOpen])

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

  const searchUser = async () => {
    if (!searchEmail.trim() || searchEmail === currentUser.email) return

    setSearchLoading(true)
    setSearchResult(null)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', searchEmail.toLowerCase().trim())
        .single()

      if (profile) {
        // Check if already friends or pending request exists
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
        setSearchResult({ email: searchEmail, not_found: true } as any)
      }
    } catch (error) {
      console.error('Error searching user:', error)
      setSearchResult({ email: searchEmail, not_found: true } as any)
    } finally {
      setSearchLoading(false)
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

      // Update search result to show pending status
      setSearchResult(prev => prev ? { ...prev, friendship_status: 'pending', is_requester: true } : null)
    } catch (error: any) {
      console.error('Error sending friend request:', error)
      alert('Fehler beim Senden der Freundschaftsanfrage: ' + error.message)
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
      alert('Fehler beim Antworten auf Freundschaftsanfrage: ' + error.message)
    }
  }

  const removeFriend = async (friendshipId: string) => {
    if (!confirm('Freundschaft wirklich beenden?')) return

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error

      // Remove from local state immediately
      setFriends(friends.filter(friend => friend.id !== friendshipId))
      onRequestsUpdated?.()
    } catch (error: any) {
      console.error('Error removing friend:', error)
      alert('Fehler beim Entfernen des Freundes: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Users size={20} className="mr-2" />
            Freunde
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Friend Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserPlus size={16} className="mr-2" />
              Freund hinzufügen
            </h3>
            <div className="flex space-x-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                placeholder="Email-Adresse eingeben..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={searchUser}
                disabled={searchLoading || !searchEmail.trim()}
                className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {searchLoading ? 'Suche...' : 'Suchen'}
              </button>
            </div>

            {/* Search Result */}
            {searchResult && (
              <div className="p-4 border rounded-lg">
                {searchResult.not_found ? (
                  <div className="flex items-center text-gray-600">
                    <Mail size={16} className="mr-2" />
                    <span>Kein Benutzer mit dieser Email gefunden</span>
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
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Mail size={16} className="mr-2 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{request.profile.full_name}</p>
                        <p className="text-sm text-gray-600">{request.profile.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => respondToRequest(request.id, true)}
                        className="px-3 py-1 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 text-sm"
                      >
                        Annehmen
                      </button>
                      <button
                        onClick={() => respondToRequest(request.id, false)}
                        className="px-3 py-1 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 text-sm"
                      >
                        Ablehnen
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
                  <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <Mail size={16} className="mr-2 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{friend.profile.full_name}</p>
                        <p className="text-sm text-gray-600">{friend.profile.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="px-3 py-1 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}