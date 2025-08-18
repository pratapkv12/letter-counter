// Firebase configuration and initialization
// This file sets up Firebase for potential use with authentication, Firestore, and hosting

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'
import { getStorage } from 'firebase/storage'

// Firebase configuration
// In production, these values should come from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "coldstorm-ai.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "coldstorm-ai",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "coldstorm-ai.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
}

// Initialize Firebase
let app
let auth
let db
let analytics
let storage

try {
  app = initializeApp(firebaseConfig)
  
  // Initialize Firebase services
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  
  // Initialize Analytics only in production and in browser
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    analytics = getAnalytics(app)
  }
  
  console.log('✅ Firebase initialized successfully')
} catch (error) {
  console.error('❌ Firebase initialization error:', error)
  console.warn('⚠️  Firebase services will not be available')
}

// Firebase utility functions
export const firebaseUtils = {
  // Check if Firebase is properly initialized
  isInitialized: () => !!app,

  // Authentication helpers
  auth: {
    getCurrentUser: () => auth?.currentUser,
    onAuthStateChanged: (callback) => auth ? auth.onAuthStateChanged(callback) : null,
    signOut: () => auth ? auth.signOut() : Promise.reject(new Error('Auth not initialized')),
  },

  // Firestore helpers
  firestore: {
    // Collection references
    leads: () => db ? db.collection('leads') : null,
    campaigns: () => db ? db.collection('campaigns') : null,
    emailLogs: () => db ? db.collection('emailLogs') : null,
    
    // Generic document operations
    getDoc: async (collection, docId) => {
      if (!db) throw new Error('Firestore not initialized')
      const docRef = db.collection(collection).doc(docId)
      const doc = await docRef.get()
      return doc.exists ? { id: doc.id, ...doc.data() } : null
    },
    
    setDoc: async (collection, docId, data) => {
      if (!db) throw new Error('Firestore not initialized')
      const docRef = db.collection(collection).doc(docId)
      await docRef.set(data, { merge: true })
      return docId
    },
    
    addDoc: async (collection, data) => {
      if (!db) throw new Error('Firestore not initialized')
      const collectionRef = db.collection(collection)
      const docRef = await collectionRef.add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return docRef.id
    },
    
    updateDoc: async (collection, docId, data) => {
      if (!db) throw new Error('Firestore not initialized')
      const docRef = db.collection(collection).doc(docId)
      await docRef.update({
        ...data,
        updatedAt: new Date()
      })
      return docId
    },
    
    deleteDoc: async (collection, docId) => {
      if (!db) throw new Error('Firestore not initialized')
      const docRef = db.collection(collection).doc(docId)
      await docRef.delete()
      return docId
    },
    
    // Query helpers
    getDocs: async (collection, options = {}) => {
      if (!db) throw new Error('Firestore not initialized')
      let query = db.collection(collection)
      
      // Apply filters
      if (options.where) {
        options.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value)
        })
      }
      
      // Apply ordering
      if (options.orderBy) {
        const [field, direction = 'asc'] = options.orderBy
        query = query.orderBy(field, direction)
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit)
      }
      
      const snapshot = await query.get()
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },
  },

  // Storage helpers
  storage: {
    uploadFile: async (path, file) => {
      if (!storage) throw new Error('Storage not initialized')
      const storageRef = storage.ref(path)
      const snapshot = await storageRef.put(file)
      const downloadURL = await snapshot.ref.getDownloadURL()
      return { downloadURL, fullPath: snapshot.ref.fullPath }
    },
    
    deleteFile: async (path) => {
      if (!storage) throw new Error('Storage not initialized')
      const storageRef = storage.ref(path)
      await storageRef.delete()
      return path
    },
    
    getDownloadURL: async (path) => {
      if (!storage) throw new Error('Storage not initialized')
      const storageRef = storage.ref(path)
      return await storageRef.getDownloadURL()
    },
  },

  // Analytics helpers
  analytics: {
    logEvent: (eventName, parameters = {}) => {
      if (analytics && process.env.NODE_ENV === 'production') {
        analytics.logEvent(eventName, parameters)
      } else if (process.env.NODE_ENV === 'development') {
        console.log('📊 Analytics Event:', eventName, parameters)
      }
    },
    
    setUserId: (userId) => {
      if (analytics && process.env.NODE_ENV === 'production') {
        analytics.setUserId(userId)
      }
    },
    
    setUserProperties: (properties) => {
      if (analytics && process.env.NODE_ENV === 'production') {
        analytics.setUserProperties(properties)
      }
    },
  },
}

// Campaign-specific Firebase operations
export const campaignOperations = {
  // Save campaign data
  saveCampaign: async (campaignData) => {
    try {
      const campaignId = await firebaseUtils.firestore.addDoc('campaigns', {
        ...campaignData,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      firebaseUtils.analytics.logEvent('campaign_created', {
        campaign_id: campaignId,
        lead_count: campaignData.leads?.length || 0
      })
      
      return campaignId
    } catch (error) {
      console.error('Error saving campaign:', error)
      throw error
    }
  },

  // Log email events
  logEmailEvent: async (eventData) => {
    try {
      await firebaseUtils.firestore.addDoc('emailLogs', {
        ...eventData,
        timestamp: new Date()
      })
      
      firebaseUtils.analytics.logEvent('email_event', {
        event_type: eventData.eventType,
        campaign_id: eventData.campaignId
      })
    } catch (error) {
      console.error('Error logging email event:', error)
      // Don't throw here as email logging shouldn't break the main flow
    }
  },

  // Get campaign analytics
  getCampaignAnalytics: async (campaignId) => {
    try {
      const emailLogs = await firebaseUtils.firestore.getDocs('emailLogs', {
        where: [['campaignId', '==', campaignId]],
        orderBy: ['timestamp', 'desc']
      })
      
      return {
        totalEmails: emailLogs.length,
        opened: emailLogs.filter(log => log.eventType === 'opened').length,
        clicked: emailLogs.filter(log => log.eventType === 'clicked').length,
        replied: emailLogs.filter(log => log.eventType === 'replied').length,
        bounced: emailLogs.filter(log => log.eventType === 'bounced').length,
      }
    } catch (error) {
      console.error('Error getting campaign analytics:', error)
      return null
    }
  },
}

// Export Firebase instances (may be undefined if initialization failed)
export { app, auth, db, analytics, storage }

// Export default Firebase utilities
export default firebaseUtils