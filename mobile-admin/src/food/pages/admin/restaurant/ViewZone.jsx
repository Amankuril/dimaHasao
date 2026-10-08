/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/ViewZone.jsx. */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { GMap, Polygon, regionFor } from '../../../../components/maps';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  LoadingState,
  ErrorState,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { alert } from '../../../../lib/webShim';
import { DotMarker, INDIA_REGION, MapTypeToggle, useMapTouchLock, zonePath } from './zoneMapParts';
const debugError = (...args) => {};

/** A read-only detail row: label above the value so neither is clipped. */
function DetailRow({ label, children }) {
  return (
    <Div className="gap-1">
      <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' ? <Text style={tw`text-sm text-slate-900`}>{children}</Text> : children}
    </Div>
  );
}
export default function ViewZone() {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapInstanceRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrollEnabled, touchLock] = useMapTouchLock();
  const { tablet, width } = useLayoutWidth();
  useEffect(() => {
    fetchZone();
    loadGoogleMaps();
  }, [id]);
  const fetchZone = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZoneById(id);
      if (response.data?.success && response.data.data?.zone) {
        setZone(response.data.data.zone);
      }
    } catch (error) {
      debugError('Error fetching zone:', error);
      alert('Failed to load zone');
      navigate('/admin/food/zone-setup');
    } finally {
      setLoading(false);
    }
  };
  const loadGoogleMaps = async () => {
    try {
      const apiKey = await getGoogleMapsApiKey();
      setGoogleMapsApiKey(apiKey || 'loaded');
    } catch (error) {
      debugError('Error loading Google Maps:', error);
      setMapLoading(false);
    }
  };
  const path = zonePath(zone?.coordinates);
  // A tall map on a tablet, shorter on a phone so the details stay reachable.
  const mapHeight = Math.max(320, Math.min(tablet ? 560 : 420, Math.round(width * 1.1)));

  // Fit the map to the polygon once both the map and the zone are ready (fitBounds).
  useEffect(() => {
    if (!mapLoading && path.length >= 3 && mapInstanceRef.current) {
      mapInstanceRef.current.animateToRegion(regionFor(path, { padding: 1.3, minDelta: 0.005 }), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoading, zone?._id, zone?.coordinates?.length]);
  if (loading) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader title="View Zone" subtitle="Loading zone details" breadcrumb={[{ label: 'Food' }, { label: 'Zone setup' }, { label: 'View zone' }]} />
        <LoadingState label="Loading zone…" />
      </AdminPage>
    );
  }
  if (!zone) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader title="View Zone" breadcrumb={[{ label: 'Food' }, { label: 'Zone setup' }, { label: 'View zone' }]} />
        <ErrorState title="Zone not found" message="This zone may have been deleted. Go back to the zone list to pick another one." onRetry={fetchZone} />
        <Div className="mt-3 flex-row">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back to Zones</Span>
          </Button>
        </Div>
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200} scrollEnabled={scrollEnabled}>
      <PageHeader
        icon={MapPin}
        title="View Zone"
        subtitle={zone.name || zone.serviceLocation || 'Zone details'}
        breadcrumb={[{ label: 'Food' }, { label: 'Zone setup', onPress: () => navigate('/admin/food/zone-setup') }, { label: zone.name || 'View zone' }]}
        actions={
          <Button onClick={() => navigate('/admin/food/zone-setup')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back to Zones</Span>
          </Button>
        }
      />

      {/* Zone Details */}
      <Card className="mb-4">
        <SectionTitle>Zone Details</SectionTitle>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-4`}>
          <DetailRow label="Name">{zone.name || 'N/A'}</DetailRow>
          <DetailRow label="Country">{zone.country || 'N/A'}</DetailRow>
          <DetailRow label="Unit">{zone.unit || 'kilometer'}</DetailRow>
          <DetailRow label="Status">
            <StatusBadge status={zone.isActive ? 'active' : 'inactive'} label={zone.isActive ? 'Active' : 'Inactive'} />
          </DetailRow>
          {zone.coordinates && zone.coordinates.length > 0 && <DetailRow label="Points">{String(zone.coordinates.length)}</DetailRow>}
        </Div>
      </Card>

      {/* Map */}
      <Card>
        <SectionTitle>Zone Map</SectionTitle>
        <Div className="relative rounded-lg overflow-hidden" style={{ height: mapHeight }} {...touchLock}>
          <GMap
            ref={mapInstanceRef}
            className="w-full h-full bg-slate-100"
            initialRegion={INDIA_REGION}
            mapType={mapType}
            zoomControlEnabled
            onMapReady={() => setMapLoading(false)}
          >
            {path.length >= 3 ? (
              <Polygon coordinates={path} strokeColor="rgba(147,51,234,0.8)" strokeWidth={3} fillColor="rgba(147,51,234,0.35)" tappable={false} />
            ) : null}
            {path.length >= 3 ? path.map((c, index) => <DotMarker key={`p${index}`} coordinate={c} title={`Point ${index + 1}`} />) : null}
          </GMap>
          <MapTypeToggle value={mapType} onChange={setMapType} />

          {mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100" pointerEvents="none">
              <LoadingState label="Loading map…" className="border-0 bg-transparent" />
            </Div>
          )}

          {!googleMapsApiKey && !mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100 px-6">
              <UiIcon as={MapPin} size={28} className="text-slate-400 mb-2" />
              <Text style={tw`text-sm text-slate-500 text-center`}>Google Maps API key not found</Text>
            </Div>
          )}
        </Div>
      </Card>
    </AdminPage>
  );
}
