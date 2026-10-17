/**
 * API config.
 * Ported from Frontend/src/services/api/config.js — VITE_API_BASE_URL (build-time,
 * inlined by Vite) becomes API_BASE_URL via react-native-config (build-time,
 * read from .env by the Android/iOS build). There is no "same origin" for a
 * mobile app, so this must be an absolute URL (see .env.example).
 */
import Config from 'react-native-config';

export const API_BASE_URL = (Config.API_BASE_URL || '').replace(/\/$/, '');

export const SOCKET_URL = (Config.SOCKET_URL || '').replace(/\/$/, '');

export const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY || '';

export default {API_BASE_URL, SOCKET_URL, GOOGLE_MAPS_API_KEY};
