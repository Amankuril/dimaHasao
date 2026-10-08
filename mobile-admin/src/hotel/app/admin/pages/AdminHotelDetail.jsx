/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminHotelDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  ChevronDown,
  Bed,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Search,
  Phone,
  Image as ImageIcon,
  Users,
} from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import RoomRatesManager from '../components/RoomRatesManager';
import { toast } from '../../../../lib/notify';

// --- Tab Components ---
import { A, Button, Div, HScroll, Img, Input, Link, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';

/** label / value row inside a detail card. */
const DetailRow = ({ label, value, children }) => (
  <Div className="flex-row items-start justify-between gap-3">
    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1" numberOfLines={2}>
      {label}
    </Span>
    {children ?? (
      <Span className="text-sm text-slate-900 flex-1 text-right" numberOfLines={2}>
        {value}
      </Span>
    )}
  </Div>
);

const OverviewTab = ({ hotel, tablet }) => (
  <Div className="gap-4">
    <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
      <Card className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
        <SectionTitle>Property information</SectionTitle>
        <DetailRow label="Property name" value={hotel.propertyName} />
        <DetailRow label="Property type" value={hotel.propertyType} />
        <DetailRow label="Contact number" value={hotel.contactNumber || 'Not provided'} />
        <DetailRow label="Status">
          <StatusBadge status={hotel.status} />
        </DetailRow>
        <DetailRow label="Joined date" value={hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
        <DetailRow label="Total room types" value={String(hotel.rooms?.length || 0)} />
        <DetailRow label="Live on platform">
          <StatusBadge tone={hotel.isLive ? 'success' : 'danger'} icon={hotel.isLive ? CheckCircle : XCircle} label={hotel.isLive ? 'Yes' : 'No'} />
        </DetailRow>
      </Card>
      <Card className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
        <SectionTitle>Partner &amp; location</SectionTitle>
        <DetailRow label="Partner name" value={hotel.partnerId?.name || 'N/A'} />
        <DetailRow label="Partner email" value={hotel.partnerId?.email || 'N/A'} />
        <DetailRow label="Partner phone" value={hotel.partnerId?.phone || 'N/A'} />
        <Div className="pt-2">
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full address</Span>
          <Div className="flex-row items-start gap-2 mt-1">
            <UiIcon as={MapPin} size={14} className="text-slate-400" />
            <Span className="text-sm text-slate-700 flex-1">
              {`${hotel.address?.fullAddress || hotel.address?.area || 'N/A'}\n${hotel.address?.city || ''}, ${
                hotel.address?.district ? `${hotel.address.district}, ` : ''
              }${hotel.address?.state || ''}${hotel.address?.pincode ? ` - ${hotel.address.pincode}` : ''}`}
            </Span>
          </Div>
        </Div>
      </Card>
    </Div>

    <Card className="gap-2">
      <SectionTitle>About property</SectionTitle>
      {hotel.shortDescription ? (
        <Div className="gap-1">
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Short description</Span>
          <Span className="text-sm text-slate-700">{hotel.shortDescription}</Span>
        </Div>
      ) : null}
      <Div className="gap-1">
        <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detailed description</Span>
        <Span className="text-sm text-slate-700">{hotel.description || 'No description provided for this property.'}</Span>
      </Div>
    </Card>

    <Card>
      <SectionTitle>Amenities</SectionTitle>
      {hotel.amenities && hotel.amenities.length > 0 ? (
        <Div className="flex-row flex-wrap gap-2">
          {hotel.amenities.map((amenity, i) => (
            <Div key={i} className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
              <UiIcon as={CheckCircle} size={12} className="text-green-700" />
              <Span className="text-xs text-slate-700">{amenity.replace(/_/g, ' ')}</Span>
            </Div>
          ))}
        </Div>
      ) : (
        <Span className="text-sm text-slate-500">No amenities listed</Span>
      )}
    </Card>

    {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 ? (
      <Card>
        <SectionTitle>Nearby places</SectionTitle>
        <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
          {hotel.nearbyPlaces.map((place, i) => (
            <Div key={i} className={`flex-row items-center gap-3 p-3 rounded-lg border border-slate-200 ${tablet ? 'min-w-[240px] flex-1' : ''}`}>
              <Div className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center shrink-0">
                <UiIcon as={MapPin} size={16} className="text-slate-500" />
              </Div>
              <Div className="flex-1 min-w-0">
                <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                  {place.name}
                </Span>
                <Span className="text-xs text-slate-500" numberOfLines={1}>
                  {place.type} · {place.distanceKm} km
                </Span>
              </Div>
            </Div>
          ))}
        </Div>
      </Card>
    ) : null}
  </Div>
);

const GalleryTab = ({ hotel, tablet }) => {
  const images = hotel.propertyImages || [];
  if (images.length === 0) {
    return <EmptyState icon={ImageIcon} title="No general photos" message="Photos the partner uploads for this property will show here." />;
  }
  return (
    <Card>
      <SectionTitle>General property photos</SectionTitle>
      <Div className="flex-row flex-wrap gap-3">
        {images.map((img, i) => (
          <Div key={i} className={`rounded-lg overflow-hidden border border-slate-200 bg-slate-100 ${tablet ? 'w-[23%]' : 'w-[48%]'}`} style={{ height: 120 }}>
            <Img src={img.url || img} alt={`Property ${i + 1}`} className="w-full" style={{ height: 120 }} contentFit="cover" />
          </Div>
        ))}
      </Div>
    </Card>
  );
};

const DocumentsTab = ({ hotel, documents, onVerify, verifying, tablet }) => {
  const [remark, setRemark] = useState('');
  if (!documents) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No documents submitted"
        message="This property has not uploaded any verification documents yet."
      />
    );
  }
  const status = documents.verificationStatus || 'pending';
  return (
    <Div className="gap-4">
      <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
        <Card className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
          <SectionTitle>Document summary</SectionTitle>
          <DetailRow label="Property" value={hotel.propertyName} />
          <DetailRow label="Property type" value={hotel.propertyType} />
          <DetailRow label="Verification status">
            <StatusBadge status={status} />
          </DetailRow>
          {documents.verifiedAt ? <DetailRow label="Last updated" value={new Date(documents.verifiedAt).toLocaleString('en-IN')} /> : null}
          {documents.adminRemark ? (
            <Div className="gap-1 pt-2">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin remark</Span>
              <Span className="text-sm text-slate-700">{documents.adminRemark}</Span>
            </Div>
          ) : null}
        </Card>

        <Card className={tablet ? 'flex-1 gap-3' : 'gap-3'}>
          <SectionTitle>Verification actions</SectionTitle>
          <Field label="Rejection remark" hint="Optional note in case of rejection">
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional note in case of rejection"
              rows={3}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
            />
          </Field>
          <Div className="flex-row flex-wrap gap-2">
            <Button
              type="button"
              disabled={verifying || status === 'verified'}
              onClick={() => onVerify && onVerify('approve', '')}
              className={`${BTN_PRIMARY} flex-1 min-w-[150px]`}
            >
              <UiIcon as={CheckCircle} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Approve documents</Span>
            </Button>
            <Button
              type="button"
              disabled={verifying || status === 'rejected'}
              onClick={() => onVerify && onVerify('reject', remark)}
              className={`${BTN_DANGER} flex-1 min-w-[150px]`}
            >
              <UiIcon as={XCircle} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Reject documents</Span>
            </Button>
          </Div>
          <Span className="text-xs text-slate-500">
            Approving documents moves the property to approved status and makes it live on the platform. Rejected properties stay hidden from users until the
            issues are fixed.
          </Span>
        </Card>
      </Div>

      <Card>
        <SectionTitle>Uploaded documents</SectionTitle>
        {documents.documents && documents.documents.length > 0 ? (
          <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
            {documents.documents.map((doc, idx) => (
              <Div key={idx} className={`p-3 rounded-lg border border-slate-200 gap-2 ${tablet ? 'min-w-[240px] flex-1' : ''}`}>
                <Div className="flex-row items-start justify-between gap-2">
                  <Span className="text-sm font-medium text-slate-900 flex-1" numberOfLines={2}>
                    {doc.name || doc.type || 'Document'}
                  </Span>
                  {doc.isRequired ? <StatusBadge tone="warning" label="Required" /> : null}
                </Div>
                <Span className="text-xs text-slate-500" numberOfLines={1}>
                  {doc.type || 'Uploaded file'}
                </Span>
                {doc.fileUrl ? (
                  <A href={doc.fileUrl} className={`${BTN_SECONDARY} self-start`}>
                    <UiIcon as={FileText} size={14} className="text-slate-600" />
                    <Span className={BTN_TEXT_SECONDARY}>View file</Span>
                  </A>
                ) : (
                  <Div className="flex-row items-center gap-1">
                    <UiIcon as={AlertCircle} size={12} className="text-slate-400" />
                    <Span className="text-xs text-slate-500">No file</Span>
                  </Div>
                )}
              </Div>
            ))}
          </Div>
        ) : (
          <Span className="text-sm text-slate-500">No individual documents uploaded</Span>
        )}
      </Card>
    </Div>
  );
};

