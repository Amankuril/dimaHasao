/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Trips.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, MoreVertical, Search, X, Eye, UserPlus, MapPin, XCircle, FileText, Route } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { Button, Div, HScroll, Input, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { printHtml } from '../../../../../lib/files';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';

const TAB_SET = ['All', 'Completed', 'Cancelled', 'Upcoming', 'On Trip'];
const COLS = [120, 140, 150, 150, 120, 120, 110, 56];
const LABELS = ['Request ID', 'Date', 'User Name', 'Driver Name', 'Transport', 'Trip Status', 'Payment', ''];
const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const normalizeTab = (tab) => {
  if (tab === 'On Trip') return 'ongoing';
  return tab.toLowerCase();
};
const normalizeRow = (row = {}) => ({
  id: String(row._id || row.id || row.requestId || Math.random()),
  requestId: row.requestId || row.request_id || row.ride_request_id || '--',
  date: row.date || row.createdAt || row.created_at || row.trip_date || row.updatedAt,
  userName: row.userName || row.user_name || row.customer_name || row.user?.name || '--',
  driverName: row.driverName || row.driver_name || row.driver?.name || '--',
  transportType: row.transportType || row.transport_type || row.service_type || row.module || '--',
  tripStatus: String(row.tripStatus || row.trip_status || row.status || '').toUpperCase(),
  paymentOption: String(row.paymentOption || row.payment_option || row.payment_method || 'CASH').toUpperCase(),
});

const DetailRow = ({ label, value }) => (
  <Div className="gap-0.5">
    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
    <Span className="text-sm text-slate-900">{value}</Span>
  </Div>
);

const TripDetailsModal = ({ trip, onClose }) => {
  if (!trip) return null;
  return (
    <Overlay onClose={onClose} className="flex-1 items-center justify-center p-4">
      <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <Div className="flex-row items-center justify-between gap-3 mb-3">
          <Span className="text-base font-semibold text-slate-900 flex-1">Trip Details</Span>
          <Button onClick={onClose} accessibilityLabel="Close" className="w-11 h-11 items-center justify-center rounded-lg">
            <UiIcon as={X} size={18} className="text-slate-500" />
          </Button>
        </Div>
        <Div className="gap-3">
          <DetailRow label="Request ID" value={trip.requestId} />
          <DetailRow label="Date" value={formatDate(trip.date)} />
          <DetailRow label="User Name" value={trip.userName} />
          <DetailRow label="Driver Name" value={trip.driverName} />
          <DetailRow label="Transport Type" value={String(trip.transportType).toLowerCase()} />
          <DetailRow label="Payment Option" value={String(trip.paymentOption).toLowerCase()} />
          <Div className="gap-1 pt-2 border-t border-slate-100">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trip Status</Span>
            <StatusBadge status={String(trip.tripStatus).toLowerCase()} label={String(trip.tripStatus).toLowerCase() || 'unknown'} />
          </Div>
        </Div>
        <Button onClick={onClose} className={`${BTN_SECONDARY} mt-4`}>
          <Span className={BTN_TEXT_SECONDARY}>Close</Span>
        </Button>
      </Div>
    </Overlay>
  );
};
const handlePrintInvoice = (trip) => {
  const formattedDate = formatDate(trip.date);
  printHtml(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${trip.requestId}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 30px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: 800; margin: 0; color: #111827; letter-spacing: 1px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-top: 8px; }
          .details { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .details th, .details td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; text-align: left; }
          .details th { width: 35%; color: #6b7280; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .details td { font-size: 15px; font-weight: 500; }
          .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #e5e7eb; }
          .highlight { font-weight: bold; color: #000; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">TRIP INVOICE</h1>
          <p class="subtitle">Request ID: <span class="highlight">${trip.requestId}</span></p>
        </div>
        <table class="details">
          <tr><th>Date</th><td>${formattedDate}</td></tr>
          <tr><th>Customer</th><td>${trip.userName}</td></tr>
          <tr><th>Driver</th><td>${trip.driverName}</td></tr>
          <tr><th>Transport Type</th><td style="text-transform: capitalize;">${String(trip.transportType).toLowerCase()}</td></tr>
          <tr><th>Payment Method</th><td style="text-transform: capitalize;">${String(trip.paymentOption).toLowerCase()}</td></tr>
          <tr><th>Trip Status</th><td style="text-transform: capitalize;">${String(trip.tripStatus).toLowerCase()}</td></tr>
        </table>
        <div class="footer">
          Thank you for choosing our service.<br/>
          This is a computer generated invoice and requires no signature.
        </div>
      </body>
    </html>
  `);
};

/* The row's action list. On a phone a dropdown anchored to a scrolling table
 * row gets clipped, so the menu opens as a centred sheet instead. */
const ActionMenu = ({ row, onViewDetails, onPrintInvoice }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isCompleted = row.tripStatus === 'COMPLETED';
  const isCancelled = row.tripStatus === 'CANCELLED';
  const isOngoing = row.tripStatus === 'ONGOING' || row.tripStatus === 'ACCEPTED';
  const hasDriver = row.driverName !== '--';
  const assignDisabled = isCompleted || isCancelled || isOngoing || hasDriver;
  return (
    <>
      <Button onClick={() => setIsOpen(!isOpen)} accessibilityLabel={`Actions for ${row.requestId}`} className="w-11 h-11 items-center justify-center rounded-lg">
        <UiIcon as={MoreVertical} size={18} className="text-slate-500" />
      </Button>

      {isOpen && (
        <Overlay onClose={() => setIsOpen(false)} className="flex-1 items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <Div className="w-60 bg-white rounded-xl border border-slate-200 py-1" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={() => {
                setIsOpen(false);
                onViewDetails();
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View Details</Span>
            </Button>
            <Button disabled={assignDisabled} className={`${MENU_ITEM} ${assignDisabled ? 'opacity-40' : ''}`}>
              <UiIcon as={UserPlus} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Assign Driver</Span>
            </Button>
            <Button disabled={!isOngoing} className={`${MENU_ITEM} ${!isOngoing ? 'opacity-40' : ''}`}>
              <UiIcon as={MapPin} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Track Trip</Span>
            </Button>
            <Button disabled={isCompleted || isCancelled} className={`${MENU_ITEM} ${isCompleted || isCancelled ? 'opacity-40' : ''}`}>
              <UiIcon as={XCircle} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Cancel Trip</Span>
            </Button>
            <Div className="h-px bg-slate-100 my-1" />
            <Button
              onClick={() => {
                setIsOpen(false);
                onPrintInvoice();
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={FileText} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Print Invoice</Span>
            </Button>
          </Div>
        </Overlay>
      )}
    </>
  );
};
const Trips = () => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    transportType: '',
    paymentOption: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const [draftFilters, setDraftFilters] = useState({
    transportType: '',
    paymentOption: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getRideRequests({
        page,
        limit,
        tab: normalizeTab(activeTab),
        search,
      });
      const payload = response?.data?.data || response?.data || response || {};
      const results = Array.isArray(payload?.results) ? payload.results : [];
      const paginator = payload?.paginator || {
        current_page: page,
        last_page: 1,
        total: results.length,
      };
      setRows(results.map(normalizeRow));
      setPagination({
        current_page: Number(paginator.current_page || page || 1),
        last_page: Math.max(1, Number(paginator.last_page || 1)),
        total: Math.max(0, Number(paginator.total || results.length || 0)),
      });
    } catch (err) {
      setRows([]);
      setPagination({
        current_page: 1,
        last_page: 1,
        total: 0,
      });
      setError(err?.message || 'Failed to load trip requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, limit, page, search]);
  useEffect(() => {
    setPage(1);
  }, [activeTab, limit, search]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Frontend Filtering
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeFilters.transportType && row.transportType.toLowerCase() !== activeFilters.transportType.toLowerCase()) return false;
      if (activeFilters.paymentOption && row.paymentOption.toLowerCase() !== activeFilters.paymentOption.toLowerCase()) return false;
      if (activeFilters.driverAssigned === 'assigned' && row.driverName === '--') return false;
      if (activeFilters.driverAssigned === 'unassigned' && row.driverName !== '--') return false;
      if (activeFilters.dateFrom || activeFilters.dateTo) {
        const rowDate = new Date(row.date);
        if (!isNaN(rowDate.getTime())) {
          if (activeFilters.dateFrom) {
            const fromDate = new Date(activeFilters.dateFrom);
            if (rowDate < fromDate) return false;
          }
          if (activeFilters.dateTo) {
            const toDate = new Date(activeFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (rowDate > toDate) return false;
          }
        }
      }
      return true;
    });
  }, [rows, activeFilters]);
  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const emptyFilters = {
      transportType: '',
      paymentOption: '',
      driverAssigned: '',
      dateFrom: '',
      dateTo: '',
    };
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setShowFilters(false);
  };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader icon={Route} title="Trip Requests" subtitle="Every ride request across the district" breadcrumb={[{ label: 'Operations' }, { label: 'Trip Requests' }]} />

      <HScroll className="mb-3" contentClassName="flex-row items-center gap-2">
        {TAB_SET.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-11 px-4 rounded-full items-center justify-center ${activeTab === tab ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={`text-sm font-semibold ${activeTab === tab ? 'text-white' : 'text-slate-700'}`}>{tab}</Span>
          </Button>
        ))}
      </HScroll>

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search requests" className="flex-1 text-sm text-slate-900" />
          </Div>
          <Button onClick={() => setShowFilters(!showFilters)} className={BTN_SECONDARY}>
            <UiIcon as={Filter} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>{activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}</Span>
          </Button>
          <Div className="flex-row items-center gap-2">
            <Span className="text-sm text-slate-500">Show</Span>
            <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`${INPUT} w-24`}>
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
          </Div>
        </Toolbar>

        {showFilters ? (
          <Div className="mt-3 pt-3 border-t border-slate-200 gap-3">
            <SectionTitle
              action={
                <Button onClick={() => setShowFilters(false)} accessibilityLabel="Close filters" className="w-11 h-11 items-center justify-center rounded-lg">
                  <UiIcon as={X} size={16} className="text-slate-500" />
                </Button>
              }
            >
              Advanced Filters
            </SectionTitle>

            <Field label="Transport Type">
              <Select
                value={draftFilters.transportType}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    transportType: e.target.value,
                  })
                }
                className={INPUT}
              >
                <Option value="">All Types</Option>
                <Option value="taxi">Taxi</Option>
                <Option value="auto">Auto</Option>
                <Option value="bike">Bike</Option>
                <Option value="bus">Bus</Option>
              </Select>
            </Field>

            <Field label="Payment Option">
              <Select
                value={draftFilters.paymentOption}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    paymentOption: e.target.value,
                  })
                }
                className={INPUT}
              >
                <Option value="">All Methods</Option>
                <Option value="cash">Cash</Option>
                <Option value="online">Online</Option>
                <Option value="wallet">Wallet</Option>
              </Select>
            </Field>

            <Field label="Driver Assignment">
              <Div className="flex-row gap-2">
                {[
                  { value: '', label: 'All' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'unassigned', label: 'Unassigned' },
                ].map((option) => (
                  <Button
                    key={option.label}
                    onClick={() =>
                      setDraftFilters({
                        ...draftFilters,
                        driverAssigned: option.value,
                      })
                    }
                    className={`flex-1 h-11 rounded-lg items-center justify-center border ${draftFilters.driverAssigned === option.value ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
                  >
                    <Span className={`text-sm font-semibold ${draftFilters.driverAssigned === option.value ? 'text-blue-700' : 'text-slate-700'}`}>{option.label}</Span>
                  </Button>
                ))}
              </Div>
            </Field>

            <Div className="grid grid-cols-2 gap-3">
              <Field label="Date From">
                <Input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      dateFrom: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Date To">
                <Input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      dateTo: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>
            </Div>

            <Div className="flex-row gap-2">
              <Button onClick={resetFilters} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button onClick={applyFilters} className={`${BTN_PRIMARY} flex-1`}>
                <Span className={BTN_TEXT_PRIMARY}>Apply Filters</Span>
              </Button>
            </Div>
          </Div>
        ) : null}
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState title="Could not load trip requests" message={error} onRetry={loadRows} />
      ) : filteredRows.length === 0 ? (
        <EmptyState icon={Filter} title="No requests found" message="Try adjusting your active filters or search term." />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {filteredRows.map((row, i) => (
                <Row key={row.id} last={i === filteredRows.length - 1}>
                  <Cell width={COLS[0]} numberOfLines={1}>{row.requestId}</Cell>
                  <Cell width={COLS[1]}>{formatDate(row.date)}</Cell>
                  <Cell width={COLS[2]}>{row.userName}</Cell>
                  <Cell width={COLS[3]}>
                    {row.driverName !== '--' ? (
                      <Span className="text-sm text-slate-700" numberOfLines={2}>
                        {row.driverName}
                      </Span>
                    ) : (
                      <Span className="text-sm text-slate-400">Unassigned</Span>
                    )}
                  </Cell>
                  <Cell width={COLS[4]}>{String(row.transportType).toLowerCase()}</Cell>
                  <Cell width={COLS[5]}>
                    <StatusBadge status={row.tripStatus.toLowerCase()} label={row.tripStatus ? row.tripStatus.toLowerCase() : 'unknown'} />
                  </Cell>
                  <Cell width={COLS[6]}>
                    <StatusBadge tone="neutral" label={row.paymentOption ? row.paymentOption.toLowerCase() : 'cash'} />
                  </Cell>
                  <Cell width={COLS[7]} align="center">
                    <ActionMenu row={row} onViewDetails={() => setSelectedTrip(row)} onPrintInvoice={() => handlePrintInvoice(row)} />
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={pagination.current_page}
            pages={pagination.last_page}
            total={pagination.total}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
          />
        </>
      )}

      <TripDetailsModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </AdminPage>
  );
};
export default Trips;
