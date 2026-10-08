/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/AppModules.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronRight,
  Loader2,
  Upload,
  ArrowLeft,
  Filter,
  Save,
  ImageIcon,
  FileSearch,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useNavigate, useParams, useLocation } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { useImageUpload } from '../../../../shared/hooks/useImageUpload';
import { toast } from '../../../../../lib/notify';
import { motion, AnimatePresence } from '../../../../../lib/motion';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import {
  Button,
  Div,
  H1,
  Img,
  Input,
  Label,
  Option,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const selectClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_12px_center] bg-no-repeat";
const StatusToggle = ({ active, onToggle }) => (
  <Button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${active ? 'bg-yellow-400' : 'bg-gray-300'}`}
  >
    <Div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-5.5' : 'translate-x-0'}`} />
  </Button>
);
const AppModules = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isCreate = propMode === 'create' || location.pathname.endsWith('/create');
  const isEdit = propMode === 'edit' || location.pathname.includes('/edit/');
  const isList = !isCreate && !isEdit;
  const [loading, setLoading] = useState(true);
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
      const res = await adminService.getAppModules({});
      const data = res.data?.data?.results || res.data?.results || (Array.isArray(res.data?.data) ? res.data.data : []);
      setModules(data);
    } catch (err) {
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
      <ScrollDiv className="min-h-screen bg-gray-50 animate-in fade-in duration-500 font-sans flex flex-col">
        {/* Header matches Image 1 */}
        <Div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
          <H1 className="text-lg font-bold text-slate-900">App Modules</H1>
          <Div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
            <Span>App Modules</Span>
            <UiIcon as={ChevronRight} size={12} className="opacity-30" />
            <Span className="text-gray-500">App Modules</Span>
          </Div>
        </Div>

        <Div className="flex-1 p-8 lg:p-10">
          <motion.div
            key="list"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            className="max-w-7xl mx-auto"
          >
            <Div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
              {/* Table Toolbar matches Image 1 */}
              <Div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <Div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                  <Span>show</Span>
                  <Select
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md px-2 py-1 text-slate-700 outline-none focus:border-yellow-400"
                  >
                    <Option value={10}>10</Option>
                    <Option value={20}>20</Option>
                    <Option value={50}>50</Option>
                  </Select>
                  <Span>entries</Span>
                </Div>

                <Div className="flex items-center gap-3">
                  <Div className="relative">
                    <UiIcon as={Search} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search modules"
                      className="h-10 w-52 rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[13px] font-medium text-slate-700 outline-none transition-colors focus:border-yellow-400"
                    />
                  </Div>
                  <Button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 rounded-lg text-[13px] font-bold shadow-md hover:bg-gray-50 transition-colors"
                  >
                    <UiIcon as={Filter} size={16} /> {isFilterOpen ? 'Hide Filters' : 'Filters'}
                  </Button>
                  <Button
                    onClick={() => navigate('create')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black rounded-lg text-[13px] font-bold shadow-md hover:bg-yellow-500 transition-colors"
                  >
                    <UiIcon as={Plus} size={18} /> Add App Modules
                  </Button>
                </Div>
              </Div>

              <AnimatePresence initial={false}>
                {isFilterOpen ? (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto',
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <Div className="flex items-center justify-between px-8 pt-5">
                      <Div className="text-sm font-semibold text-gray-500">Filter Sub Module List</Div>
                      <Button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <UiIcon as={X} size={14} /> Close
                      </Button>
                    </Div>
                    <Div className="grid grid-cols-1 gap-4 px-8 py-6 md:grid-cols-4">
                      <Div>
                        <Label className={labelClass}>Module Service</Label>
                        <Select value={filters.service_type} onChange={(e) => updateFilter('service_type', e.target.value)} className={selectClass}>
                          <Option value="">All services</Option>
                          <Option value="normal">Normal</Option>
                          <Option value="outstation">Outstation</Option>
                          <Option value="pooling">Pooling</Option>
                          <Option value="bus">Bus</Option>
                        </Select>
                      </Div>

                      <Div>
                        <Label className={labelClass}>Transport Type</Label>
                        <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={selectClass}>
                          <Option value="">All transport types</Option>
                          {transportTypes.map((type) => (
                            <Option key={type.value || type.id} value={type.value || type.id}>
                              {type.label || type.name || type.value}
                            </Option>
                          ))}
                        </Select>
                      </Div>

                      <Div>
                        <Label className={labelClass}>Status</Label>
                        <Select value={filters.active} onChange={(e) => updateFilter('active', e.target.value)} className={selectClass}>
                          <Option value="">All statuses</Option>
                          <Option value="true">Active</Option>
                          <Option value="false">Inactive</Option>
                        </Select>
                      </Div>

                      <Div className="flex items-end">
                        <Button
                          type="button"
                          onClick={clearFilters}
                          className="h-[42px] w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          Reset Filters
                        </Button>
                      </Div>
                    </Div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Table Body matches Image 1 */}
              <Div className="px-8 pb-8">
                <Div>
                  <Table cols={[170, 160, 160, 110, 120, 132]} className="w-full text-left">
                    <Thead>
                      <Tr className="bg-gray-50 border-y border-gray-200">
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Name</Th>
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Module Service</Th>
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Transport Type</Th>
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Thumbnail</Th>
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Status</Th>
                        <Th className="px-6 py-4 text-[13px] font-bold text-slate-700">Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody className="divide-y divide-gray-50">
                      {loading ? (
                        <Tr>
                          <Td colSpan="6" className="py-24 text-center">
                            <UiIcon as={Loader2} className="animate-spin text-yellow-600 mx-auto" size={32} />
                          </Td>
                        </Tr>
                      ) : paginatedModules.length > 0 ? (
                        paginatedModules.map((m) => (
                          <Tr key={m._id || m.id} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                            <Td className="px-6 py-5">
                              <Span className="text-[14px] font-bold text-slate-700 capitalize">{(m.name || '').toLowerCase()}</Span>
                            </Td>
                            <Td className="px-6 py-5">
                              <Span className="text-[14px] font-medium text-slate-600 capitalize">{m.service_type || 'Normal'}</Span>
                            </Td>
                            <Td className="px-6 py-5">
                              <Span className="text-[14px] font-medium text-slate-600 capitalize">{m.transport_type || 'Taxi'}</Span>
                            </Td>
                            <Td className="px-6 py-5">
                              <Div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                                <Img src={m.mobile_menu_icon || 'https://via.placeholder.com/40'} className="w-full h-full object-contain" alt="" />
                              </Div>
                            </Td>
                            <Td className="px-6 py-5">
                              <StatusToggle
                                active={m.active}
                                onToggle={() => {
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
                            </Td>
                            <Td className="px-6 py-5">
                              <Div className="flex items-center gap-2">
                                <Button
                                  onClick={() => navigate(`edit/${m._id || m.id}`)}
                                  className="p-2 bg-orange-50 text-orange-400 hover:bg-orange-100 rounded-lg transition-colors"
                                >
                                  <UiIcon as={Edit2} size={16} />
                                </Button>
                                <Button
                                  onClick={() => handleDelete(m._id || m.id)}
                                  className="p-2 bg-rose-50 text-rose-400 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                  <UiIcon as={Trash2} size={16} />
                                </Button>
                              </Div>
                            </Td>
                          </Tr>
                        ))
                      ) : (
                        <Tr>
                          <Td colSpan="6" className="py-32 text-center text-gray-400 font-medium italic">
                            No records integrated in the system database.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Div>

                <Div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                  <Span>
                    Showing {paginatedModules.length ? (currentPage - 1) * entriesPerPage + 1 : 0} to{' '}
                    {(currentPage - 1) * entriesPerPage + paginatedModules.length} of {filteredModules.length} entries
                  </Span>
                  <Div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <Span className="min-w-[90px] text-center font-semibold text-slate-700">
                      Page {currentPage} / {totalPages}
                    </Span>
                    <Button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </Div>
                </Div>
              </Div>
            </Div>
          </motion.div>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 animate-in fade-in duration-500 font-sans flex flex-col">
      {/* Header matches Image 2 */}
      <Div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm relative z-10">
        <H1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit' : 'Create'}</H1>
        <Div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
          <Span className="hover:text-yellow-600 cursor-pointer" onClick={() => navigate('/taxi/admin/pricing/app-modules')}>
            App Modules
          </Span>
          <UiIcon as={ChevronRight} size={12} className="opacity-50" />
          <Span className="text-gray-700">{isEdit ? 'Edit' : 'Create'}</Span>
        </Div>
      </Div>

      <Div className="flex-1 p-8 lg:p-10 shrink-0">
        <motion.div
          key="form"
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: -20,
          }}
          className="max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 lg:p-12 mb-20"
        >
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <Div className="space-y-1.5">
              <Label className={labelClass}>Name *</Label>
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter Name" className={inputClass} />
            </Div>

            <Div className="space-y-1.5 font-sans">
              <Label className={labelClass}>Module Service *</Label>
              <Select name="service_type" value={formData.service_type} onChange={handleInputChange} className={selectClass}>
                <Option value="">Choose Module Service</Option>
                <Option value="normal">Normal</Option>
                <Option value="outstation">Outstation</Option>
                <Option value="pooling">Pooling</Option>
                <Option value="bus">Bus</Option>
              </Select>
            </Div>

            <Div className="space-y-1.5">
              <Label className={labelClass}>Transport Type *</Label>
              <Select name="transport_type" value={formData.transport_type} onChange={handleInputChange} className={selectClass}>
                <Option value="">Choose Transport Type</Option>
                {transportTypes.map((t) => (
                  <Option key={t.id || t._id} value={t.name}>
                    {t.display_name || t.name}
                  </Option>
                ))}
              </Select>
            </Div>

            <Div className="space-y-1.5">
              <Label className={labelClass}>Icon Type</Label>
              <Select name="icon_type" value={formData.icon_type} onChange={handleInputChange} className={selectClass}>
                <Option value="">Choose Icon Type</Option>
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
            </Div>

            <Div className="space-y-1.5">
              <Label className={labelClass}>Order Number *</Label>
              <Input
                type="number"
                name="order_by"
                value={formData.order_by}
                onChange={handleInputChange}
                placeholder="Enter Order Number"
                className={inputClass}
              />
            </Div>

            <Div className="space-y-1.5">
              <Label className={labelClass}>Short Description *</Label>
              <Input
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                placeholder="Enter Short Description"
                className={inputClass}
              />
            </Div>
          </Div>

          <Div className="mt-8 space-y-1.5">
            <Label className={labelClass}>Description *</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Enter Description"
              className={inputClass + ' resize-none'}
            />
          </Div>

          <Div className="mt-10">
            <Label className={labelClass}>Thumbnail (512px x 512px) *</Label>
            <Div
              onClick={() => onImageFileChange()}
              className="mt-2 w-full max-w-[400px] h-[300px] border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50 hover:border-indigo-400 transition-all cursor-pointer group group relative overflow-hidden shadow-inner"
            >
              {imagePreview || formData.mobile_menu_icon ? (
                <Div className="relative w-full h-full p-8 flex items-center justify-center">
                  <Img src={imagePreview || formData.mobile_menu_icon} className="max-w-full max-h-full object-contain" alt="Preview" />
                  {imageUploading && (
                    <Div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <UiIcon as={Loader2} className="animate-spin text-yellow-600" />
                    </Div>
                  )}
                </Div>
              ) : (
                <Div className="text-center">
                  <Div className="text-gray-400 mb-3 font-semibold group-hover:text-indigo-500 transition-colors">Upload Image</Div>
                  <Div className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center mx-auto text-gray-300 group-hover:bg-indigo-50 group-hover:text-yellow-600 group-hover:border-indigo-100 transition-all">
                    <UiIcon as={ImageIcon} size={20} />
                  </Div>
                </Div>
              )}
            </Div>
          </Div>

          <Div className="mt-12 flex justify-end gap-3 pt-8 border-t border-gray-100">
            <Button
              onClick={() => navigate('/taxi/admin/pricing/app-modules')}
              className="px-6 py-2.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all active:scale-95"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || imageUploading}
              className="px-8 py-2.5 bg-yellow-400 text-white rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-all shadow-md shadow-indigo-100 active:scale-95 flex items-center gap-2"
            >
              {submitting ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />}
              {isEdit ? 'Update Module' : 'Push to Production'}
            </Button>
          </Div>
        </motion.div>
      </Div>
    </ScrollDiv>
  );
};
export default AppModules;