const RoomsTab = ({ rooms, tablet }) => {
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  if (!rooms || rooms.length === 0) {
    return <EmptyState icon={Bed} title="No room data available" message="Room types added for this property will be listed here." />;
  }
  return (
    <Div className="gap-3">
      {rooms.map((room, i) => {
        const isExpanded = expandedRoomId === room._id;
        return (
          <Card key={i} padded={false}>
            <Div className="p-4 gap-3" onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}>
              <Div className="flex-row items-center gap-3">
                <Div className="w-16 h-16 rounded-lg bg-slate-100 items-center justify-center shrink-0 overflow-hidden">
                  {room.images && room.images[0] ? (
                    <Img src={room.images[0].url || room.images[0]} alt={room.name} className="w-16 h-16" contentFit="cover" />
                  ) : (
                    <UiIcon as={Bed} size={24} className="text-slate-400" />
                  )}
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-base font-semibold text-slate-900" numberOfLines={2}>
                    {room.name}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={1}>
                    ₹{room.pricePerNight} / night
                  </Span>
                </Div>
                <UiIcon as={ChevronDown} size={20} className="text-slate-400" />
              </Div>
              <Div className="flex-row flex-wrap items-center gap-2">
                <Div className="flex-row items-center gap-1">
                  <UiIcon as={Users} size={12} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">
                    Max {room.maxAdults} adults, {room.maxChildren} child
                  </Span>
                </Div>
                <Div className="flex-row items-center gap-1">
                  <UiIcon as={Building2} size={12} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">{room.totalInventory} rooms total</Span>
                </Div>
                <StatusBadge status={room.isActive ? 'active' : 'inactive'} label={room.isActive ? 'Active' : 'Inactive'} />
                <StatusBadge tone="neutral" label={String(room.inventoryType || '')} />
              </Div>
            </Div>

            {isExpanded ? (
              <Div className="border-t border-slate-100 p-4 gap-4">
                <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
                  <Div className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing details</Span>
                    <Div className="p-3 rounded-lg border border-slate-200 gap-2">
                      <DetailRow label="Base price" value={`₹${room.pricePerNight}`} />
                      <DetailRow label="Extra adult" value={`₹${room.extraAdultPrice}`} />
                      <DetailRow label="Extra child" value={`₹${room.extraChildPrice}`} />
                    </Div>
                  </Div>
                  <Div className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuration</Span>
                    <Div className="p-3 rounded-lg border border-slate-200 gap-2">
                      <DetailRow label="Category" value={room.roomCategory} />
                      <DetailRow label="Inventory type" value={room.inventoryType} />
                      <DetailRow label="Total inventory" value={`${room.totalInventory} units`} />
                    </Div>
                  </Div>
                  <Div className={tablet ? 'flex-1 gap-2' : 'gap-2'}>
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amenities</Span>
                    <Div className="p-3 rounded-lg border border-slate-200 flex-row flex-wrap gap-2">
                      {(room.amenities || []).map((amenity, idx) => (
                        <Span key={idx} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                          {amenity}
                        </Span>
                      ))}
                    </Div>
                  </Div>
                </Div>

                <Div className="gap-2">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room photos</Span>
                  <Div className="flex-row flex-wrap gap-3">
                    {(room.images || []).map((img, idx) => (
                      <Div key={idx} className={`rounded-lg overflow-hidden border border-slate-200 bg-slate-100 ${tablet ? 'w-[23%]' : 'w-[48%]'}`} style={{ height: 100 }}>
                        <Img src={img.url || img} alt={`${room.name} ${idx + 1}`} className="w-full" style={{ height: 100 }} contentFit="cover" />
                      </Div>
                    ))}
                  </Div>
                </Div>
              </Div>
            ) : null}
          </Card>
        );
      })}
    </Div>
  );
};

