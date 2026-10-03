/**
 * Ported from Frontend/src/modules/Taxi/shared/api/socket.js, simplified to
 * the single 'user' role this app ever authenticates as.
 */
import {io} from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BACKEND_ORIGIN} from './config';
import {base64Decode} from '../../utils/base64';

const getTokenPayload = token => {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(base64Decode(normalized));
    if (decoded && typeof decoded.exp === 'number' && Date.now() / 1000 >= decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
};

async function resolveUserToken() {
  const pairs = await AsyncStorage.multiGet(['userToken', 'token', 'user_accessToken']);
  const tokens = pairs.map(([, v]) => v);
  return tokens.find(token => {
    if (!token) return false;
    const role = String(getTokenPayload(token)?.role || '').toLowerCase();
    return !role || role === 'user';
  });
}

class SocketService {
  constructor() {
    this.socket = null;
    this.currentToken = null;
    this.listeners = new Map();
  }

  attachRegisteredListeners() {
    if (!this.socket) return;
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => this.socket.on(event, callback));
    });
  }

  /** @param {{token?: string}} [options] pass a token directly to skip the AsyncStorage read. */
  async connect(options = {}) {
    const token = options.token || (await resolveUserToken());

    if (!token) {
      console.warn('[socket] missing user token');
      return null;
    }

    if (this.socket && this.currentToken === token) {
      if (!this.socket.connected) {
        this.socket.auth = {...(this.socket.auth || {}), token};
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.socket) this.socket.disconnect();

    this.currentToken = token;
    this.socket = io(BACKEND_ORIGIN, {
      auth: {token},
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionDelay: 750,
      reconnectionDelayMax: 2500,
      timeout: 10000,
    });
    this.attachRegisteredListeners();

    this.socket.on('connect', () => console.info('[socket] connected', this.socket?.id));
    this.socket.on('connect_error', error => console.error('[socket] connect_error', error?.message));
    this.socket.on('disconnect', reason => console.warn('[socket] disconnected', reason));

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
    }
  }

  on(event, callback) {
    if (!event || typeof callback !== 'function') return;
    const callbacks = this.listeners.get(event) || new Set();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
    if (this.socket) this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!event) return;
    if (callback) {
      const callbacks = this.listeners.get(event);
      callbacks?.delete(callback);
      if (callbacks?.size === 0) this.listeners.delete(event);
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      if (callback) this.socket.off(event, callback);
      else this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket) this.socket.emit(event, data);
  }

  isConnected() {
    return Boolean(this.socket?.connected);
  }
}

export const socketService = new SocketService();
export default socketService;
