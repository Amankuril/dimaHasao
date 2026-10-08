/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Ongoing.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Filter, MoreVertical, Search, CheckCircle, MapPin, XCircle, Eye, UserPlus, User, Truck, X } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { Button, Div, HScroll, Input, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
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
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';

const TAB_SET = ['All', 'Accepted', 'Upcoming', 'Ongoing'];
const COLS = [120, 140, 150, 150, 120, 120, 110, 56];
const LABELS = ['Request ID', 'Date', 'User Name', 'Driver Name', 'Transport', 'Trip Status', 'Payment', ''];
const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const optionsDate = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  const optionsTime = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  const dPart = d.toLocaleDateString('en-GB', optionsDate);
  const tPart = d.toLocaleTimeString('en-US', optionsTime);
  return `${dPart} • ${tPart}`;
};

const DetailRow = ({ label, value, icon: IconCmp }) => (
  <Div className="gap-0.5">
    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
    <Div className="flex-row items-center gap-1.5">
      {IconCmp ? <UiIcon as={IconCmp} size={14} className="text-slate-400" /> : null}
      <Span className="text-sm text-slate-900 flex-1" numberOfLines={2}>
        {value}
      </Span>
    </Div>
  </Div>
);

const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;
  return (
    <Overlay onClose={onClose} className="flex-1 items-center justify-center p-4">
      <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <Div className="flex-row items-center justify-between gap-3 mb-3">
          <Span className="text-base font-semibold text-slate-900 flex-1">Request Details</Span>
          <Button onClick={onClose} accessibilityLabel="Close" className="w-11 h-11 items-center justify-center rounded-lg">
            <UiIcon as={X} size={18} className="text-slate-500" />
          </Button>
        </Div>

        <Div className="gap-3">
          <Div className="flex-row items-center justify-between gap-3">
            <DetailRow label="Request ID" value={request.requestId || 'N/A'} />
            <StatusBadge
              status={String(request.tripStatus || '').toLowerCase()}
              label={String(request.tripStatus || 'unknown').replace('_', ' ').toLowerCase()}
            />
          </Div>
          <DetailRow label="Date & Time" value={formatDate(request.date)} />
          <DetailRow label="Transport" value={String(request.transportType || '').toLowerCase()} icon={Truck} />
          <DetailRow label="Customer" value={request.userName || 'N/A'} icon={User} />
          <DetailRow label="Driver" value={request.driverName || 'N/A'} icon={User} />
          <Div className="gap-1">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Option</Span>
            <StatusBadge tone="neutral" label={String(request.paymentOption || 'cash').toLowerCase()} />
          </Div>
        </Div>

        <Button onClick={onClose} className={`${BTN_SECONDARY} mt-4`}>
          <Span className={BTN_TEXT_SECONDARY}>Close</Span>
        </Button>
      </Div>
    </Overlay>
  );
};

/* The row's action list. A dropdown anchored to a sideways-scrolling table row
 * gets clipped on a phone, so the menu opens as a centred sheet. */
