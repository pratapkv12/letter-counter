import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('authToken')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          // Forbidden
          console.error('❌ Access forbidden:', data?.message)
          break
        case 404:
          // Not found
          console.error('❌ Resource not found:', error.config?.url)
          break
        case 422:
          // Validation error
          console.error('❌ Validation error:', data?.details || data?.message)
          break
        case 500:
          // Server error
          console.error('❌ Server error:', data?.message)
          break
        default:
          console.error('❌ API Error:', data?.message || error.message)
      }
    } else if (error.request) {
      // Network error
      console.error('❌ Network Error:', error.message)
    } else {
      // Other error
      console.error('❌ Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API methods
export const apiMethods = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    register: (userData) => api.post('/auth/register', userData),
    refreshToken: () => api.post('/auth/refresh'),
  },

  // Email campaigns
  email: {
    sendBatch: (data) => api.post('/email/send-batch', data),
    uploadLeads: (formData) => api.post('/email/upload-leads', formData),
    getCampaigns: () => api.get('/email/campaigns'),
    getCampaign: (id) => api.get(`/email/campaigns/${id}`),
    updateCampaign: (id, data) => api.put(`/email/campaigns/${id}`, data),
    deleteCampaign: (id) => api.delete(`/email/campaigns/${id}`),
  },

  // Leads management
  leads: {
    getAll: (params) => api.get('/leads', { params }),
    getOne: (id) => api.get(`/leads/${id}`),
    create: (data) => api.post('/leads', data),
    update: (id, data) => api.put(`/leads/${id}`, data),
    delete: (id) => api.delete(`/leads/${id}`),
    bulkUpdate: (data) => api.put('/leads/bulk', data),
    export: (format = 'csv') => api.get(`/leads/export?format=${format}`, { responseType: 'blob' }),
    import: (formData) => api.post('/leads/import', formData),
  },

  // Analytics and reporting
  analytics: {
    getDashboard: () => api.get('/analytics/dashboard'),
    getCampaignStats: (campaignId) => api.get(`/analytics/campaigns/${campaignId}`),
    getLeadSegments: () => api.get('/analytics/lead-segments'),
    getPerformanceMetrics: (params) => api.get('/analytics/performance', { params }),
    getReplyAnalysis: (params) => api.get('/analytics/replies', { params }),
  },

  // Webhooks (for email events)
  webhooks: {
    emailEvents: (data) => api.post('/webhooks/email-events', data),
    sendgrid: (data) => api.post('/webhooks/sendgrid', data),
    mailgun: (data) => api.post('/webhooks/mailgun', data),
  },

  // AI Engine integration
  ai: {
    generateEmail: (data) => api.post('/ai/generate', data),
    scoreLead: (data) => api.post('/ai/score', data),
    analyzeReply: (data) => api.post('/ai/analyze', data),
  },

  // Settings and configuration
  settings: {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
    getEmailProviders: () => api.get('/settings/email-providers'),
    testEmailProvider: (provider) => api.post(`/settings/email-providers/${provider}/test`),
  },

  // Health check
  health: () => api.get('/health'),
}

// Utility functions
export const apiUtils = {
  // Handle file downloads
  downloadFile: (response, filename) => {
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  // Format API errors for display
  formatError: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    if (error.message) {
      return error.message
    }
    return 'An unexpected error occurred'
  },

  // Check if error is network related
  isNetworkError: (error) => {
    return !error.response && error.request
  },

  // Check if error is server error
  isServerError: (error) => {
    return error.response?.status >= 500
  },

  // Check if error is client error
  isClientError: (error) => {
    return error.response?.status >= 400 && error.response?.status < 500
  },
}

// Export default api instance
export default api

// Export specific methods for convenience
export const {
  auth,
  email,
  leads,
  analytics,
  webhooks,
  ai,
  settings,
  health,
} = apiMethods