import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import IncomingRideRequest from '../screens/IncomingRideRequest';
import api from '../api/client';
import { socketService } from '../api/socket';
import { getLocalDriverToken } from '../services/registrationService';
import { useNavigate } from '../../lib/webRouter';
import { getCurrentCoords } from '../utils/driverLocation';
import {
  DEFAULT_MAP_COORDS,
  buildRideRequest,
  isScheduledRideForFuture,
  mergeBiddingUpdate,
  unwrapApiPayload,
  withDriverAuthorization,
} from '../utils/driverRideJobs';
import { playRideRequestAlertSound, stopRideRequestAlertSound } from '../utils/rideRequestAlertSound';

/*
 * Web: Taxi/modules/driver/components/DriverRideRequestListener.jsx. Mounted by DriverShell for approved drivers; it is
 * silent on the home / active-trip / onboarding screens (DriverHome runs its own request handling).
 */
const ignoredRoutes = new Set([
  '/taxi/driver/home',
  '/taxi/driver/dashboard',
  '/taxi/driver/active-trip',
  '/taxi/driver/login',
  '/taxi/driver/reg-phone',
  '/taxi/driver/otp-verify',
  '/taxi/driver/step-personal',
  '/taxi/driver/step-vehicle',
  '/taxi/driver/step-documents',
  '/taxi/driver/registration-status',
  '/taxi/driver/status',
]);

const isIgnoredRoute = (pathname = '') => ignoredRoutes.has(pathname) || pathname.startsWith('/taxi/driver/role-signup/bus-builder');

const getCoordsOrDefault = () => getCurrentCoords().catch(() => DEFAULT_MAP_COORDS);

