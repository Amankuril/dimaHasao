/* Ported from Frontend/src/modules/Food/pages/admin/categories/Category.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from '../../../../lib/motion';
import { BadgeCheck, Download, Globe, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react-native';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { API_BASE_URL } from '../../../../api/config';
import { toast } from '../../../../lib/notify';
import { tableToPdf, pickImage, objectUrl } from '../../../../lib/files';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  Button,
  Div,
  Form,
  H1,
  H2,
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
} from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const defaultFormData = {
  name: '',
  image: '',
  status: true,
  type: '',
  zoneId: 'global',
  foodTypeScope: 'Both',
};
const approvalBadgeClass = (status) => {
  const value = String(status || 'pending').toLowerCase();
  if (value === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (value === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};
const scopeBadgeClass = (scope) => {
  if (scope === 'Veg') return 'bg-green-50 text-green-700 border-green-200';
  if (scope === 'Non-Veg') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};
const zoneLabel = (zone) => {
  if (!zone) return 'Global';
  if (typeof zone === 'string') {
    const value = zone.trim();
    if (/^[a-f0-9]{24}$/i.test(value)) return `Zone ID ${value.slice(-6)}`;
    return value;
  }
  return zone?.name || zone?.zoneName || zone?.serviceLocation || 'Zone';
};
export default function Category() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_categories_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_accessToken');
    if (!adminToken) {
      toast.error('Please login to access categories');
      setLoading(false);
      return;
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    setZonesLoading(true);
    adminAPI
      .getZones({
        limit: 1000,
      })
      .then((res) => {
        const list = res?.data?.data?.zones || res?.data?.data?.data?.zones || res?.data?.data || [];
        if (!cancelled) setZones(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setZones([]);
      })
      .finally(() => {
        if (!cancelled) setZonesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, showPendingOnly]);
  useEffect(() => {
    fetchCategories();
  }, [debouncedSearch, showPendingOnly, currentPage, pageSize]);
  const fetchCategories = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (showPendingOnly) params.approvalStatus = 'pending';
      const response = await adminAPI.getCategories(params);
      const list = response?.data?.data?.categories || response?.data?.categories || [];
      setCategories(Array.isArray(list) ? list : []);
      setTotalItems(response?.data?.data?.total ?? response?.data?.total ?? (Array.isArray(list) ? list.length : 0));
    } catch (error) {
      if (error?.response?.status === 401) {
        toast.error('Authentication required. Please login again.');
      } else if (error?.response?.status === 403) {
        toast.error('Access denied. You do not have permission.');
      } else if (error?.response?.status === 404) {
        toast.error('Categories endpoint not found. Please check backend server.');
      } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        toast.error('Cannot connect to server. Please check if backend is running on ' + API_BASE_URL.replace('/api', ''));
      } else {
        toast.error(error?.response?.data?.message || 'Failed to load categories');
      }
      if (!silent) setCategories([]);
      setTotalItems(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  const resetModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(defaultFormData);
    setSelectedImageFile(null);
    setImagePreview(null);
  };
  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData(defaultFormData);
    setSelectedImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };
  const handleEdit = (category) => {
    setEditingCategory(category);
    const zoneIdValue = typeof category?.zoneId === 'string' ? category.zoneId : category?.zoneId?._id || category?.zoneId?.id || 'global';
    setFormData({
      name: category?.name || '',
      image: category?.image || '',
      status: category?.status !== false,
      type: category?.type || '',
      zoneId: zoneIdValue || 'global',
      foodTypeScope: category?.foodTypeScope || 'Both',
    });
    setSelectedImageFile(null);
    setImagePreview(category?.image || null);
    setIsModalOpen(true);
  };
  const handleImageSelect = async () => {
    const file = await pickImage();
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setSelectedImageFile(file);
    setImagePreview(objectUrl(file));
  };
  const handleToggleStatus = async (id) => {
    try {
      const response = await adminAPI.toggleCategoryStatus(String(id));
      if (response?.data?.success) {
        toast.success('Category status updated successfully');
        fetchCategories({
          silent: true,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update category status');
    }
  };
  const handleApprove = async (id) => {
    setCategories((prev) =>
      prev.map((c) =>
        String(c?.id || c?._id) === String(id)
          ? {
              ...c,
              approvalStatus: 'approved',
            }
          : c,
      ),
    );
    try {
      const response = await adminAPI.approveCategory(String(id));
      if (response?.data?.success) {
        toast.success('Category approved successfully');
        fetchCategories({
          silent: true,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve category');
      fetchCategories({
        silent: true,
      });
    }
  };
  const handleReject = (category) => {
    // The web asks for the reason with window.prompt; there is no prompt here, so the
    // same question is asked in a small modal and the submit runs the web's flow.
    setRejectTarget(category);
    setRejectReason('');
  };
  const submitReject = async () => {
    const category = rejectTarget;
    const reason = rejectReason;
    if (!String(reason).trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setRejectTarget(null);
    const id = String(category?.id || category?._id);
    setCategories((prev) =>
      prev.map((c) =>
        String(c?.id || c?._id) === id
          ? {
              ...c,
              approvalStatus: 'rejected',
            }
          : c,
      ),
    );
    try {
      const response = await adminAPI.rejectCategory(id, reason);
      if (response?.data?.success) {
        toast.success('Category rejected successfully');
        fetchCategories({
          silent: true,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject category');
      fetchCategories({
        silent: true,
      });
    }
  };
  const handleMakeGlobal = async (category) => {
    if (!(await window.confirmAsync(`Make "${category?.name}" global for every restaurant?`))) return;
    try {
      const response = await adminAPI.makeCategoryGlobal(String(category?.id || category?._id));
      if (response?.data?.success) {
        toast.success('Category is now global');
        fetchCategories({
          silent: true,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to make category global');
    }
  };
  const handleDelete = async (id) => {
    const categoryName = categories.find((category) => String(category?.id) === String(id))?.name || 'this category';
    if (!(await window.confirmAsync(`Delete "${categoryName}"? This action cannot be undone.`))) return;
    setCategories((prev) => prev.filter((c) => String(c?.id || c?._id) !== String(id)));
    try {
      const response = await adminAPI.deleteCategory(String(id));
      if (response?.data?.success) {
        toast.success('Category deleted successfully');
        fetchCategories({
          silent: true,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete category');
    }
  };
  const handleExportPDF = async () => {
    try {
      const tableData = categories.map((category, index) => [
        (currentPage - 1) * pageSize + index + 1,
        category?.name || 'N/A',
        category?.foodTypeScope || 'Both',
        category?.isGlobal ? 'Global' : 'Private',
        zoneLabel(category?.zoneId),
        category?.approvalStatus || 'pending',
      ]);
      await tableToPdf({
        filename: `Categories_${new Date().toISOString().split('T')[0]}.pdf`,
        landscape: false,
        title: 'Category List',
        subtitle: `Generated on: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        columns: ['SL', 'Category', 'Diet Scope', 'Visibility', 'Zone', 'Approval'],
        rows: tableData,
        headColor: '#3B82F6',
      });
      toast.success('PDF exported successfully!');
    } catch {
      toast.error('Failed to export PDF');
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setUploadingImage(true);
      let imageUrl = String(formData.image || '').trim();
      if (selectedImageFile) {
        const uploadRes = await uploadAPI.uploadMedia(selectedImageFile, {
          folder: 'Dima Hasao/categories',
        });
        const payload = uploadRes?.data?.data || uploadRes?.data;
        imageUrl = payload?.url || imageUrl;
      }
      const payload = {
        name: String(formData.name || '').trim(),
        type: String(formData.type || '').trim(),
        status: Boolean(formData.status),
        image: imageUrl || undefined,
        zoneId: formData.zoneId || 'global',
        foodTypeScope: formData.foodTypeScope,
      };
      if (editingCategory) {
        const response = await adminAPI.updateCategory(editingCategory.id, payload);
        if (response?.data?.success) toast.success('Category updated successfully');
      } else {
        const response = await adminAPI.createCategory(payload);
        if (response?.data?.success) toast.success('Category created successfully');
      }
      resetModal();
      fetchCategories({
        silent: true,
      });
    } catch (error) {
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        toast.error('Cannot connect to server. Please check if backend is running on ' + API_BASE_URL.replace('/api', ''));
      } else {
        toast.error(error?.response?.data?.message || 'Failed to save category');
      }
    } finally {
      setUploadingImage(false);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <Div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Div className="flex flex-wrap items-start justify-between gap-4">
          <Div>
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-slate-900">Categories</H1>
            </Div>
            <P className="mt-2 max-w-2xl text-sm text-slate-500">
              Restaurant-created categories now move through approval, rejection, and optional globalization before every restaurant can use them.
            </P>
          </Div>

          <Div className="flex flex-wrap items-center gap-3">
            <Div className="flex items-center gap-2 rounded-full border border-slate-200 p-1">
              <Button
                type="button"
                onClick={() => setShowPendingOnly(false)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${!showPendingOnly ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                All
              </Button>
              <Button
                type="button"
                onClick={() => setShowPendingOnly(true)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${showPendingOnly ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
              >
                Pending
              </Button>
            </Div>

            <Div className="relative min-w-[220px]">
              <UiIcon as={Search} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search categories"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-900"
              />
            </Div>

            <Button
              onClick={handleExportPDF}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UiIcon as={Download} className="h-4 w-4" />
              Export
            </Button>

            <Button onClick={handleAddNew} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
              <UiIcon as={Plus} className="h-4 w-4" />
              Add Category
            </Button>
          </Div>
        </Div>
      </Div>

      <Div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Div>
          <Table className="min-w-full" cols={[200, 160, 140, 100, 110, 130, 220]}>
            <Thead className="border-b border-slate-200 bg-slate-50">
              <Tr>
                <Th className="w-[25%] px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Category</Th>
                <Th className="w-[17%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Owner</Th>
                <Th className="w-[15%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Zone</Th>
                <Th className="w-[10%] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Diet</Th>
                <Th className="w-[10%] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Status</Th>
                <Th className="w-[13%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Approval</Th>
                <Th className="w-[20%] px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-slate-100">
              {loading ? (
                <Tr>
                  <Td colSpan={7} className="px-6 py-20 text-center">
                    <UiIcon as={Loader2} className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                    <P className="mt-2 text-sm text-slate-500">Loading categories...</P>
                  </Td>
                </Tr>
              ) : categories.length === 0 ? (
                <Tr>
                  <Td colSpan={7} className="px-6 py-20 text-center">
                    <P className="text-lg font-semibold text-slate-700">No categories found</P>
                    <P className="mt-1 text-sm text-slate-500">Try a different search or create a new category.</P>
                  </Td>
                </Tr>
              ) : (
                categories.map((category) => {
                  const creatorName = category?.createdByRestaurant?.name || category?.restaurant?.name || 'Admin';
                  const approvalStatus = category?.approvalStatus || 'pending';
                  const isRestaurantCategory = Boolean(category?.createdByRestaurantId || category?.restaurantId);
                  const zoneText = zoneLabel(category?.zoneId);
                  return (
                    <Tr key={category.id} className="align-top hover:bg-slate-50/80">
                      <Td className="px-5 py-5">
                        <Div className="flex items-start gap-3">
                          <Div className="h-11 w-11 overflow-hidden rounded-2xl bg-slate-100">
                            {category?.image ? (
                              <Img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <Div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                                {String(category?.name || 'C')
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </Div>
                            )}
                          </Div>
                          <Div className="min-w-0">
                            <P className="truncate text-lg font-semibold leading-6 text-slate-900">{category?.name || '-'}</P>
                            <Div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <Span>{category?.type || 'No type'}</Span>
                              <Span className="text-slate-300">•</Span>
                              <Span>Items linked: {category?.itemCount || 0}</Span>
                            </Div>
                          </Div>
                        </Div>
                      </Td>
                      <Td className="px-4 py-5 text-sm text-slate-600">
                        <Div className="space-y-1">
                          <P className="font-medium leading-6 text-slate-800">{creatorName}</P>
                          <P className="text-xs text-slate-400">{category?.isGlobal ? 'Global category' : 'Private to creator'}</P>
                          {category?.isGlobal && isRestaurantCategory && (
                            <Span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                              <UiIcon as={Globe} className="mr-1 h-3.5 w-3.5" />
                              Shared
                            </Span>
                          )}
                        </Div>
                      </Td>
                      <Td className="px-4 py-5">
                        <Div className="max-w-[180px]">
                          <P className="truncate text-sm font-medium text-slate-700">{zoneText}</P>
                        </Div>
                      </Td>
                      <Td className="px-4 py-5 text-center">
                        <Span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${scopeBadgeClass(category?.foodTypeScope)}`}>
                          {category?.foodTypeScope || 'Both'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-5 text-center">
                        <Button
                          onClick={() => handleToggleStatus(category.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${category?.status ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <Span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${category?.status ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </Button>
                      </Td>
                      <Td className="px-4 py-5">
                        <Div className="space-y-2">
                          <Span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${approvalBadgeClass(approvalStatus)}`}
                          >
                            {approvalStatus === 'approved' && <UiIcon as={BadgeCheck} className="mr-1 h-3.5 w-3.5" />}
                            {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                          </Span>
                          {category?.rejectionReason && <P className="max-w-[180px] text-xs leading-5 text-rose-600">{category.rejectionReason}</P>}
                        </Div>
                      </Td>
                      <Td className="px-5 py-5">
                        <Div className="flex flex-col items-end gap-2">
                          <Div className="flex flex-wrap justify-end gap-2">
                            {approvalStatus !== 'approved' && (
                              <Button
                                onClick={() => handleApprove(category.id)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                              >
                                Approve
                              </Button>
                            )}
                            {isRestaurantCategory && approvalStatus !== 'rejected' && (
                              <Button
                                onClick={() => handleReject(category)}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                              >
                                Reject
                              </Button>
                            )}
                            {isRestaurantCategory && !category?.isGlobal && approvalStatus === 'approved' && (
                              <Button
                                onClick={() => handleMakeGlobal(category)}
                                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                              >
                                Make Global
                              </Button>
                            )}
                          </Div>
                          <Div className="flex items-center justify-end gap-1">
                            <Button onClick={() => handleEdit(category)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                              <UiIcon as={Pencil} className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDelete(category.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
                              <UiIcon as={Trash2} className="h-4 w-4" />
                            </Button>
                          </Div>
                        </Div>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Div>

        <AdminListPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            try {
              localStorage.setItem('admin_categories_pageSize', String(size));
            } catch {}
            setCurrentPage(1);
          }}
          itemLabel="categories"
        />
      </Div>

      <AnimatePresence>
            {isModalOpen && (
        <Overlay onClose={resetModal} className="fixed inset-0 z-[200]">
                <Div className="absolute inset-0 bg-black/50" onClick={resetModal} />
                <Div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[min(720px,calc(100vh-32px))]"
                  >
                    <Div className="flex items-center justify-between border-b px-6 py-4">
                      <Div>
                        <H2 className="text-xl font-bold text-slate-900">{editingCategory ? 'Edit Category' : 'Add Category'}</H2>
                        <P className="text-xs text-slate-500">
                          Admin categories are approved immediately. Restaurant-created categories can also be updated here.
                        </P>
                      </Div>
                      <Button onClick={resetModal} className="rounded-lg p-1 hover:bg-slate-100">
                        <UiIcon as={X} className="h-5 w-5 text-slate-500" />
                      </Button>
                    </Div>

                    <Form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                      <ScrollDiv className="min-h-0 flex-1" contentClassName="space-y-4 px-6 py-5">
                        <Div>
                          <Label className="mb-2 block text-sm font-medium text-slate-700">Zone</Label>
                          <Select
                            value={formData.zoneId}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                zoneId: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          >
                            <Option value="global">Global (all zones)</Option>
                            {zonesLoading && (
                              <Option value="" disabled>
                                Loading zones...
                              </Option>
                            )}
                            {zones.map((zone) => {
                              const id = String(zone?._id || zone?.id || '');
                              const label = zone?.name || zone?.zoneName || zone?.serviceLocation || id;
                              return (
                                <Option key={id} value={id}>
                                  {label}
                                </Option>
                              );
                            })}
                          </Select>
                        </Div>

                        <Div>
                          <Label className="mb-2 block text-sm font-medium text-slate-700">Diet Scope</Label>
                          <Select
                            value={formData.foodTypeScope}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                foodTypeScope: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                          >
                            <Option value="Veg">Veg</Option>
                            <Option value="Non-Veg">Non-Veg</Option>
                            <Option value="Both">Both</Option>
                          </Select>
                        </Div>

                        <Div>
                          <Label className="mb-2 block text-sm font-medium text-slate-700">Category Type</Label>
                          <Input
                            type="text"
                            value={formData.type}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                type: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                            placeholder="Examples: Starters, Desserts, Drinks"
                          />
                        </Div>

                        <Div>
                          <Label className="mb-2 block text-sm font-medium text-slate-700">Category Name</Label>
                          <Input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                            placeholder="Enter category name"
                          />
                        </Div>

                        <Div>
                          <Label className="mb-2 block text-sm font-medium text-slate-700">Category Image</Label>
                          <Div className="space-y-3">
                            {(imagePreview || formData.image) && (
                              <Div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-300">
                                <Img src={imagePreview || formData.image} alt="Category preview" className="h-full w-full object-cover" />
                              </Div>
                            )}
                            <Div className="flex items-center gap-3">
                              <Button
                                type="button"
                                onClick={handleImageSelect}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
                              >
                                <UiIcon as={Upload} className="h-4 w-4" />
                                {imagePreview ? 'Change Image' : 'Upload Image'}
                              </Button>
                              {uploadingImage && <UiIcon as={Loader2} className="h-5 w-5 animate-spin text-blue-600" />}
                            </Div>
                          </Div>
                        </Div>

                        <Label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <Input
                            type="checkbox"
                            checked={formData.status}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                status: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Active Status
                        </Label>
                      </ScrollDiv>

                      <Div className="flex items-center gap-3 border-t bg-white px-6 py-4">
                        <Button type="button" onClick={resetModal} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-700">
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-white">
                          {editingCategory ? 'Update' : 'Create'}
                        </Button>
                      </Div>
                    </Form>
                  </motion.div>
                </Div>
              </Overlay>
            )}
      </AnimatePresence>

      {rejectTarget && (
        <Overlay onClose={() => setRejectTarget(null)} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <Div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <H2 className="text-lg font-bold text-slate-900">Reject &quot;{rejectTarget?.name}&quot;</H2>
            <P className="mt-1 text-xs text-slate-500">A rejection reason is required.</P>
            <Input
              type="text"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason"
              className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
            <Div className="mt-5 flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-700"
              >
                Cancel
              </Button>
              <Button type="button" onClick={submitReject} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-white">
                Reject
              </Button>
            </Div>
          </Div>
        </Overlay>
      )}
    </ScrollDiv>
  );
}
