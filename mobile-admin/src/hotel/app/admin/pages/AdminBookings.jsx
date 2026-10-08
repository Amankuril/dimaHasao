/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminBookings.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from '../../../../lib/motion';
import { Search, MoreVertical, CheckCircle, XCircle, Clock, ArrowRight, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import {
  Button,
  Div,
  H2,
  H3,
  Input,
  Link,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
const BookingStatusBadge = ({ status }) => {
  const styles = {
    confirmed: 'bg-green-100 text-green-700 border-green-200 font-bold',
    pending: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
    cancelled: 'bg-red-100 text-red-700 border-red-200 font-bold',
    completed: 'bg-blue-100 text-blue-700 border-blue-200 font-bold',
    refunded: 'bg-gray-100 text-gray-700 border-gray-200 font-bold',
  };
  const icons = {
    confirmed: <UiIcon as={CheckCircle} size={10} className="mr-1" />,
    pending: <UiIcon as={Clock} size={10} className="mr-1" />,
    cancelled: <UiIcon as={XCircle} size={10} className="mr-1" />,
    completed: <UiIcon as={CheckCircle} size={10} className="mr-1" />,
    refunded: <UiIcon as={ArrowRight} size={10} className="mr-1" />,
  };
  return (
    <Span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status}
    </Span>
  );
};
const MetricCard = ({ label, value, subLabel, loading }) => (
  <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
    <P className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</P>
    <Div className="flex items-baseline gap-2">
      {loading ? (
        <Div className="h-8 w-16 bg-gray-50 animate-pulse rounded-md"></Div>
      ) : (
        <H3 className="text-2xl font-bold text-gray-900 uppercase">
          {typeof value === 'number' && label.includes('REVENUE') ? `₹${(value ?? 0).toLocaleString()}` : (value ?? 0).toLocaleString()}
        </H3>
      )}
      {subLabel && <Span className="text-[10px] font-bold uppercase text-gray-400">{subLabel}</Span>}
    </Div>
  </Div>
);
const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });

  // For metrics, we still fetch all or get from a dashboard sync.
  // Assuming we want fresh metrics for current view or global stats from a separate call.
  // For now, let's just use the current page for simple stats if needed, or better, another call.
  // For simplicity, let's keep a metric card for global stats.
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    confirmed: 0,
    completed: 0,
    pending: 0,
  });
  const fetchBookings = useCallback(
    async (page, currentFilters) => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        setLoading(true);
        const [bookingsRes, statsRes] = await Promise.all([
          adminService.getBookings({
            page,
            limit,
            search: currentFilters.search,
            status: currentFilters.status,
          }),
          adminService.getDashboardStats(),
        ]);
        if (bookingsRes.success) {
          setBookings(bookingsRes.bookings);
          setTotalBookings(bookingsRes.total);
          setTotalPages(Math.ceil(bookingsRes.total / limit));
        }
        if (statsRes.success) {
          setGlobalStats({
            total: statsRes.stats.totalBookings,
            confirmed: statsRes.stats.confirmedBookings,
            completed: 0,
            pending: statsRes.stats.totalBookings - statsRes.stats.confirmedBookings,
          });
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Error fetching bookings:', error);
          toast.error('Failed to load bookings');
        }
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(currentPage, filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, filters, fetchBookings]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      const res = await adminService.updateBookingStatus(bookingId, newStatus);
      if (res.success) {
        toast.success(`Booking ${newStatus} successfully`);
        fetchBookings(currentPage, filters);
      }
    } catch {
      toast.error('Failed to update booking status');
    }
  };
  const handleAction = (action, booking) => {
    setActiveDropdown(null);
    if (action === 'cancel') {
      setModalConfig({
        isOpen: true,
        title: 'Cancel Booking?',
        message: `Are you sure you want to cancel booking #${booking.bookingId}? This will notify both the guest and the partner.`,
        type: 'danger',
        confirmText: 'Cancel Booking',
        onConfirm: () => handleUpdateStatus(booking._id, 'cancelled'),
      });
    }
  };
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'Booking ID', 'Hotel', 'Guest', 'Phone', 'Check-In', 'Check-Out', 'Status', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...bookings.map((b) =>
        [
          b._id,
          b.bookingId,
          `"${b.propertyId?.propertyName || 'Deleted Hotel'}"`,
          `"${b.userId?.name || 'Guest Details Missing'}"`,
          b.userId?.phone || 'N/A',
          new Date(b.checkInDate).toLocaleDateString(),
          new Date(b.checkOutDate).toLocaleDateString(),
          b.bookingStatus,
          b.totalAmount,
        ].join(','),
      ),
    ].join('\n');
    saveTextFile(`bookings-export-${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
    toast.success('CSV exported successfully');
  };
  return (
    <ScrollDiv className="space-y-6 relative pb-10 uppercase tracking-tight" onClick={() => setActiveDropdown(null)}>
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

      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900 uppercase">Booking Management ({totalBookings})</H2>
          <P className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Monitor all reservations and their current statuses.</P>
        </Div>
        <Div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UiIcon as={Download} size={14} /> Export CSV
          </Button>
        </Div>
      </Div>

      <Div className="flex flex-col md:flex-row gap-4 mb-6">
        <MetricCard label="Total Bookings" value={globalStats.total} subLabel="GLOBAL" loading={loading} />
        <MetricCard label="Confirmed" value={globalStats.confirmed} subLabel="LIVE" loading={loading} />
        <MetricCard label="Pending Approval" value={globalStats.pending} subLabel="NEEDS ACTION" loading={loading} />
      </Div>

      <Div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <Div className="relative flex-1">
          <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search via ID, Guest or Hotel Name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
          />
        </Div>
        <Div className="flex gap-2 w-full md:w-auto">
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
          >
            <Option value="">All Status</Option>
            <Option value="pending">Pending</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="cancelled">Cancelled</Option>
            <Option value="completed">Completed</Option>
          </Select>
        </Div>
      </Div>

      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <Table cols={[130, 190, 190, 150, 130, 110, 80]} className="w-full text-left border-collapse">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                <Th className="p-4">Booking ID</Th>
                <Th className="p-4">Hotel Name</Th>
                <Th className="p-4">Guest Info</Th>
                <Th className="p-4">Dates</Th>
                <Th className="p-4">Status</Th>
                <Th className="p-4 text-right">Amount</Th>
                <Th className="p-4 text-center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Tr key={i} className="animate-pulse">
                    <Td colSpan="7" className="p-4">
                      <Div className="h-10 bg-gray-50 rounded-lg"></Div>
                    </Td>
                  </Tr>
                ))
              ) : (
                <AnimatePresence>
                  {bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <Tr key={booking._id} className="transition-colors group relative font-bold">
                        <Td className="p-4">
                          <Link
                            to={`/hotel/admin/bookings/${booking._id}`}
                            className="font-mono text-xs font-bold text-gray-900 hover:underline uppercase tracking-tight"
                          >
                            #{booking.bookingId || booking._id.slice(-6)}
                          </Link>
                          <P className="text-[10px] text-gray-400 mt-0.5 font-bold">{new Date(booking.createdAt).toLocaleDateString()}</P>
                        </Td>
                        <Td className="p-4">
                          <Div className="flex flex-col">
                            <Span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                              {booking.propertyId?.propertyName || 'Deleted Hotel'}
                            </Span>
                            <Span className="text-[10px] text-gray-400 font-semibold uppercase">{booking.propertyId?.address?.city || 'Location N/A'}</Span>
                          </Div>
                        </Td>
                        <Td className="p-4">
                          <Div className="flex flex-col">
                            <P className="text-sm font-bold text-gray-900 uppercase tracking-tight">{booking.userId?.name || 'Guest User'}</P>
                            <P className="text-[10px] text-gray-400 font-bold uppercase">{booking.userId?.email || 'No Email'}</P>
                            <P className="text-[10px] text-gray-400 font-bold uppercase">{booking.userId?.phone || 'No Phone'}</P>
                          </Div>
                        </Td>
                        <Td className="p-4">
                          <Div className="text-[10px] text-gray-600 flex flex-col gap-1 font-bold uppercase">
                            <Span className="flex items-center gap-1">
                              IN: {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'}
                            </Span>
                            <Span className="flex items-center gap-1">
                              OUT: {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}
                            </Span>
                          </Div>
                        </Td>
                        <Td className="p-4">
                          <BookingStatusBadge status={booking.bookingStatus} />
                        </Td>
                        <Td className="p-4 text-right font-bold text-gray-900 text-sm">₹{booking.totalAmount?.toLocaleString()}</Td>
                        <Td className="p-4 text-center relative">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === booking._id ? null : booking._id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                          >
                            <UiIcon as={MoreVertical} size={16} />
                          </Button>

                          {activeDropdown === booking._id && (
                            <Div className="absolute right-8 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                              <Link
                                to={`/hotel/admin/bookings/${booking._id}`}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700"
                              >
                                <UiIcon as={Eye} size={14} /> View Details
                              </Link>
                              {(booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'pending') && (
                                <Button
                                  onClick={() => handleAction('cancel', booking)}
                                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                                >
                                  <UiIcon as={XCircle} size={14} /> Cancel Booking
                                </Button>
                              )}
                            </Div>
                          )}
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan="7" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        No bookings found matching filters.
                      </Td>
                    </Tr>
                  )}
                </AnimatePresence>
              )}
            </Tbody>
        </Table>

        {/* Pagination */}
        {!loading && bookings.length > 0 && (
          <Div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <P className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalBookings)} of {totalBookings} bookings
            </P>
            <Div className="flex items-center gap-1">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
              >
                <UiIcon as={ChevronLeft} size={16} />
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
              >
                <UiIcon as={ChevronRight} size={16} />
              </Button>
            </Div>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
};
export default AdminBookings;
