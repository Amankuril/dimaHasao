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
  Lock,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { AnimatePresence } from '../../../../../lib/motion';
import {
  Button,
  Div,
  H1,
  H3,
  Img,
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
const ACTION_MENU_MAX_HEIGHT = 260;
const DriverList = ({ mode = 'approved' }) => {
  const navigate = useNavigate();
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
  const perPage = Number(paginator?.per_page || itemsPerPage);
  const startIndex = (safePage - 1) * perPage;
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + drivers.length, totalEntries);
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-3 lg:p-4 font-sans text-gray-900">
      {error && <Div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</Div>}
      <Div className="mb-3">
        <Div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={10} />
          <Span className="text-gray-700 font-medium">{mode === 'active' ? 'Active Drivers' : 'Approved Drivers'}</Span>
        </Div>
        <Div className="flex items-center justify-between gap-3">
          <H1 className="text-base text-gray-900 font-bold">{mode === 'active' ? 'Active Drivers' : 'Approved Drivers'}</H1>
          {mode !== 'active' ? (
            <Button
              onClick={() => navigate('/taxi/admin/drivers/create')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-black font-semibold bg-yellow-400 rounded-md shadow-sm hover:bg-yellow-500 transition-colors"
            >
              <UiIcon as={Plus} size={14} /> Add Drivers
            </Button>
          ) : null}
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

      {/* Table Card */}
      <Div className="bg-white rounded-lg border border-gray-200 overflow-visible">
        <Div>
          <Table cols={[170, 140, 140, 130, 150, 110, 80, 120, 90, 130, 60]} className="w-full text-left border-collapse whitespace-nowrap">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <Th className="px-3 py-2">Name</Th>
                <Th className="px-3 py-2">Code</Th>
                <Th className="px-3 py-2">Location</Th>
                <Th className="px-3 py-2">Mobile</Th>
                <Th className="px-3 py-2">Type</Th>
                <Th className="px-3 py-2">Selfie</Th>
                <Th className="px-3 py-2 text-center">Docs</Th>
                <Th className="px-3 py-2 text-center">Status</Th>
                <Th className="px-3 py-2">Rating</Th>
                <Th className="px-3 py-2">Registered</Th>
                <Th className="px-3 py-2 text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {isLoading ? (
                <Tr>
                  <Td colSpan="11" className="px-3 py-6 text-center text-gray-400">
                    Loading drivers...
                  </Td>
                </Tr>
              ) : drivers.length === 0 ? (
                <Tr>
                  <Td colSpan="11" className="px-3 py-6 text-center text-gray-400">
                    No drivers found.
                  </Td>
                </Tr>
              ) : (
                drivers.map((driver) => (
                  <Tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-3 py-1.5 font-medium text-gray-900">{driver.name}</Td>
                    <Td className="px-3 py-1.5">
                      <Span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        {driver.driverCode}
                      </Span>
                    </Td>
                    <Td className="px-3 py-1.5 text-gray-600">{driver.serviceLocation}</Td>
                    <Td className="px-3 py-1.5 font-medium">{driver.phone}</Td>
                    <Td className="px-3 py-1.5 text-gray-600">{driver.transportType}</Td>
                    <Td className="px-3 py-1.5">
                      {driver.onlineSelfieImage ? (
                        <Button
                          type="button"
                          onClick={() => window.open(driver.onlineSelfieImage, '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 hover:bg-gray-50 transition-colors"
                        >
                          <Img src={driver.onlineSelfieImage} alt={`${driver.name} selfie`} className="h-5 w-5 rounded object-cover" />
                        </Button>
                      ) : (
                        <Span className="text-[10px] text-gray-400">No selfie</Span>
                      )}
                    </Td>
                    <Td className="px-3 py-1.5 text-center">
                      <Button
                        onClick={() => navigate(`/taxi/admin/drivers/${driver.id}?tab=Documents`)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
                      >
                        <UiIcon as={FileText} size={12} />
                      </Button>
                    </Td>
                    <Td className="px-3 py-1.5 text-center">
                      <Span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 capitalize">
                        {driver.status}
                      </Span>
                    </Td>
                    <Td className="px-3 py-1.5">
                      <Div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <UiIcon
                            as={Star}
                            key={s}
                            size={10}
                            className={s <= Math.round(driver.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
                          />
                        ))}
                      </Div>
                    </Td>
                    <Td className="px-3 py-1.5 text-[10px] text-gray-500 whitespace-nowrap">{formatDate(driver.registeredAt)}</Td>
                    <Td className="px-3 py-1.5 text-right">
                      <Div className="relative inline-block">
                        <Button
                          onClick={(e) => toggleMenu(e, driver.id)}
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

        {/* Footer */}
        {!isLoading && drivers.length > 0 && (
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
        )}
      </Div>

      {activeMenu ? (
        <Overlay className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={closeMenu} onClose={closeMenu}>
          <ScrollDiv
            className="bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 w-[220px]"
            style={{ maxHeight: ACTION_MENU_MAX_HEIGHT }}
          >
            <Button
              onClick={() => {
                closeMenu();
                handleAction('disapprove', activeMenu);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={XCircle} size={15} className="text-red-600" /> Disapprove
            </Button>
            <Button
              onClick={() => {
                closeMenu();
                navigate(`/taxi/admin/drivers/edit/${activeMenu}`);
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
                closeMenu();
                navigate(`/taxi/admin/drivers/${activeMenu}`);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Eye} size={15} className="text-gray-500" /> View Profile
            </Button>
            <Div className="h-px bg-gray-100 my-1 mx-1" />
            <Button
              onClick={() => {
                closeMenu();
                handleAction('delete', activeMenu);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <UiIcon as={Trash2} size={15} className="text-red-600" /> Delete Driver
            </Button>
          </ScrollDiv>
        </Overlay>
      ) : null}

      {/* Password Modal */}
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
            <Div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 overflow-hidden p-6 space-y-5">
              <Div className="flex items-center justify-between">
                <Div>
                  <H3 className="text-lg font-bold text-gray-900">Update Password</H3>
                  <P className="text-xs text-gray-500 mt-0.5">Set a new password for this driver</P>
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

              <Div>
                <Label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</Label>
                <Div className="relative">
                  <UiIcon as={Lock} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter new password"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                    value={passwordModal.password}
                    onChange={(e) =>
                      setPasswordModal((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                </Div>
                <P className="text-[10px] text-gray-400 mt-1.5">Minimum 8 characters required.</P>
              </Div>

              <Button
                onClick={() => {
                  if (passwordModal.password.length < 4) {
                    alert('Password too short');
                    return;
                  }
                  handleAction('password', passwordModal.driverId);
                }}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className="w-full py-2 bg-yellow-400 text-black rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordModal.isSubmitting ? <UiIcon as={Loader2} className="animate-spin" size={15} /> : <UiIcon as={Key} size={15} />}
                Update Password
              </Button>
            </Div>
          </Overlay>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default DriverList;
