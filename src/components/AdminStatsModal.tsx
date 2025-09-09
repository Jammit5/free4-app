'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, Users, Calendar, Activity } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalEvents: number
  totalMatches: number
}

interface AdminStatsModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
}

export default function AdminStatsModal({ isOpen, onClose, userEmail }: AdminStatsModalProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && (userEmail === 'jammit@gmail.com' || userEmail === 'decapitaro@hotmail.com')) {
      loadStats()
    }
  }, [isOpen, userEmail])

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      setError('Fehler beim Laden der Statistiken')
      console.error('Error loading admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || (userEmail !== 'jammit@gmail.com' && userEmail !== 'decapitaro@hotmail.com')) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{
      background: '#0ea5e9'
    }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-4xl font-bold text-gray-900 flex items-center">
            <TrendingUp size={32} className="mr-2" />
            Admin Stats
          </h2>
          <button 
            onClick={onClose}
            className="p-3 text-gray-900 bg-white border border-black rounded-lg shadow-md hover:bg-gray-50"
            title="Schließen"
          >
            <X size={26} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Lade Statistiken...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadStats}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Total Users */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users size={24} className="text-blue-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Gesamte User</h3>
                        <p className="text-sm text-gray-600">Alle registrierten Benutzer</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                {/* Active Users (24h) */}
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Activity size={24} className="text-green-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Aktive User (24h)</h3>
                        <p className="text-sm text-gray-600">Aktivität in den letzten 24 Stunden</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                      <p className="text-sm text-gray-600">
                        {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% der User
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Events */}
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar size={24} className="text-purple-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Erstellte Free4s</h3>
                        <p className="text-sm text-gray-600">Alle jemals erstellten Events</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-600">{stats.totalEvents}</p>
                      <p className="text-sm text-gray-600">
                        {stats.totalUsers > 0 ? (stats.totalEvents / stats.totalUsers).toFixed(1) : 0} pro User
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Matches */}
                <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingUp size={24} className="text-orange-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Gefundene Matches</h3>
                        <p className="text-sm text-gray-600">Eindeutige Match-Verbindungen</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-orange-600">{stats.totalMatches}</p>
                      <p className="text-sm text-gray-600">
                        {stats.totalEvents > 0 ? ((stats.totalMatches / stats.totalEvents) * 100).toFixed(1) : 0}% Match-Rate
                      </p>
                    </div>
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="text-center pt-4">
                  <button
                    onClick={loadStats}
                    className="py-3 px-6 bg-white border border-black text-gray-900 rounded-lg shadow-md hover:bg-gray-50"
                  >
                    Aktualisieren
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}