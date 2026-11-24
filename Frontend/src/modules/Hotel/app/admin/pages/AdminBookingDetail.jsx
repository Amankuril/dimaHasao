import React, { useState, useEffect } from 'react';
import {
    Calendar, User, Users, MapPin, CreditCard, Clock,
    CheckCircle, XCircle, AlertTriangle, FileText,
    Download, ShieldCheck, Phone, Mail, Loader2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import BookingInvoice from '../../../components/invoice/BookingInvoice';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const AdminBookingDetail = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    const [invoice, setInvoice] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const handleViewInvoice = async () => {
        try {
            setInvoiceLoading(true);
            const data = await adminService.getBookingInvoice(id);
            setInvoice(data.invoice);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to load the invoice');
        } finally {
            setInvoiceLoading(false);
        }
    };

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


    const handleCancel = () => {
        setModalConfig({
            isOpen: true,
            title: 'Cancel booking?',
            message: `Are you sure you want to cancel booking #${booking.bookingId}? This will trigger any applicable refund processes.`,
            type: 'danger',
            confirmText: 'Yes, cancel booking',
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
            <Loader2 className="animate-spin text-neutral-400" size={24} strokeWidth={1.5} />
            <p className="mt-1 text-sm text-neutral-500">Loading booking</p>
        </div>
    );

    if (!booking) return (
        <div className="text-center py-20">
            <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-medium text-neutral-900">Booking not found</h2>
            <Link to="/hotel/admin/bookings" className="mt-6 inline-block text-black font-medium text-xs border-b-2 border-black pb-1">Back to bookings</Link>
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
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Link to="/hotel/admin/bookings" className="hover:text-black transition-colors">Bookings</Link>
                <span>/</span>
                <span className="text-black">#{booking.bookingId || booking._id.slice(-6)}</span>
            </div>

            {invoice && (
                <div className="fixed inset-0 z-[200] bg-neutral-900/50 overflow-y-auto p-4" onClick={() => setInvoice(null)}>
                    <div
                        className="max-w-3xl mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <BookingInvoice invoice={invoice} onClose={() => setInvoice(null)} />
                    </div>
                </div>
            )}

            {/* Header Card */}
            <div className="bg-white rounded-xl p-6 border border-neutral-900/[0.08] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-medium text-neutral-900">Booking <span className="font-mono">#{booking.bookingId || booking._id.slice(-6)}</span></h1>
                        <StatusDot status={booking.bookingStatus || booking.status} />
                    </div>
                    <p className="text-xs text-neutral-500">Booked on {new Date(booking.createdAt).toLocaleDateString()} • {new Date(booking.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleViewInvoice}
                        disabled={invoiceLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-60"
                    >
                        <Download size={14} /> {invoiceLoading ? 'Loading…' : 'Invoice'}
                    </button>
                    {((booking.bookingStatus || booking.status) === 'confirmed' || (booking.bookingStatus || booking.status) === 'pending') && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                            Cancel booking
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col: Main Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stay Details */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 text-neutral-500 text-xs flex items-center gap-2">
                            <Calendar size={14} /> Stay details
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Check-in</p>
                                <p className="text-lg font-medium text-neutral-900">{new Date(booking.checkInDate || booking.checkIn).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Check-out</p>
                                <p className="text-lg font-medium text-neutral-900">{new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2 pt-4 border-t border-neutral-100">
                                <p className="text-sm font-medium text-neutral-900 mb-1">Hotel: {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted property'}</p>
                                <p className="text-xs text-neutral-500 flex items-center gap-1">
                                    <MapPin size={12} /> {booking.propertyId?.address?.fullAddress || `${booking.propertyId?.address?.city}, ${booking.propertyId?.address?.state}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 text-neutral-500 text-xs flex items-center gap-2">
                            <User size={14} /> Guest information
                        </div>
                        <div className="p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium">
                                {booking.userId?.name?.charAt(0) || 'G'}
                            </div>
                            <div>
                                <h4 className="font-medium text-neutral-900 text-lg">{booking.userId?.name || 'Guest'}</h4>
                                <div className="flex flex-col gap-1 mt-1 font-medium text-xs">
                                    <p className="text-neutral-500 flex items-center gap-2">
                                        <Mail size={12} /> {booking.userId?.email || 'No email provided'}
                                    </p>
                                    <p className="text-neutral-500 flex items-center gap-2">
                                        <Phone size={12} /> {booking.userId?.phone || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Payment */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 text-neutral-500 text-xs flex items-center gap-2">
                            <CreditCard size={14} /> Payment summary
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-neutral-500">Total calculation</span>
                                <span className="text-neutral-900">₹{booking.totalAmount?.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-neutral-500">Taxes & fees</span>
                                <span className="text-neutral-900">Included</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-emerald-600">Payment status</span>
                                <span className="text-emerald-700">Paid</span>
                            </div>
                            <div className="pt-3 border-t border-neutral-100 flex justify-between items-center">
                                <span className="font-medium text-neutral-900 text-xs">Total amount</span>
                                <span className="font-mono text-xl font-medium text-neutral-900 tabular-nums">₹{booking.totalAmount?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="pt-2">
                                <span className="flex items-center justify-center w-full py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-100">
                                    <ShieldCheck size={12} className="mr-1" /> Payment verified
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                        <h4 className="font-medium text-neutral-900 text-xs mb-2 flex items-center gap-1">
                            <AlertTriangle size={14} /> Admin note
                        </h4>
                        <p className="text-xs font-medium text-[#0a4d2b] leading-relaxed">
                            System verified booking. This transaction is secured and final. Review any cancellation policies before manual intervention.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBookingDetail;
