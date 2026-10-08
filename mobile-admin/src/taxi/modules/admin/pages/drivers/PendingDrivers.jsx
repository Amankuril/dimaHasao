/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/PendingDrivers.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, Edit2, Eye, FileText, Filter, Key, Lock, MoreVertical, Plus, Search, Star, Trash2, XCircle } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { AnimatePresence } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import {
  Button,
  Div,
  H1,
  H3,
  Input,
  Label,
  Option,
  Overlay,
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
} from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const ACTION_MENU_MAX_HEIGHT = 300;
const PendingDrivers = () => {
  const navigate = useNavigate();
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
  const inputClass =
    'w-full sm:w-[320px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors';
  const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
  const totalPages = Math.max(1, Number(paginator?.last_page || 1));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const totalEntries = Number(paginator?.total || 0);
  const perPage = Number(paginator?.per_page || itemsPerPage);
  const startIndex = (safePage - 1) * perPage;
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + pendingDrivers.length, totalEntries);
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-3 lg:p-4 font-sans text-gray-900">
      {error && <Div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</Div>}

      <Div className="mb-3">
        <Div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={10} />
          <Span className="text-gray-700 font-medium">Pending Drivers</Span>
        </Div>
        <Div className="flex items-center justify-between gap-3">
          <H1 className="text-base text-gray-900 font-bold">Pending Drivers</H1>
          <Button
            onClick={() => navigate('/taxi/admin/drivers/create')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-black font-semibold bg-yellow-400 rounded-md shadow-sm hover:bg-yellow-500 transition-colors"
          >
            <UiIcon as={Plus} size={14} /> Add Drivers
          </Button>
        </Div>
      </Div>

      <Div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
        <Div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Div className="relative w-full sm:w-auto">
            <UiIcon as={Search} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="w-full sm:w-[280px] pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
              placeholder="Search by name, phone, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Div>

          <Div className="flex items-center gap-2 w-full sm:w-auto">
            <Div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Span>Show</Span>
              <Select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                className="border border-gray-200 rounded-md px-1.5 py-1 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
              >
                <Option value={10}>10</Option>
                <Option value={25}>25</Option>
                <Option value={50}>50</Option>
              </Select>
            </Div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-colors ml-auto sm:ml-0"
            >
              <UiIcon as={Filter} size={14} /> Filters
            </Button>
          </Div>
        </Div>

        {/* Filters Panel */}
        {showFilters && (
          <Div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Div>
              <Label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date Range</Label>
              <Select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: e.target.value,
                  })
                }
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-gray-50 outline-none focus:border-yellow-400 focus:bg-white"
              >
                <Option value="">All Time</Option>
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
              </Select>
            </Div>
            <Div>
              <Label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vehicle Type</Label>
              <Select
                value={filters.vehicleType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    vehicleType: e.target.value,
                  })
                }
                className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-gray-50 outline-none focus:border-yellow-400 focus:bg-white"
              >
                <Option value="">All Types</Option>
                <Option value="sedan">Sedan</Option>
                <Option value="suv">SUV</Option>
                <Option value="hatchback">Hatchback</Option>
              </Select>
            </Div>
          </Div>
        )}
      </Div>

      <Div className="bg-white rounded-lg border border-gray-200 overflow-visible">
        <Div>
          <Table cols={[170, 140, 140, 130, 150, 80, 120, 130, 60]} className="w-full text-left border-collapse whitespace-nowrap">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <Th className="px-3 py-2">Name</Th>
                <Th className="px-3 py-2">Code</Th>
                <Th className="px-3 py-2">Location</Th>
                <Th className="px-3 py-2">Mobile</Th>
                <Th className="px-3 py-2">Type</Th>
                <Th className="px-3 py-2 text-center">Docs</Th>
                <Th className="px-3 py-2 text-center">Status</Th>
                <Th className="px-3 py-2">Registered</Th>
                <Th className="px-3 py-2 text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {isLoading ? (
                <Tr>
                  <Td colSpan="9" className="px-3 py-6 text-center text-gray-400">
                    Loading pending drivers...
                  </Td>
                </Tr>
              ) : pendingDrivers.length === 0 ? (
                <Tr>
                  <Td colSpan="9" className="px-3 py-6 text-center text-gray-400">
                    No pending drivers found.
                  </Td>
                </Tr>
              ) : (
                pendingDrivers.map((driver) => (
                  <Tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-3 py-1.5 font-medium text-gray-900">{driver.name}</Td>
                    <Td className="px-3 py-1.5">
                      <Span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        {driver.driverCode}
                      </Span>
                    </Td>
                    <Td className="px-3 py-1.5 text-gray-600">{driver.serviceLocation}</Td>
                    <Td className="px-3 py-1.5 font-medium">{driver.phone}</Td>
                    <Td className="px-3 py-1.5 text-gray-600">{driver.transport}</Td>
                    <Td className="px-3 py-1.5 text-center">
                      <Button
                        onClick={() =>
                          navigate(`/taxi/admin/drivers/${driver.id}?tab=Documents`, {
                            state: {
                              from: '/admin/drivers/pending',
                            },
                          })
                        }
                        className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <UiIcon as={FileText} size={12} />
                      </Button>
                    </Td>
                    <Td className="px-3 py-1.5 text-center">
                      <Span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-100 text-yellow-800 uppercase border border-yellow-200">
                        {driver.status || 'PENDING'}
                      </Span>
                    </Td>
                    <Td className="px-3 py-1.5 text-[10px] text-gray-500">{formatDate(driver.registeredAt)}</Td>
                    <Td className="px-3 py-1.5 text-right">
                      <Div className="relative inline-block">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenu === driver.id) {
                              closeMenu();
                              return;
                            }
                            openActionMenu(driver.id);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                          <UiIcon as={MoreVertical} size={14} />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>

        <Div className="p-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50">
          <Span>
            Showing {showingFrom} to {showingTo} of {totalEntries} entries
          </Span>
          <Div className="flex items-center gap-1">
            <Button
              className="px-2 py-1 font-semibold hover:text-black disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </Button>
            <Button className="px-2.5 py-1 rounded bg-yellow-400 text-black font-bold">{safePage}</Button>
            <Button
              className="px-2 py-1 font-semibold hover:text-black disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </Div>
        </Div>
      </Div>

      {/* PASSWORD MODAL */}
      <AnimatePresence>
        {passwordModal.isOpen && (
          <Overlay
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50"
            onClose={() =>
              setPasswordModal({
                isOpen: false,
                driverId: null,
                password: '',
                isSubmitting: false,
              })
            }
          >
            <Div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-gray-100 p-6 space-y-5">
              <Div className="flex items-center justify-between">
                <Div>
                  <H3 className="text-lg font-bold text-gray-900">Update Password</H3>
                  <P className="text-xs text-gray-500">Enter new password for driver</P>
                </Div>
                <Button
                  onClick={() =>
                    setPasswordModal({
                      isOpen: false,
                      driverId: null,
                      password: '',
                      isSubmitting: false,
                    })
                  }
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <UiIcon as={XCircle} size={20} />
                </Button>
              </Div>
              <Div className="space-y-4">
                <Div className="relative">
                  <Div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <UiIcon as={Lock} size={16} />
                  </Div>
                  <Input
                    type="text"
                    placeholder="New password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                    value={passwordModal.password}
                    onChange={(e) =>
                      setPasswordModal((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </Div>
              </Div>
              <Button
                onClick={() => handleAction('password', passwordModal.driverId)}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className="w-full py-2 bg-yellow-400 text-black rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {passwordModal.isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </Div>
          </Overlay>
        )}
      </AnimatePresence>

      {activeMenu ? (
        <Overlay className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={closeMenu} onClose={closeMenu}>
          <ScrollDiv className="bg-white border border-gray-200 shadow-xl rounded-xl p-1.5 text-left w-[220px]" style={{ maxHeight: ACTION_MENU_MAX_HEIGHT }}>
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('approve', driverId);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={CheckCircle2} size={15} className="text-green-600" /> Approve Driver
            </Button>
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('edit', driverId);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Edit2} size={15} className="text-yellow-600" /> Edit Details
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
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Key} size={15} className="text-blue-600" /> Reset Password
            </Button>
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('view', driverId);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Eye} size={15} className="text-gray-500" /> View Profile
            </Button>
            <Div className="h-px bg-gray-100 my-1 mx-1" />
            <Button
              onClick={() => {
                const driverId = activeMenu;
                closeMenu();
                handleAction('delete', driverId);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Trash2} size={15} className="text-red-600" /> Delete Request
            </Button>
          </ScrollDiv>
        </Overlay>
      ) : null}
    </ScrollDiv>
  );
};
export default PendingDrivers;
