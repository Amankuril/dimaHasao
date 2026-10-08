/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/safety/SafetyCenter.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { GMap, Marker, toLatLng } from '../../../../../components/maps';
import {
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Clock,
  Globe,
  History,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Paperclip,
  Mic,
  User as UserIcon,
  Send,
  Activity,
  Shield,
  Car,
  RefreshCw,
} from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { socketService } from '../../../../shared/api/socket';
import { adminService } from '../../services/adminService';
import { HAS_VALID_GOOGLE_MAPS_KEY, DISTRICT_CENTER, useBaseGoogleMapsLoader } from '../../utils/googleMaps';
import { getChatSession } from '../../../shared/chat/chatIdentity';
import { Button, Div, Input, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  StatusBadge,
  LoadingState,
  EmptyState,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  useLayoutWidth,
} from '../../../../../admin/ui';

const formatRelativeTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};
const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};
const getParticipantTitle = (alert) => (alert?.sourceApp === 'driver' ? alert?.driverName || 'Driver' : alert?.riderName || 'Passenger');
const getMapCenter = (alert) =>
  Number.isFinite(Number(alert?.location?.lat)) && Number.isFinite(Number(alert?.location?.lng))
    ? {
        lat: Number(alert.location.lat),
        lng: Number(alert.location.lng),
      }
    : DISTRICT_CENTER;

// -------------- SUB-COMPONENTS -------------- //

const FactCell = ({ label, value }) => (
  <Div className="gap-0.5">
    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
    <Span className="text-sm text-slate-900" numberOfLines={1}>
      {value}
    </Span>
  </Div>
);

const IncidentCard = ({ alert, isActive, onClick }) => (
  <Button
    onClick={onClick}
    accessibilityLabel={`Open incident for ${getParticipantTitle(alert)}`}
    className={`p-3 rounded-lg border gap-2 ${isActive ? 'border-blue-600 bg-blue-100' : 'border-slate-200 bg-white'}`}
  >
    <Div className="flex-row items-start justify-between gap-2">
      <Div className="flex-row items-center gap-2 flex-1 min-w-0">
        <Div className={`w-9 h-9 rounded-full items-center justify-center shrink-0 ${isActive ? 'bg-white' : 'bg-slate-100'}`}>
          <UiIcon as={UserIcon} size={16} className="text-slate-600" />
        </Div>
        <Div className="flex-1 min-w-0">
          <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
            {getParticipantTitle(alert)}
          </Span>
          <Span className="text-xs text-slate-500" numberOfLines={1}>
            ID: {alert?.driverId?.slice(-6) || alert?.userId?.slice(-6) || 'Unknown'}
          </Span>
        </Div>
      </Div>
      <StatusBadge tone="danger" label="Prio-1" />
    </Div>

    <Div className="flex-row gap-2">
      <Div className="flex-1 min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2">
        <FactCell label="Vehicle" value={alert?.vehicleLabel || 'N/A'} />
      </Div>
      <Div className="flex-1 min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2">
        <FactCell label="Passenger" value={alert?.riderName || 'None'} />
      </Div>
    </Div>

    <Div className="gap-1 pt-2 border-t border-slate-100">
      <Div className="flex-row items-center gap-1.5">
        <UiIcon as={Clock} size={12} className="text-slate-400" />
        <Span className="text-xs text-slate-600 flex-1" numberOfLines={1}>
          {formatRelativeTime(alert?.createdAt)}
        </Span>
      </Div>
      <Div className="flex-row items-center gap-1.5">
        <UiIcon as={MapPin} size={12} className="text-red-600" />
        <Span className="text-xs text-slate-600 flex-1" numberOfLines={2}>
          {alert?.locationLabel || alert?.pickupAddress || 'Locating…'}
        </Span>
      </Div>
    </Div>
  </Button>
);

