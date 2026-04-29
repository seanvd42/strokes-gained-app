import axios from 'axios'
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  return config
})

export const api = {
  // Auth
  auth: {
    signup: (email: string, password: string, name?: string) =>
      apiClient.post('/api/auth/signup', { email, password, name }),
    signin: (email: string, password: string) =>
      apiClient.post('/api/auth/signin', { email, password }),
    signout: () => apiClient.post('/api/auth/signout'),
  },

  // Profile
  profile: {
    get: () => apiClient.get('/api/profile/me'),
    update: (data: any) => apiClient.put('/api/profile/me', data),
  },

  // Shots
  shots: {
    getAll: (params?: any) => apiClient.get('/api/shots/', { params }),
    getById: (id: string) => apiClient.get(`/api/shots/${id}`),
    create: (data: any) => apiClient.post('/api/shots/', data),
    bulkImport: (shots: any[], benchmark: string = 'pga_tour') =>
      apiClient.post('/api/shots/bulk', { shots, benchmark }),
    delete: (id: string) => apiClient.delete(`/api/shots/${id}`),
    deleteAll: () => apiClient.delete('/api/shots/'),
    getDashboard: (params?: any) => apiClient.get('/api/shots/dashboard', { params }),
    getSummary: (params?: any) => apiClient.get('/api/shots/summary', { params }),
  },
}

export default apiClient
