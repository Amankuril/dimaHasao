import { API_ORIGIN } from '../../api/client';

/*
 * Web: shared/utils/socketOrigin.js. In production the socket is served from
 * the site's own origin (the proxy routes /socket.io to the realtime port).
 */
export const getSocketOrigin = () => (process.env.EXPO_PUBLIC_SOCKET_URL || API_ORIGIN).replace(/\/+$/, '');
export const resolveSocketOrigin = getSocketOrigin;
export default getSocketOrigin;