const DriverRideRequestListener = () => {
  const pathname = usePathname();
  const navigate = useNavigate();
  const [currentRequest, setCurrentRequest] = useState(null);
  const [acceptingRideId, setAcceptingRideId] = useState('');
  const acceptingRideIdRef = useRef('');
  const requestRef = useRef(null);
  const activeOnRoute = !isIgnoredRoute(pathname);

  useEffect(() => {
    requestRef.current = currentRequest;
  }, [currentRequest]);

  const fetchActiveJob = useCallback(async () => {
    const driverToken = getLocalDriverToken();
    const response = await api.get('/rides/active/me', {
      ...withDriverAuthorization(driverToken),
      params: { t: Date.now(), type: 'ride' },
    });
    return unwrapApiPayload(response);
  }, []);

  useEffect(() => {
    if (!activeOnRoute) {
      stopRideRequestAlertSound();
      setCurrentRequest(null);
      acceptingRideIdRef.current = '';
      setAcceptingRideId('');
      return undefined;
    }

    const socket = socketService.connect({ role: 'driver' });

    if (!socket) {
      return undefined;
    }

    const onRideRequest = (data) => {
      const request = buildRideRequest(data, {
        attempt: data.attempt,
        maxAttempts: data.maxAttempts,
        requestExpiresAt: data.requestExpiresAt || null,
        customer: data.user || null,
      });

      setCurrentRequest(request);
      playRideRequestAlertSound({ fare: request.fare, pickup: request.pickup });
    };

    const onRideRequestClosed = ({ rideId }) => {
      if (acceptingRideIdRef.current && acceptingRideIdRef.current === rideId) return;

      const activeRequest = requestRef.current;
      if (!activeRequest?.rideId || activeRequest.rideId === rideId) {
        stopRideRequestAlertSound();
        setCurrentRequest(null);
      }
    };

    const onSocketError = ({ message } = {}) => {
      if (String(message || '').toLowerCase().includes('no longer available')) {
        stopRideRequestAlertSound();
        setCurrentRequest(null);
      }
      acceptingRideIdRef.current = '';
      setAcceptingRideId('');
    };

    const onRideBidSubmitted = ({ rideId }) => {
      if (!rideId || rideId !== acceptingRideIdRef.current) return;
      setAcceptingRideId('');
    };

    const onRideBiddingUpdated = (payload = {}) => {
      if (!payload?.rideId) return;
      setCurrentRequest((current) => mergeBiddingUpdate(current, payload));
    };

    const openAcceptedRide = async (payload) => {
      if (!payload?.rideId || payload.rideId !== acceptingRideIdRef.current) return;

      stopRideRequestAlertSound();
      const activeRequest = requestRef.current;
      const nextType = activeRequest?.type || 'ride';
      const scheduledAt = activeRequest?.raw?.scheduledAt || payload?.scheduledAt || null;
      let currentJob = null;
      let currentDriverCoords = null;

      try {
        [currentJob, currentDriverCoords] = await Promise.all([
          fetchActiveJob(nextType).catch(() => null),
          getCoordsOrDefault(),
        ]);
      } catch {
        currentJob = null;
      }

      setCurrentRequest(null);
      acceptingRideIdRef.current = '';
      setAcceptingRideId('');
      if (isScheduledRideForFuture(scheduledAt)) {
        return;
      }
      navigate('/taxi/driver/active-trip', {
        state: {
          type: nextType,
          rideId: currentJob?.rideId || payload.rideId,
          otp: currentJob?.otp || payload?.otp || activeRequest?.raw?.otp || '',
          request: {
            ...activeRequest,
            rideId: currentJob?.rideId || payload.rideId,
            otp: currentJob?.otp || payload?.otp || activeRequest?.raw?.otp || '',
            raw: currentJob || {
              ...(activeRequest?.raw || {}),
              otp: payload?.otp || activeRequest?.raw?.otp || '',
              status: payload.status,
              liveStatus: payload.liveStatus,
              acceptedAt: payload.acceptedAt,
            },
          },
          currentDriverCoords,
        },
      });
    };

    socketService.on('rideRequest', onRideRequest);
    socketService.on('rideRequestClosed', onRideRequestClosed);
    socketService.on('errorMessage', onSocketError);
    socketService.on('rideAccepted', openAcceptedRide);
    socketService.on('rideBidSubmitted', onRideBidSubmitted);
    socketService.on('rideBiddingUpdated', onRideBiddingUpdated);

    return () => {
      socketService.off('rideRequest', onRideRequest);
      socketService.off('rideRequestClosed', onRideRequestClosed);
      socketService.off('errorMessage', onSocketError);
      socketService.off('rideAccepted', openAcceptedRide);
      socketService.off('rideBidSubmitted', onRideBidSubmitted);
      socketService.off('rideBiddingUpdated', onRideBiddingUpdated);
    };
  }, [activeOnRoute, fetchActiveJob, navigate]);

  const handleAccept = useCallback(() => {
    if (!currentRequest?.rideId || acceptingRideId) return;

    acceptingRideIdRef.current = currentRequest.rideId;
    setAcceptingRideId(currentRequest.rideId);
    stopRideRequestAlertSound();
    socketService.emit('acceptRide', { rideId: currentRequest.rideId });
  }, [acceptingRideId, currentRequest]);

  const handleDecline = useCallback(() => {
    if (currentRequest?.rideId) {
      socketService.emit('rejectRide', { rideId: currentRequest.rideId });
    }
    stopRideRequestAlertSound();
    setCurrentRequest(null);
  }, [currentRequest]);

  const handleSubmitBid = useCallback((bidFare) => {
    if (!currentRequest?.rideId || acceptingRideId || currentRequest?.raw?.pricingNegotiationMode !== 'driver_bid') return;

    acceptingRideIdRef.current = currentRequest.rideId;
    setAcceptingRideId(currentRequest.rideId);
    stopRideRequestAlertSound();
    socketService.emit('submitRideBid', { rideId: currentRequest.rideId, bidFare });
  }, [acceptingRideId, currentRequest]);

  return (
    <IncomingRideRequest
      visible={activeOnRoute && Boolean(currentRequest)}
      requestData={currentRequest}
      isAccepting={Boolean(acceptingRideId)}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onSubmitBid={handleSubmitBid}
    />
  );
};

export default DriverRideRequestListener;
