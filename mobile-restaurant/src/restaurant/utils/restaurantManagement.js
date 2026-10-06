import { localStore } from '../../lib/storage';
import { events } from '../../lib/events';
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

/**
 * Restaurant Management Utility Functions
 * Centralized management for restaurant details across the restaurant module
 */

// Default restaurant data
const DEFAULT_RESTAURANT_DATA = {
  restaurantName: {
    english: "Hungry Puppets",
    bengali: "",
    arabic: "",
    spanish: ""
  },
  phoneNumber: "+101747410000",
  address: "House: 00, Road: 00, Test City",
  logo: null,
  cover: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=400&fit=crop",
  metaTitle: "Hungry Puppets Restaurant: Where Fla",
  metaDescription: "Satisfy your cravings and indulge in a culinary adventure at Hungry Puppets Restaurant. Our menu is a symphony of taste, offering a delightful fusion of flavors that excite both palate and",
  metaImage: null,
  rating: 4.7,
  totalRatings: 3
}

const RESTAURANT_STORAGE_KEY = 'restaurant_data'

const isValidImageValue = (value) => {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false

  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  )
}

const normalizeRestaurantData = (data = {}) => ({
  ...DEFAULT_RESTAURANT_DATA,
  ...data,
  restaurantName: {
    ...DEFAULT_RESTAURANT_DATA.restaurantName,
    ...(data.restaurantName || {})
  },
  logo: isValidImageValue(data.logo) ? data.logo : null,
  cover: isValidImageValue(data.cover) ? data.cover : DEFAULT_RESTAURANT_DATA.cover,
  metaImage: isValidImageValue(data.metaImage) ? data.metaImage : null
})

/**
 * Get restaurant data from localStore
 * @returns {Object} - Restaurant data object
 */
export const getRestaurantData = () => {
  try {
    const saved = localStore.getItem(RESTAURANT_STORAGE_KEY)
    if (saved) {
      const normalizedData = normalizeRestaurantData(JSON.parse(saved))
      localStore.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(normalizedData))
      return normalizedData
    }
    // Initialize with default data
    setRestaurantData(DEFAULT_RESTAURANT_DATA)
    return DEFAULT_RESTAURANT_DATA
  } catch (error) {
    debugError('Error reading restaurant data from localStore:', error)
    return DEFAULT_RESTAURANT_DATA
  }
}

/**
 * Save restaurant data to localStore
 * @param {Object} restaurantData - Restaurant data object
 */
export const setRestaurantData = (restaurantData) => {
  try {
    const normalizedData = normalizeRestaurantData(restaurantData)
    localStore.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(normalizedData))
    // Dispatch custom event for other components
    events.emit('restaurantDataUpdated')
    // Trigger storage event for cross-tab updates
    events.emit('storage')
  } catch (error) {
    debugError('Error saving restaurant data to localStore:', error)
  }
}

/**
 * Update restaurant data (merge with existing)
 * @param {Object} updates - Partial restaurant data to update
 * @returns {Object} - Updated restaurant data
 */
export const updateRestaurantData = (updates) => {
  const currentData = getRestaurantData()
  const updatedData = {
    ...currentData,
    ...updates,
    // Merge restaurantName object if it exists
    restaurantName: updates.restaurantName 
      ? { ...currentData.restaurantName, ...updates.restaurantName }
      : currentData.restaurantName
  }
  setRestaurantData(updatedData)
  return updatedData
}


