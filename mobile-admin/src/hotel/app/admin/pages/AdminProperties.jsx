/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminProperties.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from '../../../../lib/motion';
import { Building2, Search, MoreVertical, MapPin, CheckCircle, XCircle, Clock, Star, ShieldAlert, Trash2, Eye, ChevronLeft, ChevronRight, Download } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';
import { toast } from '../../../../lib/notify';
import { Button, Div, H2, Input, Link, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
const PropertyStatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-green-100 text-green-700 border-green-200 font-bold',
    pending: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
    rejected: 'bg-red-100 text-red-700 border-red-200 font-bold',
    suspended: 'bg-gray-100 text-gray-700 border-gray-200 font-bold',
    draft: 'bg-gray-100 text-gray-500 border-gray-200 font-bold',
  };
  const icons = {
    approved: <UiIcon as={CheckCircle} size={10} className="mr-1" />,
    pending: <UiIcon as={Clock} size={10} className="mr-1" />,
    rejected: <UiIcon as={XCircle} size={10} className="mr-1" />,
    suspended: <UiIcon as={ShieldAlert} size={10} className="mr-1" />,
    draft: <UiIcon as={Clock} size={10} className="mr-1" />,
  };
  return (
    <Span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status}
    </Span>
  );
};
const AdminProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProperties, setTotalProperties] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
  });
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoryService.getActiveCategories();
        setDynamicCategories(cats || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);
  const fetchProperties = useCallback(
    async (page, currentFilters) => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          search: currentFilters.search,
          status: currentFilters.status,
          type: currentFilters.type || undefined,
        };
        const data = await adminService.getHotels(params);
        if (data.success) {
          setProperties(data.hotels || []);
          setTotalProperties(data.total || 0);
          setTotalPages(Math.ceil((data.total || 0) / limit));
        } else {
          setProperties([]);
          setTotalProperties(0);
          setTotalPages(0);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Error fetching properties:', error);
          toast.error('Failed to load properties');
        }
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties(currentPage, filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, filters, fetchProperties]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };
  const handleAction = (action, property) => {
    setActiveDropdown(null);
    if (action === 'approve' || action === 'reject') {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setModalConfig({
        isOpen: true,
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Property?`,
        message: `Are you sure you want to ${action} "${property.propertyName}"?`,
        type: action === 'approve' ? 'success' : 'warning',
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        onConfirm: async () => {
          try {
            const res = await adminService.updateHotelStatus(property._id, newStatus);
            if (res.success) {
              toast.success(`Property ${action}ed successfully`);
              fetchProperties(currentPage, filters);
            }
          } catch {
            toast.error('Failed to update status');
          }
        },
      });
    } else if (action === 'delete') {
      setModalConfig({
        isOpen: true,
        title: 'Delete Property?',
        message: `Are you sure you want to delete "${property.propertyName}"? This action cannot be undone and all data related to this property (including bookings) will be affected.`,
        type: 'danger',
        confirmText: 'Delete Property',
        onConfirm: async () => {
          try {
            const res = await adminService.deleteHotel(property._id);
            if (res.success) {
              toast.success('Property deleted successfully');
              fetchProperties(currentPage, filters);
            }
          } catch {
            toast.error('Failed to delete property');
          }
        },
      });
    }
  };
  const handleExportCSV = () => {
    if (properties.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'Property Name', 'Type', 'Owner', 'Status', 'City'];
    const csvContent = [
      headers.join(','),
      ...properties.map((h) =>
        [h._id, `"${h.propertyName}"`, `"${h.propertyType}"`, `"${h.partnerId?.name || ''}"`, h.status, `"${h.address?.city || ''}"`].join(','),
      ),
    ].join('\n');
    saveTextFile(`properties-export-${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
    toast.success('CSV exported successfully');
  };
  return (
    <ScrollDiv className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
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
          <H2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Property Management ({totalProperties})</H2>
          <P className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Manage listings, approvals, and quality control.</P>
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

      <Div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <Div className="relative flex-1">
          <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search properties by name or city..."
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
            <Option value="approved">Approved</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="suspended">Suspended</Option>
          </Select>
          <Select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
          >
            <Option value="">All Types</Option>
            <Option value="hotel">Hotel</Option>
            <Option value="resort">Resort</Option>
            <Option value="homestay">Homestay</Option>
            <Option value="lodge">Lodge</Option>
            {dynamicCategories.map((cat) => (
              <Option key={cat._id} value={cat._id}>
                {cat.displayName}
              </Option>
            ))}
          </Select>
        </Div>
      </Div>

      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <Table cols={[220, 130, 190, 130, 80]} className="w-full text-left border-collapse">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                <Th className="p-4">Property Name</Th>
                <Th className="p-4">Type</Th>
                <Th className="p-4">Owner</Th>
                <Th className="p-4">Status</Th>
                <Th className="p-4 text-center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 uppercase tracking-tight font-bold">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Tr key={i} className="animate-pulse">
                    <Td colSpan="6" className="p-4">
                      <Div className="h-10 bg-gray-50 rounded-lg"></Div>
                    </Td>
                  </Tr>
                ))
              ) : (
                <AnimatePresence>
                  {properties.length > 0 ? (
                    properties.map((property) => (
                      <Tr key={property._id} className="transition-colors group relative">
                        <Td className="p-4">
                          <Link to={`/hotel/admin/properties/${property._id}`} className="flex items-center gap-3">
                            <Div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm">
                              <UiIcon as={Building2} size={18} />
                            </Div>
                            <Div>
                              <Div className="flex items-center gap-2">
                                <P className="text-sm font-bold text-gray-900 uppercase tracking-tight">{property.propertyName || 'Untitled'}</P>
                                {property.avgRating > 0 && (
                                  <Span className="flex items-center bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-yellow-100">
                                    <UiIcon as={Star} size={8} className="fill-yellow-500 text-yellow-500 mr-0.5" />
                                    {property.avgRating?.toFixed(1)}
                                  </Span>
                                )}
                              </Div>
                              <Div className="flex items-center text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">
                                <UiIcon as={MapPin} size={10} className="mr-1" />
                                {property.address?.city || 'No Address'}, {property.address?.state || ''}
                              </Div>
                            </Div>
                          </Link>
                        </Td>
                        <Td className="p-4">
                          <P className="text-[10px] text-gray-700 font-bold uppercase">
                            {property.dynamicCategory?.displayName || property.propertyType || 'N/A'}
                          </P>
                        </Td>
                        <Td className="p-4">
                          <P className="text-[10px] text-gray-700 font-bold uppercase mb-0.5">{property.partnerId?.name || 'Unknown Partner'}</P>
                          <P className="text-[10px] text-gray-500 font-medium normal-case tracking-tight">{property.partnerId?.email || 'No Email'}</P>
                        </Td>
                        <Td className="p-4">
                          <PropertyStatusBadge status={property.status} />
                        </Td>
                        <Td className="p-4 text-center relative">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === property._id ? null : property._id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                          >
                            <UiIcon as={MoreVertical} size={16} />
                          </Button>

                          {activeDropdown === property._id && (
                            <Div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                              <Link
                                to={`/hotel/admin/properties/${property._id}`}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700"
                              >
                                <UiIcon as={Eye} size={14} /> View Details
                              </Link>
                              {property.status === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handleAction('approve', property)}
                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700"
                                  >
                                    <UiIcon as={CheckCircle} size={14} /> Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleAction('reject', property)}
                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700"
                                  >
                                    <UiIcon as={XCircle} size={14} /> Reject
                                  </Button>
                                </>
                              )}
                              <Div className="h-px bg-gray-100 my-1"></Div>
                              <Button
                                onClick={() => handleAction('delete', property)}
                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700"
                              >
                                <UiIcon as={Trash2} size={14} /> Delete Property
                              </Button>
                            </Div>
                          )}
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan="6" className="p-8 text-center text-gray-500">
                        <Div className="flex flex-col items-center gap-2">
                          <UiIcon as={Building2} size={32} className="text-gray-300" />
                          <P className="text-xs font-bold uppercase">No properties found</P>
                        </Div>
                      </Td>
                    </Tr>
                  )}
                </AnimatePresence>
              )}
            </Tbody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <Div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <P className="text-[10px] font-bold text-gray-500 uppercase">
              Page {currentPage} of {totalPages}
            </P>
            <Div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UiIcon as={ChevronLeft} size={16} />
              </Button>
              <Button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
export default AdminProperties;
