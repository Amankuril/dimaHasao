/* Ported from Frontend/src/modules/Food/pages/admin/categories/Category.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from '../../../../lib/motion';
import { BadgeCheck, Download, Globe, Loader2, Pencil, Plus, Trash2, Upload, X, LayoutGrid } from 'lucide-react-native';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { API_BASE_URL } from '../../../../api/config';
import { toast } from '../../../../lib/notify';
import { tableToPdf, pickImage, objectUrl } from '../../../../lib/files';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button, Div, Form, Img, Input, Label, Option, Overlay, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { window } from '../../../../lib/webShim';
const defaultFormData = {
  name: '',
  image: '',
  status: true,
  type: '',
  zoneId: 'global',
  foodTypeScope: 'Both',
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
  const COLS = [210, 170, 140, 100, 110, 140, 210];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LayoutGrid}
        title="Categories"
        subtitle="Restaurant-created categories move through approval, rejection and optional globalization before every restaurant can use them."
        breadcrumb={[{ label: 'Food' }, { label: 'Categories' }]}
        actions={
          <>
            <Button onClick={handleAddNew} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add category</Span>
            </Button>
            <Button onClick={handleExportPDF} disabled={categories.length === 0} className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Export</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search categories"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <Div className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <Button
              type="button"
              onClick={() => setShowPendingOnly(false)}
              className={`h-9 px-4 rounded-lg items-center justify-center ${!showPendingOnly ? 'bg-blue-600' : 'bg-transparent'}`}
            >
              <Span className={`text-sm font-semibold ${!showPendingOnly ? 'text-white' : 'text-slate-500'}`}>All</Span>
            </Button>
            <Button
              type="button"
              onClick={() => setShowPendingOnly(true)}
              className={`h-9 px-4 rounded-lg items-center justify-center ${showPendingOnly ? 'bg-blue-600' : 'bg-transparent'}`}
            >
              <Span className={`text-sm font-semibold ${showPendingOnly ? 'text-white' : 'text-slate-500'}`}>Pending</Span>
            </Button>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No categories found"
          message="Try a different search or create a new category."
          actionLabel="Add category"
          onAction={handleAddNew}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Category', 'Owner', 'Zone', 'Diet', 'Status', 'Approval', 'Actions']} />
          <TBody>
            {categories.map((category, idx) => {
              const creatorName = category?.createdByRestaurant?.name || category?.restaurant?.name || 'Admin';
              const approvalStatus = category?.approvalStatus || 'pending';
              const isRestaurantCategory = Boolean(category?.createdByRestaurantId || category?.restaurantId);
              const zoneText = zoneLabel(category?.zoneId);
              return (
                <Row key={category.id} last={idx === categories.length - 1}>
                  <Cell width={COLS[0]}>
                    <Div className="flex-row items-start gap-2">
                      <Div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        {category?.image ? (
                          <Img src={category.image} alt={category.name} className="h-full w-full" contentFit="cover" />
                        ) : (
                          <Span className="text-sm font-semibold text-slate-500">
                            {String(category?.name || 'C')
                              .slice(0, 1)
                              .toUpperCase()}
                          </Span>
                        )}
                      </Div>
                      <Div className="flex-1 min-w-0 gap-0.5">
                        <Span className="text-sm font-semibold text-slate-900">{category?.name || '-'}</Span>
                        <Span className="text-xs text-slate-500">{category?.type || 'No type'}</Span>
                        <Span className="text-xs text-slate-500">Items linked: {category?.itemCount || 0}</Span>
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Div className="gap-1">
                      <Span className="text-sm font-medium text-slate-900">{creatorName}</Span>
                      <Span className="text-xs text-slate-500">{category?.isGlobal ? 'Global category' : 'Private to creator'}</Span>
                      {category?.isGlobal && isRestaurantCategory ? <StatusBadge tone="info" label="Shared" icon={Globe} /> : null}
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>{zoneText}</Cell>
                  <Cell width={COLS[3]}>
                    <Span className={`self-start rounded-full border px-2 py-1 text-xs font-semibold ${scopeBadgeClass(category?.foodTypeScope)}`}>
                      {category?.foodTypeScope || 'Both'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[4]}>
                    <Button
                      onClick={() => handleToggleStatus(category.id)}
                      className="h-11 justify-center"
                      accessibilityLabel={category?.status ? 'Deactivate category' : 'Activate category'}
                    >
                      <StatusBadge status={category?.status ? 'active' : 'inactive'} label={category?.status ? 'Active' : 'Inactive'} />
                    </Button>
                  </Cell>
                  <Cell width={COLS[5]}>
                    <Div className="gap-1">
                      <StatusBadge
                        status={approvalStatus}
                        label={approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                        icon={approvalStatus === 'approved' ? BadgeCheck : undefined}
                      />
                      {category?.rejectionReason ? <Span className="text-xs text-red-600">{category.rejectionReason}</Span> : null}
                    </Div>
                  </Cell>
                  <Cell width={COLS[6]}>
                    <Div className="gap-2">
                      <Div className="flex-row flex-wrap gap-2">
                        {approvalStatus !== 'approved' && (
                          <Button onClick={() => handleApprove(category.id)} className="h-9 px-3 rounded-lg bg-blue-600 items-center justify-center">
                            <Span className="text-xs font-semibold text-white">Approve</Span>
                          </Button>
                        )}
                        {isRestaurantCategory && approvalStatus !== 'rejected' && (
                          <Button onClick={() => handleReject(category)} className="h-9 px-3 rounded-lg bg-red-600 items-center justify-center">
                            <Span className="text-xs font-semibold text-white">Reject</Span>
                          </Button>
                        )}
                        {isRestaurantCategory && !category?.isGlobal && approvalStatus === 'approved' && (
                          <Button onClick={() => handleMakeGlobal(category)} className="h-9 px-3 rounded-lg border border-slate-300 bg-white items-center justify-center">
                            <Span className="text-xs font-semibold text-slate-700">Make global</Span>
                          </Button>
                        )}
                      </Div>
                      <Div className="flex-row items-center gap-1">
                        <Button onClick={() => handleEdit(category)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Edit category">
                          <UiIcon as={Pencil} size={16} className="text-blue-600" />
                        </Button>
                        <Button onClick={() => handleDelete(category.id)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Delete category">
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Div>
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

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

      <AnimatePresence>
        {isModalOpen && (
          <Overlay onClose={resetModal} className="fixed inset-0 z-[200]">
            <Div className="absolute inset-0 bg-black/50" onClick={resetModal} />
            <Div className="absolute inset-0 flex items-center justify-center p-4">
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
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white border border-slate-200 max-h-[min(720px,calc(100vh-32px))]"
              >
                <Div className="flex-row items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <Div className="flex-1 min-w-0 gap-0.5">
                    <Span className="text-xl font-bold text-slate-900">{editingCategory ? 'Edit category' : 'Add category'}</Span>
                    <Span className="text-xs text-slate-500">Admin categories are approved immediately. Restaurant-created categories can also be updated here.</Span>
                  </Div>
                  <Button onClick={resetModal} className="w-11 h-11 rounded-lg items-center justify-center shrink-0" accessibilityLabel="Close">
                    <UiIcon as={X} size={18} className="text-slate-500" />
                  </Button>
                </Div>

                <Form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  <ScrollDiv className="min-h-0 flex-1" contentClassName="gap-3 px-4 py-4">
                    <Field label="Zone">
                      <Select
                        value={formData.zoneId}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            zoneId: event.target.value,
                          }))
                        }
                        className={INPUT}
                      >
                        <Option value="global">Global (all zones)</Option>
                        {zonesLoading && (
                          <Option value="" disabled>
                            Loading zones…
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
                    </Field>

                    <Field label="Diet scope">
                      <Select
                        value={formData.foodTypeScope}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            foodTypeScope: event.target.value,
                          }))
                        }
                        className={INPUT}
                      >
                        <Option value="Veg">Veg</Option>
                        <Option value="Non-Veg">Non-Veg</Option>
                        <Option value="Both">Both</Option>
                      </Select>
                    </Field>

                    <Field label="Category type" hint="Examples: Starters, Desserts, Drinks">
                      <Input
                        type="text"
                        value={formData.type}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: event.target.value,
                          }))
                        }
                        className={INPUT}
                        placeholder="Examples: Starters, Desserts, Drinks"
                      />
                    </Field>

                    <Field label="Category name" required>
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
                        className={INPUT}
                        placeholder="Enter category name"
                      />
                    </Field>

                    <Field label="Category image">
                      <Div className="gap-2">
                        {(imagePreview || formData.image) && (
                          <Div className="h-28 w-28 overflow-hidden rounded-xl border border-slate-200">
                            <Img src={imagePreview || formData.image} alt="Category preview" className="h-full w-full" contentFit="cover" />
                          </Div>
                        )}
                        <Div className="flex-row items-center gap-2">
                          <Button type="button" onClick={handleImageSelect} className={BTN_SECONDARY}>
                            <UiIcon as={Upload} size={16} className="text-slate-600" />
                            <Span className={BTN_TEXT_SECONDARY}>{imagePreview ? 'Change image' : 'Upload image'}</Span>
                          </Button>
                          {uploadingImage && <UiIcon as={Loader2} size={18} className="text-blue-600" />}
                        </Div>
                      </Div>
                    </Field>

                    <Label className="flex-row items-center gap-3 h-11 text-sm font-medium text-slate-700">
                      <Input
                        type="checkbox"
                        checked={formData.status}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: event.target.checked,
                          }))
                        }
                        className="h-5 w-5 rounded border-slate-300"
                      />
                      Active status
                    </Label>
                  </ScrollDiv>

                  <Div className="flex-row items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
                    <Button type="button" onClick={resetModal} className={`${BTN_SECONDARY} flex-1`}>
                      <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                    </Button>
                    <Button type="submit" className={`${BTN_PRIMARY} flex-1`}>
                      <Span className={BTN_TEXT_PRIMARY}>{editingCategory ? 'Update' : 'Create'}</Span>
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
          <Div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-4">
            <Span className="text-base font-semibold text-slate-900">Reject &quot;{rejectTarget?.name}&quot;</Span>
            <Div className="mt-3">
              <Field label="Rejection reason" required hint="A rejection reason is required.">
                <Input
                  type="text"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Reason"
                  className={INPUT}
                />
              </Field>
            </Div>
            <Div className="mt-4 flex-row items-center gap-2">
              <Button type="button" onClick={() => setRejectTarget(null)} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button type="button" onClick={submitReject} className="flex-1 flex-row items-center justify-center h-11 px-4 rounded-lg bg-red-600">
                <Span className={BTN_TEXT_PRIMARY}>Reject</Span>
              </Button>
            </Div>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
}
