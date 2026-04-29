'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { User, Mail, Database, Save, AlertCircle, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    data_source: 'garmin'
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const response = await api.profile.get()
        setProfile({
          name: response.data.name || '',
          email: response.data.email,
          data_source: response.data.data_source
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      await api.profile.update({
        name: profile.name,
        data_source: profile.data_source
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-sage-900">Profile Settings</h1>
        <p className="text-sage-600 font-body mt-1">
          Manage your account information and preferences
        </p>
      </div>

      <div className="card">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-body">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-body">Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="input-field pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
              <input
                type="email"
                value={profile.email}
                className="input-field pl-10 bg-sage-50 cursor-not-allowed"
                disabled
              />
            </div>
            <p className="text-sm text-sage-500 font-body mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
              Data Source
            </label>
            <div className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
              <select
                value={profile.data_source}
                onChange={(e) => setProfile({ ...profile, data_source: e.target.value })}
                className="input-field pl-10"
              >
                <option value="garmin">Garmin</option>
                <option value="manual">Manual Entry</option>
                <option value="other">Other</option>
              </select>
            </div>
            <p className="text-sm text-sage-500 font-body mt-1">
              Primary source for your shot data
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Information */}
      <div className="card mt-8">
        <h2 className="text-xl font-display font-bold text-sage-900 mb-4">Account Information</h2>
        <div className="space-y-3 font-body text-sage-600">
          <div className="flex justify-between py-2 border-b border-sage-100">
            <span>Account Type</span>
            <span className="font-semibold text-sage-900">Free</span>
          </div>
          <div className="flex justify-between py-2 border-b border-sage-100">
            <span>Status</span>
            <span className="font-semibold text-golf-green-600">Active</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Data Source</span>
            <span className="font-semibold text-sage-900 capitalize">{profile.data_source}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
