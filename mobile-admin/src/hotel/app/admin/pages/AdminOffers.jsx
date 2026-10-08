/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminOffers.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  Tag,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  TicketPercent,
  Image as ImageIcon,
  LayoutGrid,
  List,
} from 'lucide-react-native';
import { axiosInstance } from '../store/adminStore';
import { toast } from '../../../../lib/notify';
import {
  Button,
  Div,
  Form,
  H1,
  H3,
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
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { window } from '../../../../lib/webShim';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
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
    isActive: true,
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
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };
  const handleImageChange = async () => {
    const file = await pickImage();
    if (file) {
      setImageFile(file);
      setImagePreview(objectUrl(file));
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
      isActive: offer.isActive ?? true,
    });
    setSelectedOfferId(offer._id);
    setIsEditing(true);
    setImagePreview(offer.image);
    setShowAddModal(true);
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this offer?'))) return;
    try {
      await axiosInstance.delete(`/offers/${id}`);
      toast.success('Offer deleted successfully');
      fetchOffers();
    } catch {
      toast.error('Failed to delete offer');
    }
  };
  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.code.trim()) return 'Coupon code is required';
    if (formData.code.length < 3) return 'Code must be at least 3 characters';
    if (!formData.discountValue || formData.discountValue <= 0) return 'Valid discount value is required';
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      return 'Percentage discount cannot exceed 100%';
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      return 'End date cannot be before start date';
    }
    if (formData.usageLimit < 1) return 'Overall usage limit must be at least 1';
    if (formData.userLimit < 1) return 'User limit must be at least 1';
    if (!isEditing && !imageFile) return 'Offer image is required';
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
        Object.keys(formData).forEach((key) => {
          data.append(key, formData[key]);
        });
        data.append('image', imageFile);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        data = formData;
      }
      if (isEditing) {
        await axiosInstance.put(`/offers/${selectedOfferId}`, data, {
          headers,
        });
        toast.success('Offer updated successfully');
      } else {
        await axiosInstance.post('/offers', data, {
          headers,
        });
        toast.success('Offer created successfully');
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
    <ScrollDiv className="p-2 pb-10 bg-gray-50">
      {/* Header */}
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <Div>
          <Div className="flex items-center gap-2">
            <UiIcon as={Tag} className="text-accent" />
            <H1 className="text-2xl font-black">Offer Management</H1>
          </Div>
          <P className="text-sm text-gray-500 font-medium">Create and manage promo codes for users</P>
        </Div>

        <Div className="flex flex-wrap items-center gap-3">
          <Div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            <Button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'text-white shadow-md' : 'text-gray-400'}`}
            >
              <UiIcon as={LayoutGrid} size={18} />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'text-white shadow-md' : 'text-gray-400'}`}
            >
              <UiIcon as={List} size={18} />
            </Button>
          </Div>

          <Button
            onClick={() => {
              setIsEditing(false);
              setFormData({
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
                image: '',
                usageLimit: '1000',
                userLimit: '1',
                isActive: true,
              });
              setImagePreview('');
              setImageFile(null);
              setShowAddModal(true);
            }}
            className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <UiIcon as={Plus} size={18} />
            <Span>Create New Offer</Span>
          </Button>
        </Div>
      </Div>

      {/* Stats Summary */}
      <Div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Offers',
            value: offers.length,
            icon: Tag,
            color: 'blue',
          },
          {
            label: 'Active Now',
            value: offers.filter((o) => o.isActive).length,
            icon: CheckCircle,
            color: 'green',
          },
          {
            label: 'Total Redemptions',
            value: offers.reduce((acc, o) => acc + (o.usageCount || 0), 0),
            icon: Sparkles,
            color: 'orange',
          },
          {
            label: 'Highest Discount',
            value: '75%',
            icon: TicketPercent,
            color: 'purple',
          },
        ].map((s, i) => (
          <Div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <Div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center`}>
              <UiIcon as={s.icon} size={22} />
            </Div>
            <Div>
              <P className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.label}</P>
              <P className="text-xl font-black">{s.value}</P>
            </Div>
          </Div>
        ))}
      </Div>

      {/* Offers Display */}
      {loading ? (
        <Div className="flex flex-col items-center justify-center py-20">
          <Div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <P className="text-sm text-gray-500 font-bold">Synchronizing offers...</P>
        </Div>
      ) : offers.length === 0 ? (
        <Div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-200">
          <Div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center self-center mb-4">
            <UiIcon as={TicketPercent} size={40} className="text-gray-300" />
          </Div>
          <H3 className="text-lg font-bold mb-2">No active offers found</H3>
          <P className="text-sm text-gray-400 text-center mb-6">Start by creating your first promotional offer to attract more bookings.</P>
          <Button onClick={() => setShowAddModal(true)} className="self-center text-accent font-bold text-sm underline">
            Create your first offer
          </Button>
        </Div>
      ) : viewMode === 'grid' ? (
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <motion.div
              layout
              key={offer._id}
              className="bg-white rounded-[28px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
            >
              <Div className="relative h-48 bg-gray-200">
                <Img src={offer.image} className="w-full h-full object-cover" />
                <LinearGradient
                  colors={['transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.5, 1]}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', padding: 20 }}
                >
                  <Div className="flex justify-between items-end gap-2">
                    <Div className="flex-1">
                      <Span className="self-start bg-accent text-[10px] font-black px-2 py-0.5 rounded uppercase text-white mb-2">
                        {offer.discountValue}
                        {offer.discountType === 'percentage' ? '%' : ' FLAT'} OFF
                      </Span>
                      <H3 className="text-xl font-black text-white leading-tight">{offer.title}</H3>
                    </Div>
                    <Div className="bg-white/20 p-2 rounded-xl border border-white/30 text-white font-black text-sm">{offer.code}</Div>
                  </Div>
                </LinearGradient>
                <Div
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${offer.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                >
                  {offer.isActive ? 'Active' : 'Paused'}
                </Div>
              </Div>

              <Div className="p-5">
                <P className="text-xs text-gray-500 font-medium line-clamp-2 mb-4">{offer.subtitle}</P>

                <Div className="grid grid-cols-2 gap-3 mb-5">
                  <Div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <P className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-1">Redemptions</P>
                    <Div className="flex items-center justify-between">
                      <Span className="text-sm font-black">{offer.usageCount || 0}</Span>
                      <Span className="text-[9px] text-gray-400">/ {offer.usageLimit}</Span>
                    </Div>
                    <Div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <Div
                        className="h-full bg-accent transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, ((offer.usageCount || 0) / offer.usageLimit) * 100)}%`,
                        }}
                      />
                    </Div>
                  </Div>
                  <Div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <P className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-1">Min. Booking</P>
                    <Span className="text-sm font-black">₹{offer.minBookingAmount}</Span>
                  </Div>
                </Div>

                <Div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(offer)}
                    className="flex-1 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <UiIcon as={Edit3} size={14} />
                    <Span>Edit Offer</Span>
                  </Button>
                  <Button
                    onClick={() => handleDelete(offer._id)}
                    className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                  >
                    <UiIcon as={Trash2} size={16} />
                  </Button>
                </Div>
              </Div>
            </motion.div>
          ))}
        </Div>
      ) : (
        <Div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
          <Table cols={[220, 130, 100, 130, 110, 104]} className="w-full text-left">
            <Thead>
              <Tr className="bg-gray-50/50 border-b border-gray-100">
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Detail</Th>
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</Th>
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount</Th>
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usage</Th>
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</Th>
                <Th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-50">
              {offers.map((offer) => (
                <Tr key={offer._id} className="hover:bg-gray-50/30 transition-colors group">
                  <Td className="px-6 py-4">
                    <Div className="flex items-center gap-3">
                      <Div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <Img src={offer.image} className="w-full h-full object-cover" />
                      </Div>
                      <Div className="flex-1">
                        <P className="text-sm font-bold">{offer.title}</P>
                        <P className="text-[10px] text-gray-400 font-medium line-clamp-1">{offer.subtitle}</P>
                      </Div>
                    </Div>
                  </Td>
                  <Td className="px-6 py-4">
                    <Span className="self-start text-white px-2 py-1 rounded text-[10px] font-black tracking-widest">{offer.code}</Span>
                  </Td>
                  <Td className="px-6 py-4">
                    <P className="text-sm font-black">
                      {offer.discountValue}
                      {offer.discountType === 'percentage' ? '%' : ' FLAT'}
                    </P>
                  </Td>
                  <Td className="px-6 py-4">
                    <Div className="flex flex-col gap-1 w-24">
                      <Div className="flex justify-between text-[9px] font-bold text-gray-400">
                        <Span>{offer.usageCount || 0}</Span>
                        <Span>{offer.usageLimit}</Span>
                      </Div>
                      <Div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <Div
                          className="h-full bg-accent"
                          style={{
                            width: `${((offer.usageCount || 0) / offer.usageLimit) * 100 || 0}%`,
                          }}
                        />
                      </Div>
                    </Div>
                  </Td>
                  <Td className="px-6 py-4">
                    <Div
                      className={`flex flex-row self-start items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${offer.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                    >
                      <Div className={`w-1 h-1 rounded-full ${offer.isActive ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                      <Span>{offer.isActive ? 'Active' : 'Paused'}</Span>
                    </Div>
                  </Td>
                  <Td className="px-6 py-4 items-end">
                    <Div className="flex items-center justify-end gap-2">
                      <Button onClick={() => handleEdit(offer)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                        <UiIcon as={Edit3} size={16} />
                      </Button>
                      <Button onClick={() => handleDelete(offer._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <UiIcon as={Trash2} size={16} />
                      </Button>
                    </Div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Overlay onClose={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <Div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <Div className="flex-1">
                  <H3 className="text-xl font-black">{isEditing ? 'Edit Offer' : 'Create New Offer'}</H3>
                  <P className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {isEditing ? 'Update Promotion Details' : 'Promotion Details'}
                  </P>
                </Div>
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all"
                >
                  <UiIcon as={Trash2} size={20} className="text-gray-400" />
                </Button>
              </Div>

              <Form onSubmit={handleSubmit} className="flex-shrink">
                <ScrollDiv className="p-6">
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Div className="space-y-4">
                    <Div className="group">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Offer Title</Label>
                      <Input
                        required
                        type="text"
                        placeholder="e.g. Welcome Special"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            title: e.target.value,
                          })
                        }
                      />
                    </Div>
                    <Div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Offer Code</Label>
                      <Input
                        required
                        type="text"
                        placeholder="e.g. WELCOME100"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-black tracking-widest transition-all outline-none uppercase"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </Div>
                    <Div className="grid grid-cols-2 gap-4">
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Type</Label>
                        <Select
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.discountType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discountType: e.target.value,
                            })
                          }
                        >
                          <Option value="percentage">Percentage (%)</Option>
                          <Option value="flat">Flat Cash (₹)</Option>
                        </Select>
                      </Div>
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Value</Label>
                        <Input
                          required
                          type="number"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.discountValue}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discountValue: e.target.value,
                            })
                          }
                        />
                      </Div>
                    </Div>
                    {formData.discountType === 'percentage' && (
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Max Discount Cap (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Leave empty for no limit"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.maxDiscount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxDiscount: e.target.value,
                            })
                          }
                        />
                      </Div>
                    )}
                    <Div className="grid grid-cols-2 gap-4">
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Start Date</Label>
                        <Input
                          type="date"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </Div>
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">End Date</Label>
                        <Input
                          type="date"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </Div>
                    </Div>
                  </Div>

                  <Div className="space-y-4">
                    <Div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Subtitle / Short Description</Label>
                      <Textarea
                        required
                        rows="1"
                        placeholder="Flat ₹100 Off on your first stay"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none resize-none"
                        value={formData.subtitle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            subtitle: e.target.value,
                          })
                        }
                      />
                    </Div>
                    <Div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Detailed Terms/Description</Label>
                      <Textarea
                        rows="2"
                        placeholder="Enter full details about the offer..."
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none resize-none"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                      />
                    </Div>
                    <Div className="grid grid-cols-2 gap-4">
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Min. Booking (₹)</Label>
                        <Input
                          type="number"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.minBookingAmount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              minBookingAmount: e.target.value,
                            })
                          }
                        />
                      </Div>
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Overall Usage Limit</Label>
                        <Input
                          type="number"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.usageLimit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              usageLimit: e.target.value,
                            })
                          }
                        />
                      </Div>
                    </Div>
                    <Div className="grid grid-cols-2 gap-4">
                      <Div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Limit Per User</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 1"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold transition-all outline-none"
                          value={formData.userLimit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              userLimit: e.target.value,
                            })
                          }
                        />
                      </Div>
                      <Div className="flex flex-col">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Status</Label>
                        <Div
                          onClick={() =>
                            setFormData({
                              ...formData,
                              isActive: !formData.isActive,
                            })
                          }
                          className={`w-full h-[48px] rounded-2xl flex items-center px-5 transition-all border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                        >
                          <Div className={`w-2 h-2 rounded-full mr-2 ${formData.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <Span className="text-sm font-bold uppercase tracking-widest">{formData.isActive ? 'Active' : 'Paused'}</Span>
                        </Div>
                      </Div>
                    </Div>
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Offer Image</Label>
                    <Div className="flex items-center gap-4">
                      <Div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-accent transition-colors">
                        {imagePreview || formData.image ? (
                          <Img src={imagePreview || formData.image} className="w-full h-full object-cover" />
                        ) : (
                          <UiIcon as={ImageIcon} className="text-gray-300" size={24} />
                        )}
                      </Div>
                      <Div className="flex-1">
                        <Button
                          type="button"
                          onClick={handleImageChange}
                          className="bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <UiIcon as={Sparkles} size={16} className="text-accent" />
                          <Span numberOfLines={1} className="flex-shrink">{imageFile ? imageFile.name : 'Upload Offer Image'}</Span>
                        </Button>
                        <P className="text-[9px] text-gray-400 mt-2 ml-1">PNG, JPG or WEBP (Max 5MB)</P>
                      </Div>
                    </Div>
                  </Div>
                </Div>

                <Button
                  type="submit"
                  className="w-full items-center text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest mt-8 shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  {isEditing ? 'Update Offer' : 'Launch Offer'}
                </Button>
                </ScrollDiv>
              </Form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default AdminOffers;
