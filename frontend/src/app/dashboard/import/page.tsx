'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Upload, FileJson, AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function ImportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [benchmark, setBenchmark] = useState('pga_tour')
  const [importCount, setImportCount] = useState(0)

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
          Upload your golf shot data from Garmin or other sources
        </p>
      </div>

      {/* Upload Card */}
      <div className="card mb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-body">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-body">
              Successfully imported {importCount} shots! Redirecting to dashboard...
            </span>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
            Benchmark Comparison
          </label>
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className="input-field max-w-xs"
            disabled={loading}
          >
            <option value="pga_tour">PGA Tour</option>
            <option value="scratch">Scratch Golfer</option>
            <option value="bogey">Bogey Golfer</option>
          </select>
          <p className="text-sm text-sage-500 font-body mt-1">
            Choose the skill level to compare your shots against
          </p>
        </div>

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
      </div>

      {/* Instructions */}
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

      {/* Garmin Instructions */}
      <div className="card mt-8">
        <h3 className="text-xl font-display font-bold text-sage-900 mb-4">
          Exporting from Garmin
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sage-700 font-body">
          <li>Connect your Garmin device to Garmin Connect</li>
          <li>Navigate to Activities and select your round</li>
          <li>Export the activity data</li>
          <li>Convert to the JSON format above</li>
          <li>Upload the file using the form above</li>
        </ol>
        <p className="text-sm text-sage-500 font-body mt-4">
          Note: Direct Garmin API integration coming soon!
        </p>
      </div>
    </div>
  )
}
