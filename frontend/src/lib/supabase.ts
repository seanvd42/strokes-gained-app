import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  email: string
}

export type Profile = {
  id: string
  email: string
  name: string | null
  data_source: string
  created_at: string
  updated_at: string
}

export type Shot = {
  id: string
  user_id: string
  shot_date: string
  shot_time: string | null
  hole_number: number | null
  shot_number: number | null
  club: string | null
  distance_yards: number | null
  lie_type: string | null
  starting_position: string | null
  ending_position: string | null
  strokes_gained: number | null
  benchmark: string
  raw_data: any
  created_at: string
  updated_at: string
}

export type SummaryMetrics = {
  total_shots: number
  total_strokes_gained: number
  avg_strokes_gained: number
  best_shot: number
  worst_shot: number
  positive_shots: number
  negative_shots: number
}
