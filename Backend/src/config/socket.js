import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../core/auth/token.util.js';
import { getFirebaseDB } from './firebase.js';

let io = null;

function logDeliverySocket(message, extra = {}) {
    const suffix = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '';
    logger.info(`[DeliverySocket] ${message}${suffix}`);
}

function getTokenFromHandshake(socket) {
    const authToken = socket?.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const header = socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.substring(7).trim();
    const queryToken = socket?.handshake?.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim();
    return null;
}

function maskToken(token) {
    if (!token || typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (!trimmed) return null;
    return `${trimmed.slice(0, 12)}...${trimmed.slice(-6)}`;
}

/**
 * Normalize Mongo ObjectId / populated refs into a stable room id string.
 * Populated documents stringify to "{ ... }" and would target the wrong room.
 */
export function resolveRoomOwnerId(value) {
    if (value == null || value === '') return null;

    if (typeof value === 'object' && typeof value.toHexString === 'function') {
        return value.toHexString();
    }

    if (typeof value === 'object' && value._id != null && value._id !== value) {
        return resolveRoomOwnerId(value._id);
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === '[object Object]' || normalized.startsWith('{')) {
        return null;
    }

    return normalized;
}

const roomNames = {
    restaurant: (id) => `restaurant:${resolveRoomOwnerId(id) || ''}`,
    user: (id) => `user:${resolveRoomOwnerId(id) || ''}`,
    delivery: (id) => `delivery:${resolveRoomOwnerId(id) || ''}`,
    tracking: (orderId) => `tracking:${resolveRoomOwnerId(orderId) || ''}`,
};

/**
 * One findById at handshake for the account kinds whose model is unambiguous.
 * Roles not listed (restaurant, hotel, tours...) are not checked here — their
 * own guards still apply. A lookup error fails open: this is a revocation
 * check, and refusing every socket because the database blinked would take
 * live tracking down for everyone.
 */
const socketAccountCheckers = {
    USER: async (id) => {
        const { FoodUser } = await import('../core/users/user.model.js');
        const user = await FoodUser.findById(id).select('isActive deletedAt').lean();
        return !user || user.isActive === false || Boolean(user.deletedAt);
    },
    DELIVERY_PARTNER: async (id) => {
        const { FoodDeliveryPartner } = await import('../modules/food/delivery/models/deliveryPartner.model.js');
        const partner = await FoodDeliveryPartner.findById(id).select('status deletedAt').lean();
        return !partner || Boolean(partner.deletedAt) || partner.status === 'deleted';
    },
    ADMIN: async (id) => {
        const { FoodAdmin } = await import('../core/admin/admin.model.js');
        const admin = await FoodAdmin.findById(id).select('isActive').lean();
        return !admin || admin.isActive === false;
    },
    DRIVER: async (id) => {
        const { Driver } = await import('../modules/taxi/driver/models/Driver.js');
        const driver = await Driver.findById(id).select('deletedAt').lean();
        return !driver || Boolean(driver.deletedAt);
    },
};

async function isSocketAccountInactive(role, entityId) {
    const checker = socketAccountCheckers[String(role || '').toUpperCase()];
    if (!checker || !entityId || !mongoose.Types.ObjectId.isValid(String(entityId))) return false;
    try {
        return await checker(String(entityId));
    } catch (err) {
        logger.warn(`Socket account check skipped for ${role}:${entityId}: ${err.message}`);
        return false;
    }
}

/** Order lookup by any id the apps use for it (_id, orderId, order_id). */
async function findOrderForSocket(orderKey) {
    const key = String(orderKey || '').trim();
    if (!key || key.length > 64) return null;
    const { FoodOrder } = await import('../modules/food/orders/models/order.model.js');
    const or = [{ orderId: key }, { order_id: key }];
    if (mongoose.Types.ObjectId.isValid(key)) or.unshift({ _id: key });
    return FoodOrder.findOne({ $or: or })
        .select('_id userId restaurantId dispatch.deliveryPartnerId')
        .lean();
}

/** Whether this socket's account is a party to the order. */
function isOrderParty(order, role, userId) {
    if (!order || !userId) return false;
    const id = String(userId);
    if (role === 'USER') return resolveRoomOwnerId(order.userId) === id;
    if (role === 'RESTAURANT') return resolveRoomOwnerId(order.restaurantId) === id;
    if (role === 'DELIVERY_PARTNER') return resolveRoomOwnerId(order.dispatch?.deliveryPartnerId) === id;
    return false;
}

/**
 * Initializes Socket.IO with the provided HTTP server.
 * When REDIS_ENABLED=true and REDIS_URL is set, attaches Redis adapter for horizontal scaling.
 * @param {import('http').Server} server
 * @returns {Promise<Server>}
 */
export const initSocket = async (server) => {
    const socketOrigins = String(config.socketCorsOrigin || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const socketCorsOrigin =
        socketOrigins.length === 0
            ? '*'
            : socketOrigins.length === 1
                ? socketOrigins[0]
                : socketOrigins;

    io = new Server(server, {
        cors: {
            origin: socketCorsOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        }
    });

    // Socket auth middleware (Bearer token).
    io.use((socket, next) => {
        try {
            const token = getTokenFromHandshake(socket);
            if (!token) {
                logger.warn(`Socket auth failed: token missing for socket ${socket.id}`);
                logger.warn(`[DeliverySocket] Handshake auth missing`, {
                    socketId: socket.id,
                    origin: socket?.handshake?.headers?.origin || null,
                    host: socket?.handshake?.headers?.host || null,
                    userAgent: socket?.handshake?.headers?.['user-agent'] || null,
                    hasAuthToken: Boolean(socket?.handshake?.auth?.token),
                    hasAuthorizationHeader: Boolean(
                        socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization
                    ),
                    hasQueryToken: Boolean(socket?.handshake?.query?.token),
                });
                return next(new Error('AUTH_MISSING'));
            }
            logger.info(`[DeliverySocket] Handshake token received`, {
                socketId: socket.id,
                origin: socket?.handshake?.headers?.origin || null,
                host: socket?.handshake?.headers?.host || null,
                transport: socket?.handshake?.query?.transport || null,
                tokenPreview: maskToken(token),
            });
            const decoded = verifyAccessToken(token);
            const entityId = decoded.userId || decoded.sub;
            const role = decoded.role;
            socket.user = { userId: entityId, role };
            socket.auth = {
                sub: String(entityId || ''),
                role: String(role || '').toLowerCase(),
            };
            // A JWT outlives the account it was issued for. Without this, a
            // deactivated or deleted user/rider/admin kept a working live
            // connection (tracking rooms, taxi dispatch, support chat) until
            // the token expired.
            return isSocketAccountInactive(role, entityId)
                .then((inactive) => {
                    if (inactive) {
                        logger.warn(`Socket auth refused: inactive account ${role}:${entityId} for socket ${socket.id}`);
                        return next(new Error('AUTH_INACTIVE'));
                    }
                    logger.info(`Socket auth success: ${decoded.role}:${decoded.userId} for socket ${socket.id}`);
                    return next();
                });
        } catch (err) {
            logger.error(`Socket auth failed for socket ${socket.id}: ${err.message}`);
            logger.error(`[DeliverySocket] Handshake auth invalid`, {
                socketId: socket.id,
                origin: socket?.handshake?.headers?.origin || null,
                host: socket?.handshake?.headers?.host || null,
                transport: socket?.handshake?.query?.transport || null,
                tokenPreview: maskToken(getTokenFromHandshake(socket)),
                errorMessage: err.message,
                errorName: err.name || null,
            });
            return next(new Error('AUTH_INVALID'));
        }
    });

    if (config.redisEnabled && config.redisUrl) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { createClient } = await import('redis');
            const pubClient = createClient({ url: config.redisUrl });
            const subClient = pubClient.duplicate();
            pubClient.on('error', (err) => logger.error(`Socket.IO Redis pub client: ${err.message}`));
            subClient.on('error', (err) => logger.error(`Socket.IO Redis sub client: ${err.message}`));
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter attached for horizontal scaling');
        } catch (err) {
            logger.warn(`Socket.IO Redis adapter skipped (using in-memory): ${err.message}`);
        }
    }

    io.on('connection', (socket) => {
        const userId = socket.user?.userId;
        const role = socket.user?.role;
        logger.info(`Socket client connected: ${socket.id} (${role || 'UNKNOWN'}:${userId || '-'})`);

        // Auto-join role rooms (lets us emit without a custom join).
        if (userId && role) {
            if (role === 'RESTAURANT') socket.join(roomNames.restaurant(userId));
            if (role === 'USER') socket.join(roomNames.user(userId));
            if (role === 'DELIVERY_PARTNER') {
                socket.join(roomNames.delivery(userId));
                logDeliverySocket('Auto-joined delivery room on connect', {
                    socketId: socket.id,
                    deliveryPartnerId: String(userId),
                    room: roomNames.delivery(userId),
                });
            }
        }

        // Explicit join (used by existing restaurant client hook).
        socket.on('join-restaurant', (restaurantId) => {
            if (socket.user?.role !== 'RESTAURANT') return;
            // Security: only join your own restaurant room.
            if (String(socket.user?.userId) !== String(restaurantId)) return;
            socket.join(roomNames.restaurant(restaurantId));
            socket.emit('restaurant-room-joined', { room: roomNames.restaurant(restaurantId), restaurantId: String(restaurantId) });
        });

        // Explicit join (used by existing delivery client hook).
        socket.on('join-delivery', (deliveryPartnerId) => {
            if (socket.user?.role !== 'DELIVERY_PARTNER') {
                logDeliverySocket('Rejected join-delivery for non-delivery role', {
                    socketId: socket.id,
                    role: socket.user?.role || 'UNKNOWN',
                    requestedDeliveryPartnerId: String(deliveryPartnerId || ''),
                });
                return;
            }
            // Security: only join your own delivery room.
            if (String(socket.user?.userId) !== String(deliveryPartnerId)) {
                logDeliverySocket('Rejected join-delivery due to user mismatch', {
                    socketId: socket.id,
                    authDeliveryPartnerId: String(socket.user?.userId || ''),
                    requestedDeliveryPartnerId: String(deliveryPartnerId || ''),
                });
                return;
            }
            const room = roomNames.delivery(deliveryPartnerId);
            socket.join(room);
            const roomSize = io?.sockets?.adapter?.rooms?.get(room)?.size || 0;
            logDeliverySocket('Delivery room joined', {
                socketId: socket.id,
                deliveryPartnerId: String(deliveryPartnerId),
                room,
                roomSize,
            });
            socket.emit('delivery-room-joined', { room, deliveryPartnerId: String(deliveryPartnerId) });
        });

        // ─── Live Tracking Events ───────────────────────────────────────

        // Users / restaurants subscribe to an order's real-time tracking room.
        // Only the order's own customer, restaurant or assigned rider may join:
        // any signed-in account used to be able to watch any order's rider live.
        socket.on('join-tracking', async (orderId) => {
            if (!orderId || typeof orderId !== 'string' && typeof orderId !== 'number') return;
            const role = socket.user?.role;
            if (role !== 'USER' && role !== 'RESTAURANT' && role !== 'DELIVERY_PARTNER') return;
            try {
                const order = await findOrderForSocket(orderId);
                if (!isOrderParty(order, role, userId)) {
                    logger.warn(`Socket ${socket.id} (${role}:${userId}) refused tracking room for ${orderId}`);
                    return;
                }
            } catch (err) {
                logger.error(`join-tracking lookup failed for ${orderId}: ${err.message}`);
                return;
            }
            const room = roomNames.tracking(orderId);
            socket.join(room);
            logger.info(`Socket ${socket.id} (${role}:${userId}) joined tracking room ${room}`);
            socket.emit('tracking-room-joined', { room, orderId: String(orderId) });
        });

        // Delivery partner emits live GPS location for an active order.
        // Broadcasts to the tracking room so users see the bike move in real time.
        const _lastLocationBroadcast = {};
        // orderKey -> { order, checkedAt }: the assignment check runs once per
        // order per 30 s, not on every GPS tick.
        const _assignedOrderCache = new Map();
        const ASSIGNMENT_CACHE_MS = 30_000;
        const resolveAssignedOrder = async (orderKey) => {
            const cacheKey = String(orderKey);
            const cached = _assignedOrderCache.get(cacheKey);
            if (cached && Date.now() - cached.checkedAt < ASSIGNMENT_CACHE_MS) return cached.order;
            const order = await findOrderForSocket(cacheKey);
            const assigned = isOrderParty(order, 'DELIVERY_PARTNER', userId) ? order : null;
            _assignedOrderCache.set(cacheKey, { order: assigned, checkedAt: Date.now() });
            return assigned;
        };

        socket.on('update-location', async (data) => {
            if (socket.user?.role !== 'DELIVERY_PARTNER') return;
            if (!data || !data.orderId) return;
            if (typeof data.orderId !== 'string' && typeof data.orderId !== 'number') return;

            /*
             * Only the rider assigned to this order may report its location.
             * Any delivery partner used to be able to post a position for any
             * order, push it into any user:/restaurant: room named in the
             * payload, and overwrite the order's RTDB node including its status.
             * The customer and restaurant now come from the order itself.
             */
            let assignedOrder = null;
            try {
                assignedOrder = await resolveAssignedOrder(data.orderId);
            } catch (err) {
                logger.error(`update-location lookup failed for ${data.orderId}: ${err.message}`);
                return;
            }
            if (!assignedOrder) return;
            const orderUserId = resolveRoomOwnerId(assignedOrder.userId);
            const orderRestaurantId = resolveRoomOwnerId(assignedOrder.restaurantId);

            const lat = Number(data.lat);
            const lng = Number(data.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

            const heading = Number.isFinite(Number(data.heading)) ? Number(data.heading) : 0;
            const speed = Number.isFinite(Number(data.speed)) ? Number(data.speed) : 0;
            const accuracy = Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : null;

            // Throttle: max one broadcast per 2s per orderId
            const now = Date.now();
            const lastTS = _lastLocationBroadcast[data.orderId] || 0;
            if (now - lastTS < 2000) return;
            _lastLocationBroadcast[data.orderId] = now;

            const payload = {
                orderId: String(data.orderId),
                deliveryPartnerId: String(userId),
                lat,
                lng,
                boy_lat: lat, // Add boy_lat/lng for compatibility
                boy_lng: lng,
                riderLocation: [lat, lng], // Add array format for safety
                heading,
                speed,
                accuracy,
                timestamp: now
            };

            logDeliverySocket('Location update received', {
                socketId: socket.id,
                deliveryPartnerId: String(userId),
                orderId: String(data.orderId),
                lat,
                lng,
                status: 'on_the_way',
            });

            // Broadcast to tracking room (all users + driver watching this order)
            const trackingRoom = roomNames.tracking(data.orderId);
            io.to(trackingRoom).emit('location-update', payload);

            // The order's own customer and restaurant, never ids from the payload.
            if (orderUserId) {
                socket.to(roomNames.user(orderUserId)).emit('location-update', payload);
            }

            if (orderRestaurantId) {
                socket.to(roomNames.restaurant(orderRestaurantId)).emit('location-update', payload);
            }

            // ─── Scalable Persistence (BullMQ + Redis "Hot" Buffering) ───
            try {
                const { getTrackingQueue } = await import('../queues/index.js');
                const { getRedisClient } = await import('../config/redis.js');
                const trackingQueue = getTrackingQueue();
                const redis = getRedisClient();

                if (trackingQueue && redis) {
                    const coordString = JSON.stringify({ lat, lng, timestamp: now });

                    // 1. Immediately buffer the newest location in high-speed Redis Hash (HOT storage)
                    await Promise.all([
                        redis.hSet('rider:locations:hot', String(userId), coordString),
                        redis.hSet('order:locations:hot', String(data.orderId), coordString)
                    ]);

                    // 2. Schedule a deferred MongoDB write (COLD storage)
                    // jobId debulks updates: if a job is already waiting, BullMQ ignores the new add()
                    // Delay (30s) ensures we don't spam MongoDB while the rider is moving fast
                    const syncJobId = `sync:loc:${data.orderId}`;
                    trackingQueue.add('sync-hot-locations',
                        { userId, orderId: data.orderId },
                        { jobId: syncJobId, delay: 30000, removeOnComplete: true }
                    ).catch(e => logger.error(`BullMQ sync schedule failed: ${e.message}`));
                }
            } catch (err) {
                logger.error(`Real-time persistence layer error: ${err.message}`);
            }

            // ─── Firebase Realtime Database Sync (Cost Optimization) ───
            try {
                const db = getFirebaseDB();
                if (db) {
                    // 1. Update order-specific tracking node
                    const orderRef = db.ref(`active_orders/${data.orderId}`);
                    orderRef.update({
                        lat,
                        lng,
                        boy_lat: lat,
                        boy_lng: lng,
                        heading,
                        speed,
                        accuracy,
                        last_updated: now,
                        // Fixed, not client-supplied: a location ping is never
                        // a status change (riders always sent this value).
                        status: 'on_the_way'
                    }).catch(e => logger.error(`Firebase orderRef update error: ${e.message}`));

                    // 2. Update global delivery boy status node
                    const boyRef = db.ref(`delivery_boys/${userId}`);
                    boyRef.update({
                        lat,
                        lng,
                        accuracy,
                        last_updated: now,
                        status: 'online'
                    }).catch(e => logger.error(`Firebase boyRef update error: ${e.message}`));
                }
            } catch (err) {
                // Silently skip if Firebase not initialized yet
                logger.debug(`Firebase RTDB sync skipped: ${err.message}`);
            }
        });

        // Leave tracking room on user navigation away.
        socket.on('leave-tracking', (orderId) => {
            if (!orderId) return;
            const room = roomNames.tracking(orderId);
            socket.leave(room);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket client disconnected: ${socket.id}`);
            if (role === 'DELIVERY_PARTNER') {
                logDeliverySocket('Delivery socket disconnected', {
                    socketId: socket.id,
                    deliveryPartnerId: String(userId || ''),
                });
            }
        });

        // 🆕 Resync State on Reconnect
        socket.on('resync', async () => {
            try {
                if (role === 'DELIVERY_PARTNER') {
                    logDeliverySocket('Resync requested', {
                        socketId: socket.id,
                        deliveryPartnerId: String(userId || ''),
                    });
                }
                const { resyncState } = await import('../modules/food/orders/services/order.service.js');
                const state = await resyncState(userId, role);
                if (state.activeOrder) {
                    const eventName = role === 'USER' ? 'order_state' : 'active_order';
                    socket.emit(eventName, state.activeOrder);
                    if (role === 'DELIVERY_PARTNER') {
                        logDeliverySocket('Resync emitted active order', {
                            socketId: socket.id,
                            deliveryPartnerId: String(userId || ''),
                            orderId: String(
                                state.activeOrder?.orderId ||
                                state.activeOrder?.orderMongoId ||
                                ''
                            ),
                            eventName,
                        });
                    }

                    // Re-emit OTP if user is in drop phase
                    if (role === 'USER' && state.activeOrder.handoverOtp) {
                        socket.emit('delivery_drop_otp', {
                            orderId: state.activeOrder.orderId,
                            otp: state.activeOrder.handoverOtp,
                            message: 'Share this OTP with your delivery partner.'
                        });
                    }
                }
                socket.emit('resync_complete', { timestamp: Date.now() });
                if (role === 'DELIVERY_PARTNER') {
                    logDeliverySocket('Resync complete', {
                        socketId: socket.id,
                        deliveryPartnerId: String(userId || ''),
                        hasActiveOrder: Boolean(state.activeOrder),
                    });
                }
            } catch (err) {
                logger.error(`Resync failed for ${role}:${userId} — ${err.message}`);
            }
        });
    });

    try {
        const { registerTaxiSocketIntegration } = await import('../modules/taxi/socket/index.js');
        const { restoreScheduledDispatches } = await import('../modules/taxi/services/dispatchService.js');
        registerTaxiSocketIntegration(io);
        restoreScheduledDispatches().catch((err) => {
            logger.error(`Taxi scheduled dispatch restore failed: ${err.message}`);
        });
        logger.info('Taxi Socket.IO handlers registered');
    } catch (err) {
        logger.error(`Taxi Socket.IO integration failed: ${err.message}`);
    }

    logger.info('Socket.IO infrastructure initialized');
    return io;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server | null}
 */
export const getIO = () => {
    if (!io) {
        logger.warn('Socket.IO not initialized');
    }
    return io;
};

export const rooms = roomNames;
