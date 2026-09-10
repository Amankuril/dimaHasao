import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, User, Phone,
    Clock, MapPin, ChevronRight, BedDouble
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';

// --- Card Component ---
const BookingCard = ({ booking }) => {
    const navigate = useNavigate();

    // Property Type helpers
    const pType = (booking.propertyType || '').toLowerCase();
    const isPG = ['pg', 'hostel'].includes(pType);
    const isRent = pType === 'rent';
    const isBuyPlot = ['buy', 'plot'].includes(pType);
    const isInquiry = booking.isInquiry === true;

    // Status Logic
    const rawStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase().trim();
    const inqStatus = (booking.inquiryMetadata?.status || 'new').toLowerCase();

    const getStatusStyle = (s) => {
        if (isInquiry) {
            if (inqStatus === 'new') return { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'New Inquiry' };
            if (inqStatus === 'scheduled') return { color: 'text-purple-600 bg-purple-50 border-purple-100', label: 'Scheduled' };
            if (inqStatus === 'negotiating') return { color: 'text-orange-600 bg-orange-50 border-orange-100', label: 'Negotiating' };
            if (inqStatus === 'sold' || inqStatus === 'rented') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: inqStatus.toUpperCase() };
            return { color: 'text-gray-500 bg-gray-50 border-gray-200', label: inqStatus.toUpperCase() };
        }

        if (s === 'confirmed') return { color: 'text-blue-600 bg-blue-50 border-blue-100', label: isPG ? 'Booked' : 'Confirmed' };
        if (s === 'checked_in') return { color: 'text-purple-600 bg-purple-50 border-purple-100', label: isPG || isRent ? 'Active Tenant' : 'Ongoing' };
        if (s === 'checked_out' || s === 'completed') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Completed' };
        if (s === 'cancelled') return { color: 'text-red-500 bg-red-50 border-red-100', label: 'Cancelled' };
        if (s === 'no_show') return { color: 'text-gray-500 bg-gray-100 border-gray-200', label: 'No Show' };
        if (s === 'pending_payment') return { color: 'text-orange-600 bg-orange-50 border-orange-100', label: 'Payment Pending' };

        return { color: 'text-yellow-600 bg-yellow-50 border-yellow-100', label: s.replace('_', ' ').toUpperCase() };
    };

    const status = getStatusStyle(rawStatus);

    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    // Calculate nights
    const calculateNights = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 1;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    };

    const guestName = booking.userId?.name || 'Guest User';
    const checkInDate = formatDate(booking.checkInDate || booking.checkIn || booking.inquiryMetadata?.preferredDate);
    const checkOutDate = formatDate(booking.checkOutDate || booking.checkOut);
    const nights = calculateNights(booking.checkInDate || booking.checkIn, booking.checkOutDate || booking.checkOut);
    const guestCount = (booking.guests?.adults || 1) + (booking.guests?.children || 0);
    const unitsCount = 1;
    const hotelName = booking.propertyId?.propertyName || booking.propertyId?.name || 'Property';
    const bookingId = booking.bookingId || booking._id?.slice(-8).toUpperCase();

    // Labels
    const secondaryLabel = isBuyPlot ? 'Interested' : (isPG || isRent ? 'Tenant' : 'Guest');
    const durationLabel = isPG || isRent ? (nights >= 30 ? `${Math.round(nights / 30)} Months` : `${nights} Days`) : `${nights} Nights`;
    const unitLabel = isPG ? 'Bed' : (isBuyPlot || isRent ? 'Unit' : 'Room');

    return (
        <div className="bg-white rounded-[24px] p-4 pt-3.5 mb-4 shadow-[0_2px_15px_rgb(0,0,0,0.04)] border border-gray-50">
            {/* Header: ID & Status */}
            <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    ENQUIRY ID: {bookingId}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                    {status.label}
                </span>
            </div>

            {/* Guest & Property Info */}
            <div className="mb-3">
                <div className="flex justify-between items-center">
                    <div 
                        className="flex items-center gap-1.5 cursor-pointer group"
                        onClick={(e) => { e.stopPropagation(); navigate(`/hotel/bookings/${booking._id}`); }}
                    >
                        <h3 className="text-xl font-black text-slate-900 group-hover:opacity-80 transition-opacity leading-none">
                            {guestName}
                        </h3>
                        <ChevronRight size={20} className="text-[#005CA8] group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                    </div>
                    {booking.userId?.phone && (
                        <a
                            href={`tel:${booking.userId.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-[#F5F7F7] text-[#005CA8] flex items-center justify-center hover:bg-[#E8ECEC] active:scale-95 transition-all flex-shrink-0"
                        >
                            <Phone size={14} />
                        </a>
                    )}
                </div>
                <p className="text-[13px] text-gray-500 font-medium tracking-wide mt-1">
                    {hotelName} • <span className="uppercase">{pType}</span>
                </p>
            </div>

            {/* Details Grid */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-[12px] font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                    <Calendar size={15} strokeWidth={2} />
                    <span>{checkInDate} {!isBuyPlot && ` - ${checkOutDate}`}</span>
                </div>
                
                {!isBuyPlot && (
                    <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <div className="flex items-center gap-1.5">
                            <Clock size={15} strokeWidth={2} />
                            <span>{durationLabel}</span>
                        </div>
                    </>
                )}
                
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                    <User size={15} strokeWidth={2} />
                    <span>{isBuyPlot ? '1 Person' : `${guestCount} ${secondaryLabel}s`}</span>
                </div>
                
                {!isBuyPlot && (
                    <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <div className="flex items-center gap-1.5">
                            <BedDouble size={15} strokeWidth={2} />
                            <span>{unitsCount} {unitLabel}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---
const PartnerBookings = () => {
    const [activeTab, setActiveTab] = useState('upcoming');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                // Fetch with server-side filtering
                const data = await bookingService.getPartnerBookings(activeTab);
                setBookings(data);
            } catch (error) {
                console.error('Failed to fetch partner bookings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [activeTab]);

    // Client-side filtering removed as backend handles it
    const filteredBookings = bookings;

    const tabs = [
        { id: 'upcoming', label: 'New Leads' },
        { id: 'in_house', label: 'Ongoing' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">
            <PartnerHeader />

            {/* Filter Tabs */}
            <div className="sticky top-14 z-20 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-100/50 mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeTab === tab.id
                                ? 'bg-[#005CA8] text-white border-[#005CA8] shadow-sm'
                                : 'bg-white text-gray-500 border-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Content */}
            <div className="px-4 mt-2">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005CA8]"></div>
                    </div>
                ) : filteredBookings.length > 0 ? (
                    <div className="space-y-3 animate-fadeIn">
                        {filteredBookings.map((booking, idx) => (
                            <BookingCard key={booking._id || idx} booking={booking} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 opacity-50">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 grayscale">
                            <BedDouble size={32} className="text-white" />
                        </div>
                        <p className="font-bold text-gray-400 text-sm">No {activeTab} enquiries found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerBookings;