const AdminSosChat = ({ alert }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesRef = useRef(null);
  const scrollToBottom = () => {
    messagesRef.current?.scrollToEnd({ animated: true });
  };
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: 'Distress signal received. Open communication channel established.',
        sender: 'system',
        time: new Date(),
      },
    ]);
  }, [alert]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSend = () => {
    // Disabled as per no API requirement. Handled by button disabled state.
  };
  return (
    <Card padded={false}>
      <Div className="px-4 py-3 border-b border-slate-200">
        <Span className="text-base font-semibold text-slate-900">Live Support Chat</Span>
        <Div className="flex-row items-center gap-1.5 mt-0.5">
          <Div className="w-2 h-2 rounded-full bg-green-600" />
          <Span className="text-xs text-slate-500">{getParticipantTitle(alert)} online</Span>
        </Div>
      </Div>

      <ScrollDiv ref={messagesRef} className="max-h-60" contentClassName="p-3 gap-2">
        {messages.map((msg) => (
          <Div key={msg.id} className={msg.sender === 'admin' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}>
            {msg.sender === 'system' ? (
              <Div className="bg-slate-100 px-3 py-1.5 rounded-full">
                <Span className="text-xs text-slate-600 text-center">{msg.text}</Span>
              </Div>
            ) : (
              <Div className={`max-w-[85%] rounded-lg p-2.5 ${msg.sender === 'admin' ? 'bg-blue-600' : 'bg-slate-50 border border-slate-200'}`}>
                <Span className={`text-sm ${msg.sender === 'admin' ? 'text-white' : 'text-slate-800'}`}>{msg.text}</Span>
                <Div className="flex-row items-center gap-1 mt-1">
                  <Span className={`text-xs ${msg.sender === 'admin' ? 'text-white' : 'text-slate-500'}`}>
                    {msg.time.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Span>
                  {msg.sender === 'admin' ? <UiIcon as={CheckCheck} size={12} className="text-white" /> : null}
                </Div>
              </Div>
            )}
          </Div>
        ))}
      </ScrollDiv>

      <Div className="p-2 border-t border-slate-200 flex-row items-center gap-2">
        <Button disabled accessibilityLabel="Attach a file" className="w-11 h-11 items-center justify-center rounded-lg opacity-40">
          <UiIcon as={Paperclip} size={18} className="text-slate-400" />
        </Button>
        <Input
          type="text"
          placeholder="Chat API unavailable"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled
          className="flex-1 h-11 px-3 rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-500"
        />
        <Button disabled accessibilityLabel="Record a voice note" className="w-11 h-11 items-center justify-center rounded-lg opacity-40">
          <UiIcon as={Mic} size={18} className="text-slate-400" />
        </Button>
        <Button disabled onClick={handleSend} accessibilityLabel="Send" className="w-11 h-11 items-center justify-center rounded-lg bg-slate-100 opacity-40">
          <UiIcon as={Send} size={18} className="text-slate-400" />
        </Button>
      </Div>
    </Card>
  );
};

// -------------- MAIN COMPONENT -------------- //

