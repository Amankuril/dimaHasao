/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminOffers.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  Tag,
  Plus,
  Trash2,
  Edit3,
  X,
  CheckCircle,
  Sparkles,
  TicketPercent,
  Image as ImageIcon,
  LayoutGrid,
  List,
} from 'lucide-react-native';
import { axiosInstance } from '../store/adminStore';
import { toast } from '../../../../lib/notify';
import { Button, Div, Form, Img, Input, Option, Overlay, P, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  StatCard,
  StatGrid,
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
import { window } from '../../../../lib/webShim';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
const COLS = [220, 130, 110, 140, 120, 104];
const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const { tablet } = useLayoutWidth();
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
      setLoadError(null);
      const res = await axiosInstance.get('/offers/all');
      setOffers(res.data);
    } catch (error) {
      toast.error('Failed to fetch offers');
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to fetch offers.');
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
  const openCreate = () => {
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
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Tag}
        title="Offer Management"
        subtitle="Create and manage promo codes for guests."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Offers & Coupons' }]}
        actions={
          <>
            <Button onClick={openCreate} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Create new offer</Span>
            </Button>
            <Button
              onClick={() => setViewMode('grid')}
              className={`w-11 h-11 rounded-lg items-center justify-center border ${viewMode === 'grid' ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
              accessibilityLabel="Grid view"
            >
              <UiIcon as={LayoutGrid} size={18} className={viewMode === 'grid' ? 'text-blue-700' : 'text-slate-500'} />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={`w-11 h-11 rounded-lg items-center justify-center border ${viewMode === 'list' ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
              accessibilityLabel="List view"
            >
              <UiIcon as={List} size={18} className={viewMode === 'list' ? 'text-blue-700' : 'text-slate-500'} />
            </Button>
          </>
        }
      />

      {/* Stats Summary */}
      <StatGrid className="mb-4">
        <StatCard label="Total offers" value={String(offers.length)} icon={Tag} tone="info" />
        <StatCard label="Active now" value={String(offers.filter((o) => o.isActive).length)} icon={CheckCircle} tone="success" />
        <StatCard label="Total redemptions" value={String(offers.reduce((acc, o) => acc + (o.usageCount || 0), 0))} icon={Sparkles} tone="warning" />
        <StatCard label="Highest discount" value="75%" icon={TicketPercent} tone="neutral" />
      </StatGrid>

      {/* Offers Display */}
      {loadError ? (
        <ErrorState title="Could not load offers" message={loadError} onRetry={fetchOffers} />
      ) : loading ? (
        <LoadingState label="Loading offers…" />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title="No offers yet"
          message="Create your first promotional offer to attract more bookings."
          actionLabel="Create offer"
          onAction={openCreate}
        />
      ) : viewMode === 'grid' ? (
        <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
          {offers.map((offer) => (
            <motion.div layout key={offer._id} className={tablet ? 'flex-1 min-w-[300px]' : ''}>
              <Card padded={false} className="overflow-hidden">
                <Div className="relative h-40 bg-slate-100">
                  <Img src={offer.image} className="w-full h-full object-cover" alt={offer.title} />
                  <LinearGradient
                    colors={['transparent', 'transparent', 'rgba(0,0,0,0.75)']}
                    locations={[0, 0.5, 1]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', padding: 12 }}
                  >
                    <Div className="flex-row justify-between items-end gap-2">
                      <Div className="flex-1 min-w-0">
                        <Span className="self-start bg-blue-600 text-xs font-semibold px-2 py-0.5 rounded text-white mb-1">
                          {offer.discountValue}
                          {offer.discountType === 'percentage' ? '% OFF' : ' FLAT OFF'}
                        </Span>
                        <P numberOfLines={2} className="text-base font-semibold text-white">
                          {offer.title}
                        </P>
                      </Div>
                      <Div className="bg-white/20 px-2 py-1 rounded-lg border border-white/30 shrink-0">
                        <Span numberOfLines={1} className="text-sm font-semibold text-white">
                          {offer.code}
                        </Span>
                      </Div>
                    </Div>
                  </LinearGradient>
                  <Div className="absolute top-3 right-3">
                    <StatusBadge status={offer.isActive ? 'active' : 'inactive'} label={offer.isActive ? 'Active' : 'Paused'} />
                  </Div>
                </Div>

                <Div className="p-4 gap-3">
                  <P numberOfLines={2} className="text-sm text-slate-500">
                    {offer.subtitle}
                  </P>

                  <Div className="flex-row gap-2">
                    <Div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Redemptions</P>
                      <Div className="flex-row items-center justify-between">
                        <Span className="text-sm font-semibold text-slate-900">{offer.usageCount || 0}</Span>
                        <Span className="text-xs text-slate-500">/ {offer.usageLimit}</Span>
                      </Div>
                      <Div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <Div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${Math.min(100, ((offer.usageCount || 0) / offer.usageLimit) * 100)}%`,
                          }}
                        />
                      </Div>
                    </Div>
                    <Div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Min. booking</P>
                      <Span className="text-sm font-semibold text-slate-900">₹{offer.minBookingAmount}</Span>
                    </Div>
                  </Div>

                  <Div className="flex-row gap-2">
                    <Button onClick={() => handleEdit(offer)} className={`${BTN_SECONDARY} flex-1`}>
                      <UiIcon as={Edit3} size={16} className="text-slate-600" />
                      <Span className={BTN_TEXT_SECONDARY}>Edit offer</Span>
                    </Button>
                    <Button
                      onClick={() => handleDelete(offer._id)}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-slate-300 bg-white"
                      accessibilityLabel={`Delete offer ${offer.title}`}
                    >
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Div>
              </Card>
            </motion.div>
          ))}
        </Div>
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Offer detail', 'Code', 'Discount', 'Usage', 'Status', 'Actions']} />
          <TBody>
            {offers.map((offer, i) => (
              <Row key={offer._id} last={i === offers.length - 1}>
                <Cell width={COLS[0]}>
                  <Div className="flex-row items-center gap-3">
                    <Div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                      <Img src={offer.image} className="w-full h-full object-cover" alt={offer.title} />
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                        {offer.title}
                      </P>
                      <P numberOfLines={1} className="text-xs text-slate-500">
                        {offer.subtitle}
                      </P>
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[1]}>
                  <Span numberOfLines={1} className="text-sm font-semibold text-slate-900">
                    {offer.code}
                  </Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm font-semibold text-slate-900">
                    {offer.discountValue}
                    {offer.discountType === 'percentage' ? '%' : ' FLAT'}
                  </Span>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="gap-1 w-full">
                    <Div className="flex-row justify-between">
                      <Span className="text-xs text-slate-500">{offer.usageCount || 0}</Span>
                      <Span className="text-xs text-slate-500">{offer.usageLimit}</Span>
                    </Div>
                    <Div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <Div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${Math.min(100, ((offer.usageCount || 0) / offer.usageLimit) * 100) || 0}%`,
                        }}
                      />
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[4]}>
                  <StatusBadge status={offer.isActive ? 'active' : 'inactive'} label={offer.isActive ? 'Active' : 'Paused'} />
                </Cell>
                <Cell width={COLS[5]} align="center">
                  <Div className="flex-row items-center gap-1">
                    <Button
                      onClick={() => handleEdit(offer)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Edit offer ${offer.title}`}
                    >
                      <UiIcon as={Edit3} size={18} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(offer._id)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Delete offer ${offer.title}`}
                    >
                      <UiIcon as={Trash2} size={18} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Add / edit modal */}
      <AnimatePresence>
        {showAddModal && (
          <Overlay onClose={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <Div className="p-4 border-b border-slate-200 flex-row justify-between items-center gap-3">
                <Div className="flex-1 min-w-0">
                  <P className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Offer' : 'Create New Offer'}</P>
                  <P className="text-sm text-slate-500">{isEditing ? 'Update the promotion details' : 'Promotion details'}</P>
                </Div>
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                  }}
                  className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                  accessibilityLabel="Close"
                >
                  <UiIcon as={X} size={20} className="text-slate-500" />
                </Button>
              </Div>

              <Form onSubmit={handleSubmit} className="flex-shrink">
                <ScrollDiv className="p-4" contentClassName="gap-3">
                  <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
                    <Field label="Offer title" required className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        required
                        type="text"
                        placeholder="e.g. Welcome Special"
                        className={INPUT}
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            title: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Offer code" required hint="Guests type this at checkout" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        required
                        type="text"
                        placeholder="e.g. WELCOME100"
                        className={INPUT}
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </Field>
                    <Field label="Discount type" required className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Select
                        className={INPUT}
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
                    </Field>
                    <Field label="Discount value" required className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        required
                        type="number"
                        className={INPUT}
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountValue: e.target.value,
                          })
                        }
                      />
                    </Field>
                    {formData.discountType === 'percentage' ? (
                      <Field label="Max discount cap (₹)" hint="Leave empty for no limit" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                        <Input
                          type="number"
                          placeholder="No limit"
                          className={INPUT}
                          value={formData.maxDiscount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxDiscount: e.target.value,
                            })
                          }
                        />
                      </Field>
                    ) : null}
                    <Field label="Start date" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        type="date"
                        className={INPUT}
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="End date" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        type="date"
                        className={INPUT}
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Min. booking (₹)" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        type="number"
                        className={INPUT}
                        value={formData.minBookingAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minBookingAmount: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Overall usage limit" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        type="number"
                        className={INPUT}
                        value={formData.usageLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            usageLimit: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Limit per user" className={tablet ? 'flex-1 min-w-[240px]' : null}>
                      <Input
                        type="number"
                        placeholder="e.g. 1"
                        className={INPUT}
                        value={formData.userLimit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            userLimit: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </Div>

                  <Field label="Subtitle / short description" required>
                    <Textarea
                      required
                      rows={2}
                      placeholder="Flat ₹100 off on your first stay"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                      value={formData.subtitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subtitle: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Detailed terms / description">
                    <Textarea
                      rows={3}
                      placeholder="Enter full details about the offer…"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Status" hint="Paused offers cannot be redeemed">
                    <Button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          isActive: !formData.isActive,
                        })
                      }
                      className={`h-11 flex-row items-center gap-2 px-3 rounded-lg border ${formData.isActive ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'}`}
                      accessibilityLabel={formData.isActive ? 'Offer active, tap to pause' : 'Offer paused, tap to activate'}
                    >
                      <Div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-green-700' : 'bg-red-700'}`} />
                      <Span className={`text-sm font-semibold ${formData.isActive ? 'text-green-700' : 'text-red-700'}`}>
                        {formData.isActive ? 'Active' : 'Paused'}
                      </Span>
                    </Button>
                  </Field>

                  <Field label="Offer image" required={!isEditing} hint="PNG, JPG or WEBP (max 5MB)">
                    <Div className="flex-row items-center gap-3">
                      <Div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden items-center justify-center border border-slate-200 shrink-0">
                        {imagePreview || formData.image ? (
                          <Img src={imagePreview || formData.image} className="w-full h-full object-cover" alt="Offer image preview" />
                        ) : (
                          <UiIcon as={ImageIcon} className="text-slate-400" size={24} />
                        )}
                      </Div>
                      <Button type="button" onClick={handleImageChange} className={`${BTN_SECONDARY} flex-1`}>
                        <Span numberOfLines={1} className={BTN_TEXT_SECONDARY}>
                          {imageFile ? imageFile.name : 'Upload offer image'}
                        </Span>
                      </Button>
                    </Div>
                  </Field>

                  <SectionTitle className="mb-0 mt-1">{isEditing ? 'Ready to update?' : 'Ready to launch?'}</SectionTitle>
                  <Button type="submit" className={BTN_PRIMARY}>
                    <Span className={BTN_TEXT_PRIMARY}>{isEditing ? 'Update offer' : 'Launch offer'}</Span>
                  </Button>
                </ScrollDiv>
              </Form>
            </motion.div>
          </Overlay>
        )}
      </AnimatePresence>
    </AdminPage>
  );
};
export default AdminOffers;
