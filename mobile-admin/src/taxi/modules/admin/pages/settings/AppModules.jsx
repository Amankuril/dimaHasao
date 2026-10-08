/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/AppModules.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Filter, Save, ImageIcon, X, Boxes } from 'lucide-react-native';
import { useNavigate, useParams, useLocation } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { useImageUpload } from '../../../../shared/hooks/useImageUpload';
import { toast } from '../../../../../lib/notify';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
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
  Pagination,
  Field,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Img, Input, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const LIST_COLS = [150, 130, 130, 80, 90, 100];
const AppModules = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isCreate = propMode === 'create' || location.pathname.endsWith('/create');
  const isEdit = propMode === 'edit' || location.pathname.includes('/edit/');
  const isList = !isCreate && !isEdit;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modules, setModules] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    service_type: '',
    transport_type: '',
    active: '',
  });
  const { transportTypes } = useTaxiTransportTypes();
  const { tablet } = useLayoutWidth();
  const [formData, setFormData] = useState({
    name: '',
    transport_type: '',
    service_type: '',
    icon_type: '',
    order_by: '',
    short_description: '',
    description: '',
    active: true,
    mobile_menu_icon: '',
  });
  const fetchModules = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getAppModules({});
      const data = res.data?.data?.results || res.data?.results || (Array.isArray(res.data?.data) ? res.data.data : []);
      setModules(data);
    } catch (err) {
      setLoadError(err?.message || 'Failed to load application modules');
      toast.error('Failed to load application modules');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isList) {
      fetchModules();
    } else if (isEdit && id) {
      const fetchItem = async () => {
        try {
          const res = await adminService.getAppModules({});
          const data = res.data?.data?.results || res.data?.results || (Array.isArray(res.data?.data) ? res.data.data : []);
          const item = data.find((m) => String(m._id || m.id) === String(id));
          if (item) {
            setFormData({
              name: item.name || '',
              transport_type: item.transport_type || '',
              service_type: item.service_type || '',
              icon_type: item.icon_type || '',
              order_by: item.order_by || '',
              short_description: item.short_description || '',
              description: item.description || '',
              active: item.active !== false,
              mobile_menu_icon: item.mobile_menu_icon || '',
            });
          }
        } catch (err) {
          setLoadError(err?.message || 'Failed to fetch module details');
          toast.error('Failed to fetch module details');
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
  const {
    uploading: imageUploading,
    preview: imagePreview,
    handleFileChange: onImageFileChange,
  } = useImageUpload({
    folder: 'app-modules',
    onSuccess: (url) =>
      setFormData((prev) => ({
        ...prev,
        mobile_menu_icon: url,
      })),
  });
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name) return toast.error('Name is required');
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        order_by: Number(formData.order_by),
      };
      if (isEdit) {
        await adminService.updateAppModule(id, payload);
        toast.success('Module successfully updated');
      } else {
        await adminService.createAppModule(payload);
        toast.success('New module created');
      }
      navigate('/taxi/admin/pricing/app-modules');
    } catch (err) {
      toast.error(err.message || 'Failed to save module');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (mid) => {
    if (!(await window.confirmAsync('Delete this app module?'))) return;
    try {
      await adminService.deleteAppModule(mid);
      toast.success('Module deleted');
      fetchModules();
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };
  const filteredModules = useMemo(() => {
    return modules.filter((moduleItem) => {
      const matchesSearch = (moduleItem.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = !filters.service_type || String(moduleItem.service_type || '').toLowerCase() === String(filters.service_type).toLowerCase();
      const matchesTransport =
        !filters.transport_type || String(moduleItem.transport_type || '').toLowerCase() === String(filters.transport_type).toLowerCase();
      const matchesStatus = filters.active === '' || String(Boolean(moduleItem.active)) === String(filters.active === 'true');
      return matchesSearch && matchesService && matchesTransport && matchesStatus;
    });
  }, [filters, modules, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredModules.length / entriesPerPage));
  const paginatedModules = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredModules.slice(startIndex, startIndex + entriesPerPage);
  }, [currentPage, entriesPerPage, filteredModules]);
  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, filters, searchTerm]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const clearFilters = () => {
    setFilters({
      service_type: '',
      transport_type: '',
      active: '',
    });
  };
  if (isList) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Boxes}
          title="App Modules"
          subtitle="Ride products shown in the mobile apps"
          breadcrumb={[{ label: 'Pricing' }, { label: 'App Modules' }]}
          actions={
            <>
              <Button onClick={() => navigate('create')} className={BTN_PRIMARY}>
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Add app module</Span>
              </Button>
              <Button type="button" onClick={() => setIsFilterOpen((current) => !current)} className={BTN_SECONDARY}>
                <UiIcon as={Filter} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>{isFilterOpen ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            </>
          }
        />

        <Card className="mb-4">
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search modules" className={`${INPUT} flex-1`} />
            </Div>
            <Select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className={INPUT}>
              <Option value={10}>Show 10</Option>
              <Option value={20}>Show 20</Option>
              <Option value={50}>Show 50</Option>
            </Select>
          </Toolbar>

          {isFilterOpen ? (
            <Div className="mt-4 border-t border-slate-100 pt-4 gap-4">
              <SectionTitle
                action={
                  <Button type="button" onClick={() => setIsFilterOpen(false)} accessibilityLabel="Close filters" className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center">
                    <UiIcon as={X} size={14} className="text-slate-700" />
                  </Button>
                }
              >
                Filter module list
              </SectionTitle>
              <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
                <Field label="Module service" className="flex-1">
                  <Select value={filters.service_type} onChange={(e) => updateFilter('service_type', e.target.value)} className={INPUT}>
                    <Option value="">All services</Option>
                    <Option value="normal">Normal</Option>
                    <Option value="outstation">Outstation</Option>
                    <Option value="pooling">Pooling</Option>
                    <Option value="bus">Bus</Option>
                  </Select>
                </Field>
                <Field label="Transport type" className="flex-1">
                  <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={INPUT}>
                    <Option value="">All transport types</Option>
                    {transportTypes.map((type) => (
                      <Option key={type.value || type.id} value={type.value || type.id}>
                        {type.label || type.name || type.value}
                      </Option>
                    ))}
                  </Select>
                </Field>
              </Div>
              <Div className={tablet ? 'flex-row items-end gap-4' : 'gap-4'}>
                <Field label="Status" className="flex-1">
                  <Select value={filters.active} onChange={(e) => updateFilter('active', e.target.value)} className={INPUT}>
                    <Option value="">All statuses</Option>
                    <Option value="true">Active</Option>
                    <Option value="false">Inactive</Option>
                  </Select>
                </Field>
                <Button type="button" onClick={clearFilters} className={`${BTN_SECONDARY} flex-1`}>
                  <Span className={BTN_TEXT_SECONDARY}>Reset filters</Span>
                </Button>
              </Div>
            </Div>
          ) : null}
        </Card>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : loadError ? (
          <ErrorState title="Could not load modules" message={loadError} onRetry={fetchModules} />
        ) : paginatedModules.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No app modules"
            message={searchTerm || filters.service_type || filters.transport_type || filters.active ? 'No module matches these filters.' : 'Create a module to offer it in the apps.'}
            actionLabel="Add app module"
            onAction={() => navigate('create')}
          />
        ) : (
          <>
            <DataTable cols={LIST_COLS}>
              <THead cols={LIST_COLS} labels={['Name', 'Module service', 'Transport type', 'Icon', 'Status', 'Actions']} />
              <TBody>
                {paginatedModules.map((m, i) => (
                  <Row key={m._id || m.id} last={i === paginatedModules.length - 1}>
                    <Cell width={LIST_COLS[0]}>
                      <Span className="text-sm font-semibold text-slate-900">{m.name || ''}</Span>
                    </Cell>
                    <Cell width={LIST_COLS[1]}>{m.service_type || 'Normal'}</Cell>
                    <Cell width={LIST_COLS[2]}>{m.transport_type || 'Taxi'}</Cell>
                    <Cell width={LIST_COLS[3]}>
                      <Div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 items-center justify-center overflow-hidden">
                        {m.mobile_menu_icon ? (
                          <Img src={m.mobile_menu_icon} className="w-full h-full" contentFit="contain" alt="" />
                        ) : (
                          <UiIcon as={ImageIcon} size={16} className="text-slate-300" />
                        )}
                      </Div>
                    </Cell>
                    <Cell width={LIST_COLS[4]}>
                      <Switch
                        checked={Boolean(m.active)}
                        onCheckedChange={() => {
                          adminService
                            .updateAppModule(m._id || m.id, {
                              active: !m.active,
                            })
                            .then(() => {
                              toast.success('Status Updated');
                              fetchModules();
                            });
                        }}
                      />
                    </Cell>
                    <Cell width={LIST_COLS[5]}>
                      <Div className="flex-row items-center gap-1">
                        <Button onClick={() => navigate(`edit/${m._id || m.id}`)} accessibilityLabel="Edit module" className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={Edit2} size={16} className="text-slate-600" />
                        </Button>
                        <Button onClick={() => handleDelete(m._id || m.id)} accessibilityLabel="Delete module" className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
            <Pagination
              page={currentPage}
              pages={totalPages}
              total={filteredModules.length}
              onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </>
        )}
      </AdminPage>
    );
  }
  const formHeader = (
    <PageHeader
      icon={Boxes}
      title={isEdit ? 'Edit App Module' : 'Create App Module'}
      subtitle="Name, service, transport type and thumbnail"
      breadcrumb={[{ label: 'App Modules', onPress: () => navigate('/taxi/admin/pricing/app-modules') }, { label: isEdit ? 'Edit' : 'Create' }]}
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <TableSkeleton rows={4} />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <ErrorState title="Could not load this module" message={loadError} onRetry={() => navigate('/taxi/admin/pricing/app-modules')} />
      </AdminPage>
    );
  }
  const pair = (a, b) => <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>{a}{b}</Div>;
  return (
    <AdminPage maxWidth={720}>
      {formHeader}

      <Card className="gap-4">
        {pair(
          <Field key="name" label="Name" required className="flex-1">
            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter name" className={INPUT} />
          </Field>,
          <Field key="svc" label="Module service" required className="flex-1">
            <Select name="service_type" value={formData.service_type} onChange={handleInputChange} className={INPUT}>
              <Option value="">Choose module service</Option>
              <Option value="normal">Normal</Option>
              <Option value="outstation">Outstation</Option>
              <Option value="pooling">Pooling</Option>
              <Option value="bus">Bus</Option>
            </Select>
          </Field>,
        )}
        {pair(
          <Field key="tt" label="Transport type" required className="flex-1">
            <Select name="transport_type" value={formData.transport_type} onChange={handleInputChange} className={INPUT}>
              <Option value="">Choose transport type</Option>
              {transportTypes.map((t) => (
                <Option key={t.id || t._id} value={t.name}>
                  {t.display_name || t.name}
                </Option>
              ))}
            </Select>
          </Field>,
          <Field key="it" label="Icon type" className="flex-1">
            <Select name="icon_type" value={formData.icon_type} onChange={handleInputChange} className={INPUT}>
              <Option value="">Choose icon type</Option>
              <Option value="car">Car</Option>
              <Option value="bike">Bike</Option>
              <Option value="auto">Auto</Option>
              <Option value="truck">Truck</Option>
              <Option value="ehcv">EHCV</Option>
              <Option value="hatchback">Hatchback</Option>
              <Option value="hcv">HCV</Option>
              <Option value="lcv">LCV</Option>
              <Option value="mcv">MCV</Option>
              <Option value="luxury">Luxury</Option>
              <Option value="premium">Premium</Option>
              <Option value="suv">SUV</Option>
            </Select>
          </Field>,
        )}
        {pair(
          <Field key="ob" label="Order number" required className="flex-1">
            <Input type="number" name="order_by" value={formData.order_by} onChange={handleInputChange} placeholder="Enter order number" className={INPUT} />
          </Field>,
          <Field key="sd" label="Short description" required className="flex-1">
            <Input name="short_description" value={formData.short_description} onChange={handleInputChange} placeholder="Enter short description" className={INPUT} />
          </Field>,
        )}

        <Field label="Description" required>
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            placeholder="Enter description"
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
          />
        </Field>

        <Field label="Thumbnail" required hint="512 × 512 px">
          <Div
            onClick={() => onImageFileChange()}
            accessibilityRole="button"
            accessibilityLabel="Upload thumbnail"
            className="h-48 rounded-lg border border-dashed border-slate-300 bg-slate-50 items-center justify-center overflow-hidden"
          >
            {imagePreview || formData.mobile_menu_icon ? (
              <Div className="w-full h-full p-4 items-center justify-center">
                <Img src={imagePreview || formData.mobile_menu_icon} className="w-full h-full" contentFit="contain" alt="Preview" />
                {imageUploading ? <UiIcon as={Loader2} size={20} className="text-blue-600" /> : null}
              </Div>
            ) : (
              <Div className="items-center gap-2">
                <UiIcon as={ImageIcon} size={22} className="text-slate-400" />
                <Span className="text-sm font-medium text-slate-500">Upload image</Span>
              </Div>
            )}
          </Div>
        </Field>

        <Div className="flex-row flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button onClick={handleSubmit} disabled={submitting || imageUploading} className={`${BTN_PRIMARY} ${submitting || imageUploading ? 'opacity-60' : ''}`}>
            <UiIcon as={submitting ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{isEdit ? 'Update module' : 'Create module'}</Span>
          </Button>
          <Button onClick={() => navigate('/taxi/admin/pricing/app-modules')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default AppModules;