const BOOKING_COLS = [130, 130, 120];
const BOOKING_LABELS = ['Booking', 'Status', 'Amount'];

const BookingsTab = ({ bookings }) => (
  <Div className="gap-3">
    <Card>
      <Div className="flex-row flex-wrap items-center gap-2">
        <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input type="text" placeholder="Search guest name" className="flex-1 text-sm text-slate-900" />
        </Div>
        <Span className="text-sm text-slate-500">{bookings?.length || 0} bookings</Span>
      </Div>
    </Card>

    {bookings && bookings.length > 0 ? (
      <DataTable cols={BOOKING_COLS}>
        <THead cols={BOOKING_COLS} labels={BOOKING_LABELS} />
        <TBody>
          {bookings.map((b, i) => (
            <Row key={i} last={i === bookings.length - 1}>
              <Cell width={BOOKING_COLS[0]}>#{b.bookingId || b._id.slice(-6)}</Cell>
              <Cell width={BOOKING_COLS[1]}>
                <StatusBadge status={b.status} />
              </Cell>
              <Cell width={BOOKING_COLS[2]} align="right">
                <Span className="text-sm font-semibold text-slate-900">₹{b.totalAmount?.toLocaleString()}</Span>
              </Cell>
            </Row>
          ))}
        </TBody>
      </DataTable>
    ) : (
      <EmptyState icon={Calendar} title="No bookings found" message="Stays booked at this property will be listed here." />
    )}
  </Div>
);

