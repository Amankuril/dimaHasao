import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, CheckCircle, XCircle, FileText,
    ChevronLeft, Star, Bed, Calendar, ShieldCheck, AlertCircle,
    MoreVertical, Download, Search, Ban, Wifi, Phone, Mail, Tv, Coffee, Wind, Loader2, Clock, Image as ImageIcon, Users
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import RoomRatesManager from '../components/RoomRatesManager';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

// --- Tab Components ---

const OverviewTab = ({ hotel }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                <h3 className="text-xs text-neutral-500 mb-4 flex items-center gap-2">
                    <Building2 size={14} /> Property information
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Property name</span>
                        <span className="font-medium text-neutral-900">{hotel.propertyName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Property type</span>
                        <span className="font-medium text-neutral-900 capitalize">{hotel.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Contact number</span>
                        <span className="font-medium text-neutral-900">{hotel.contactNumber || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Status</span>
                        <StatusDot status={hotel.status} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Joined date</span>
                        <span className="font-medium text-neutral-900">{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Total room types</span>
                        <span className="font-medium text-neutral-900">{hotel.rooms?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Live on platform</span>
                        <span className="font-medium text-neutral-900 flex items-center gap-1">
                            {hotel.isLive ? <CheckCircle size={12} className="text-green-600" /> : <XCircle size={12} className="text-red-500" />}
                            {hotel.isLive ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                <h3 className="text-xs text-neutral-500 mb-4 flex items-center gap-2">
                    <MapPin size={14} /> Partner & location
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Partner name</span>
                        <span className="font-medium text-neutral-900">{hotel.partnerId?.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Partner email</span>
                        <span className="font-medium text-neutral-900">{hotel.partnerId?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 text-xs">Partner phone</span>
                        <span className="font-medium text-neutral-900">{hotel.partnerId?.phone || '—'}</span>
                    </div>
                    <div className="pt-2">
                        <span className="text-neutral-500 text-xs block mb-1">Full address</span>
                        <span className="font-medium block text-neutral-800 leading-relaxed">
                            {hotel.address?.fullAddress || hotel.address?.area || '—'}
                            <br />
                            {hotel.address?.city}, {hotel.address?.district ? `${hotel.address.district}, ` : ''}{hotel.address?.state} {hotel.address?.pincode && `- ${hotel.address.pincode}`}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
            <h3 className="text-xs text-neutral-500 mb-3">About property</h3>
            {hotel.shortDescription && (
                <div className="mb-4">
                    <h4 className="text-xs text-neutral-500 mb-1">Short description</h4>
                    <p className="text-sm font-medium text-neutral-700">
                        {hotel.shortDescription}
                    </p>
                </div>
            )}
            <h4 className="text-xs text-neutral-500 mb-1">Detailed description</h4>
            <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                {hotel.description || 'No description provided for this property.'}
            </p>
        </div>

        <div>
            <h3 className="text-xs text-neutral-500 mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-3">
                {hotel.amenities && hotel.amenities.length > 0 ? (
                    hotel.amenities.map((amenity, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700">
                            <CheckCircle size={12} className="text-green-500" />
                            {amenity.replace(/_/g, ' ')}
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-neutral-500">No amenities listed</p>
                )}
            </div>
        </div>



        {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 && (
            <div>
                <h3 className="text-xs text-neutral-500 mb-3">Nearby places</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hotel.nearbyPlaces.map((place, i) => (
                        <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <MapPin size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-neutral-900">{place.name}</h4>
                                <p className="text-xs text-neutral-500">
                                    {place.type} • <span className="text-emerald-600">{place.distanceKm} km</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const GalleryTab = ({ hotel }) => (
    <div className="space-y-10">
        {/* Section: Property Wide Images */}
        <div>
            <div className="flex items-center gap-2 mb-4">
                <Building2 size={20} className="text-[#0a4d2b]" />
                <h3 className="text-lg font-medium text-neutral-900">General property photos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {hotel.propertyImages && hotel.propertyImages.length > 0 ? (
                    hotel.propertyImages.map((img, i) => (
                        <div key={i} className="aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 relative group shadow-sm transition-colors hover:shadow-md">
                            <img src={img.url || img} alt={`Property ${i}`} className="w-full h-full object-cover transition-transform duration-500" />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-10 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                        <p className="mt-1 text-sm text-neutral-500">No general photos</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const DocumentsTab = ({ hotel, documents, onVerify, verifying }) => {
    const [remark, setRemark] = useState('');

    if (!documents) {
        return (
            <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
                <ShieldCheck size={48} className="mx-auto text-neutral-200 mb-4" />
                <h3 className="text-neutral-900 font-medium text-sm">No documents submitted</h3>
                <p className="mt-1 text-sm text-neutral-500">This property has not uploaded any verification documents yet</p>
            </div>
        );
    }

    const status = documents.verificationStatus || 'pending';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                    <h4 className="font-medium text-neutral-900 mb-4 flex items-center gap-2 text-xs">
                        <FileText size={16} /> Document summary
                    </h4>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500 text-xs">Property</span>
                            <span className="font-medium text-neutral-900">{hotel.propertyName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500 text-xs">Property type</span>
                            <span className="font-medium text-neutral-900 capitalize">{hotel.propertyType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 text-xs">Verification status</span>
                            <StatusDot status={status} tone={status === 'verified' ? 'positive' : status === 'rejected' ? 'negative' : 'warning'} />
                        </div>
                        {documents.verifiedAt && (
                            <div className="flex justify-between">
                                <span className="text-neutral-500 text-xs">Last updated</span>
                                <span className="font-medium text-neutral-900">
                                    {new Date(documents.verifiedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {documents.adminRemark && (
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Admin remark</p>
                                <p className="text-xs font-medium text-neutral-800">{documents.adminRemark}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                    <h4 className="font-medium text-neutral-900 mb-4 flex items-center gap-2 text-xs">
                        <ShieldCheck size={16} /> Verification actions
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-neutral-500 mb-2">Rejection remark</p>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional note in case of rejection"
                                className="w-full min-h-[80px] text-xs font-medium border border-neutral-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                disabled={verifying || status === 'verified'}
                                onClick={() => onVerify && onVerify('approve', '')}
                                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium  flex items-center justify-center gap-2 ${status === 'verified'
                                    ? 'bg-green-100 text-green-500 border border-green-100 cursor-not-allowed'
                                    : 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle size={14} />
                                Approve documents
                            </button>
                            <button
                                type="button"
                                disabled={verifying || status === 'rejected'}
                                onClick={() => onVerify && onVerify('reject', remark)}
                                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium  flex items-center justify-center gap-2 ${status === 'rejected'
                                    ? 'bg-red-100 text-red-500 border border-red-100 cursor-not-allowed'
                                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <XCircle size={14} />
                                Reject documents
                            </button>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Approving documents will move the property to <span className="text-green-700">approved</span> status
                            and make it live on the platform. Rejected properties will stay hidden from users until issues are fixed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <h4 className="font-medium text-neutral-900 mb-4 flex items-center gap-2 text-xs">
                    <FileText size={16} /> Uploaded documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.documents && documents.documents.length > 0 ? (
                        documents.documents.map((doc, idx) => (
                            <div key={idx} className="border border-neutral-200 rounded-xl p-4 flex flex-col justify-between bg-neutral-50">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-neutral-900">
                                            {doc.name || doc.type || 'Document'}
                                        </span>
                                        {doc.isRequired && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-500">
                                        {doc.type || 'Uploaded file'}
                                    </p>
                                </div>
                                <div className="mt-3">
                                    {doc.fileUrl ? (
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                                        >
                                            <FileText size={12} />
                                            View file
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                            <AlertCircle size={11} /> No file
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-xs text-neutral-500">
                            No individual documents uploaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RoomsTab = ({ rooms }) => {
    const [expandedRoomId, setExpandedRoomId] = useState(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-neutral-900">Room inventory</h3>
            </div>

            <div className="space-y-4">
                {rooms && rooms.length > 0 ? (
                    rooms.map((room, i) => {
                        const isExpanded = expandedRoomId === room._id;
                        return (
                            <div key={i} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    className="p-5 flex flex-col md:flex-row items-center gap-6 cursor-pointer"
                                    onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}
                                >
                                    <div className="w-full md:w-32 h-24 bg-neutral-100 rounded-lg shrink-0 flex items-center justify-center text-neutral-500 relative overflow-hidden">
                                        {room.images && room.images[0] ? (
                                            <img src={room.images[0].url || room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Bed size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h4 className="font-medium text-neutral-900 text-lg">{room.name}</h4>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1"><Users size={12} /> Max {room.maxAdults} Adults, {room.maxChildren} Child</span>
                                            <span className="flex items-center gap-1"><Building2 size={12} /> {room.totalInventory} Rooms Total</span>
                                            <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={12} /> {room.inventoryType}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-neutral-100 pt-4 md:pt-0">
                                        <div className="text-center">
                                            <p className="text-xs text-neutral-500 mb-1">Status</p>
                                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full  ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {room.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-neutral-500 mb-1">Price / night</p>
                                            <p className="text-xl font-medium text-neutral-900">₹{room.pricePerNight}</p>
                                        </div>
                                        <ChevronLeft
                                            size={20}
                                            className={`text-neutral-500 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            className="border-t border-neutral-100 bg-neutral-50"
                                        >
                                            <div className="p-6">
                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div>
                                                        <h5 className="text-xs text-neutral-500 mb-3 block">Pricing details</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Base price</span>
                                                                <span className="font-medium text-neutral-900">₹{room.pricePerNight}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Extra adult</span>
                                                                <span className="font-medium text-neutral-900">₹{room.extraAdultPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Extra child</span>
                                                                <span className="font-medium text-neutral-900">₹{room.extraChildPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs text-neutral-500 mb-3 block">Configuration</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Category</span>
                                                                <span className="font-medium text-neutral-900">{room.roomCategory}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Inventory type</span>
                                                                <span className="font-medium text-neutral-900">{room.inventoryType}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-neutral-500">Total inventory</span>
                                                                <span className="font-medium text-neutral-900">{room.totalInventory} Units</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs text-neutral-500 mb-3 block">Amenities</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-wrap gap-2">
                                                            {room.amenities.map((amenity, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-neutral-50 rounded border border-neutral-100 text-xs font-medium text-neutral-600">
                                                                    {amenity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Room Images */}
                                                <div>
                                                    <h5 className="text-xs text-neutral-500 mb-3 block">Room photos</h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {room.images && room.images.map((img, idx) => (
                                                            <div key={idx} className="aspect-video bg-neutral-200 rounded-lg overflow-hidden border border-neutral-200 group relative">
                                                                <img
                                                                    src={img.url || img}
                                                                    alt={`${room.name} ${idx}`}
                                                                    className="w-full h-full object-cover transition-transform duration-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-10 text-center text-neutral-500 text-xs">No room data available</div>
                )}
            </div>
        </div>
    );
};

const BookingsTab = ({ bookings, propertyType }) => (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search guest name"
                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                />
            </div>
            <div className="flex items-center gap-4">
                <div className="text-xs text-neutral-500">
                    Total: <span className="font-medium text-neutral-900">{bookings?.length || 0} Bookings</span>
                </div>
            </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                    <tr>
                        <th className="p-4 font-medium text-neutral-600">Booking ID</th>
                        <th className="p-4 font-medium text-neutral-600">Status</th>
                        <th className="p-4 font-medium text-neutral-600 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {bookings && bookings.length > 0 ? (
                        bookings.map((b, i) => (
                            <tr key={i} className="hover:bg-neutral-50">
                                <td className="p-4 font-mono text-xs text-neutral-500">#{b.bookingId || b._id.slice(-6)}</td>
                                <td className="p-4">
                                    <StatusDot status={b.status} />
                                </td>
                                <td className="p-4 text-right font-medium">₹{b.totalAmount?.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-neutral-500 text-xs">No bookings found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Main Page Component ---

const AdminHotelDetail = () => {
    const { id } = useParams();
    const [hotel, setHotel] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [documents, setDocuments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
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
            title: isApprove ? 'Approve property documents?' : 'Reject property documents?',
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
            }
        });
    };

    const handleStatusToggle = async () => {
        const isSuspended = hotel.status === 'suspended';
        const newStatus = isSuspended ? 'approved' : 'suspended';
        setModalConfig({
            isOpen: true,
            title: isSuspended ? 'Activate hotel?' : 'Suspend hotel?',
            message: isSuspended
                ? `Hotel "${hotel.propertyName}" will be able to receive bookings again.`
                : `Suspending "${hotel.propertyName}" will prevent it from receiving new bookings.`,
            type: isSuspended ? 'success' : 'danger',
            confirmText: isSuspended ? 'Activate' : 'Suspend',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                    if (res.success) {
                        toast.success(`Hotel ${isSuspended ?'activated' : 'suspended'} successfully`);
                        fetchHotelDetails();
                    }
                } catch {
                    toast.error('Failed to update hotel status');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-neutral-400" size={24} strokeWidth={1.5} />
            <p className="mt-1 text-sm text-neutral-500">Loading property</p>
        </div>
    );

    if (!hotel) return (
        <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-medium text-neutral-900">Property not found</h2>
            <Link to="/hotel/admin/properties" className="mt-6 inline-block text-black font-medium text-xs border-b-2 border-black pb-1">Back to properties</Link>
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'gallery', label: 'Full gallery', icon: ImageIcon },
        { id: 'documents', label: 'KYC documents', icon: ShieldCheck },
        { id: 'rooms', label: 'Rooms & pricing', icon: Bed },
        { id: 'rates', label: 'Rates & availability', icon: Calendar },
        { id: 'bookings', label: 'Booking history', icon: Calendar },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Link to="/hotel/admin/properties" className="hover:text-black transition-colors">Properties</Link>
                <span>/</span>
                <span className="text-black font-medium">{hotel.propertyName}</span>
            </div>

            <div className="bg-white rounded-xl p-6 border border-neutral-900/[0.08] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl bg-neutral-100 shadow-inner flex items-center justify-center shrink-0 overflow-hidden border border-neutral-200">
                        {hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0]) ? (
                            <img src={hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0].url) || (hotel.propertyImages && hotel.propertyImages[0])} alt="Hotel" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={32} className="text-neutral-300" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-neutral-900">{hotel.propertyName}</h1>
                            {hotel.status === 'suspended' ? (
                                <StatusDot status="suspended" tone="negative" />
                            ) : (
                                <span className={`px-2.5 py-0.5 border text-xs font-medium rounded-full flex items-center  ${hotel.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {hotel.status === 'approved' ? <CheckCircle size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                                    {hotel.status}
                                </span>
                            )}
                        </div>
                        <p className="text-neutral-500 text-xs mt-1 flex items-center">
                            <MapPin size={12} className="mr-1 text-neutral-500" /> {hotel.address?.city}, {hotel.address?.state}
                            <span className="mx-2 text-neutral-300">|</span>
                            Owner: {hotel.partnerId?.name || '—'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleStatusToggle}
                        className={`flex-1 md:flex-none px-4 py-2 border rounded-lg text-xs font-medium  transition-colors ${hotel.status === 'suspended'
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {hotel.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>

                </div>
            </div>

            <div className="flex border-b border-neutral-200 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-xs font-medium  transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-neutral-500 hover:text-neutral-600'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && <OverviewTab hotel={hotel} />}
                    {activeTab === 'gallery' && <GalleryTab hotel={hotel} />}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            hotel={hotel}
                            documents={documents}
                            onVerify={handleVerifyDocuments}
                            verifying={verifying}
                        />
                    )}
                    {activeTab === 'rooms' && <RoomsTab rooms={hotel.rooms} />}
                    {activeTab === 'rates' && <RoomRatesManager propertyId={id} />}
                    {activeTab === 'bookings' && <BookingsTab bookings={bookings} propertyType={hotel?.propertyType} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminHotelDetail;
