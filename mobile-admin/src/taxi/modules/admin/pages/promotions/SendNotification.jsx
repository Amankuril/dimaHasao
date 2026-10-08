/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/promotions/SendNotification.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, Filter, Image as ImageIcon, Loader2, MapPin, Plus, Send, Trash2, Users } from 'lucide-react-native';
import { motion, AnimatePresence } from '../../../../../lib/motion';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import {
  Button,
  Div,
  H1,
  H3,
  Img,
  Input,
  Label,
  Option,
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
} from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { objectUrl, pickImage } from '../../../../../lib/files';
import fileToDataUrl from './fileToDataUrl';
const Motion = motion;
const LIST_PATH = '/taxi/admin/promotions/send-notification';
const CREATE_PATH = '/taxi/admin/promotions/send-notification/create';
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const createInitialFormData = () => ({
  service_location_id: '',
  send_to: '',
  push_title: '',
  message: '',
  image: null,
});
const createInitialFilters = () => ({
  service_location_id: '',
  send_to: '',
});
const HeaderBlock = ({ isCreateRoute, onBack }) => (
  <Div className="mb-6">
    <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
      <Span>Promotions</Span>
      <UiIcon as={ChevronRight} size={12} />
      <Span className="text-gray-700">{isCreateRoute ? 'Create Push Notification' : 'Push Notifications'}</Span>
    </Div>
    <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <H1 className="text-xl text-gray-900 font-bold">{isCreateRoute ? 'Create Push Notification' : 'Push Notifications'}</H1>
      {isCreateRoute ? (
        <Button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <UiIcon as={ArrowLeft} size={16} /> Back
        </Button>
      ) : null}
    </Div>
  </Div>
);
const SectionCard = ({ icon: Icon, title, description, children }) => (
  <Div className="bg-white rounded-xl border border-gray-200 p-6">
    <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
      <Div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500">
        <Icon size={18} />
      </Div>
      <Div>
        <H3 className="text-sm text-gray-900 font-bold">{title}</H3>
        <P className="text-xs text-gray-400">{description}</P>
      </Div>
    </Div>
    {children}
  </Div>
);
const FieldLabel = ({ children, required = false }) => (
  <Label className={labelClass}>
    {children}
    {required ? ' *' : ''}
  </Label>
);
const buildDeliveryAlertMessage = (responseData) => {
  const delivery = responseData?.data?.delivery || {};
  const deliveredCount = Number(delivery.deliveredCount || 0);
  const failedCount = Number(delivery.failedCount || 0);
  const targetCount = Number(delivery.targetCount || 0);
  const invalidTokenCount = Number(delivery.invalidTokenCount || 0);
  const reason = String(delivery.reason || '').trim();
  if (!delivery.attempted) {
    return reason || responseData?.data?.message || 'Notification created, but push delivery is not configured.';
  }
  const parts = [`Notification sent. Delivered to ${deliveredCount} of ${targetCount} device(s).`];
  if (failedCount > 0) {
    parts.push(`${failedCount} failed.`);
  }
  if (invalidTokenCount > 0) {
    parts.push(`${invalidTokenCount} invalid token(s) were cleaned up.`);
  }
  if (reason) {
    parts.push(reason);
  }
  return parts.join(' ');
};
const SendNotification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateRoute = location.pathname === CREATE_PATH;
  const [notifications, setNotifications] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);
  const [filters, setFilters] = useState(createInitialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bootstrapData = await adminService.getPromotionsBootstrap();
      setNotifications(Array.isArray(bootstrapData?.data?.notifications) ? bootstrapData.data.notifications : []);
      setServiceLocations(Array.isArray(bootstrapData?.data?.service_locations) ? bootstrapData.data.service_locations : []);
    } catch (error) {
      console.error('Error fetching notifications data:', error);
      setNotifications([]);
      setServiceLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (!isCreateRoute) {
      setFormData(createInitialFormData());
      setImagePreview(null);
    }
  }, [isCreateRoute]);
  const rows = useMemo(() => {
    return notifications.filter((item) => {
      const matchesAudience = !filters.send_to || String(item.send_to || '').toLowerCase() === String(filters.send_to).toLowerCase();
      const matchesLocation =
        !filters.service_location_id || String(item.service_location_id || item.service_location?._id || '') === String(filters.service_location_id);
      return matchesAudience && matchesLocation;
    });
  }, [filters, notifications]);
  const handleFieldChange = (key, value) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const clearFilters = () => {
    setFilters(createInitialFilters());
  };
  const handleImageChange = async () => {
    const file = await pickImage();
    if (!file) return;
    setFormData((current) => ({
      ...current,
      image: file,
    }));
    setImagePreview(objectUrl(file));
  };
  const handleSend = async (event) => {
    event.preventDefault();
    if (!formData.service_location_id || !formData.send_to || !formData.push_title || !formData.message) {
      alert('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      let imageData = '';
      if (formData.image) {
        imageData = await fileToDataUrl(formData.image);
      }
      const payload = {
        service_location_id: formData.service_location_id,
        send_to: formData.send_to,
        push_title: formData.push_title,
        title: formData.push_title,
        message: formData.message,
        image: imageData,
      };
      const data = await adminService.sendNotification(payload);
      if (data.success) {
        const deliveryMessage = buildDeliveryAlertMessage(data);
        setFormData(createInitialFormData());
        setImagePreview(null);
        await fetchData();
        navigate(LIST_PATH);
        alert(deliveryMessage);
      } else {
        alert(data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Send notification error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this notification?'))) return;
    try {
      const data = await adminService.deleteNotification(id);
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Delete notification error:', error);
    }
  };
  return (
    <ScrollDiv className="min-h-full bg-gray-50 text-gray-900">
      <HeaderBlock isCreateRoute={isCreateRoute} onBack={() => navigate(LIST_PATH)} />

      <AnimatePresence mode="wait">
        {!isCreateRoute ? (
          <Motion.div
            key="notification-list"
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
            className="space-y-6"
          >
            <Div className="bg-white rounded-xl border border-gray-200 p-6">
              <Div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <Span className="font-medium text-gray-600">Push notifications management</Span>
                  <Span className="hidden sm:inline text-gray-300">|</Span>
                  <Span>Total: {rows.length}</Span>
                </Div>
                <Div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <UiIcon as={Filter} size={16} /> {isFilterOpen ? 'Hide Filters' : 'Filters'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(CREATE_PATH)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold !text-[#0B1220] !bg-[#FFC400] border-none rounded-lg hover:brightness-95 transition-colors"
                  >
                    <UiIcon as={Plus} size={16} /> Create Push Notification
                  </Button>
                </Div>
              </Div>

              {isFilterOpen ? (
                <Div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Div>
                    <FieldLabel>Service Location</FieldLabel>
                    <Select
                      value={filters.service_location_id}
                      onChange={(event) => handleFilterChange('service_location_id', event.target.value)}
                      className={inputClass}
                    >
                      <Option value="">All service locations</Option>
                      {serviceLocations.map((loc) => (
                        <Option key={loc._id || loc.id} value={loc._id || loc.id}>
                          {loc.service_location_name || loc.name}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <FieldLabel>Send To</FieldLabel>
                    <Select value={filters.send_to} onChange={(event) => handleFilterChange('send_to', event.target.value)} className={inputClass}>
                      <Option value="">All audiences</Option>
                      <Option value="all">All</Option>
                      <Option value="drivers">Drivers</Option>
                      <Option value="users">Users</Option>
                    </Select>
                  </Div>

                  <Div className="flex items-end">
                    <Button
                      type="button"
                      onClick={clearFilters}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 md:w-auto"
                    >
                      Reset
                    </Button>
                  </Div>
                </Div>
              ) : null}
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table cols={[180, 220, 170, 110, 96]} className="w-full text-left">
                  <Thead className="bg-gray-50">
                    <Tr className="text-xs font-semibold text-gray-500">
                      <Th className="px-6 py-4">Push Title</Th>
                      <Th className="px-6 py-4">Message</Th>
                      <Th className="px-6 py-4">Service Location</Th>
                      <Th className="px-6 py-4">Send To</Th>
                      <Th className="px-6 py-4 text-right">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <Tr>
                        <Td colSpan="5" className="px-6 py-16 text-center text-sm text-gray-400">
                          Loading notifications...
                        </Td>
                      </Tr>
                    ) : rows.length === 0 ? (
                      <Tr>
                        <Td colSpan="5" className="px-6 py-16 text-center">
                          <Div className="flex flex-col items-center gap-3 text-gray-400">
                            <UiIcon as={Bell} size={40} strokeWidth={1.5} />
                            <P className="text-sm font-medium">No notifications found.</P>
                          </Div>
                        </Td>
                      </Tr>
                    ) : (
                      rows.map((item) => (
                        <Tr key={item._id || item.id} className="hover:bg-gray-50 transition-colors">
                          <Td className="px-6 py-4">
                            <Div className="flex items-center gap-3">
                              <Span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-500">
                                <UiIcon as={Bell} size={16} />
                              </Span>
                              <Span className="text-sm font-semibold text-gray-800">{item.push_title}</Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 text-sm text-gray-600 max-w-[340px] truncate">{item.message}</Td>
                          <Td className="px-6 py-4 text-sm text-gray-600">{item.service_location_name || '-'}</Td>
                          <Td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.send_to || 'all'}</Td>
                          <Td className="px-6 py-4">
                            <Div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                onClick={() => handleDelete(item._id || item.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-rose-600 transition-colors"
                              >
                                <UiIcon as={Trash2} size={16} />
                              </Button>
                            </Div>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
              </Table>
            </Div>
          </Motion.div>
        ) : (
          <Motion.form
            key="notification-create"
            onSubmit={handleSend}
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
            className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
          >
            <Div className="space-y-6">
              <SectionCard icon={Send} title="Notification Configuration" description="Choose the audience, write the message, and send the push right away.">
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Div>
                    <FieldLabel required>Service Location</FieldLabel>
                    <Div className="relative">
                      <UiIcon as={MapPin} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Select
                        value={formData.service_location_id}
                        onChange={(e) => handleFieldChange('service_location_id', e.target.value)}
                        className={`${inputClass} pl-10`}
                        required
                      >
                        <Option value="">Select Service Location</Option>
                        {serviceLocations.map((loc) => (
                          <Option key={loc._id || loc.id} value={loc._id || loc.id}>
                            {loc.service_location_name || loc.name}
                          </Option>
                        ))}
                      </Select>
                    </Div>
                  </Div>

                  <Div>
                    <FieldLabel required>Send To</FieldLabel>
                    <Div className="relative">
                      <UiIcon as={Users} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Select
                        value={formData.send_to}
                        onChange={(e) => handleFieldChange('send_to', e.target.value)}
                        className={`${inputClass} pl-10`}
                        required
                      >
                        <Option value="">Select</Option>
                        <Option value="all">All</Option>
                        <Option value="drivers">Drivers</Option>
                        <Option value="users">Users</Option>
                      </Select>
                    </Div>
                  </Div>

                  <Div className="md:col-span-2">
                    <FieldLabel required>Push Title</FieldLabel>
                    <Input
                      type="text"
                      value={formData.push_title}
                      onChange={(e) => handleFieldChange('push_title', e.target.value)}
                      className={inputClass}
                      placeholder="Enter Push Title"
                      required
                    />
                  </Div>

                  <Div className="md:col-span-2">
                    <FieldLabel required>Message</FieldLabel>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleFieldChange('message', e.target.value)}
                      className={`${inputClass} min-h-[120px] resize-none`}
                      placeholder="Enter Message"
                      required
                    />
                  </Div>

                  <Div className="md:col-span-2">
                    <FieldLabel>Notification Banner (320px x 320px)</FieldLabel>
                    <Div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
                      {imagePreview ? (
                        <Div className="space-y-4">
                          <Img src={imagePreview} alt="Notification preview" className="h-48 w-48 rounded-lg object-cover border border-gray-200 bg-white" />
                          <Button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData((current) => ({
                                ...current,
                                image: null,
                              }));
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Remove Image
                          </Button>
                        </Div>
                      ) : (
                        <Label onClick={handleImageChange} className="flex cursor-pointer flex-col items-center justify-center gap-3 py-8 text-center">
                          <Span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white border border-gray-200 text-yellow-500">
                            <UiIcon as={ImageIcon} size={20} />
                          </Span>
                          <Div>
                            <P className="text-sm font-semibold text-gray-800">Upload Image</P>
                            <P className="text-xs text-gray-400">Optional banner image for the push notification.</P>
                          </Div>
                        </Label>
                      )}
                    </Div>
                  </Div>
                </Div>
              </SectionCard>
            </Div>

            <Div className="space-y-6">
              <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 !bg-[#FFC400] !text-[#0B1220] rounded-lg text-sm font-bold hover:brightness-95 border-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {saving ? <UiIcon as={Loader2} className="animate-spin" size={16} /> : <UiIcon as={Send} size={16} />}
                  Send Notification
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate(LIST_PATH)}
                  className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
              </Div>

              <Div className="bg-white rounded-xl border border-gray-200 p-6">
                <H3 className="text-sm text-gray-900 mb-2 font-bold">How It Works</H3>
                <P className="text-xs leading-5 text-gray-500">
                  Service location, send-to audience, push title, message, aur optional notification banner ke saath admin se direct push fire hota hai.
                </P>
              </Div>
            </Div>
          </Motion.form>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default SendNotification;
