import { geocodeGooglePlaceId } from './googleGeocoding'
import { geocodeAPI } from '../../api/restaurant'
import { getGoogleMapsApiKey } from './googleMapsApiKey'

/*
 * Food/utils/googlePlaces.js. The web mixes three sources (the Maps JS
 * AutocompleteService, the new AutocompleteSuggestion and the backend
 * text-search proxy). The JS-SDK sources do not exist in a native app: the new
 * Places autocomplete is called through its REST endpoint with the app's Maps
 * key, the legacy SDK service is covered by it, and the text-search proxy is
 * unchanged. All are ranked and merged the same way.
 */

const normalizePlaceId = (placeId = '') => {
  const raw = String(placeId).trim()
  if (!raw) return ''
  return raw.startsWith('places/') ? raw.slice('places/'.length) : raw
}

/** The web waits for the Maps SDK here; nothing to load natively. */
export async function ensureGoogleMapsPlacesLoaded() {
  return true
}

export function mapGeocodeParsedToLocation(parsed) {
  if (!parsed) return null

  const placeName = parsed.placeName || parsed.premise || ''
  const streetLine =
    parsed.streetNumber && parsed.route
      ? `${parsed.streetNumber}, ${parsed.route}`
      : parsed.route || ''

  const addressLine1 =
    placeName ||
    streetLine ||
    parsed.address?.split(',')[0]?.trim() ||
    parsed.formattedAddress?.split(',')[0]?.trim() ||
    ''

  return {
    formattedAddress: parsed.formattedAddress || '',
    addressLine1,
    addressLine2: placeName && streetLine && !streetLine.includes(placeName) ? streetLine : '',
    area: parsed.area || '',
    city: parsed.city || 'Indore',
    state: parsed.state || 'Madhya Pradesh',
    pincode: parsed.pincode || '',
    landmark: placeName || '',
    latitude: Number(parsed.latitude),
    longitude: Number(parsed.longitude),
    placeName,
  }
}

function rankSuggestion(query, suggestion) {
  const q = String(query || '').trim().toLowerCase()
  const main = String(suggestion.mainText || suggestion.display || '').toLowerCase()
  const full = String(suggestion.display || '').toLowerCase()

  if (!q) return 0
  if (main === q || full === q) return 100
  if (main.startsWith(q) || full.startsWith(q)) return 80
  if (main.includes(q) || full.includes(q)) return 60
  if (suggestion.source === 'text_search') return 55
  if (suggestion.source === 'autocomplete_new') return 50
  return 30
}

function mergeSuggestions(query, lists = []) {
  const merged = new Map()

  for (const list of lists) {
    for (const item of list) {
      const placeId = normalizePlaceId(item.placeId || item.id)
      if (!placeId) continue

      const existing = merged.get(placeId)
      if (!existing || rankSuggestion(query, item) > rankSuggestion(query, existing)) {
        merged.set(placeId, {
          id: placeId,
          placeId,
          display: item.display || item.mainText || '',
          mainText: item.mainText || item.display || '',
          secondaryText: item.secondaryText || '',
          source: item.source || 'autocomplete',
          latitude: item.latitude ?? null,
          longitude: item.longitude ?? null,
        })
      }
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => rankSuggestion(query, b) - rankSuggestion(query, a))
    .slice(0, 8)
}

async function fetchTextSearchPredictions(query, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 7000)

  try {
    const lat = Number(options.latitude)
    const lng = Number(options.longitude)

    const body = {
      textQuery: query,
      maxResultCount: 6,
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.latitude = lat
      body.longitude = lng
    }

    const response = await geocodeAPI.textSearch(body, { signal: controller.signal })
    const data = response?.data?.data
    const places = Array.isArray(data?.places) ? data.places : []

    return places.map((place) => {
      const placeId = normalizePlaceId(place.id)
      const mainText = place.displayName?.text || place.displayName || ''
      const formattedAddress = place.formattedAddress || ''
      return {
        id: placeId,
        placeId,
        display: formattedAddress || mainText,
        mainText: mainText || formattedAddress.split(',')[0] || '',
        secondaryText: formattedAddress && mainText ? formattedAddress : '',
        source: 'text_search',
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
      }
    })
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/** AutocompleteSuggestion.fetchAutocompleteSuggestions, through the Places (New) REST endpoint. */
async function fetchNewAutocompletePredictions(query, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 7000)
  try {
    const apiKey = await getGoogleMapsApiKey()
    if (!apiKey) return []

    const body = { input: query, includedRegionCodes: ['in'] }
    const lat = Number(options.latitude)
    const lng = Number(options.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } }
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) return []
    const data = await response.json()

    return (data?.suggestions || [])
      .map((item) => item.placePrediction)
      .filter(Boolean)
      .map((prediction) => {
        const mainText = prediction.structuredFormat?.mainText?.text || prediction.text?.text || ''
        const secondaryText = prediction.structuredFormat?.secondaryText?.text || ''
        return {
          id: normalizePlaceId(prediction.placeId),
          placeId: normalizePlaceId(prediction.placeId),
          display: prediction.text?.text || `${mainText}${secondaryText ? `, ${secondaryText}` : ''}`,
          mainText,
          secondaryText,
          source: 'autocomplete_new',
        }
      })
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchPlaceSuggestions(input, options = {}) {
  const query = String(input || '').trim()
  if (query.length < 3) return []

  const [newResults, textResults] = await Promise.all([
    fetchNewAutocompletePredictions(query, options),
    fetchTextSearchPredictions(query, options),
  ])

  return mergeSuggestions(query, [textResults, [], newResults])
}

export async function resolvePlaceSuggestion(suggestion) {
  const placeId = normalizePlaceId(suggestion?.placeId || suggestion?.id)
  if (!placeId) throw new Error('Missing place id')

  const parsed = await geocodeGooglePlaceId(placeId)
  const location = mapGeocodeParsedToLocation(parsed)

  if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    return location
  }

  if (Number.isFinite(suggestion?.latitude) && Number.isFinite(suggestion?.longitude)) {
    return {
      formattedAddress: suggestion.display || '',
      addressLine1: suggestion.mainText || suggestion.display || '',
      addressLine2: '',
      area: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '',
      landmark: suggestion.mainText || '',
      latitude: Number(suggestion.latitude),
      longitude: Number(suggestion.longitude),
      placeName: suggestion.mainText || '',
    }
  }

  throw new Error('Could not resolve location coordinates')
}

export function formatLocationPreview(location) {
  if (!location) return ''
  const parts = []
  if (location.placeName || location.addressLine1) {
    parts.push((location.placeName || location.addressLine1).trim())
  }
  if (location.area) parts.push(location.area.trim())
  if (location.city) parts.push(location.city.trim())
  if (location.pincode) parts.push(location.pincode.trim())
  return parts.filter(Boolean).join(', ')
}
