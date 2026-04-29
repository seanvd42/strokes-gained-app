'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Shot, SummaryMetrics } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Target, AlertCircle, Calendar, Filter } from 'lucide-react'
import { format } from 'date-fns'

export default function DashboardPage() {
  const [shots, setShots] = useState<Shot[]>([])
  const [summary, setSummary] = useState<SummaryMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [benchmark, setBenchmark] = useState('pga_tour')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [startDate, endDate, benchmark])

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const params: any = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (benchmark) params.benchmark = benchmark

      const response = await api.shots.getDashboard(params)
      setShots(response.data.shots)
      setSummary(response.data.summary)
    } catch (err: any) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatStrokesGained = (value: number | null) => {
    if (value === null) return 'N/A'
    const formatted = value.toFixed(3)
    return value > 0 ? `+${formatted}` : formatted
  }

  const getStrokeColor = (value: number | null) => {
    if (value === null) return 'text-sage-500'
    return value > 0 ? 'stat-positive' : 'stat-negative'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-sage-900">Dashboard</h1>
          <p className="text-sage-600 font-body mt-1">
            Your golf performance analytics
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2"
        >
          <Filter className="w-5 h-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <h3 className="text-lg font-display font-bold text-sage-900 mb-4">Filters</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-display font-semibold text-sage-700 mb-2">
                Benchmark
              </label>
              <select
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="input-field"
              >
                <option value="pga_tour">PGA Tour</option>
                <option value="scratch">Scratch Golfer</option>
                <option value="bogey">Bogey Golfer</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-body">{error}</span>
        </div>
      )}

      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-golf-fairway" />
              <span className="text-sm font-display font-semibold text-sage-600">Total Shots</span>
            </div>
            <div className="text-3xl font-display font-bold text-sage-900">
              {summary.total_shots}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-golf-fairway" />
              <span className="text-sm font-display font-semibold text-sage-600">Total SG</span>
            </div>
            <div className={`text-3xl font-display font-bold ${getStrokeColor(summary.total_strokes_gained)}`}>
              {formatStrokesGained(summary.total_strokes_gained)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-golf-fairway" />
              <span className="text-sm font-display font-semibold text-sage-600">Avg SG</span>
            </div>
            <div className={`text-3xl font-display font-bold ${getStrokeColor(summary.avg_strokes_gained)}`}>
              {formatStrokesGained(summary.avg_strokes_gained)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-golf-fairway" />
              <span className="text-sm font-display font-semibold text-sage-600">Best Shot</span>
            </div>
            <div className="text-3xl font-display font-bold stat-positive">
              {formatStrokesGained(summary.best_shot)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-sm font-display font-semibold text-sage-600">Worst Shot</span>
            </div>
            <div className="text-3xl font-display font-bold stat-negative">
              {formatStrokesGained(summary.worst_shot)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-golf-green-500" />
              <span className="text-sm font-display font-semibold text-sage-600">Positive Shots</span>
            </div>
            <div className="text-3xl font-display font-bold text-golf-green-600">
              {summary.positive_shots}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-sm font-display font-semibold text-sage-600">Negative Shots</span>
            </div>
            <div className="text-3xl font-display font-bold text-red-600">
              {summary.negative_shots}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-golf-fairway" />
              <span className="text-sm font-display font-semibold text-sage-600">Success Rate</span>
            </div>
            <div className="text-3xl font-display font-bold text-sage-900">
              {summary.total_shots > 0 
                ? `${Math.round((summary.positive_shots / summary.total_shots) * 100)}%`
                : '0%'}
            </div>
          </div>
        </div>
      )}

      {/* Shots Table */}
      <div className="card">
        <h2 className="text-2xl font-display font-bold text-sage-900 mb-6">Shot Details</h2>
        
        {shots.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-sage-300 mx-auto mb-4" />
            <p className="text-sage-600 font-body text-lg mb-4">No shots found</p>
            <a href="/dashboard/import" className="btn-primary inline-block">
              Import Your First Round
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage-200">
                  <th className="text-left py-3 px-4 font-display font-bold text-sage-700">Date</th>
                  <th className="text-left py-3 px-4 font-display font-bold text-sage-700">Hole</th>
                  <th className="text-left py-3 px-4 font-display font-bold text-sage-700">Club</th>
                  <th className="text-right py-3 px-4 font-display font-bold text-sage-700">Distance</th>
                  <th className="text-left py-3 px-4 font-display font-bold text-sage-700">Lie</th>
                  <th className="text-right py-3 px-4 font-display font-bold text-sage-700">SG</th>
                </tr>
              </thead>
              <tbody>
                {shots.map((shot) => (
                  <tr key={shot.id} className="border-b border-sage-100 hover:bg-sage-50 transition-colors">
                    <td className="py-3 px-4 font-body text-sage-900">
                      {format(new Date(shot.shot_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4 font-mono text-sage-700">
                      {shot.hole_number || '—'}
                    </td>
                    <td className="py-3 px-4 font-body text-sage-900">
                      {shot.club || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-sage-700">
                      {shot.distance_yards ? `${shot.distance_yards}y` : '—'}
                    </td>
                    <td className="py-3 px-4 font-body text-sage-700 capitalize">
                      {shot.lie_type?.replace('_', ' ') || '—'}
                    </td>
                    <td className={`py-3 px-4 font-mono text-right font-semibold ${getStrokeColor(shot.strokes_gained)}`}>
                      {formatStrokesGained(shot.strokes_gained)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
