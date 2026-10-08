/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminCategories.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Save, AlertCircle } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import { pickImage } from '../../../../lib/files';
import { window } from '../../../../lib/webShim';
import adminService from '../../../services/adminService';
import * as LucideIcons from 'lucide-react-native';

// Icon Picker Component
import {
  Button,
  Code,
  Div,
  Form,
  H1,
  H2,
  Img,
  Input,
  Label,
  Overlay,
  P,
  ScrollDiv,
  Span,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
const IconPicker = ({ value, onChange }) => {
  const [search, setSearch] = useState('');

  // Common icons for property types
  const commonIcons = ['Building2', 'Home', 'Palmtree', 'Hotel', 'Building', 'BedDouble', 'Tent', 'Castle', 'Warehouse', 'Mountain', 'Trees', 'Waves'];
  return (
    <Div className="space-y-2">
      <Label className="block text-sm font-medium text-gray-700">Icon</Label>
      <ScrollDiv className="p-3 border rounded-lg max-h-40" contentClassName="flex flex-row flex-wrap gap-2">
        {commonIcons.map((iconName) => {
          const Icon = LucideIcons[iconName];
          if (!Icon) return null;
          return (
            <Button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={`p-2 rounded-lg transition-colors ${value === iconName ? 'bg-amber-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <UiIcon as={Icon} size={20} />
            </Button>
          );
        })}
      </ScrollDiv>
      <Div className="text-xs text-gray-500">Selected: {value}</Div>
    </Div>
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
      <Div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <Div className="flex justify-between items-center p-6 border-b shrink-0">
          <H2 className="text-xl font-bold text-gray-900">{category ? 'Edit Category' : 'Add New Category'}</H2>
          <Button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <UiIcon as={X} size={24} />
          </Button>
        </Div>

        <Form onSubmit={handleSubmit} className="flex flex-col flex-shrink min-h-0">
          <ScrollDiv className="p-6 space-y-4 flex-shrink">
            <Div className="grid grid-cols-2 gap-4">
              <Div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</Label>
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Luxury Villas"
                />
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Display Name</Label>
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Luxury"
                />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                rows="2"
                placeholder="Short description..."
              />
            </Div>

            <IconPicker
              value={formData.icon}
              onChange={(icon) =>
                setFormData({
                  ...formData,
                  icon,
                })
              }
            />

            <Div className="grid grid-cols-2 gap-4">
              <Div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Color</Label>
                <Div className="flex items-center gap-2">
                  <Div className="h-10 w-10 rounded border border-gray-200" style={{ backgroundColor: formData.color }} />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        color: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-lg uppercase"
                  />
                </Div>
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</Label>
                <Input
                  type="text"
                  value={formData.badge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      badge: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Optional"
                />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Background Image</Label>
              <Div className="flex items-center gap-4">
                {formData.bgImage && (
                  <Div className="relative w-24 h-16 rounded-lg overflow-hidden border">
                    <Img src={formData.bgImage} alt="Bg preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          bgImage: '',
                        }))
                      }
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-red-500 hover:text-red-700"
                    >
                      <UiIcon as={X} size={14} />
                    </Button>
                  </Div>
                )}
                <Div className="flex-1">
                  <Button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadLoading || loading}
                    className="self-start py-2 px-4 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold"
                  >
                    Choose File
                  </Button>
                  {uploadLoading ? (
                    <Div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <Span>Uploading image...</Span>
                    </Div>
                  ) : (
                    <P className="text-xs text-gray-400 mt-1">Recommended: 1920x1080 (For Hero Sections)</P>
                  )}
                </Div>
              </Div>
            </Div>

            <Div className="flex items-center gap-2 pt-2">
              <Input
                type="checkbox"
                nativeID="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.checked,
                  })
                }
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <Label className="text-sm font-medium text-gray-700">Active (Visible to users)</Label>
            </Div>
          </ScrollDiv>

          <Div className="flex gap-3 p-6 border-t bg-gray-50 shrink-0">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadLoading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UiIcon as={Save} size={18} />
                  <Span>Save Category</Span>
                </>
              )}
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
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      const data = await adminService.getAllCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to fetch categories');
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
    <ScrollDiv className="p-2 pb-10">
      <Div className="flex justify-between items-center mb-6">
        <Div className="flex-1">
          <H1 className="text-2xl font-bold text-gray-900">Property Categories</H1>
          <P className="text-gray-500 text-sm mt-1">Manage dynamic property types and tabs</P>
        </Div>
        {/* Add Category Button Removed */}
      </Div>

      {/* Categories List */}
      <Div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Div className="p-12 flex justify-center">
            <Div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          </Div>
        ) : categories.length === 0 ? (
          <Div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <UiIcon as={AlertCircle} className="w-12 h-12 text-gray-300 mb-3" />
            <P className="text-lg font-medium">No dynamic categories found</P>
            <P className="text-sm">Create a new category to get started</P>
          </Div>
        ) : (
          <Table cols={[90, 200, 110, 140, 110, 90]} className="w-full">
            <Thead className="bg-gray-50 border-b border-gray-100">
              <Tr>
                <Th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</Th>
                <Th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category Info</Th>
                <Th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bg Image</Th>
                <Th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</Th>
                <Th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</Th>
                <Th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const Icon = LucideIcons[cat.icon] || LucideIcons.HelpCircle;
                return (
                  <Tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-6 py-4">
                      <Div className="flex items-center gap-2 text-gray-400 ">
                        <UiIcon as={GripVertical} size={16} />
                        <Span className="text-xs font-mono">{cat.order || '-'}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4">
                      <Div className="flex items-center gap-3">
                        <Div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                          style={{
                            backgroundColor: cat.color,
                          }}
                        >
                          <UiIcon as={Icon} size={20} />
                        </Div>
                        <Div>
                          <Div className="font-semibold text-gray-900">{cat.displayName}</Div>
                          {cat.badge && (
                            <Span className="self-start px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 mt-0.5">
                              {cat.badge}
                            </Span>
                          )}
                        </Div>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4">
                      {cat.bgImage ? (
                        <Img src={cat.bgImage} alt="bg" className="w-16 h-10 object-cover rounded shadow-sm border border-gray-200" />
                      ) : (
                        <Span className="text-xs text-gray-400">None</Span>
                      )}
                    </Td>
                    <Td className="px-6 py-4">
                      <Code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{cat.slug}</Code>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span
                        className={`self-start px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 text-right">
                      <Div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(cat)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <UiIcon as={Edit2} size={18} />
                        </Button>
                        {/* Delete Button Removed */}
                      </Div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Div>

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
    </ScrollDiv>
  );
};
export default AdminCategories;