const SafetyCenter = () => {
  const { isLoaded, loadError } = useBaseGoogleMapsLoader();
  const { tablet } = useLayoutWidth();
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    resolved: 0,
    escalated: 0,
    connectedAgents: 1,
  });
  const selectedAlert = useMemo(() => alerts.find((entry) => entry.id === selectedAlertId) || alerts[0] || null, [alerts, selectedAlertId]);
  const adminSession = useMemo(() => getChatSession('admin'), []);
  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await adminService.getSafetyAlerts({
        status: 'active',
        limit: 50,
      });
      const results = response?.data?.data?.results || response?.data?.results || [];
      setAlerts(results);
      setSelectedAlertId((current) => current || results[0]?.id || '');
      adminService
        .getDashboardData()
        .then((dashRes) => {
          if (dashRes?.data?.notifiedSos) {
            setDashboardStats((prev) => ({
              ...prev,
              resolved: dashRes.data.notifiedSos.closed || 0,
            }));
          }
        })
        .catch(() => {});
    } catch (error) {
      console.error('Failed to load safety alerts:', error);
      toast.error(error?.message || 'Terminal: SOS Sync Failed');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadAlerts();
  }, []);
  useEffect(() => {
    const handleNewAlert = (payload = {}) => {
      setAlerts((current) => [payload, ...current.filter((item) => item.id !== payload.id)]);
      setSelectedAlertId((current) => current || payload.id || '');
      toast.error(`Emergency: ${getParticipantTitle(payload)} triggered SOS`, {
        duration: 5000,
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: 'bold',
        },
      });
    };
    const handleUpdatedAlert = (payload = {}) => {
      setAlerts((current) =>
        current.map((item) => (item.id === payload.id ? payload : item)).filter((item) => String(item.status || '').toLowerCase() !== 'resolved'),
      );
      setSelectedAlertId((current) => (current === payload.id ? '' : current));
    };
    socketService.on('new_sos', handleNewAlert);
    socketService.on('safety:alert:new', handleNewAlert);
    socketService.on('safety:alert:updated', handleUpdatedAlert);
    return () => {
      socketService.off('new_sos', handleNewAlert);
      socketService.off('safety:alert:new', handleNewAlert);
      socketService.off('safety:alert:updated', handleUpdatedAlert);
    };
  }, []);
  const handleResolve = async () => {
    if (!selectedAlert?.id) return;
    setIsResolving(true);
    try {
      await adminService.resolveSafetyAlert(selectedAlert.id, 'Resolved via terminal');
      setAlerts((current) => current.filter((item) => item.id !== selectedAlert.id));
      setSelectedAlertId('');
      setDashboardStats((prev) => ({
        ...prev,
        resolved: prev.resolved + 1,
      }));
      toast.success('Incident closed successfully');
    } catch (error) {
      console.error('Failed to resolve safety alert:', error);
      toast.error(error?.message || 'Resolution failed');
    } finally {
      setIsResolving(false);
    }
  };
  const mapMarkers = useMemo(() => {
    if (!selectedAlert) return [];
    return [
      {
        id: 'incident',
        pos: getMapCenter(selectedAlert),
        type: 'Incident Location',
        color: '#E11D48',
        icon: Car,
      },
    ];
  }, [selectedAlert]);
  const timeline = useMemo(() => {
    if (!selectedAlert) return [];
    return [
      {
        time: new Date(selectedAlert.createdAt),
        label: 'SOS Signal Triggered',
      },
    ];
  }, [selectedAlert]);
  const contextCols = tablet ? 3 : 2;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={ShieldAlert}
        title="Safety Center"
        subtitle="Live SOS signals from riders and drivers"
        breadcrumb={[{ label: 'Safety' }, { label: 'Safety Center' }]}
      />

      <StatGrid className="mb-4">
        <StatCard label="Active SOS" value={alerts.length} icon={AlertCircle} tone={alerts.length > 0 ? 'danger' : 'neutral'} />
        <StatCard label="Resolved Today" value={dashboardStats.resolved} icon={CheckCircle2} tone="success" />
        <StatCard label="High Priority" value={alerts.length} icon={ShieldAlert} tone={alerts.length > 0 ? 'danger' : 'neutral'} />
        <StatCard label="Escalated" value={dashboardStats.escalated} icon={History} tone="warning" />
        <StatCard label="Avg Response" value="< 30s" icon={Activity} tone="info" />
        <StatCard label="Agents" value={dashboardStats.connectedAgents} icon={UserIcon} tone="info" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Div className="flex-row items-center gap-2">
              <StatusBadge tone={alerts.length > 0 ? 'danger' : 'neutral'} label={`${alerts.length}`} />
              <Button onClick={loadAlerts} accessibilityLabel="Refresh incidents" className="w-11 h-11 items-center justify-center rounded-lg">
                {isLoading ? <ActivityIndicator size="small" color="#155DFC" /> : <UiIcon as={RefreshCw} size={18} className="text-slate-500" />}
              </Button>
            </Div>
          }
        >
          Active Incidents
        </SectionTitle>

        {isLoading ? (
          <LoadingState label="Syncing SOS signals…" className="border-0" />
        ) : alerts.length === 0 ? (
          <EmptyState icon={Shield} title="All clear" message="No active distress signals." className="border-0" />
        ) : (
          <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
            {alerts.map((alert) => (
              <IncidentCard key={alert.id} alert={alert} isActive={selectedAlert?.id === alert.id} onClick={() => setSelectedAlertId(alert.id)} />
            ))}
          </Div>
        )}
      </Card>

      {selectedAlert ? (
        <>
          <Card className="mb-4">
            <SectionTitle>SOS Details</SectionTitle>
            <Div className="flex-row flex-wrap items-center gap-2 mb-3">
              <Div className="flex-row items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5">
                <UiIcon as={Clock} size={12} className="text-slate-400" />
                <Span className="text-xs text-slate-600">{formatDateTime(selectedAlert.createdAt)}</Span>
              </Div>
              <Div className="flex-row items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1.5 flex-1 min-w-[160px]">
                <UiIcon as={MapPin} size={12} className="text-red-600" />
                <Span className="text-xs text-slate-600 flex-1" numberOfLines={1}>
                  {selectedAlert.locationLabel || selectedAlert.pickupAddress || 'GPS Active'}
                </Span>
              </Div>
            </Div>

            <Toolbar className="mb-0">
              <Button onClick={() => window.open('tel:100', '_self')} className={`${BTN_DANGER} flex-1 min-w-[150px]`}>
                <UiIcon as={PhoneCall} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Emergency</Span>
              </Button>
              <Button onClick={handleResolve} disabled={isResolving} className={`${BTN_PRIMARY} flex-1 min-w-[150px] ${isResolving ? 'opacity-50' : ''}`}>
                {isResolving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UiIcon as={CheckCircle2} size={16} className="text-white" />}
                <Span className={BTN_TEXT_PRIMARY}>{isResolving ? 'Closing…' : 'Close Incident'}</Span>
              </Button>
            </Toolbar>
          </Card>

          <Card padded={false} className="mb-4 overflow-hidden">
            <Div className="h-64">
              {loadError ? (
                <Div className="flex-1 items-center justify-center bg-slate-50 p-6 gap-2">
                  <UiIcon as={Globe} size={24} className="text-slate-400" />
                  <Span className="text-sm font-semibold text-slate-900">Map unavailable</Span>
                </Div>
              ) : HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
                <GMap
                  className="w-full h-full"
                  region={{
                    ...toLatLng(getMapCenter(selectedAlert)),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  zoomControlEnabled
                >
                  {mapMarkers.map((m) => (
                    <Marker key={m.id} coordinate={toLatLng(m.pos)} pinColor={m.color} />
                  ))}
                </GMap>
              ) : (
                <Div className="flex-1 items-center justify-center bg-slate-50 gap-2">
                  <ActivityIndicator size="small" color="#155DFC" />
                  <Span className="text-sm text-slate-500">Loading map…</Span>
                </Div>
              )}
            </Div>
          </Card>

          <Card className="mb-4">
            <SectionTitle>Distress Context</SectionTitle>
            <Div className={`grid grid-cols-${contextCols} gap-3`}>
              <FactCell label="Driver ID" value={selectedAlert?.driverId?.slice(-8) || 'N/A'} />
              <FactCell label="User ID" value={selectedAlert?.userId?.slice(-8) || 'N/A'} />
              <FactCell label="Ride ID" value={selectedAlert?.rideId?.slice(-8) || selectedAlert?.tripCode || 'N/A'} />
              <FactCell label="Contact" value={selectedAlert?.emergencyContact || 'Unavailable'} />
            </Div>
          </Card>

          <Div className="mb-4">
            <AdminSosChat alert={selectedAlert} />
          </Div>

          <Card>
            <SectionTitle>Activity Log</SectionTitle>
            <Div className="gap-3">
              {timeline.map((event, idx) => (
                <Div key={idx} className="flex-row gap-3">
                  <Div className="items-center">
                    <Div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-red-600' : 'bg-slate-400'}`} />
                    {idx !== timeline.length - 1 ? <Div className="w-px flex-1 bg-slate-200 my-1" /> : null}
                  </Div>
                  <Div className="flex-1 min-w-0">
                    <Span className="text-sm font-medium text-slate-900">{event.label}</Span>
                    <Span className="text-xs text-slate-500">{formatDateTime(event.time)}</Span>
                  </Div>
                </Div>
              ))}
            </Div>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="System standby"
          message="Waiting for emergency distress signals. Select an incident above to view its details."
        />
      )}
    </AdminPage>
  );
};
export default SafetyCenter;