const ActionMenu = ({ row, onViewDetails, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleNotImplemented = (action) => {
    toast.error(`Backend API for '${action}' is not implemented yet.`);
    setIsOpen(false);
  };
  const isCompleted = row.tripStatus === 'COMPLETED';
  const isCancelled = row.tripStatus === 'CANCELLED';
  const isOngoing = row.tripStatus === 'ON_TRIP' || row.tripStatus === 'ONGOING';
  const hasDriver = row.driverName && row.driverName !== '--' && row.driverName !== 'N/A';
  const assignDisabled = isCompleted || isCancelled || isOngoing || hasDriver;
  const cancelDisabled = isCompleted || isCancelled;
  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        accessibilityLabel={`Actions for ${row.requestId || 'this request'}`}
        className="w-11 h-11 items-center justify-center rounded-lg"
      >
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
            <Button disabled={assignDisabled} onClick={() => handleNotImplemented('Assign Driver')} className={`${MENU_ITEM} ${assignDisabled ? 'opacity-40' : ''}`}>
              <UiIcon as={UserPlus} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Assign Driver</Span>
            </Button>
            <Button onClick={() => handleNotImplemented('Change Status')} className={MENU_ITEM}>
              <UiIcon as={CheckCircle} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Change Status</Span>
            </Button>
            <Button disabled={!isOngoing} onClick={() => handleNotImplemented('Track Request')} className={`${MENU_ITEM} ${!isOngoing ? 'opacity-40' : ''}`}>
              <UiIcon as={MapPin} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Track Request</Span>
            </Button>
            <Div className="h-px bg-slate-100 my-1" />
            <Button disabled={cancelDisabled} onClick={() => handleNotImplemented('Cancel Request')} className={`${MENU_ITEM} ${cancelDisabled ? 'opacity-40' : ''}`}>
              <UiIcon as={XCircle} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Cancel Request</Span>
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                onDelete(row);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={XCircle} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete Request</Span>
            </Button>
          </Div>
        </Overlay>
      )}
    </>
  );
};
const Ongoing = () => {
  const { tablet } = useLayoutWidth();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftFilters, setDraftFilters] = useState({
    status: '',
    transportType: '',
    paymentType: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const [activeFilters, setActiveFilters] = useState({
    status: '',
    transportType: '',
    paymentType: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const loadRows = React.useCallback(async () => {
    let active = true;
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getOngoingRides({
        limit,
        tab: activeTab.toLowerCase(),
        search,
        ...activeFilters,
      });
      const data = response?.data?.data || response?.data || response;
      if (!active) return;
      setRows(data?.results || []);
    } catch (err) {
      if (active) {
        setError(err?.message || 'Failed to load ongoing rides');
        setRows([]);
      }
    } finally {
      if (active) setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [activeTab, limit, search, activeFilters]);
  useEffect(() => {
    const cleanup = loadRows();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [loadRows]);
  const handleDelete = async (request) => {
    const confirmed = await window.confirmAsync(`Delete request ${request.requestId}? This will remove it for both rider and driver.`);
    if (!confirmed) return;
    try {
      await adminService.deleteOngoingRide(request.id);
      toast.success('Request deleted successfully');
      setRows((prev) => prev.filter((row) => row.id !== request.id));
    } catch (err) {
      toast.error(err?.message || 'Failed to delete request');
    }
  };
  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const emptyFilters = {
      status: '',
      transportType: '',
      paymentType: '',
      driverAssigned: '',
      dateFrom: '',
      dateTo: '',
    };
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setShowFilters(false);
  };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const filterCols = tablet ? 2 : 1;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Truck}
        title="Ongoing Requests"
        subtitle="Manage and track active rides and deliveries"
        breadcrumb={[{ label: 'Operations' }, { label: 'Ongoing Requests' }]}
      />

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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests" className="flex-1 text-sm text-slate-900" />
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

            <Div className={`grid grid-cols-${filterCols} gap-3`}>
              <Field label="Status">
                <Select
                  value={draftFilters.status}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      status: e.target.value,
                    })
                  }
                  className={INPUT}
                >
                  <Option value="">All Statuses</Option>
                  <Option value="accepted">Accepted</Option>
                  <Option value="upcoming">Upcoming</Option>
                  <Option value="ongoing">Ongoing</Option>
                </Select>
              </Field>

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
                  <Option value="bike">Bike</Option>
                  <Option value="auto">Auto</Option>
                </Select>
              </Field>

              <Field label="Payment Type">
                <Select
                  value={draftFilters.paymentType}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      paymentType: e.target.value,
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
                <Span className={BTN_TEXT_SECONDARY}>Clear Filters</Span>
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
        <ErrorState title="Could not load ongoing requests" message={error} onRetry={loadRows} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Truck} title="No ongoing requests found" message="Try adjusting your filters or search term." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {rows.map((row, rowIndex) => (
              <Row key={row.id || row.requestId || rowIndex} last={rowIndex === rows.length - 1} onPress={() => setSelectedRequest(row)}>
                <Cell width={COLS[0]} numberOfLines={1}>{row.requestId || '-'}</Cell>
                <Cell width={COLS[1]}>{formatDate(row.date)}</Cell>
                <Cell width={COLS[2]}>{row.userName || '-'}</Cell>
                <Cell width={COLS[3]}>{row.driverName || '--'}</Cell>
                <Cell width={COLS[4]}>{String(row.transportType || '').toLowerCase()}</Cell>
                <Cell width={COLS[5]}>
                  <StatusBadge
                    status={String(row.tripStatus || '').toLowerCase()}
                    label={row.tripStatus ? String(row.tripStatus).replace('_', ' ').toLowerCase() : 'unknown'}
                  />
                </Cell>
                <Cell width={COLS[6]}>
                  <StatusBadge tone="neutral" label={row.paymentOption ? String(row.paymentOption).toLowerCase() : 'cash'} />
                </Cell>
                <Cell width={COLS[7]} align="center">
                  <ActionMenu row={row} onViewDetails={() => setSelectedRequest(row)} onDelete={handleDelete} />
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </AdminPage>
  );
};
export default Ongoing;
