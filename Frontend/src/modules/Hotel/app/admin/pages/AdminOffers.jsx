import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Trash2, Edit3, Search,
  Filter, ChevronRight, Calendar, Users,
  CheckCircle, XCircle, Clock, Sparkles,
  TicketPercent, Image as ImageIcon, LayoutGrid, List
} from 'lucide-react';
import { axiosInstance } from '../store/adminStore';
import toast from 'react-hot-toast';

const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minBookingAmount: '',
    maxDiscount: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '1000',
    userLimit: '1',
    isActive: true
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/offers/all');
      setOffers(res.data);
    } catch {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (offer) => {
    setFormData({
      title: offer.title || '',
      subtitle: offer.subtitle || '',
      code: offer.code || '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue || '',
      minBookingAmount: offer.minBookingAmount || '',
      maxDiscount: offer.maxDiscount || '',
      description: offer.description || '',
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
      image: offer.image || '',
      usageLimit: offer.usageLimit || '1000',
      userLimit: offer.userLimit || '1',
      isActive: offer.isActive ?? true
    });
    setSelectedOfferId(offer._id);
    setIsEditing(true);
    setImagePreview(offer.image);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await axiosInstance.delete(`/offers/${id}`);
      toast.success("Offer deleted successfully");
      fetchOffers();
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "Title is required";
    if (!formData.code.trim()) return "Coupon code is required";
    if (formData.code.length < 3) return "Code must be at least 3 characters";
    if (!formData.discountValue || formData.discountValue <= 0) return "Valid discount value is required";

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      return "Percentage discount cannot exceed 100%";
    }

    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      return "End date cannot be before start date";
    }

    if (formData.usageLimit < 1) return "Overall usage limit must be at least 1";
    if (formData.userLimit < 1) return "User limit must be at least 1";

    if (!isEditing && !imageFile) return "Offer image is required";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      let data;
      let headers = {};

      if (imageFile) {
        data = new FormData();
        Object.keys(formData).forEach(key => {
          data.append(key, formData[key]);
        });
        data.append('image', imageFile);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        data = formData;
      }

      if (isEditing) {
        await axiosInstance.put(`/offers/${selectedOfferId}`, data, { headers });
        toast.success("Offer updated successfully");
      } else {
        await axiosInstance.post('/offers', data, { headers });
        toast.success("Offer created successfully");
      }

      setShowAddModal(false);
      setIsEditing(false);
      setSelectedOfferId(null);
      setImageFile(null);
      setImagePreview('');
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} offer`);
    }
  };

  return (
    <div className="p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                        Offer management
          </h1>
          <p className="text-sm text-neutral-500">Create and manage promo codes for users</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-neutral-200 flex shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              setIsEditing(false);
              setFormData({
                title: '', subtitle: '', code: '', discountType: 'percentage',
                discountValue: '', minBookingAmount: '', maxDiscount: '',
                description: '', startDate: new Date().toISOString().split('T')[0],
                endDate: '', image: '', usageLimit: '1000', userLimit: '1', isActive: true
              });
              setImagePreview('');
              setImageFile(null);
              setShowAddModal(true);
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Plus size={16} strokeWidth={1.5} />
            Create new offer
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {[
          { label: "Total offers", value: offers.length },
          { label: "Active now", value: offers.filter(o => o.isActive).length },
          { label: "Total redemptions", value: offers.reduce((acc, o) => acc + (o.usageCount || 0), 0) },
          {
            label: "Highest percentage discount",
            value: (() => {
              const pct = offers.filter(o => o.discountType === 'percentage').map(o => Number(o.discountValue) || 0);
              return pct.length ? `${Math.max(...pct)}%` : '—';
            })(),
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
            <p className="text-[13px] text-neutral-500">{s.label}</p>
            <p className="mt-2 text-[28px] font-medium leading-9 text-neutral-900 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Offers Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mb-4" />
          <p className="text-sm text-neutral-500">Loading offers</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-neutral-300">
          <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TicketPercent size={40} className="text-neutral-300" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No offers yet</h3>
          <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6">Promo codes you create here show up at checkout in the guest app</p>
          <button onClick={() => setShowAddModal(true)} className="text-[#0a4d2b] font-medium text-sm underline">Create your first offer</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <motion.div
              layout
              key={offer._id}
              className="bg-white rounded-xl overflow-hidden border border-neutral-900/[0.08] hover:shadow-xl transition-colors group"
            >
              <div className="relative h-48 bg-neutral-200">
                <img src={offer.image} className="w-full h-full object-cover transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="bg-[#0a4d2b] text-xs font-medium px-2 py-0.5 rounded text-white mb-2 inline-block">
                        {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' FLAT'} OFF
                      </span>
                      <h3 className="text-xl font-medium text-white leading-tight">{offer.title}</h3>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 text-white font-medium text-sm">
                      {offer.code}
                    </div>
                  </div>
                </div>
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium   ${offer.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {offer.isActive ? 'Active' : 'Paused'}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-neutral-500 line-clamp-2 mb-4">{offer.subtitle}</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                    <p className="text-xs text-neutral-500 mb-1">Redemptions</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900">{offer.usageCount || 0}</span>
                      <span className="text-xs text-neutral-500">/ {offer.usageLimit}</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[#0a4d2b]"
                        style={{ width: `${Math.min(100, ((offer.usageCount || 0) / offer.usageLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                    <p className="text-xs text-neutral-500 mb-1">Min. Booking</p>
                    <span className="text-sm font-medium text-neutral-900">₹{offer.minBookingAmount}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(offer)}
                    className="flex-1 bg-neutral-900 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} /> Edit offer
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id)}
                    className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-neutral-900/[0.08]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-6 py-4 text-xs text-neutral-500">Offer detail</th>
                <th className="px-6 py-4 text-xs text-neutral-500">Code</th>
                <th className="px-6 py-4 text-xs text-neutral-500">Discount</th>
                <th className="px-6 py-4 text-xs text-neutral-500">Usage</th>
                <th className="px-6 py-4 text-xs text-neutral-500">Status</th>
                <th className="px-6 py-4 text-xs text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {offers.map(offer => (
                <tr key={offer._id} className="hover:bg-neutral-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={offer.image} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{offer.title}</p>
                        <p className="text-xs text-neutral-500 line-clamp-1">{offer.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-neutral-900 text-white px-2 py-1 rounded text-xs font-medium">
                      {offer.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-neutral-900">
                      {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' FLAT'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>{offer.usageCount || 0}</span>
                        <span>{offer.usageLimit}</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0a4d2b]" style={{ width: `${(offer.usageCount / offer.usageLimit) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium  ${offer.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      <div className={`w-1 h-1 rounded-full ${offer.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                      {offer.isActive ? 'Active' : 'Paused'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(offer)} className="p-2 text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(offer._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-neutral-800 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <div>
                  <h3 className="text-xl font-medium text-neutral-900">{isEditing ? 'Edit offer' : 'Create offer'}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{isEditing ? 'Update promotion details' : 'Promotion details'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Offer title</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Welcome special"
                        className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Offer code</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. WELCOME100"
                        className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Type</label>
                        <select
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.discountType}
                          onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat">Flat Cash (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Value</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        />
                      </div>
                    </div>
                    {formData.discountType === 'percentage' && (
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Max Discount Cap (₹)</label>
                        <input
                          type="number"
                          placeholder="Leave empty for no limit"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.maxDiscount}
                          onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Start date</label>
                        <input
                          type="date"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">End date</label>
                        <input
                          type="date"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Subtitle / short description</label>
                      <textarea
                        required
                        rows="1"
                        placeholder="Flat ₹100 off on your first stay"
                        className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none resize-none"
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Detailed terms/description</label>
                      <textarea
                        rows="2"
                        placeholder="Enter full details about the offer"
                        className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Min. Booking (₹)</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.minBookingAmount}
                          onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Overall usage limit</label>
                        <input
                          type="number"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.usageLimit}
                          onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Limit per user</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          className="w-full bg-neutral-50 border border-neutral-900/[0.08] focus:border-neutral-400 focus:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors outline-none"
                          value={formData.userLimit}
                          onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Status</label>
                        <div
                          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                          className={`w-full cursor-pointer h-[48px] rounded-2xl flex items-center px-5 transition-colors border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${formData.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm font-medium">{formData.isActive ? 'Active' : 'Paused'}</span>
                        </div>
                      </div>
                    </div>
                    <label className="text-xs text-neutral-500 mb-1.5 block ml-1">Offer image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-neutral-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-dashed border-neutral-300 group-hover:border-accent transition-colors">
                        {imagePreview || formData.image ? (
                          <img src={imagePreview || formData.image} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-neutral-300" size={24} />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="cursor-pointer bg-neutral-50 border border-neutral-900/[0.08] hover:border-accent hover:bg-white rounded-lg px-3 py-2.5 text-sm text-neutral-900 transition-colors flex items-center justify-center gap-2">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                          <Sparkles size={16} className="text-[#0a4d2b]" />
                          {imageFile ? imageFile.name : 'Upload offer image'}
                        </label>
                        <p className="text-xs text-neutral-500 mt-2 ml-1">PNG, JPG or WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-neutral-900 text-white py-4 rounded-[20px] font-medium text-sm mt-8 shadow-2xl shadow-surface/20 transition-colors"
                >
                  {isEditing ? 'Update offer' : 'Launch offer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOffers;
