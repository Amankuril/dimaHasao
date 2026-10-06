import { io } from 'socket.io-client';
import { API_ORIGIN, getTaxiToken } from '../../api/client';

/* Port of Taxi/shared/api/socket.js. Same origin as the API (EXPO_PUBLIC_SOCKET_URL when set). */
const SOCKET_ORIGIN = String(process.env.EXPO_PUBLIC_SOCKET_URL || '').replace(/\/+$/, '') || API_ORIGIN;

class SocketService {
  constructor() {
    this.socket = null;
    this.currentToken = null;
    this.listeners = new Map();
  }

  attachRegisteredListeners() {
    if (!this.socket) return;
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => this.socket.on(event, callback));
    });
  }

  connect(options = {}) {
    const token = options.token || getTaxiToken();
    if (!token) return null;

    if (this.socket && this.currentToken === token) {
      if (!this.socket.connected) {
        this.socket.auth = { ...(this.socket.auth || {}), token };
        this.socket.connect();
      }
      return this.socket;
    }
    if (this.socket) this.socket.disconnect();

    this.currentToken = token;
    this.socket = io(SOCKET_ORIGIN, {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionDelay: 750,
      reconnectionDelayMax: 2500,
      timeout: 10000,
    });
    this.attachRegisteredListeners();
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
