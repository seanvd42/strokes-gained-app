'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Upload, FileJson, AlertCircle, CheckCircle, Info, Wifi, Download } from 'lucide-react'

export default function ImportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [benchmark, setBenchmark] = useState('pga_tour')
  const [importCount, setImportCount] = useState(0)
  const [importMethod, setImportMethod] = useState<'garmin' | 'file'>('garmin')
  const [garminAvailable, setGarminAvailable] = useState(true)
  
  // Garmin state
  const [garminEmail, setGarminEmail] = useState('')
  const [garminPassword, setGarminPassword] = useState('')
  const [roundCount, setRoundCount] = useState(5)
  const [fetchingRounds, setFetchingRounds] = useState(false)
  const [roundsFetched, setRoundsFetched] = useState(0)

  useEffect(() => {
    checkGarminAvailability()
  }, [])

  const checkGarminAvailability = async () => {
    try {
      const response = await api.garmin.checkAvailable()
      setGarminAvailable(response.data.available)
      if (!response.data.available) {
        setImportMethod('file')
      }
    } catch (err) {
      console.error('Failed to check Garmin availability:', err)
      setGarminAvailable(false)
      setImportMethod('file')
    }
  }

  const handleGarminFetch = async (e: React.FormEvent) => {
    e.preventDefault()
    setFetchingRounds(true)
    setError('')
    setSuccess(false)

    try {
      const response = await api.garmin.fetchRounds(
        garminEmail,
        garminPassword,
        roundCount,
        benchmark
      )

      if (response.data.success) {
        setRoundsFetched(response.data.rounds_fetched)
        setImportCount(response.data.shots_imported)
        setSuccess(true)
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch from Garmin Connect'
      setError(errorMessage)
    } finally {
      setFetchingRounds(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('Invalid file format. Expected an array of shots.')
      }

      // Import shots
      const response = await api.shots.bulkImport(data, benchmark)
      setImportCount(response.data.length)
      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to import data')
    } finally {
      setLoading(false)
    }
  }

  const sampleData = [
    {
      shot_date: "2024-01-15",
      hole_number: 1,
      shot_number: 1,
      club: "Driver",
      distance: 280,
      start_position: "tee_box",
      end_position: "fairway",
      start_distance_to_hole: 400,
      end_distance_to_hole: 120
    },
    {
      shot_date: "2024-01-15",
      hole_number: 1,
      shot_number: 2,
      club: "9 Iron",
      distance: 120,
      start_position: "fairway",
      end_position: "green",
      start_distance_to_hole: 120,
      end_distance_to_hole: 15
    }
  ]

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-shots.json'
    a.click()
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-sage-900">Import Data</h1>
        <p className="text-sage-600 font-body mt-1">
          Connect to Garmin or upload your golf shot data
        </p>
      </div>

      {/* Method Selector */}
      <div className="card mb-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setImportMethod('garmin')}
            disabled={!garminAvailable}
            className={`flex-1 py-3 px-4 rounded-lg font-display font-semibold transition-all ${
              importMethod === 'garmin'
                ? 'bg-golf-fairway text-white'
                : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
            } ${!garminAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Wifi className="w-5 h-5 inline mr-2" />
            Garmin Connect
          </button>
          <button
            onClick={() => setImportMethod('file')}
            className={`flex-1 py-3 px-4 rounded-lg font-display font-semibold transition-all ${
              importMethod === 'file'
                ? 'bg-golf-fairway text-white'
                : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
            }`}
          >
            <FileJson className="w-5 h-5 inline mr-2" />
            Upload File
          </button>
        </div>

        {/* Benchmark Selection */}
        <div className="mb-6">
          <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
            Benchmark Comparison
          </label>
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className="input-field max-w-xs"
            disabled={loading || fetchingRounds}
          >
            <option value="pga_tour">PGA Tour</option>
            <option value="scratch">Scratch Golfer</option>
            <option value="bogey">Bogey Golfer</option>
          </select>
          <p className="text-sm text-sage-500 font-body mt-1">
            Choose the skill level to compare your shots against
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-body">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-body">
              {importMethod === 'garmin' 
                ? `Successfully imported ${roundsFetched} round(s) with ${importCount} shots!`
                : `Successfully imported ${importCount} shots!`
              } Redirecting to dashboard...
            </span>
          </div>
        )}

        {/* Garmin Connect Form */}
        {importMethod === 'garmin' && (
          <form onSubmit={handleGarminFetch} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 font-body">
                  <p className="font-semibold mb-1">Connect to your Garmin account</p>
                  <p>Enter your Garmin Connect credentials to automatically fetch your recent golf rounds. Your credentials are only used for this import and are not stored.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                Garmin Email
              </label>
              <input
                type="email"
                value={garminEmail}
                onChange={(e) => setGarminEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
                disabled={fetchingRounds}
              />
            </div>

            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                Garmin Password
              </label>
              <input
                type="password"
                value={garminPassword}
                onChange={(e) => setGarminPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                disabled={fetchingRounds}
              />
              <p className="text-xs text-sage-500 font-body mt-1">
                If you use Google/Apple sign-in, set a Garmin password in your account settings first.
              </p>
            </div>

            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                Number of Recent Rounds
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={roundCount}
                onChange={(e) => setRoundCount(parseInt(e.target.value))}
                className="input-field max-w-xs"
                disabled={fetchingRounds}
              />
            </div>

            <button
              type="submit"
              disabled={fetchingRounds || !garminEmail || !garminPassword}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetchingRounds ? (
                <>
                  <div className="spinner inline-block w-5 h-5 mr-2"></div>
                  Fetching from Garmin...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 inline mr-2" />
                  Fetch from Garmin Connect
                </>
              )}
            </button>
          </form>
        )}

        {/* File Upload */}
        {importMethod === 'file' && (
          <div className="border-2 border-dashed border-sage-300 rounded-xl p-12 text-center hover:border-golf-fairway transition-colors">
            <Upload className="w-16 h-16 text-sage-400 mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold text-sage-900 mb-2">
              Upload JSON File
            </h3>
            <p className="text-sage-600 font-body mb-6">
              Select a JSON file containing your shot data
            </p>
            <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
              <FileJson className="w-5 h-5" />
              {loading ? 'Uploading...' : 'Choose File'}
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* File Format Instructions */}
      {importMethod === 'file' && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-display font-bold text-blue-900 mb-2">
                Data Format Instructions
              </h3>
              <p className="text-blue-800 font-body mb-4">
                Your JSON file should contain an array of shot objects with the following fields:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 font-body mb-4">
                <li><code className="bg-blue-100 px-1 rounded">shot_date</code> - Date in YYYY-MM-DD format</li>
                <li><code className="bg-blue-100 px-1 rounded">hole_number</code> - Hole number (1-18)</li>
                <li><code className="bg-blue-100 px-1 rounded">shot_number</code> - Shot sequence number</li>
                <li><code className="bg-blue-100 px-1 rounded">club</code> - Club used (e.g., "Driver", "7 Iron")</li>
                <li><code className="bg-blue-100 px-1 rounded">distance</code> - Shot distance in yards</li>
                <li><code className="bg-blue-100 px-1 rounded">start_position</code> - Starting lie (tee_box, fairway, rough, sand, green)</li>
                <li><code className="bg-blue-100 px-1 rounded">end_position</code> - Ending lie</li>
                <li><code className="bg-blue-100 px-1 rounded">start_distance_to_hole</code> - Starting distance to hole</li>
                <li><code className="bg-blue-100 px-1 rounded">end_distance_to_hole</code> - Ending distance to hole</li>
              </ul>
              <button
                onClick={downloadSample}
                className="btn-secondary text-sm"
              >
                Download Sample File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
