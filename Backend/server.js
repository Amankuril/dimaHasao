import http from 'http';
import crypto from 'crypto';
import { exec } from 'child_process';

import app from './src/app.js';
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis } from './src/config/redis.js';
import { initSocket } from './src/config/socket.js';
import { initializeQueues, closeBullMQConnection } from './src/queues/index.js';
import { expireExpiredOffers } from './src/modules/food/admin/services/admin.service.js';
import { syncExpiredFssaiNotifications } from './src/modules/food/restaurant/services/fssaiExpiry.service.js';

import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let server = null;
let socketServer = null;
let expireOffersInterval = null;
let fssaiExpiryInterval = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    if (!server) {
        process.exit(0);
        return;
    }
    // Stop accepting new sockets alongside the API.
    if (socketServer) socketServer.close();

    server.close(async () => {
        try {
            await disconnectDB();
            await closeRedis();
            await closeBullMQConnection();
            if (expireOffersInterval) clearInterval(expireOffersInterval);
            if (fssaiExpiryInterval) clearInterval(fssaiExpiryInterval);
            logger.info('Graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error(`Shutdown error: ${err.message}`);
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger.error('Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startServer = async () => {
    try {
        validateConfig();
        initializeFirebaseRealtime();

        // 1. Connect to Database (MongoDB)
        await connectDB();

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // 3. Socket.IO gets its own HTTP server on its own port, so realtime
        //    traffic can be proxied, scaled and rate-limited separately from
        //    the REST API. Same process, so every emit from a controller still
        //    reaches the same `io` instance with no cross-process adapter.
        socketServer = http.createServer((req, res) => {
            // Anything that is not a Socket.IO handshake gets a plain health
            // response rather than a confusing 404 from a bare server.
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ service: 'socket.io', status: 'ok' }));
        });
        await initSocket(socketServer);

        if (config.redisEnabled) {
            await connectRedis();
        }

        // 5a. Watchdog: Recover stuck orders from previous run
        try {
            const { recoverStuckOrders } = await import('./src/modules/food/orders/services/order.service.js');
            await recoverStuckOrders();
        } catch (err) {
            logger.error(`Watchdog startup error: ${err.message}`);
        }

        // 5. Conditionally initialize BullMQ queues.
        // BullMQ requires Redis; skip queue bootstrap when Redis is disabled.
        if (config.bullmqEnabled && config.redisEnabled) {
            try {
                initializeQueues();
            } catch (err) {
                logger.error(`BullMQ initialization error (server continues): ${err.message}`);
            }
        } else if (config.bullmqEnabled && !config.redisEnabled) {
            logger.warn('BullMQ is enabled but Redis is disabled. Queue initialization skipped.');
        }

        app.post('/api/deploy', (req, res) => {
            const signature = req.headers['x-hub-signature-256'];
            const secret = 'mysecret123';

            const hash = 'sha256=' + crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== hash) {
                return res.status(403).send('Unauthorized');
            }

            exec('cd ~ && ./deploy.sh', (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    return res.send('Deploy failed');
                }

                console.log(stdout);
                res.send('Deploy success');
            });
        });

        // 6. Start the HTTP server

        server = httpServer.listen(config.port, config.host, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on ${config.host}:${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });

        socketServer.listen(config.socketPort, config.host, () => {
            logger.info(`Socket.IO listening on ${config.host}:${config.socketPort}`);
            console.log(`🔌 [SOCKET] http://localhost:${config.socketPort}`);
        });

        socketServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Socket port ${config.socketPort} is already in use. Set SOCKET_PORT to a free port.`);
            } else {
                logger.error(`Socket server error: ${err.message}`);
            }
            process.exit(1);
        });

        const runExpire = async () => {
            try {
                await expireExpiredOffers();
            } catch (err) {
                logger.error(`Expire offers error: ${err.message}`);
            }
        };
        runExpire();
        expireOffersInterval = setInterval(runExpire, 5 * 60 * 1000);

        const runFssaiExpirySync = async () => {
            try {
                await syncExpiredFssaiNotifications();
            } catch (err) {
                logger.error(`FSSAI expiry sync error: ${err.message}`);
            }
        };
        runFssaiExpirySync();
        fssaiExpiryInterval = setInterval(runFssaiExpirySync, 60 * 60 * 1000);

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use. Please kill the process or use a different port.`);
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                if (server) server.close(() => process.exit(1));
                else process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

