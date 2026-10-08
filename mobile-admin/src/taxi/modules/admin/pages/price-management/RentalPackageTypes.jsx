/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/RentalPackageTypes.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowLeft, Clock, Filter, Save } from 'lucide-react-native';
import { useNavigate, useParams, useLocation } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
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
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const COLS = [200, 150, 130, 100];
const LABELS = ['Name', 'Transport type', 'Status', 'Actions'];
/** A 44 px-tall switch, so the row target is tappable on a phone. */
const StatusToggle = ({ active, onToggle, label }) => (
  <Button
    type="button"
    accessibilityLabel={label}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className="h-11 justify-center"
  >
    <Div className={`w-12 h-7 rounded-full justify-center px-1 ${active ? 'bg-green-600' : 'bg-slate-300'}`}>
      <Div className={`w-5 h-5 rounded-full bg-white ${active ? 'self-end' : 'self-start'}`} />
    </Div>
  </Button>
);
const RentalPackageTypes = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { columns, tablet } = useLayoutWidth();
  const isCreate = propMode === 'create' || location.pathname.endsWith('/create');
  const isEdit = propMode === 'edit' || location.pathname.includes('/edit/');
  const isList = !isCreate && !isEdit;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [packages, setPackages] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTransport, setFilterTransport] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    transport_type: 'taxi',
    short_description: '',
    description: '',
    status: 'active',
  });
  const fetchPackages = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getRentalPackageTypes();
      if (res && res.success) {
        // Backend pattern consistency: check data.results or rental_packages.results
        const rawPackages =
          res.data?.rental_packages?.results ||
          res.data?.rental_packages ||
          res.rental_packages?.results ||
          res.rental_packages ||
          res.results ||
          res.data?.results ||
          [];
        setPackages(Array.isArray(rawPackages) ? rawPackages : []);
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Failed to load rental packages');
      toast.error('Failed to load rental packages');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isList) {
      fetchPackages();
    } else if (isEdit && id) {
      const fetchItem = async () => {
        try {
          const res = await adminService.getRentalPackageTypes();
          const items =
            res.data?.rental_packages?.results ||
            res.data?.rental_packages ||
            res.rental_packages?.results ||
            res.rental_packages ||
            res.results ||
            res.data?.results ||
            [];
          const itemsArr = Array.isArray(items) ? items : [];
          const item = itemsArr.find((p) => String(p._id || p.id) === String(id));
          if (item) {
            setFormData({
              name: item.name || '',
              transport_type: item.transport_type || 'taxi',
              short_description: item.short_description || '',
              description: item.description || '',
              status: item.status || 'active',
            });
          }
        } catch (err) {
          setLoadError(err?.response?.data?.message || 'Failed to fetch package details');
          toast.error('Failed to fetch package details');
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    } else {
      setLoading(false);
    }
  }, [isList, isEdit, id]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) return toast.error('Package name is required');
    if (!formData.transport_type) return toast.error('Transport type is required');
    if (!formData.short_description?.trim()) return toast.error('Short description is required');
    if (!formData.description?.trim()) return toast.error('Description is required');
    try {
      setSubmitting(true);
      if (isEdit) {
        await adminService.updateRentalPackageType(id, formData);
        toast.success('Package updated');
      } else {
        await adminService.createRentalPackageType(formData);
        toast.success('Package created');
      }
      navigate('/taxi/admin/pricing/rental-packages');
    } catch (err) {
      toast.error(err.message || 'Failed to save package');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (pid) => {
    if (!(await window.confirmAsync('Delete this rental package type?'))) return;
    try {
      await adminService.deleteRentalPackageType(pid);
      toast.success('Package deleted');
      fetchPackages();
    } catch (err) {
      toast.error('Failed to delete package');
    }
  };
  const resetFilters = () => {
    setSearchTerm('');
    setFilterTransport('all');
    setFilterStatus('all');
  };
  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const matchSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchTransport = filterTransport === 'all' || p.transport_type === filterTransport;
      // Depending on API, status could be active/inactive boolean or string. Just check string cast.
      const pStatus = p.status === 'active' || p.active ? 'active' : 'inactive';
      const matchStatus = filterStatus === 'all' || pStatus === filterStatus;
      return matchSearch && matchTransport && matchStatus;
    });
  }, [packages, searchTerm, filterTransport, filterStatus]);
  if (isList) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Clock}
          title="Rental packages"
          subtitle="Hourly and daily rental package types offered to riders"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Rental packages' }]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/rental-packages/create')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add package</Span>
            </Button>
          }
        />

        <Card className="mb-4">
          <SectionTitle
            action={
              <Button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>{showFilters ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            }
          >
            Search
          </SectionTitle>
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search packages"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
            <Select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className={`${INPUT} w-32`}>
              <Option value={10}>10 per page</Option>
              <Option value={25}>25 per page</Option>
              <Option value={50}>50 per page</Option>
            </Select>
          </Toolbar>
          {showFilters ? (
            <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
              <Field label="Transport type">
                <Select value={filterTransport} onChange={(e) => setFilterTransport(e.target.value)} className={INPUT}>
                  <Option value="all">All types</Option>
                  <Option value="taxi">Taxi / ride-hailing</Option>
                  <Option value="delivery">Logistics / delivery</Option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={INPUT}>
                  <Option value="all">All statuses</Option>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Field>
              <Div className="justify-end">
                <Button type="button" onClick={resetFilters} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Reset filters</Span>
                </Button>
              </Div>
            </Div>
          ) : null}
        </Card>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : loadError ? (
          <ErrorState title="Could not load rental packages" message={loadError} onRetry={fetchPackages} />
        ) : filteredPackages.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={packages.length ? 'No packages match these filters' : 'No rental packages yet'}
            message={packages.length ? 'Clear the search or filters to see every package.' : 'Add a package type to offer hourly or daily rentals.'}
            actionLabel={packages.length ? 'Reset filters' : 'Add package'}
            onAction={packages.length ? resetFilters : () => navigate('/taxi/admin/pricing/rental-packages/create')}
          />
        ) : (
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {filteredPackages.slice(0, entriesPerPage).map((p, i, all) => {
                const active = p.status === 'active' || p.active;
                return (
                  <Row key={p._id || p.id} last={i === all.length - 1}>
                    <Cell width={COLS[0]}>
                      <Span className="text-sm font-semibold text-slate-900">{p.name || 'Untitled package'}</Span>
                    </Cell>
                    <Cell width={COLS[1]}>
                      <StatusBadge status={p.transport_type || 'taxi'} tone="info" />
                    </Cell>
                    <Cell width={COLS[2]}>
                      <Div className="flex-row items-center gap-2">
                        <StatusToggle
                          active={active}
                          label={`${active ? 'Deactivate' : 'Activate'} ${p.name || 'package'}`}
                          onToggle={() => {
                            const sid = p._id || p.id;
                            const currentActive = p.status === 'active' || p.active;
                            adminService
                              .updateRentalPackageType(sid, {
                                status: currentActive ? 'inactive' : 'active',
                                active: !currentActive,
                              })
                              .then(() => {
                                toast.success('Status Updated');
                                fetchPackages();
                              });
                          }}
                        />
                        <StatusBadge status={active ? 'active' : 'inactive'} />
                      </Div>
                    </Cell>
                    <Cell width={COLS[3]}>
                      <Div className="flex-row items-center gap-1">
                        <Button
                          type="button"
                          accessibilityLabel={`Edit ${p.name || 'package'}`}
                          onClick={() => navigate(`/taxi/admin/pricing/rental-packages/edit/${p._id || p.id}`)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Edit2} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel={`Delete ${p.name || 'package'}`}
                          onClick={() => handleDelete(p._id || p.id)}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                );
              })}
            </TBody>
          </DataTable>
        )}
      </AdminPage>
    );
  }
  const formHeader = (
    <PageHeader
      icon={Clock}
      title={isEdit ? 'Edit rental package type' : 'Create rental package type'}
      subtitle="Name and describe the package riders will see"
      breadcrumb={[
        { label: 'Taxi' },
        { label: 'Rental packages', onPress: () => navigate('/taxi/admin/pricing/rental-packages') },
        { label: isEdit ? 'Edit' : 'Create' },
      ]}
      actions={
        <Button type="button" onClick={() => navigate('/taxi/admin/pricing/rental-packages')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <LoadingState label="Loading package…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <ErrorState title="Could not load this package" message={loadError} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {formHeader}

      <Card className="mb-4">
        <SectionTitle>Package details</SectionTitle>
        <Div className={`grid grid-cols-${columns} gap-3`}>
          <Field label="Transport type" required>
            <Select name="transport_type" value={formData.transport_type} onChange={handleInputChange} className={INPUT}>
              <Option value="">Select transport type</Option>
              <Option value="taxi">Taxi / ride-hailing</Option>
              <Option value="delivery">Logistics / delivery</Option>
            </Select>
          </Field>
          <Field label="Name" required>
            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter name" className={INPUT} />
          </Field>
          <Field label="Short description" required hint="Shown next to the package in the rider app">
            <Input
              name="short_description"
              value={formData.short_description}
              onChange={handleInputChange}
              placeholder="Enter short description"
              className={INPUT}
            />
          </Field>
          <Field label="Description" required>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter description"
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
            />
          </Field>
        </Div>
      </Card>

      <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
        <Button type="button" onClick={() => navigate('/taxi/admin/pricing/rental-packages')} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting} className={BTN_PRIMARY}>
          <UiIcon as={Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{submitting ? 'Saving…' : isEdit ? 'Update package' : 'Save package'}</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default RentalPackageTypes;
