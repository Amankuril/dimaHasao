/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/PendingDrivers.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Edit2, Eye, FileText, Filter, Key, MoreVertical, Plus, Search, Trash2, UserCheck, XCircle } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { AnimatePresence } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { Button, Div, H3, Input, Option, Overlay, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
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
const COLS = [170, 140, 140, 130, 150, 80, 130, 130, 60];
const MENU_ITEM = 'w-full flex-row items-center gap-3 px-3 h-11 rounded-lg';
const PendingDrivers = () => {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    vehicleType: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    driverId: null,
    password: '',
    isSubmitting: false,
  });
  const [page, setPage] = useState(1);
  const [paginator, setPaginator] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const openActionMenu = (driverId) => {
    setActiveMenu(driverId);
  };
  const closeMenu = () => {
    setActiveMenu(null);
  };
  const handleAction = async (action, driverId) => {
    const confirmMsg = action === 'delete' ? 'Are you sure you want to delete this pending request?' : 'Are you sure you want to APPROVE this driver?';
    if (action !== 'view' && action !== 'edit' && action !== 'password' && !(await window.confirmAsync(confirmMsg))) return;
    if (action === 'view') {
      navigate(`/taxi/admin/drivers/${driverId}`, {
        state: {
          from: '/admin/drivers/pending',
        },
      });
      return;
    }
    if (action === 'edit') {
      navigate(`/taxi/admin/drivers/edit/${driverId}`, {
        state: {
          from: '/admin/drivers/pending',
        },
      });
      return;
    }
    try {
      if (action === 'password') {
        setPasswordModal((prev) => ({
          ...prev,
          isSubmitting: true,
        }));
      }
      if (action === 'approve') {
        await adminService.updateDriverStatus(driverId, {
          approve: true,
          status: 'approved',
        });
      } else if (action === 'delete') {
        await adminService.deleteDriver(driverId);
      } else if (action === 'password') {
        await adminService.updateDriverPassword(driverId, passwordModal.password);
      }
      if (action !== 'view' && action !== 'edit') {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        if (action === 'password') {
          setPasswordModal({
            isOpen: false,
            driverId: null,
            password: '',
            isSubmitting: false,
          });
        }
        if (action === 'delete' || action === 'approve') {
          await fetchPendingDrivers();
        }
      }
    } catch (err) {
      alert(err?.message || `Network error during ${action}`);
      if (action === 'password')
        setPasswordModal((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
    } finally {
      closeMenu();
    }
  };
  const fetchPendingDrivers = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const responseData = await adminService.getDrivers(nextPage, nextLimit, {
        approve: false,
        search: String(nextSearch || '').trim(),
      });
      const driversList = responseData.data?.results || [];
      const pending = driversList
        .filter((d) => String(d?.onboarding_role || '').toLowerCase() !== 'owner')
        .map((d) => ({
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
          serviceLocation: d.service_location_name || d.city || 'India',
          phone: d.phone || d.mobile || 'N/A',
          transport: d.transport_type || d.register_for || d.transport_type || 'N/A',
          docs: 'View Docs',
          status: String(d.status || '').toUpperCase() || 'PENDING',
          reason: d.rejectionReason || d.rejected_reason || '-',
          rating: d.rating || 0.0,
          registeredAt: d.createdAt || null,
        }));
      setPendingDrivers(pending);
      setPaginator(responseData.data?.paginator || null);
    } catch (err) {
      setError(err?.message || 'Failed to fetch pending drivers');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchPendingDrivers({
      nextPage: 1,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
    setPage(1);
  }, [itemsPerPage]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchPendingDrivers({
        nextPage: 1,
        nextLimit: itemsPerPage,
        nextSearch: searchTerm,
      });
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);
  useEffect(() => {
    fetchPendingDrivers({
      nextPage: page,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
  }, [page]);
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
        icon={UserCheck}
        title="Pending drivers"
        subtitle="Applications waiting for approval"
        breadcrumb={[{ label: 'Drivers' }, { label: 'Pending drivers' }]}
        actions={
          <Button onClick={() => navigate('/taxi/admin/drivers/create')} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add driver</Span>
          </Button>
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
        <ErrorState message={error} onRetry={() => fetchPendingDrivers({ nextPage: page, nextLimit: itemsPerPage, nextSearch: searchTerm })} />
      ) : pendingDrivers.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={searchTerm ? 'No pending drivers match that search' : 'Nothing waiting for approval'}
          message={searchTerm ? 'Try a different name, phone number or location.' : 'New driver applications appear here as they register.'}
          actionLabel={searchTerm ? 'Clear search' : 'Refresh'}
          onAction={searchTerm ? () => setSearchTerm('') : () => fetchPendingDrivers({ nextPage: page, nextLimit: itemsPerPage, nextSearch: searchTerm })}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Name', 'Code', 'Location', 'Mobile', 'Type', 'Docs', 'Status', 'Registered', '']} />
            <TBody>
              {pendingDrivers.map((driver, index) => (
                <Row key={driver.id} last={index === pendingDrivers.length - 1}>
                  <Cell width={COLS[0]}>
                    <P className="text-sm font-medium text-slate-900" numberOfLines={2}>
                      {driver.name}
                    </P>
                  </Cell>
                  <Cell width={COLS[1]}>{driver.driverCode}</Cell>
                  <Cell width={COLS[2]}>{driver.serviceLocation}</Cell>
                  <Cell width={COLS[3]}>{driver.phone}</Cell>
                  <Cell width={COLS[4]}>{driver.transport}</Cell>
                  <Cell width={COLS[5]} align="center">
                    <Button
                      accessibilityLabel={`View documents for ${driver.name}`}
                      onClick={() =>
                        navigate(`/taxi/admin/drivers/${driver.id}?tab=Documents`, {
                          state: {
                            from: '/admin/drivers/pending',
                          },
                        })
                      }
                      className="h-11 w-11 items-center justify-center rounded-lg border border-slate-200"
                    >
                      <UiIcon as={FileText} size={16} className="text-slate-500" />
                    </Button>
                  </Cell>
                  <Cell width={COLS[6]}>
                    <StatusBadge status={driver.status || 'PENDING'} />
                  </Cell>
                  <Cell width={COLS[7]}>{formatDate(driver.registeredAt)}</Cell>
                  <Cell width={COLS[8]} align="center">
                    <Button
                      accessibilityLabel={`Actions for ${driver.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeMenu === driver.id) {
                          closeMenu();
                          return;
                        }
                        openActionMenu(driver.id);
                      }}
                      className="h-11 w-11 items-center justify-center rounded-lg"
                    >
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

      <AnimatePresence>
        {passwordModal.isOpen && (
          <Overlay className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50" onClose={closePasswordModal}>
            <Div className="bg-white rounded-xl w-full max-w-sm border border-slate-200 p-4 gap-4">
              <Div className="flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <H3 className="text-base font-semibold text-slate-900">Update password</H3>
                  <P className="text-xs text-slate-500 mt-0.5">Enter a new password for this driver</P>
                </Div>
                <Button accessibilityLabel="Close" onClick={closePasswordModal} className="h-11 w-11 items-center justify-center rounded-lg">
                  <UiIcon as={XCircle} size={20} className="text-slate-400" />
                </Button>
              </Div>
              <Field label="New password">
                <Input
                  type="text"
                  placeholder="New password"
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
                onClick={() => handleAction('password', passwordModal.driverId)}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className={`${BTN_PRIMARY} w-full ${passwordModal.isSubmitting || !passwordModal.password ? 'opacity-50' : ''}`}
              >
                <Span className={BTN_TEXT_PRIMARY}>{passwordModal.isSubmitting ? 'Updating…' : 'Update password'}</Span>
              </Button>
            </Div>
          </Overlay>
        )}
      </AnimatePresence>

      {activeMenu ? (
        <Overlay className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={closeMenu} onClose={closeMenu}>
          <ScrollDiv className="bg-white border border-slate-200 rounded-xl p-2 w-[240px]" style={{ maxHeight: ACTION_MENU_MAX_HEIGHT }}>
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('approve', driverId);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={CheckCircle2} size={16} className="text-green-700" />
              <Span className="text-sm font-medium text-slate-700">Approve driver</Span>
            </Button>
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('edit', driverId);
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
                const driverId = activeMenu;
                closeMenu();
                handleAction('view', driverId);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View profile</Span>
            </Button>
            <Div className="h-px bg-slate-100 my-1" />
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('delete', driverId);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Trash2} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete request</Span>
            </Button>
          </ScrollDiv>
        </Overlay>
      ) : null}
    </AdminPage>
  );
};
export default PendingDrivers;
