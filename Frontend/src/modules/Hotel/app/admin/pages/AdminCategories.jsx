import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminService from '../../../services/adminService';
import * as LucideIcons from 'lucide-react';

// Icon Picker Component
const IconPicker = ({ value, onChange }) => {
    const [search, setSearch] = useState('');

    // Common icons for property types
    const commonIcons = [
        'Building2', 'Home', 'Palmtree', 'Hotel', 'Building', 'BedDouble',
        'Tent', 'Castle', 'Warehouse', 'Mountain', 'Trees', 'Waves'
    ];

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Icon</label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                {commonIcons.map((iconName) => {
                    const Icon = LucideIcons[iconName];
                    if (!Icon) return null;
                    return (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => onChange(iconName)}
                            className={`p-2 rounded-lg transition-colors ${value === iconName
                                ? 'bg-amber-600 text-white'
                                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                                }`}
                        >
                            <Icon size={20} />
                        </button>
                    );
                })}
            </div>
            <div className="text-xs text-neutral-500">Selected: {value}</div>
        </div>
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
        isActive: true
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
                isActive: category.isActive !== undefined ? category.isActive : true
            });
        }
    }, [category]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadLoading(true);
            const formDataUpload = new FormData();
            formDataUpload.append('images', file);
            
            const response = await adminService.uploadImage(formDataUpload);
            if (response && response.images && response.images.length > 0) {
                setFormData(prev => ({ ...prev, bgImage: response.images[0].url }));
                toast.success('Image uploaded successfully');
            } else if (response && response.urls && response.urls.length > 0) {
                setFormData(prev => ({ ...prev, bgImage: response.urls[0] }));
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
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b shrink-0">
                    <h2 className="text-xl font-medium text-neutral-900">
                        {category ? 'Edit category' : 'Add category'}
                    </h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Internal name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="e.g. Luxury villas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Display name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="e.g. Luxury"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0a4d2b]/30 outline-none"
                                rows="2"
                                placeholder="Short description"
                            />
                        </div>

                        <IconPicker
                            value={formData.icon}
                            onChange={(icon) => setFormData({ ...formData, icon })}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                    />
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Badge text</label>
                                <input
                                    type="text"
                                    value={formData.badge}
                                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Background image</label>
                            <div className="flex items-center gap-4">
                                {formData.bgImage && (
                                    <div className="relative w-24 h-16 rounded-lg overflow-hidden border">
                                        <img src={formData.bgImage} alt="Bg preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, bgImage: '' }))}
                                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-red-500 hover:text-red-700"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadLoading || loading}
                                        className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                                    />
                                    {uploadLoading ? (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <div className="w-3 h-3 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" /> Uploading image...
                                        </p>
                                    ) : (
                                        <p className="text-xs text-neutral-500 mt-1">Recommended: 1920x1080 (For Hero Sections)</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">
                                Active (Visible to users)
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 p-6 border-t bg-neutral-50 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploadLoading}
                            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save category
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
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
        if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;

        try {
            await adminService.deleteCategory(id);
            toast.success('Category deleted');
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-900">Property categories</h1>
                    <p className="mt-1 text-sm text-neutral-500">Manage dynamic property types and tabs</p>
                </div>
                {/* Add Category Button Removed */}
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-neutral-300 mb-3" />
                        <p className="text-lg font-medium">No dynamic categories found</p>
                        <p className="text-sm">Create a new category to get started</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs text-neutral-500">Order</th>
                                <th className="px-6 py-4 text-left text-xs text-neutral-500">Category info</th>
                                <th className="px-6 py-4 text-left text-xs text-neutral-500">Bg image</th>
                                <th className="px-6 py-4 text-left text-xs text-neutral-500">Slug</th>
                                <th className="px-6 py-4 text-left text-xs text-neutral-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs text-neutral-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {categories.map((cat) => {
                                const Icon = LucideIcons[cat.icon] || LucideIcons.HelpCircle;
                                return (
                                    <tr key={cat._id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-neutral-500 cursor-move">
                                                <GripVertical size={16} />
                                                <span className="text-xs font-mono">{cat.order || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                                                    style={{ backgroundColor: cat.color }}
                                                >
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-neutral-900">{cat.displayName}</div>
                                                    {cat.badge && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 mt-0.5">
                                                            {cat.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cat.bgImage ? (
                                                <img src={cat.bgImage} alt="bg" className="w-16 h-10 object-cover rounded shadow-sm border border-neutral-200" />
                                            ) : (
                                                <span className="text-xs text-neutral-500">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                                                {cat.slug}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.isActive
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}>
                                                {cat.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(cat)}
                                                    className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                {/* Delete Button Removed */}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

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
        </div>
    );
};

export default AdminCategories;
