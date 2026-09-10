import React, { useState, useEffect } from 'react';
import {
    Calendar, User, Users, MapPin, CreditCard, Clock,
    CheckCircle, XCircle, AlertTriangle, FileText,
    Download, ShieldCheck, Phone, Mail, Loader2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminBookingDetail = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getBookingDetails(id);
            if (data.success) {
                setBooking(data.booking);
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
            toast.error('Failed to load booking information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingDetails();
    }, [id]);

    // Status Colors
    const getStatusColor = (s) => {
        if (s === 'confirmed') return 'text-green-600 bg-green-50 border-green-200 font-bold';
        if (s === 'cancelled') return 'text-red-600 bg-red-50 border-red-200 font-bold';
        if (s === 'completed') return 'text-blue-600 bg-blue-50 border-blue-200 font-bold';
        return 'text-amber-600 bg-amber-50 border-amber-200 font-bold';
    };

    const handleCancel = () => {
        setModalConfig({
            isOpen: true,
            title: 'Cancel Booking?',
            message: `Are you sure you want to cancel booking #${booking.bookingId}? This will trigger any applicable refund processes.`,
            type: 'danger',
            confirmText: 'Yes, Cancel Booking',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateBookingStatus(booking._id, 'cancelled');
                    if (res.success) {
                        toast.success('Booking cancelled successfully');
                        fetchBookingDetails();
                    }
                } catch {
                    toast.error('Failed to cancel booking');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-gray-400" size={48} />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading booking details...</p>
        </div>
    );

    if (!booking) return (
        <div className="text-center py-20">
            <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Booking Not Found</h2>
            <Link to="/admin/bookings" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Bookings</Link>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Nav */}
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to="/admin/bookings" className="hover:text-black transition-colors">Bookings</Link>
                <span>/</span>
                <span className="text-black">#{booking.bookingId || booking._id.slice(-6)}</span>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900 uppercase">Booking #{booking.bookingId || booking._id.slice(-6)}</h1>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusColor(booking.bookingStatus || booking.status)} flex items-center gap-1`}>
                            {(booking.bookingStatus || booking.status) === 'confirmed' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {booking.bookingStatus || booking.status}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">Booked on {new Date(booking.createdAt).toLocaleDateString()} • {new Date(booking.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors">
                        <Download size={14} /> Download Receipt
                    </button>
                    {((booking.bookingStatus || booking.status) === 'confirmed' || (booking.bookingStatus || booking.status) === 'pending') && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100 transition-colors"
                        >
                            Cancel Booking
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col: Main Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stay Details */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <Calendar size={14} /> Stay Details
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-in</p>
                                <p className="text-lg font-bold text-gray-900">{new Date(booking.checkInDate || booking.checkIn).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-out</p>
                                <p className="text-lg font-bold text-gray-900">{new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2 pt-4 border-t border-gray-100">
                                <p className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-tight">Hotel: {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Property'}</p>
                                <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase">
                                    <MapPin size={12} /> {booking.propertyId?.address?.fullAddress || `${booking.propertyId?.address?.city}, ${booking.propertyId?.address?.state}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <User size={14} /> Guest Information
                        </div>
                        <div className="p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold uppercase">
                                {booking.userId?.name?.charAt(0) || 'G'}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{booking.userId?.name || 'Guest User'}</h4>
                                <div className="flex flex-col gap-1 mt-1 font-bold uppercase text-[10px]">
                                    <p className="text-gray-400 flex items-center gap-2">
                                        <Mail size={12} /> {booking.userId?.email || 'No email provided'}
                                    </p>
                                    <p className="text-gray-400 flex items-center gap-2">
                                        <Phone size={12} /> {booking.userId?.phone || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Payment */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <CreditCard size={14} /> Payment Summary
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-400">Total Calculation</span>
                                <span className="text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-400">Taxes & Fees</span>
                                <span className="text-gray-900">Included</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-emerald-600">Payment Status</span>
                                <span className="text-emerald-700">PAID</span>
                            </div>
                            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-900 uppercase text-xs">Total Amount</span>
                                <span className="text-xl font-bold text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div className="pt-2">
                                <span className="flex items-center justify-center w-full py-1.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100 uppercase">
                                    <ShieldCheck size={12} className="mr-1" /> Payment Verified
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 text-[10px] uppercase mb-2 flex items-center gap-1">
                            <AlertTriangle size={14} /> Admin Note
                        </h4>
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
                            System verified booking. This transaction is secured and final. Review any cancellation policies before manual intervention.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBookingDetail;
