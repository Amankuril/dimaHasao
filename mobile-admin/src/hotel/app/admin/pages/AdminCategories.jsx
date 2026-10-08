/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminCategories.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Edit2, X, Save, LayoutGrid } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import { pickImage } from '../../../../lib/files';
import { window } from '../../../../lib/webShim';
import adminService from '../../../services/adminService';
import * as LucideIconSet from 'lucide-react-native';

// Category icons are stored by lucide name, looked up at render as on the web.
const LucideIcons = { ...LucideIconSet };

// Icon Picker Component
import { Button, CheckBox, Div, Form, H2, Img, Input, Overlay, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Field,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const COLS = [90, 200, 120, 150, 120, 90];
const IconPicker = ({ value, onChange }) => {
  // Common icons for property types
  const commonIcons = ['Building2', 'Home', 'Palmtree', 'Hotel', 'Building', 'BedDouble', 'Tent', 'Castle', 'Warehouse', 'Mountain', 'Trees', 'Waves'];
  return (
    <Field label="Icon" hint={`Selected: ${value}`}>
      <ScrollDiv className="p-2 border border-slate-300 rounded-lg max-h-40" contentClassName="flex-row flex-wrap gap-2">
        {commonIcons.map((iconName) => {
          const Icon = LucideIcons[iconName];
          if (!Icon) return null;
          const selected = value === iconName;
          return (
            <Button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={`w-11 h-11 rounded-lg items-center justify-center ${selected ? 'bg-blue-600' : 'bg-slate-100'}`}
              accessibilityLabel={iconName}
            >
              <UiIcon as={Icon} size={20} className={selected ? 'text-white' : 'text-slate-700'} />
            </Button>
          );
        })}
      </ScrollDiv>
    </Field>
  );
};
const CategoryModal = ({ category, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: 'Building2',
    color: '#B45309',
    badge: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const { tablet } = useLayoutWidth();
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        displayName: category.displayName || '',
        description: category.description || '',
        icon: category.icon || 'Building2',
        color: category.color || '#B45309',
        badge: category.badge || '',
        bgImage: category.bgImage || '',
        isActive: category.isActive !== undefined ? category.isActive : true,
      });
    }
  }, [category]);
  const handleImageUpload = async () => {
    const file = await pickImage();
    if (!file) return;
    try {
      setUploadLoading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('images', file);
      const response = await adminService.uploadImage(formDataUpload);
      if (response && response.images && response.images.length > 0) {
        setFormData((prev) => ({
          ...prev,
          bgImage: response.images[0].url,
        }));
        toast.success('Image uploaded successfully');
      } else if (response && response.urls && response.urls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          bgImage: response.urls[0],
        }));
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to get image URL');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (category) {
        await adminService.updateCategory(category._id, formData);
        toast.success('Category updated successfully');
      } else {
        await adminService.createCategory(formData);
        toast.success('Category created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Overlay onClose={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[90vh]">
        <Div className="flex-row justify-between items-center gap-3 p-4 border-b border-slate-200 shrink-0">
          <H2 className="text-xl font-bold text-slate-900 flex-1" numberOfLines={1}>
            {category ? 'Edit Category' : 'Add New Category'}
          </H2>
          <Button onClick={onClose} className="w-11 h-11 rounded-lg items-center justify-center shrink-0" accessibilityLabel="Close">
            <UiIcon as={X} size={20} className="text-slate-500" />
          </Button>
        </Div>

        <Form onSubmit={handleSubmit} className="flex flex-col flex-shrink min-h-0">
          <ScrollDiv className="p-4 flex-shrink" contentClassName="gap-3">
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              <Field label="Internal name" required className={tablet ? 'flex-1 min-w-[240px]' : null}>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className={INPUT}
                  placeholder="e.g. Luxury Villas"
                />
              </Field>
              <Field label="Display name" required className={tablet ? 'flex-1 min-w-[240px]' : null}>
                <Input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayName: e.target.value,
                    })
                  }
                  className={INPUT}
                  placeholder="e.g. Luxury"
                />
              </Field>
            </Div>

            <Field label="Description">
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                rows={2}
                placeholder="Short description…"
              />
            </Field>

            <IconPicker
              value={formData.icon}
              onChange={(icon) =>
                setFormData({
                  ...formData,
                  icon,
                })
              }
            />

            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              <Field label="Colour" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                <Div className="flex-row items-center gap-2">
                  <Div className="h-11 w-11 rounded-lg border border-slate-200 shrink-0" style={{ backgroundColor: formData.color }} />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        color: e.target.value,
                      })
                    }
                    className={`${INPUT} flex-1`}
                  />
                </Div>
              </Field>
              <Field label="Badge text" hint="Optional ribbon on the category tab" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                <Input
                  type="text"
                  value={formData.badge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      badge: e.target.value,
                    })
                  }
                  className={INPUT}
                  placeholder="Optional"
                />
              </Field>
            </Div>

            <Field label="Background image" hint={uploadLoading ? 'Uploading image…' : 'Recommended: 1920x1080 (for hero sections)'}>
              <Div className="flex-row items-center gap-3">
                {formData.bgImage ? (
                  <Div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <Img src={formData.bgImage} alt="Background preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          bgImage: '',
                        }))
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white items-center justify-center"
                      accessibilityLabel="Remove background image"
                    >
                      <UiIcon as={X} size={14} className="text-red-600" />
                    </Button>
                  </Div>
                ) : null}
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadLoading || loading}
                  className={`${BTN_SECONDARY} flex-1 ${uploadLoading || loading ? 'opacity-60' : ''}`}
                >
                  <Span className={BTN_TEXT_SECONDARY}>{uploadLoading ? 'Uploading…' : 'Choose file'}</Span>
                </Button>
              </Div>
            </Field>

            <Div className="flex-row items-center gap-2 py-1">
              <CheckBox
                className="w-5 h-5"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.checked,
                  })
                }
              />
              <P className="text-sm text-slate-700">Active (visible to users)</P>
            </Div>
          </ScrollDiv>

          <Div className="flex-row gap-2 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <Button type="button" onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button type="submit" disabled={loading || uploadLoading} className={`${BTN_PRIMARY} flex-1 ${loading || uploadLoading ? 'opacity-60' : ''}`}>
              <UiIcon as={Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{loading ? 'Saving…' : 'Save category'}</Span>
            </Button>
          </Div>
        </Form>
      </Div>
    </Overlay>
  );
};
const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      setLoadError(null);
      const data = await adminService.getAllCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to fetch categories');
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };
  const handleCreate = () => {
    setEditingCategory(null);
    setShowModal(true);
  };
  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this category? This action cannot be undone.'))) return;
    try {
      await adminService.deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LayoutGrid}
        title="Property Categories"
        subtitle="Manage the property types and tabs shown to guests."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Categories' }]}
      />

      {loadError ? (
        <ErrorState title="Could not load categories" message={loadError} onRetry={fetchCategories} />
      ) : loading ? (
        <LoadingState label="Loading categories…" />
      ) : categories.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No categories found" message="Property categories configured for the platform appear here." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Order', 'Category', 'Bg image', 'Slug', 'Status', 'Actions']} />
          <TBody>
            {categories.map((cat, i) => {
              const Icon = LucideIcons[cat.icon] || LucideIcons.HelpCircle;
              return (
                <Row key={cat._id} last={i === categories.length - 1}>
                  <Cell width={COLS[0]}>{cat.order != null ? String(cat.order) : '—'}</Cell>
                  <Cell width={COLS[1]}>
                    <Div className="flex-row items-center gap-3">
                      <Div
                        className="w-10 h-10 rounded-lg items-center justify-center shrink-0"
                        style={{
                          backgroundColor: cat.color,
                        }}
                      >
                        <UiIcon as={Icon} size={20} className="text-white" />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <P numberOfLines={2} className="text-sm font-semibold text-slate-900">
                          {cat.displayName}
                        </P>
                        {cat.badge ? <StatusBadge tone="info" label={cat.badge} className="mt-0.5" /> : null}
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>
                    {cat.bgImage ? (
                      <Img src={cat.bgImage} alt="Category background" className="w-16 h-10 object-cover rounded border border-slate-200" />
                    ) : (
                      <Span className="text-sm text-slate-400">None</Span>
                    )}
                  </Cell>
                  <Cell width={COLS[3]}>{cat.slug}</Cell>
                  <Cell width={COLS[4]}>
                    <StatusBadge status={cat.isActive ? 'active' : 'inactive'} label={cat.isActive ? 'Active' : 'Inactive'} />
                  </Cell>
                  <Cell width={COLS[5]} align="center">
                    <Button
                      onClick={() => handleEdit(cat)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Edit ${cat.displayName}`}
                    >
                      <UiIcon as={Edit2} size={18} className="text-blue-600" />
                    </Button>
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchCategories();
          }}
        />
      )}
    </AdminPage>
  );
};
export default AdminCategories;
