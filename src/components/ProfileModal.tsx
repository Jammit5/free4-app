'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Camera, Trash2, AlertTriangle, Edit3 } from 'lucide-react'
import type { Profile } from '@/lib/supabase'
import PushNotificationSettings from './PushNotificationSettings'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
  profile: Profile | null
  onProfileUpdated: () => void
}

export default function ProfileModal({ isOpen, onClose, currentUser, profile, onProfileUpdated }: ProfileModalProps) {
  const [newName, setNewName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [nameChangeLoading, setNameChangeLoading] = useState(false)

  const canChangeName = profile?.name_changed_at === null

  useEffect(() => {
    if (isOpen && profile) {
      setNewName(profile.full_name || '')
      setAvatarPreview(profile.avatar_url || null)
    }
  }, [isOpen, profile])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type')
        return
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        console.error('File too large')
        return
      }

      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${currentUser.id}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw error
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setLoading(true)
    try {
      let avatarUrl = profile.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile)
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
        })
        .eq('id', currentUser.id)

      if (error) throw error

      onProfileUpdated()
      setAvatarFile(null)
      console.log('Profil erfolgreich aktualisiert!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      console.log('Fehler beim Aktualisieren des Profils: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeName = async () => {
    if (!profile || !canChangeName || !newName.trim()) return

    setNameChangeLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newName.trim(),
          name_changed_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (error) throw error

      onProfileUpdated()
      console.log('Name erfolgreich geändert! Dies war deine einmalige Namensänderung.')
    } catch (error: any) {
      console.error('Error changing name:', error)
      console.log('Fehler beim Ändern des Namens: ' + error.message)
    } finally {
      setNameChangeLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      console.log('Bitte tippe "DELETE" um zu bestätigen')
      return
    }

    setLoading(true)
    try {
      // Delete user events first
      await supabase
        .from('free4_events')
        .delete()
        .eq('user_id', currentUser.id)

      // Delete friendships
      await supabase
        .from('friendships')
        .delete()
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUser.id)

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(currentUser.id)
      if (error) throw error

      console.log('Account wurde gelöscht.')
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting account:', error)
      console.log('Fehler beim Löschen des Accounts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !profile) return null

  return (
    <div className="fixed inset-0 z-50" style={{
      background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User size={24} className="mr-2" />
            Mein Profil
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

        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mx-auto mb-4">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Profilbild" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={32} />
                  </div>
                )}
              </div>
              <label className="absolute bottom-3 right-0 w-8 h-8 bg-white border border-black text-gray-900 shadow-md rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-600">Profilbild ändern</p>
          </div>

          {/* Name Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Angezeigter Name
              {canChangeName && (
                <span className="text-blue-600 text-xs ml-2">(einmalig änderbar)</span>
              )}
              {!canChangeName && (
                <span className="text-gray-500 text-xs ml-2">(bereits geändert)</span>
              )}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={!canChangeName}
                className={`flex-1 px-3 py-2 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                  !canChangeName ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
              {canChangeName && (
                <button
                  onClick={handleChangeName}
                  disabled={nameChangeLoading || !newName.trim() || newName === profile.full_name}
                  className="px-4 py-2 bg-white border border-black text-gray-900 shadow-md rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center"
                >
                  {nameChangeLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Edit3 size={16} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-white/20 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={loading || (!avatarFile)}
            className="w-full py-2 px-4 bg-white border border-black text-gray-900 shadow-md rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Speichere...
              </div>
            ) : (
              'Profilbild speichern'
            )}
          </button>

          {/* Push Notifications Settings */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Benachrichtigungen</h3>
            <PushNotificationSettings />
          </div>

          {/* Delete Account Section */}
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Danger Zone
            </h3>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-4 bg-white border border-black text-gray-900 shadow-md rounded-lg hover:bg-gray-50 flex items-center justify-center"
              >
                <Trash2 size={16} className="mr-2" />
                Account löschen
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
                  Alle deine Events und Freundschaften werden gelöscht.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tippe "DELETE" um zu bestätigen:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 px-4 bg-white border border-black text-gray-900 shadow-md rounded-lg hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || deleteConfirmText !== 'DELETE'}
                    className="flex-1 py-2 px-4 bg-white border border-black text-gray-900 shadow-md rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading ? 'Lösche...' : 'Account löschen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}