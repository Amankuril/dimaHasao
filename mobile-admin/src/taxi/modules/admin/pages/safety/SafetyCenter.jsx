/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/safety/SafetyCenter.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Loader2,
} from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { socketService } from '../../../../shared/api/socket';
import { adminService } from '../../services/adminService';
import { HAS_VALID_GOOGLE_MAPS_KEY, DISTRICT_CENTER, useBaseGoogleMapsLoader } from '../../utils/googleMaps';
import { getChatSession } from '../../../shared/chat/chatIdentity';
import { Button, Div, Input, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
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

const StatCard = ({ title, value, icon, alertMode }) => (
  <Div className={`bg-white p-3 rounded-xl border ${alertMode ? 'border-red-200' : 'border-gray-200'} shadow-sm flex items-center justify-between`}>
    <Div>
      <P className="text-[11px] font-semibold text-gray-500 mb-0.5">{title}</P>
      <Div className={`text-lg font-bold ${alertMode && value > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{value}</Div>
    </Div>
    <Div className={`w-8 h-8 rounded-full flex items-center justify-center ${alertMode && value > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
      {icon}
    </Div>
  </Div>
);
const IncidentCard = ({ alert, isActive, onClick }) => (
  <Div
    onClick={onClick}
    className={`p-2.5 rounded-xl border transition-colors cursor-pointer relative ${isActive ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-white border-gray-200 hover:border-yellow-200'}`}
  >
    <Div className="flex justify-between items-start mb-2">
      <Div className="flex items-center gap-2">
        <Div
          className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}
        >
          <UiIcon as={UserIcon} size={16} />
        </Div>
        <Div>
          <Div className="text-[13px] font-bold text-gray-900 leading-none mb-1">{getParticipantTitle(alert)}</Div>
          <P className="text-[10px] font-medium text-gray-500 leading-none">ID: {alert?.driverId?.slice(-6) || alert?.userId?.slice(-6) || 'Unknown'}</P>
        </Div>
      </Div>
      <Span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">Prio-1</Span>
    </Div>

    <Div className="grid grid-cols-2 gap-2 mb-2 text-[11px]">
      <Div className="bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
        <Span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Vehicle</Span>
        <Span className="font-bold text-gray-800">{alert?.vehicleLabel || 'N/A'}</Span>
      </Div>
      <Div className="bg-gray-50/80 p-1.5 rounded-lg border border-gray-100 overflow-hidden">
        <Span className="block text-[9px] text-gray-500 font-semibold mb-0.5">Passenger</Span>
        <Span className="font-bold text-gray-800 truncate block">{alert?.riderName || 'None'}</Span>
      </Div>
    </Div>

    <Div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
      <Div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
        <UiIcon as={Clock} size={12} className="text-gray-400 shrink-0" />
        <Span>{formatRelativeTime(alert?.createdAt)}</Span>
      </Div>
      <Div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
        <UiIcon as={MapPin} size={12} className="text-red-500 shrink-0" />
        <Span className="truncate">{alert?.locationLabel || alert?.pickupAddress || 'Locating...'}</Span>
      </Div>
    </Div>
  </Div>
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
    <Div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[320px] shadow-sm">
      {/* Header */}
      <Div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
        <Div>
          <Div className="text-xs font-bold text-gray-900">Live Support Chat</Div>
          <Div className="flex items-center gap-1.5 mt-0.5">
            <Span className="w-1.5 h-1.5 rounded-full bg-green-500"></Span>
            <Span className="text-[10px] font-semibold text-gray-500">{getParticipantTitle(alert)} Online</Span>
          </Div>
        </Div>
      </Div>

      {/* Messages */}
      <ScrollDiv ref={messagesRef} className="flex-1 p-3 space-y-3 bg-gray-50/30">
        {messages.map((msg) => (
          <Div key={msg.id} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
            {msg.sender === 'system' ? (
              <Span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{msg.text}</Span>
            ) : (
              <Div
                className={`max-w-[85%] rounded-xl p-2.5 text-[11px] ${msg.sender === 'admin' ? 'bg-yellow-400 text-black rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}
              >
                <P className="font-medium leading-relaxed">{msg.text}</P>
                <Div className={`flex items-center gap-1 mt-1 text-[9px] font-bold ${msg.sender === 'admin' ? 'text-black/60 justify-end' : 'text-gray-400'}`}>
                  {msg.time.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.sender === 'admin' && <UiIcon as={CheckCheck} size={10} className="text-black" />}
                </Div>
              </Div>
            )}
          </Div>
        ))}
      </ScrollDiv>

      {/* Input */}
      <Div className="p-2 border-t border-gray-100 bg-white flex items-center gap-2 rounded-b-xl">
        <Button disabled className="p-1.5 text-gray-300 rounded-lg cursor-not-allowed">
          <UiIcon as={Paperclip} size={16} />
        </Button>
        <Input
          type="text"
          placeholder="Chat API unavailable..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-gray-500 cursor-not-allowed"
        />
        <Button disabled className="p-1.5 text-gray-300 rounded-lg cursor-not-allowed">
          <UiIcon as={Mic} size={16} />
        </Button>
        <Button disabled onClick={handleSend} className="p-1.5 bg-gray-100 text-gray-400 rounded-lg shadow-sm cursor-not-allowed">
          <UiIcon as={Send} size={16} />
        </Button>
      </Div>
    </Div>
  );
};

// -------------- MAIN COMPONENT -------------- //

const SafetyCenter = () => {
  const { isLoaded, loadError } = useBaseGoogleMapsLoader();
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
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Dashboard Row */}
      <Div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 shadow-sm z-10 shrink-0">
        <StatCard title="Active SOS" value={alerts.length} icon={<UiIcon as={AlertCircle} size={16} />} alertMode={true} />
        <StatCard title="Resolved Today" value={dashboardStats.resolved} icon={<UiIcon as={CheckCircle2} size={16} />} />
        <StatCard title="High Priority" value={alerts.length} icon={<UiIcon as={ShieldAlert} size={16} />} alertMode={true} />
        <StatCard title="Escalated" value={dashboardStats.escalated} icon={<UiIcon as={History} size={16} />} />
        <StatCard title="Avg Response" value="< 30s" icon={<UiIcon as={Activity} size={16} />} />
        <StatCard title="Agents" value={dashboardStats.connectedAgents} icon={<UiIcon as={UserIcon} size={16} />} />
      </Div>

      {/* Main Content Area */}
      <Div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left Sidebar: Incident List */}
        <Div className="w-full lg:w-72 h-[450px] lg:h-auto flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <Div className="text-sm font-bold text-gray-900">Active Incidents</Div>
            <Div className="flex items-center gap-2">
              <Button onClick={loadAlerts} className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors">
                <UiIcon as={RefreshCw} size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
              <Span className="bg-red-100 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded-md">{alerts.length}</Span>
            </Div>
          </Div>

          <Div className="flex-1 p-3 space-y-2">
            {isLoading ? (
              <Div className="flex justify-center p-8">
                <UiIcon as={Loader2} className="w-6 h-6 animate-spin text-gray-400" />
              </Div>
            ) : alerts.length === 0 ? (
              <Div className="text-center p-8">
                <UiIcon as={Shield} className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <P className="text-xs font-bold text-gray-900">All Clear</P>
                <P className="text-[10px] font-medium text-gray-500 mt-1">No active distress signals.</P>
              </Div>
            ) : (
              alerts.map((alert) => (
                <IncidentCard key={alert.id} alert={alert} isActive={selectedAlert?.id === alert.id} onClick={() => setSelectedAlertId(alert.id)} />
              ))
            )}
          </Div>
        </Div>

        {/* Right Area: Incident Details */}
        {selectedAlert ? (
          <Div className="flex-1 flex flex-col gap-4 lg:pr-2 no-scrollbar">
            {/* Header Actions */}
            <Div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Div>
                <Div className="text-lg font-bold text-gray-900 mb-1.5">SOS Details</Div>
                <Div className="flex flex-wrap items-center gap-2">
                  <Div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <UiIcon as={Clock} size={12} className="text-gray-400" />
                    {formatDateTime(selectedAlert.createdAt)}
                  </Div>
                  <Div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <UiIcon as={MapPin} size={12} className="text-red-500" />
                    {selectedAlert.locationLabel || selectedAlert.pickupAddress || 'GPS Active'}
                  </Div>
                </Div>
              </Div>

              <Div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                  onClick={() => window.open('tel:100', '_self')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  <UiIcon as={PhoneCall} size={14} /> Emergency
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-500 transition-colors shadow-sm disabled:opacity-50"
                >
                  <UiIcon as={CheckCircle2} size={14} /> {isResolving ? 'Closing...' : 'Close Incident'}
                </Button>
              </Div>
            </Div>

            {/* Grid Layout for Panels */}
            <Div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[400px]">
              {/* Map Panel */}
              <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-64 lg:h-auto relative">
                {loadError ? (
                  <Div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-gray-50 p-6">
                    <UiIcon as={Globe} size={24} className="text-gray-300 mb-2" />
                    <P className="text-xs font-bold text-gray-900">Map Unavailable</P>
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
                  <Div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-xs font-bold text-gray-500">Loading Map...</Div>
                )}
              </Div>

              {/* Context & Timeline Panel */}
              <Div className="flex flex-col gap-4">
                {/* Distress Context */}
                <Div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <Div className="text-xs font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Distress Context</Div>
                  <Div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Div>
                      <P className="text-[9px] font-semibold text-gray-500 mb-0.5">Driver ID</P>
                      <P className="text-[11px] font-bold text-gray-900">{selectedAlert?.driverId?.slice(-8) || 'N/A'}</P>
                    </Div>
                    <Div>
                      <P className="text-[9px] font-semibold text-gray-500 mb-0.5">User ID</P>
                      <P className="text-[11px] font-bold text-gray-900">{selectedAlert?.userId?.slice(-8) || 'N/A'}</P>
                    </Div>
                    <Div>
                      <P className="text-[9px] font-semibold text-gray-500 mb-0.5">Ride ID</P>
                      <P className="text-[11px] font-bold text-gray-900">{selectedAlert?.rideId?.slice(-8) || selectedAlert?.tripCode || 'N/A'}</P>
                    </Div>
                    <Div>
                      <P className="text-[9px] font-semibold text-gray-500 mb-0.5">Contact</P>
                      <P className="text-[11px] font-bold text-gray-900">{selectedAlert?.emergencyContact || 'Unavailable'}</P>
                    </Div>
                  </Div>
                </Div>

                {/* Live Chat */}
                <AdminSosChat alert={selectedAlert} />
              </Div>
            </Div>

            {/* Live Activity Timeline */}
            <Div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4 lg:mb-0">
              <Div className="text-xs font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Activity Log</Div>
              <Div className="space-y-3">
                {timeline.map((event, idx) => (
                  <Div key={idx} className="flex gap-3">
                    <Div className="flex flex-col items-center">
                      <Div className={`w-2.5 h-2.5 rounded-full border-2 ${idx === 0 ? 'bg-red-500 border-red-200' : 'bg-gray-400 border-gray-200'}`}></Div>
                      {idx !== timeline.length - 1 && <Div className="w-px flex-1 bg-gray-100 my-1"></Div>}
                    </Div>
                    <Div className="pb-2">
                      <P className="text-[11px] font-bold text-gray-900">{event.label}</P>
                      <P className="text-[9px] font-medium text-gray-500">{formatDateTime(event.time)}</P>
                    </Div>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>
        ) : (
          <Div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200">
            <UiIcon as={ShieldAlert} size={40} className="text-gray-300 mb-3" />
            <Div className="text-base font-bold text-gray-900">System Standby</Div>
            <P className="text-[11px] font-medium text-gray-500 max-w-xs mt-1.5">
              Waiting for emergency distress signals. Select an incident from the sidebar to view details.
            </P>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
};
export default SafetyCenter;
