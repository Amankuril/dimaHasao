/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverList.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  FileText,
  Star,
  Plus,
  Eye,
  Edit2,
  Key,
  XCircle,
  Trash2,
  Loader2,
  Filter,
  Users,
} from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { AnimatePresence } from '../../../../../lib/motion';
import {
  Button,
  Div,
  H3,
  Img,
  Input,
  Option,
  Overlay,
  P,
  ScrollDiv,
  Select,
  Span,
  Icon as UiIcon,
} from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import {
  AdminPage,
  PageHeader,
  Card,
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
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
const ACTION_MENU_MAX_HEIGHT = 300;
const COLS = [170, 140, 140, 130, 150, 110, 80, 130, 100, 130, 60];
const MENU_ITEM = 'w-full flex-row items-center gap-3 px-3 h-11 rounded-lg';
const DriverList = ({ mode = 'approved' }) => {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    vehicleType: '',
  });
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    driverId: null,
    password: '',
    isSubmitting: false,
  });
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [paginator, setPaginator] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fetchDrivers = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const responseData = await adminService.getDrivers(nextPage, nextLimit, {
        ...(mode === 'active'
          ? {
              isOnline: true,
            }
          : {
              approve: true,
            }),
        search: String(nextSearch || '').trim(),
      });
      const driversList = responseData.data?.results || [];
      if (responseData.success) {
        const visibleDrivers = mode === 'active' ? driversList.filter((d) => Boolean(d.isOnline)) : driversList;
        const approved = visibleDrivers.map((d) => ({
          id: d._id,
          name: d.name || 'Unknown',
          driverCode:
            d.driver_code ||
            d.referralCode ||
            (d.phone
              ? `DRV${String(d.phone).slice(-4)}${String(d._id || d.id || '')
                  .slice(-6)
                  .toUpperCase()}`.replace(/\W/g, '')
              : 'N/A'),
          serviceLocation: d.service_location_name || d.city || d.service_location?.name || 'India',
          phone: d.phone || d.mobile || 'N/A',
          transportType: d.transport_type || d.register_for || d.vehicle_type || 'All - Bike',
          rating: Number(d.rating_count || d.ratingCount || 0) > 0 ? Number(d.rating || d.average_rating || d.avg_rating || 0) : 0,
          isOnline: Boolean(d.isOnline),
          onlineSelfieImage: d.online_selfie_image || '',
          onlineSelfieCapturedAt: d.online_selfie_captured_at || null,
          registeredAt: d.createdAt || null,
          status: mode === 'active' ? 'Online' : d.approve ? 'Approved' : d.status || 'Approved',
        }));
        setDrivers(approved);
        setPaginator(responseData.data?.paginator || null);
      } else {
        setError(responseData.message || 'Failed to fetch drivers');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchDrivers({
      nextPage: 1,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
    setPage(1);
  }, [itemsPerPage]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDrivers({
        nextPage: 1,
        nextLimit: itemsPerPage,
        nextSearch: searchTerm,
      });
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);
  useEffect(() => {
    fetchDrivers({
      nextPage: page,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
  }, [page]);
  const closeMenu = () => {
    setActiveMenu(null);
  };
  const toggleMenu = (e, userId) => {
    e.stopPropagation();
    if (activeMenu === userId) {
      closeMenu();
      return;
    }
    setActiveMenu(userId);
  };
  const handleAction = async (action, driverId) => {
    const confirmMsg = action === 'delete' ? 'Are you sure you want to delete this driver?' : 'Are you sure you want to disapprove this driver?';
    if (action !== 'password' && !(await window.confirmAsync(confirmMsg))) return;
    try {
      let resData;
      if (action === 'delete') {
        resData = await adminService.deleteDriver(driverId);
      } else if (action === 'disapprove') {
        resData = await adminService.updateDriverStatus(driverId, {
          approve: false,
          status: 'disapproved',
          active: false,
        });
      } else if (action === 'password') {
        setPasswordModal((prev) => ({
          ...prev,
          isSubmitting: true,
        }));
        resData = await adminService.updateDriverPassword(driverId, passwordModal.password);
      }
      if (resData.success) {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        if (action === 'delete' || action === 'disapprove') {
          setDrivers((prev) => prev.filter((d) => d.id !== driverId));
        }
        if (action === 'password') {
          setPasswordModal({
            isOpen: false,
            driverId: null,
            password: '',
            isSubmitting: false,
          });
        }
      } else {
        alert(resData.message || `Failed to ${action}`);
        if (action === 'password')
          setPasswordModal((prev) => ({
            ...prev,
            isSubmitting: false,
          }));
      }
    } catch (err) {
      alert(err.message || `Network error during ${action}`);
      if (action === 'password')
        setPasswordModal((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
    }
  };
  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  const totalPages = Math.max(1, Number(paginator?.last_page || 1));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const totalEntries = Number(paginator?.total || 0);
  const title = mode === 'active' ? 'Active drivers' : 'Approved drivers';
  const closePasswordModal = () =>
    setPasswordModal({
      isOpen: false,
      driverId: null,
      password: '',
      isSubmitting: false,
    });
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Users}
        title={title}
        subtitle={mode === 'active' ? 'Drivers currently online across the district' : 'Every approved driver on the platform'}
        breadcrumb={[{ label: 'Drivers' }, { label: title }]}
        actions={
          mode !== 'active' ? (
            <Button onClick={() => navigate('/taxi/admin/drivers/create')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add driver</Span>
            </Button>
          ) : null
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-1 min-w-[200px] flex-row items-center gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input className={`${INPUT} flex-1`} placeholder="Search by name, phone, or location" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Div>
          <Div className="flex-row items-center gap-2">
            <Span className="text-sm text-slate-500">Show</Span>
            <Select value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))} className={`${INPUT} w-20`}>
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
          </Div>
          <Button onClick={() => setShowFilters(!showFilters)} className={BTN_SECONDARY}>
            <UiIcon as={Filter} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Filters</Span>
          </Button>
        </Toolbar>

        {showFilters && (
          <Div className={`mt-3 pt-3 border-t border-slate-100 gap-3 ${tablet ? 'flex-row' : 'flex-col'}`}>
            <Field label="Date range" className={tablet ? 'flex-1' : ''}>
              <Select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: e.target.value,
                  })
                }
                className={INPUT}
              >
                <Option value="">All Time</Option>
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
              </Select>
            </Field>
            <Field label="Vehicle type" className={tablet ? 'flex-1' : ''}>
              <Select
                value={filters.vehicleType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    vehicleType: e.target.value,
                  })
                }
                className={INPUT}
              >
                <Option value="">All Types</Option>
                <Option value="sedan">Sedan</Option>
                <Option value="suv">SUV</Option>
                <Option value="hatchback">Hatchback</Option>
              </Select>
            </Field>
          </Div>
        )}
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchDrivers({ nextPage: page, nextLimit: itemsPerPage, nextSearch: searchTerm })} />
      ) : drivers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchTerm ? 'No drivers match that search' : 'No drivers yet'}
          message={
            searchTerm
              ? 'Try a different name, phone number or location.'
              : mode === 'active'
                ? 'No driver is online right now. They appear here as they go online.'
                : 'Approved drivers appear here. Add one to get started.'
          }
          actionLabel={searchTerm ? 'Clear search' : mode !== 'active' ? 'Add driver' : undefined}
          onAction={searchTerm ? () => setSearchTerm('') : mode !== 'active' ? () => navigate('/taxi/admin/drivers/create') : undefined}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Name', 'Code', 'Location', 'Mobile', 'Type', 'Selfie', 'Docs', 'Status', 'Rating', 'Registered', '']} />
            <TBody>
              {drivers.map((driver, index) => (
                <Row key={driver.id} last={index === drivers.length - 1}>
                  <Cell width={COLS[0]}>
                    <P className="text-sm font-medium text-slate-900" numberOfLines={2}>
                      {driver.name}
                    </P>
                  </Cell>
                  <Cell width={COLS[1]}>{driver.driverCode}</Cell>
                  <Cell width={COLS[2]}>{driver.serviceLocation}</Cell>
                  <Cell width={COLS[3]}>{driver.phone}</Cell>
                  <Cell width={COLS[4]}>{driver.transportType}</Cell>
                  <Cell width={COLS[5]}>
                    {driver.onlineSelfieImage ? (
                      <Button
                        type="button"
                        accessibilityLabel={`Open ${driver.name} selfie`}
                        onClick={() => window.open(driver.onlineSelfieImage, '_blank', 'noopener,noreferrer')}
                        className="h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                      >
                        <Img src={driver.onlineSelfieImage} alt={`${driver.name} selfie`} className="h-8 w-8 rounded" />
                      </Button>
                    ) : (
                      <Span className="text-xs text-slate-400">No selfie</Span>
                    )}
                  </Cell>
                  <Cell width={COLS[6]} align="center">
                    <Button
                      accessibilityLabel={`View documents for ${driver.name}`}
                      onClick={() => navigate(`/taxi/admin/drivers/${driver.id}?tab=Documents`)}
                      className="h-11 w-11 items-center justify-center rounded-lg border border-slate-200"
                    >
                      <UiIcon as={FileText} size={16} className="text-slate-500" />
                    </Button>
                  </Cell>
                  <Cell width={COLS[7]}>
                    <StatusBadge status={driver.status} />
                  </Cell>
                  <Cell width={COLS[8]}>
                    <Div className="flex-row items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <UiIcon as={Star} key={s} size={11} className={s <= Math.round(driver.rating) ? 'text-amber-500' : 'text-slate-200'} fill={s <= Math.round(driver.rating) ? '#F0B100' : 'none'} />
                      ))}
                    </Div>
                  </Cell>
                  <Cell width={COLS[9]}>{formatDate(driver.registeredAt)}</Cell>
                  <Cell width={COLS[10]} align="center">
                    <Button accessibilityLabel={`Actions for ${driver.name}`} onClick={(e) => toggleMenu(e, driver.id)} className="h-11 w-11 items-center justify-center rounded-lg">
                      <UiIcon as={MoreVertical} size={18} className="text-slate-500" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={safePage}
            pages={totalPages}
            total={totalEntries}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </>
      )}

      {activeMenu ? (
        <Overlay className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={closeMenu} onClose={closeMenu}>
          <ScrollDiv className="bg-white rounded-xl border border-slate-200 p-2 w-[240px]" style={{ maxHeight: ACTION_MENU_MAX_HEIGHT }}>
            <Button
              onClick={() => {
                closeMenu();
                handleAction('disapprove', activeMenu);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={XCircle} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-slate-700">Disapprove</Span>
            </Button>
            <Button
              onClick={() => {
                closeMenu();
                navigate(`/taxi/admin/drivers/edit/${activeMenu}`);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Edit2} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Edit details</Span>
            </Button>
            <Button
              onClick={() => {
                closeMenu();
                setPasswordModal({
                  isOpen: true,
                  driverId: activeMenu,
                  password: '',
                  isSubmitting: false,
                });
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Key} size={16} className="text-blue-600" />
              <Span className="text-sm font-medium text-slate-700">Reset password</Span>
            </Button>
            <Button
              onClick={() => {
                closeMenu();
                navigate(`/taxi/admin/drivers/${activeMenu}`);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View profile</Span>
            </Button>
            <Div className="h-px bg-slate-100 my-1" />
            <Button
              onClick={() => {
                closeMenu();
                handleAction('delete', activeMenu);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Trash2} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete driver</Span>
            </Button>
          </ScrollDiv>
        </Overlay>
      ) : null}

      <AnimatePresence>
        {passwordModal.isOpen && (
          <Overlay className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50" onClose={closePasswordModal}>
            <Div className="bg-white rounded-xl w-full max-w-sm border border-slate-200 p-4 gap-4">
              <Div className="flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <H3 className="text-base font-semibold text-slate-900">Update password</H3>
                  <P className="text-xs text-slate-500 mt-0.5">Set a new password for this driver</P>
                </Div>
                <Button accessibilityLabel="Close" onClick={closePasswordModal} className="h-11 w-11 items-center justify-center rounded-lg">
                  <UiIcon as={XCircle} size={20} className="text-slate-400" />
                </Button>
              </Div>

              <Field label="New password" hint="Minimum 8 characters required.">
                <Input
                  type="text"
                  placeholder="Enter new password"
                  autoFocus
                  className={INPUT}
                  value={passwordModal.password}
                  onChange={(e) =>
                    setPasswordModal((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </Field>

              <Button
                onClick={() => {
                  if (passwordModal.password.length < 4) {
                    alert('Password too short');
                    return;
                  }
                  handleAction('password', passwordModal.driverId);
                }}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className={`${BTN_PRIMARY} w-full ${passwordModal.isSubmitting || !passwordModal.password ? 'opacity-50' : ''}`}
              >
                <UiIcon as={passwordModal.isSubmitting ? Loader2 : Key} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Update password</Span>
              </Button>
            </Div>
          </Overlay>
        )}
      </AnimatePresence>
    </AdminPage>
  );
};
export default DriverList;
