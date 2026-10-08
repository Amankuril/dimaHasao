/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminProperties.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Search, MoreVertical, MapPin, CheckCircle, XCircle, Star, Trash2, Eye, Download } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Input, Link, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
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
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';

const COLS = [220, 130, 190, 130, 56];
const LABELS = ['Property', 'Type', 'Owner', 'Status', ''];
const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

const AdminProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
          setLoadError(null);
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
          setLoadError(error.message || 'Failed to load properties');
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

  const menuProperty = properties.find((p) => p._id === activeDropdown);
  const hasFilter = Boolean(filters.search || filters.status || filters.type);

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
        icon={Building2}
        title="Property management"
        subtitle={`${totalProperties} listing${totalProperties === 1 ? '' : 's'} — approvals and quality control`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Properties' }]}
        actions={
          <Button onClick={handleExportCSV} className={BTN_SECONDARY} accessibilityLabel="Export properties as CSV">
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by property name or city"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={`${INPUT} w-36`} placeholder="All status">
            <Option value="">All status</Option>
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="suspended">Suspended</Option>
          </Select>
          <Select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className={`${INPUT} w-36`} placeholder="All types">
            <Option value="">All types</Option>
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
        </Toolbar>
      </Card>

      {loading ? (
        <LoadingState label="Loading properties…" />
      ) : loadError ? (
        <ErrorState title="Could not load properties" message={loadError} onRetry={() => fetchProperties(currentPage, filters)} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={hasFilter ? 'No matching properties' : 'No properties yet'}
          message={hasFilter ? 'No listing matches the current search or filters.' : 'Listings appear here once partners submit their properties.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {properties.map((property, i) => (
                <Row key={property._id} last={i === properties.length - 1}>
                  <Cell width={COLS[0]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        <UiIcon as={Building2} size={18} className="text-slate-500" />
                      </Div>
                      <Link to={`/hotel/admin/properties/${property._id}`} className="flex-1 min-w-0">
                        <Div className="flex-row items-center gap-2">
                          <Span className="text-sm font-medium text-slate-900 flex-1" numberOfLines={2}>
                            {property.propertyName || 'Untitled'}
                          </Span>
                          {property.avgRating > 0 ? <StatusBadge tone="warning" icon={Star} label={property.avgRating?.toFixed(1)} /> : null}
                        </Div>
                        <Div className="flex-row items-center gap-1">
                          <UiIcon as={MapPin} size={11} className="text-slate-400" />
                          <Span className="text-xs text-slate-500 flex-1" numberOfLines={1}>
                            {property.address?.city || 'No address'}
                            {property.address?.state ? `, ${property.address.state}` : ''}
                          </Span>
                        </Div>
                      </Link>
                    </Div>
                  </Cell>
                  <Cell width={COLS[1]}>{property.dynamicCategory?.displayName || property.propertyType || 'N/A'}</Cell>
                  <Cell width={COLS[2]}>
                    <Span className="text-sm text-slate-900" numberOfLines={1}>
                      {property.partnerId?.name || 'Unknown partner'}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {property.partnerId?.email || 'No email'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[3]}>
                    <StatusBadge status={property.status} />
                  </Cell>
                  <Cell width={COLS[4]} align="center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === property._id ? null : property._id);
                      }}
                      accessibilityLabel={`Actions for ${property.propertyName || 'property'}`}
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
            total={totalProperties}
            onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          />
        </>
      )}

      {activeDropdown && menuProperty ? (
        <Overlay onClose={() => setActiveDropdown(null)} className="flex-1 items-center justify-center p-4 bg-black/40" onClick={() => setActiveDropdown(null)}>
          <Div className="w-64 bg-white rounded-xl border border-slate-200 py-1" onClick={(e) => e.stopPropagation()}>
            <Link to={`/hotel/admin/properties/${menuProperty._id}`} onClick={() => setActiveDropdown(null)} className={MENU_ITEM}>
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View details</Span>
            </Link>
            {menuProperty.status === 'pending' ? (
              <>
                <Button onClick={() => handleAction('approve', menuProperty)} className={MENU_ITEM}>
                  <UiIcon as={CheckCircle} size={16} className="text-slate-500" />
                  <Span className="text-sm font-medium text-slate-700">Approve</Span>
                </Button>
                <Button onClick={() => handleAction('reject', menuProperty)} className={MENU_ITEM}>
                  <UiIcon as={XCircle} size={16} className="text-slate-500" />
                  <Span className="text-sm font-medium text-slate-700">Reject</Span>
                </Button>
              </>
            ) : null}
            <Div className="h-px bg-slate-100 my-1" />
            <Button onClick={() => handleAction('delete', menuProperty)} className={MENU_ITEM}>
              <UiIcon as={Trash2} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete property</Span>
            </Button>
          </Div>
        </Overlay>
      ) : null}
    </AdminPage>
  );
};
export default AdminProperties;