// --- Main Page Component ---

const AdminHotelDetail = () => {
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
  const [hotel, setHotel] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const [verifying, setVerifying] = useState(false);
  const fetchHotelDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getHotelDetails(id);
      if (data.success) {
        setHotel(data.hotel);
        setBookings(data.bookings || []);
        setDocuments(data.documents || null);
      }
    } catch (error) {
      console.error('Error fetching hotel details:', error);
      toast.error('Failed to load hotel information');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchHotelDetails();
  }, [fetchHotelDetails]);
  const handleVerifyDocuments = (action, remark) => {
    if (!hotel) return;
    const isApprove = action === 'approve';
    setModalConfig({
      isOpen: true,
      title: isApprove ? 'Approve Property Documents?' : 'Reject Property Documents?',
      message: isApprove
        ? 'This will mark all submitted documents as verified and move the property to approved status.'
        : 'This will reject the submitted documents and keep the property hidden from users.',
      type: isApprove ? 'success' : 'danger',
      confirmText: isApprove ? 'Approve' : 'Reject',
      onConfirm: async () => {
        try {
          setVerifying(true);
          const res = await adminService.verifyPropertyDocuments(hotel._id, action, remark);
          if (res.success) {
            toast.success(isApprove ? 'Documents approved successfully' : 'Documents rejected successfully');
            setHotel(res.property);
            setDocuments(res.documents);
          }
        } catch {
          toast.error('Failed to update document verification');
        } finally {
          setVerifying(false);
        }
      },
    });
  };
  const handleStatusToggle = async () => {
    const isSuspended = hotel.status === 'suspended';
    const newStatus = isSuspended ? 'approved' : 'suspended';
    setModalConfig({
      isOpen: true,
      title: isSuspended ? 'Activate Hotel?' : 'Suspend Hotel?',
      message: isSuspended
        ? `Hotel "${hotel.propertyName}" will be able to receive bookings again.`
        : `Suspending "${hotel.propertyName}" will prevent it from receiving new bookings.`,
      type: isSuspended ? 'success' : 'danger',
      confirmText: isSuspended ? 'Activate' : 'Suspend',
      onConfirm: async () => {
        try {
          const res = await adminService.updateHotelStatus(hotel._id, newStatus);
          if (res.success) {
            toast.success(`Hotel ${isSuspended ? 'activated' : 'suspended'} successfully`);
            fetchHotelDetails();
          }
        } catch {
          toast.error('Failed to update hotel status');
        }
      },
    });
  };
  if (loading)
    return (
      <AdminPage maxWidth={1100}>
        <PageHeader title="Property" breadcrumb={[{ label: 'Hotel' }, { label: 'Properties' }]} />
        <LoadingState label="Loading property details…" />
      </AdminPage>
    );
  if (!hotel)
    return (
      <AdminPage maxWidth={1100}>
        <PageHeader title="Property" breadcrumb={[{ label: 'Hotel' }, { label: 'Properties' }]} />
        <ErrorState title="Property not found" message="This property does not exist or has been removed." onRetry={fetchHotelDetails} />
        <Link to="/hotel/admin/properties" className={`${BTN_SECONDARY} mt-3 self-center`}>
          <Span className={BTN_TEXT_SECONDARY}>Back to properties</Span>
        </Link>
      </AdminPage>
    );
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Building2,
    },
    {
      id: 'gallery',
      label: 'Full Gallery',
      icon: ImageIcon,
    },
    {
      id: 'documents',
      label: 'KYC Documents',
      icon: ShieldCheck,
    },
    {
      id: 'rooms',
      label: 'Rooms & Pricing',
      icon: Bed,
    },
    {
      id: 'rates',
      label: 'Rates & Availability',
      icon: Calendar,
    },
    {
      id: 'bookings',
      label: 'Booking History',
      icon: Calendar,
    },
  ];
  const coverImage = hotel.coverImage || (hotel.propertyImages && (hotel.propertyImages[0]?.url || hotel.propertyImages[0]));
  return (
    <AdminPage maxWidth={1100}>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      <PageHeader
        icon={Building2}
        title={hotel.propertyName}
        subtitle={`${hotel.address?.city || 'City N/A'}, ${hotel.address?.state || ''} · Owner: ${hotel.partnerId?.name || 'N/A'}`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Properties' }, { label: hotel.propertyName }]}
        actions={
          <>
            <Button onClick={handleStatusToggle} className={hotel.status === 'suspended' ? BTN_PRIMARY : BTN_DANGER}>
              <Span className={BTN_TEXT_PRIMARY}>{hotel.status === 'suspended' ? 'Activate' : 'Suspend'}</Span>
            </Button>
            <StatusBadge status={hotel.status} />
          </>
        }
      />

      <Card className="mb-4">
        <Div className="flex-row items-center gap-3">
          <Div className="w-16 h-16 rounded-lg bg-slate-100 items-center justify-center shrink-0 overflow-hidden">
            {coverImage ? <Img src={coverImage} alt={hotel.propertyName} className="w-16 h-16" contentFit="cover" /> : <UiIcon as={Building2} size={28} className="text-slate-400" />}
          </Div>
          <Div className="flex-1 min-w-0 gap-1">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={MapPin} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={2}>
                {[hotel.address?.city, hotel.address?.state].filter(Boolean).join(', ') || 'Location N/A'}
              </Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Phone} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {hotel.contactNumber || 'Not provided'}
              </Span>
            </Div>
          </Div>
        </Div>
      </Card>

      <HScroll className="mb-4" contentClassName="flex-row gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-row items-center gap-2 h-11 px-4 rounded-lg border ${activeTab === tab.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
          >
            <UiIcon as={tab.icon} size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-500'} />
            <Span className={`text-sm font-semibold ${activeTab === tab.id ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
          </Button>
        ))}
      </HScroll>

      {activeTab === 'overview' ? <OverviewTab hotel={hotel} tablet={tablet} /> : null}
      {activeTab === 'gallery' ? <GalleryTab hotel={hotel} tablet={tablet} /> : null}
      {activeTab === 'documents' ? (
        <DocumentsTab hotel={hotel} documents={documents} onVerify={handleVerifyDocuments} verifying={verifying} tablet={tablet} />
      ) : null}
      {activeTab === 'rooms' ? <RoomsTab rooms={hotel.rooms} tablet={tablet} /> : null}
      {activeTab === 'rates' ? <RoomRatesManager propertyId={id} /> : null}
      {activeTab === 'bookings' ? <BookingsTab bookings={bookings} propertyType={hotel?.propertyType} /> : null}
    </AdminPage>
  );
};
export default AdminHotelDetail;
