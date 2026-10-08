/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminBookings.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreVertical, XCircle, Eye, Download, CalendarCheck, CheckCircle, Clock } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Input, Link, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  StatCard,
  StatGrid,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';

const COLS = [120, 180, 190, 150, 120, 110, 56];
const LABELS = ['Booking', 'Hotel', 'Guest', 'Dates', 'Status', 'Amount', ''];
const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
          setLoadError(null);
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
          setLoadError(error.message || 'Failed to load bookings');
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

  const menuBooking = bookings.find((b) => b._id === activeDropdown);

  return (
    <AdminPage maxWidth={1200}>
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
        icon={CalendarCheck}
        title="Booking management"
        subtitle={`${totalBookings} reservation${totalBookings === 1 ? '' : 's'} — monitor every stay and its status`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Bookings' }]}
        actions={
          <Button onClick={handleExportCSV} className={BTN_SECONDARY} accessibilityLabel="Export bookings as CSV">
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
          </Button>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total bookings" value={loading ? '—' : (globalStats.total ?? 0).toLocaleString()} hint="All time" icon={CalendarCheck} tone="info" />
        <StatCard label="Confirmed" value={loading ? '—' : (globalStats.confirmed ?? 0).toLocaleString()} hint="Live stays" icon={CheckCircle} tone="success" />
        <StatCard label="Pending approval" value={loading ? '—' : (globalStats.pending ?? 0).toLocaleString()} hint="Needs action" icon={Clock} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search booking id, guest or hotel"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={`${INPUT} w-40`} placeholder="All status">
            <Option value="">All status</Option>
            <Option value="pending">Pending</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="cancelled">Cancelled</Option>
            <Option value="completed">Completed</Option>
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <LoadingState label="Loading bookings…" />
      ) : loadError ? (
        <ErrorState title="Could not load bookings" message={loadError} onRetry={() => fetchBookings(currentPage, filters)} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={filters.search || filters.status ? 'No matching bookings' : 'No bookings yet'}
          message={filters.search || filters.status ? 'No reservation matches the current search or filter.' : 'Reservations appear here as guests book stays.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {bookings.map((booking, i) => (
                <Row key={booking._id} last={i === bookings.length - 1}>
                  <Cell width={COLS[0]}>
                    <Link to={`/hotel/admin/bookings/${booking._id}`} className="py-1">
                      <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                        #{booking.bookingId || booking._id.slice(-6)}
                      </Span>
                    </Link>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Span>
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                      {booking.propertyId?.propertyName || 'Deleted Hotel'}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {booking.propertyId?.address?.city || 'Location N/A'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                      {booking.userId?.name || 'Guest User'}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {booking.userId?.email || 'No email'}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {booking.userId?.phone || 'No phone'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[3]}>
                    <Span className="text-xs text-slate-600" numberOfLines={1}>
                      In: {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                    </Span>
                    <Span className="text-xs text-slate-600" numberOfLines={1}>
                      Out: {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[4]}>
                    <StatusBadge status={booking.bookingStatus} />
                  </Cell>
                  <Cell width={COLS[5]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">₹{booking.totalAmount?.toLocaleString()}</Span>
                  </Cell>
                  <Cell width={COLS[6]} align="center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === booking._id ? null : booking._id);
                      }}
                      accessibilityLabel={`Actions for booking ${booking.bookingId || booking._id.slice(-6)}`}
                      className="w-11 h-11 items-center justify-center rounded-lg"
                    >
                      <UiIcon as={MoreVertical} size={18} className="text-slate-500" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={currentPage}
            pages={totalPages}
            total={totalBookings}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      {activeDropdown && menuBooking ? (
        <Overlay onClose={() => setActiveDropdown(null)} className="flex-1 items-center justify-center p-4 bg-black/40" onClick={() => setActiveDropdown(null)}>
          <Div className="w-60 bg-white rounded-xl border border-slate-200 py-1" onClick={(e) => e.stopPropagation()}>
            <Link to={`/hotel/admin/bookings/${menuBooking._id}`} onClick={() => setActiveDropdown(null)} className={MENU_ITEM}>
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View details</Span>
            </Link>
            {menuBooking.bookingStatus === 'confirmed' || menuBooking.bookingStatus === 'pending' ? (
              <>
                <Div className="h-px bg-slate-100 my-1" />
                <Button onClick={() => handleAction('cancel', menuBooking)} className={MENU_ITEM}>
                  <UiIcon as={XCircle} size={16} className="text-red-600" />
                  <Span className="text-sm font-medium text-red-600">Cancel booking</Span>
                </Button>
              </>
            ) : null}
          </Div>
        </Overlay>
      ) : null}
    </AdminPage>
  );
};
export default AdminBookings;
