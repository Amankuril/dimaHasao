/**
 * Google Maps REST calls made on behalf of the mobile apps.
 *
 * The apps used to call Google directly with a key baked into the APK. They now
 * call these endpoints, and the key (admin-editable, see
 * core/platform/credentials.service.js) never leaves the server.
 *
 * Only fixed Google endpoints with validated parameters are reachable — this is
 * not a generic URL proxy.
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../auth/auth.middleware.js';
import { getGoogleMapsApiKey } from './googleMaps.service.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const TIMEOUT_MS = 10000;

const mapsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.MAPS_RATE_LIMIT_PER_MIN || 90),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many map requests, please slow down.' },
});

router.use(mapsLimiter);

const toPoint = (value) => {
    const lat = Number(value?.lat ?? value?.latitude);
    const lng = Number(value?.lng ?? value?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
};

const waypoint = (p) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
const minutesText = (secs) => `${Math.max(1, Math.round(secs / 60))} mins`;
const seconds = (duration) => Number(String(duration || '0').replace('s', '')) || 0;

const requireKey = (res) => {
    const key = getGoogleMapsApiKey();
    if (!key) {
        res.status(503).json({ success: false, message: 'Maps is not configured on the server' });
        return null;
    }
    return key;
};

const viaRoutesApi = async (key, { origin, destination, intermediates, region }) => {
    const body = { origin: waypoint(origin), destination: waypoint(destination), travelMode: 'DRIVE' };
    if (intermediates.length) body.intermediates = intermediates.map(waypoint);
    if (region) body.regionCode = region;

    const response = await fetch(ROUTES_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask':
                'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const route = (await response.json())?.routes?.[0];
    if (!route?.polyline?.encodedPolyline) return null;

    const durationSeconds = seconds(route.duration);
    return {
        status: 'OK',
        encodedPolyline: route.polyline.encodedPolyline,
        distanceMeters: route.distanceMeters || 0,
        durationSeconds,
        durationText: minutesText(durationSeconds),
        legs: (route.legs || []).map((leg) => ({
            distanceMeters: leg.distanceMeters || 0,
            durationSeconds: seconds(leg.duration),
        })),
    };
};

const viaDirectionsApi = async (key, { origin, destination, intermediates, region }) => {
    const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: 'driving',
        key,
    });
    if (intermediates.length) params.set('waypoints', intermediates.map((p) => `${p.lat},${p.lng}`).join('|'));
    if (region) params.set('region', region);

    const response = await fetch(`${DIRECTIONS_URL}?${params.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = await response.json();
    const route = json?.routes?.[0];
    if (json?.status !== 'OK' || !route) return { status: json?.status || 'DIRECTIONS_FAILED' };

    const legs = (route.legs || []).map((leg) => ({
        distanceMeters: leg.distance?.value || 0,
        durationSeconds: leg.duration?.value || 0,
        durationText: leg.duration?.text || '',
    }));
    const durationSeconds = legs.reduce((sum, l) => sum + l.durationSeconds, 0);
    return {
        status: 'OK',
        encodedPolyline: route.overview_polyline?.points || '',
        distanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
        durationSeconds,
        durationText: minutesText(durationSeconds),
        legs,
    };
};

/**
 * @route POST /v1/maps/route   (signed-in users of any app)
 * Body: { origin:{lat,lng}, destination:{lat,lng}, intermediates?:[{lat,lng}], region? }
 */
router.post('/route', authMiddleware, async (req, res) => {
    const key = requireKey(res);
    if (!key) return;

    const origin = toPoint(req.body?.origin);
    const destination = toPoint(req.body?.destination);
    if (!origin || !destination) {
        return res.status(400).json({ success: false, message: 'origin and destination are required' });
    }

    const rawMids = Array.isArray(req.body?.intermediates) ? req.body.intermediates.slice(0, 10) : [];
    const intermediates = rawMids.map(toPoint).filter(Boolean);
    const region = /^[a-z]{2}$/i.test(String(req.body?.region || '').trim())
        ? String(req.body.region).trim().toLowerCase()
        : '';
    const input = { origin, destination, intermediates, region };

    try {
        const data = (await viaRoutesApi(key, input).catch(() => null)) || (await viaDirectionsApi(key, input));
        return res.json({ success: true, data });
    } catch (error) {
        logger.error(`[Maps] Route failed: ${error.message}`);
        return res.json({ success: true, data: { status: 'ROUTE_COMPUTE_FAILED' } });
    }
});

/**
 * @route POST /v1/maps/autocomplete   (public: used on sign-up address screens)
 * Body: { input, latitude?, longitude? }
 */
router.post('/autocomplete', async (req, res) => {
    const key = requireKey(res);
    if (!key) return;

    const input = String(req.body?.input || '').trim().slice(0, 200);
    if (input.length < 2) return res.status(400).json({ success: false, message: 'input is required' });

    const body = { input, includedRegionCodes: ['in'] };
    const center = toPoint(req.body);
    if (center) {
        body.locationBias = { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 50000 } };
    }

    try {
        const response = await fetch(AUTOCOMPLETE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return res.status(502).json({ success: false, message: 'Place search failed' });
        return res.json({ success: true, data });
    } catch (error) {
        logger.error(`[Maps] Autocomplete failed: ${error.message}`);
        return res.status(502).json({ success: false, message: 'Place search failed' });
    }
});

export default router;
