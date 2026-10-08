/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/promotions/SendNotification.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Filter, Image as ImageIcon, Loader2, Plus, Send, Trash2 } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, Img, Input, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { objectUrl, pickImage } from '../../../../../lib/files';
import fileToDataUrl from './fileToDataUrl';
const LIST_PATH = '/taxi/admin/promotions/send-notification';
const CREATE_PATH = '/taxi/admin/promotions/send-notification/create';
const COLS = [170, 220, 160, 110, 80];
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
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);
  const [filters, setFilters] = useState(createInitialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const { tablet } = useLayoutWidth();
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const bootstrapData = await adminService.getPromotionsBootstrap();
      setNotifications(Array.isArray(bootstrapData?.data?.notifications) ? bootstrapData.data.notifications : []);
      setServiceLocations(Array.isArray(bootstrapData?.data?.service_locations) ? bootstrapData.data.service_locations : []);
    } catch (error) {
      console.error('Error fetching notifications data:', error);
      setLoadError(error?.message || 'Failed to load notifications');
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
    <AdminPage maxWidth={isCreateRoute ? 720 : 1200}>
      <PageHeader
        icon={Bell}
        title={isCreateRoute ? 'Create push notification' : 'Push notifications'}
        subtitle={isCreateRoute ? 'Choose the audience, write the message and send it' : 'Pushes sent to riders and drivers'}
        breadcrumb={[{ label: 'Promotions' }, { label: 'Push notifications' }, ...(isCreateRoute ? [{ label: 'Create' }] : [])]}
        actions={
          isCreateRoute ? (
            <Button type="button" onClick={() => navigate(LIST_PATH)} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          ) : (
            <>
              <Button type="button" onClick={() => navigate(CREATE_PATH)} className={BTN_PRIMARY}>
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Create push notification</Span>
              </Button>
              <Button type="button" onClick={() => setIsFilterOpen((current) => !current)} className={BTN_SECONDARY}>
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>{isFilterOpen ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            </>
          )
        }
      />

      {!isCreateRoute ? (
        <>
          <Card className="mb-4">
            <SectionTitle className={isFilterOpen ? undefined : 'mb-0'}>Push notifications · {rows.length} total</SectionTitle>

            {isFilterOpen ? (
              <Div className="gap-3">
                <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                  <Field label="Service location" className={tablet ? 'flex-1' : ''}>
                    <Select
                      value={filters.service_location_id}
                      onChange={(event) => handleFilterChange('service_location_id', event.target.value)}
                      className={INPUT}
                    >
                      <Option value="">All service locations</Option>
                      {serviceLocations.map((loc) => (
                        <Option key={loc._id || loc.id} value={loc._id || loc.id}>
                          {loc.service_location_name || loc.name}
                        </Option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Send to" className={tablet ? 'flex-1' : ''}>
                    <Select value={filters.send_to} onChange={(event) => handleFilterChange('send_to', event.target.value)} className={INPUT}>
                      <Option value="">All audiences</Option>
                      <Option value="all">All</Option>
                      <Option value="drivers">Drivers</Option>
                      <Option value="users">Users</Option>
                    </Select>
                  </Field>
                </Div>
                <Toolbar className="mb-0">
                  <Button type="button" onClick={clearFilters} className={BTN_SECONDARY}>
                    <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
                  </Button>
                </Toolbar>
              </Div>
            ) : null}
          </Card>

          {loading ? (
            <TableSkeleton rows={5} />
          ) : loadError ? (
            <ErrorState title="Could not load notifications" message={loadError} onRetry={fetchData} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications found"
              message={
                filters.send_to || filters.service_location_id
                  ? 'No notification matches the filters you picked.'
                  : 'Create a push notification and it will be listed here.'
              }
              actionLabel="Create push notification"
              onAction={() => navigate(CREATE_PATH)}
            />
          ) : (
            <DataTable cols={COLS}>
              <THead cols={COLS} labels={['Push title', 'Message', 'Service location', 'Send to', 'Action']} />
              <TBody>
                {rows.map((item, i) => (
                  <Row key={item._id || item.id} last={i === rows.length - 1}>
                    <Cell width={COLS[0]}>
                      <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                        {item.push_title}
                      </Span>
                    </Cell>
                    <Cell width={COLS[1]}>{item.message}</Cell>
                    <Cell width={COLS[2]}>{item.service_location_name || '-'}</Cell>
                    <Cell width={COLS[3]}>
                      <StatusBadge tone="info" label={item.send_to || 'all'} />
                    </Cell>
                    <Cell width={COLS[4]} align="right">
                      <Button
                        type="button"
                        onClick={() => handleDelete(item._id || item.id)}
                        accessibilityLabel="Delete notification"
                        className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
          )}
        </>
      ) : (
        <Form onSubmit={handleSend}>
          <Card className="mb-4 gap-4">
            <SectionTitle className="mb-0">Notification configuration</SectionTitle>

            <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
              <Field label="Service location" required className={tablet ? 'flex-1' : ''}>
                <Select
                  value={formData.service_location_id}
                  onChange={(e) => handleFieldChange('service_location_id', e.target.value)}
                  className={INPUT}
                  required
                >
                  <Option value="">Select Service Location</Option>
                  {serviceLocations.map((loc) => (
                    <Option key={loc._id || loc.id} value={loc._id || loc.id}>
                      {loc.service_location_name || loc.name}
                    </Option>
                  ))}
                </Select>
              </Field>

              <Field label="Send to" required className={tablet ? 'flex-1' : ''}>
                <Select value={formData.send_to} onChange={(e) => handleFieldChange('send_to', e.target.value)} className={INPUT} required>
                  <Option value="">Select</Option>
                  <Option value="all">All</Option>
                  <Option value="drivers">Drivers</Option>
                  <Option value="users">Users</Option>
                </Select>
              </Field>
            </Div>

            <Field label="Push title" required>
              <Input
                type="text"
                value={formData.push_title}
                onChange={(e) => handleFieldChange('push_title', e.target.value)}
                className={INPUT}
                placeholder="Enter Push Title"
                required
              />
            </Field>

            <Field label="Message" required>
              <Textarea
                value={formData.message}
                onChange={(e) => handleFieldChange('message', e.target.value)}
                className="min-h-[120px] px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                placeholder="Enter Message"
                required
              />
            </Field>

            <Field label="Notification banner" hint="Optional, 320 px × 320 px.">
              {imagePreview ? (
                <Div className="gap-3">
                  <Img
                    src={imagePreview}
                    alt="Notification preview"
                    className="h-40 w-40 rounded-lg border border-slate-200 bg-white"
                    contentFit="cover"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData((current) => ({
                        ...current,
                        image: null,
                      }));
                    }}
                    className={`${BTN_SECONDARY} self-start`}
                  >
                    <Span className={BTN_TEXT_SECONDARY}>Remove image</Span>
                  </Button>
                </Div>
              ) : (
                <Button
                  type="button"
                  onClick={handleImageChange}
                  accessibilityLabel="Upload notification banner"
                  className="rounded-lg border border-slate-300 bg-white items-center justify-center gap-2 py-8"
                >
                  <UiIcon as={ImageIcon} size={24} className="text-slate-400" />
                  <Span className="text-sm font-semibold text-slate-700">Upload image</Span>
                </Button>
              )}
            </Field>
          </Card>

          <Card className="mb-4 gap-2">
            <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
              {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Send} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>Send notification</Span>
            </Button>
            <Button type="button" onClick={() => navigate(LIST_PATH)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
          </Card>

          <Card>
            <SectionTitle className="mb-2">How it works</SectionTitle>
            <Span className="text-sm text-slate-500">
              The push fires straight from the admin with the service location, audience, title, message and the optional banner image.
            </Span>
          </Card>
        </Form>
      )}
    </AdminPage>
  );
};
export default SendNotification;
