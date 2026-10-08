/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/NotificationChannels.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Edit, User, Users } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { AdminPage, PageHeader, Card, DataTable, THead, TBody, Row, Cell, LoadingState, EmptyState, ErrorState, BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';

const COLS = [230, 110, 110, 180];

const NotificationChannels = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [channels, setChannels] = useState([]);
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'driver'

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await adminService.getNotificationChannels();
      setChannels(res.data?.results || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load notification channels');
      toast.error('Failed to load notification channels');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleToggle = async (id, type, currentValue) => {
    try {
      if (type === 'push') {
        await adminService.toggleChannelPush(id, !currentValue);
      } else {
        await adminService.toggleChannelMail(id, !currentValue);
      }
      setChannels((prev) =>
        prev.map((c) =>
          String(c._id) === String(id)
            ? {
                ...c,
                [type === 'push' ? 'push_notification' : 'mail']: !currentValue,
              }
            : c,
        ),
      );
      toast.success('Channel preference updated');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to update toggle');
    }
  };
  const filteredChannels = channels.filter((channel) => (activeTab === 'user' ? channel.for_user : !channel.for_user));

  const header = (
    <PageHeader
      icon={Bell}
      title="Push & Email Channels"
      subtitle="Delivery methods for automated platform events"
      breadcrumb={[{ label: 'Settings' }, { label: 'Business Configuration' }, { label: 'Notification Channels' }]}
      actions={
        <Button onClick={() => window.history.back()} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );

  const tabs = (
    <Div className="flex-row flex-wrap gap-2 mb-4">
      {[
        { key: 'user', label: 'Customers', icon: User },
        { key: 'driver', label: 'Drivers', icon: Users },
      ].map((t) => {
        const on = activeTab === t.key;
        return (
          <Button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border ${on ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}
          >
            <UiIcon as={t.icon} size={16} className={on ? 'text-white' : 'text-slate-700'} />
            <Span className={on ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{t.label}</Span>
          </Button>
        );
      })}
    </Div>
  );

  if (loading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        {tabs}
        <LoadingState label="Loading channels…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        {tabs}
        <ErrorState title="Could not load channels" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      {header}
      {tabs}

      {filteredChannels.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No channels in this segment"
          message={`No system notification channels are configured for ${activeTab === 'user' ? 'customers' : 'drivers'} yet.`}
          actionLabel="Reload"
          onAction={fetchData}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Event channel', 'Push', 'Email', 'Templates']} />
          <TBody>
            {filteredChannels.map((channel, i) => (
              <Row key={channel._id} last={i === filteredChannels.length - 1}>
                <Cell width={COLS[0]}>
                  <Div className="gap-1">
                    <P className="text-sm font-semibold text-slate-900">{channel.topic_name || channel.name}</P>
                    <P className="text-xs text-slate-500">
                      {channel.description || `Automatic notifications sent to ${activeTab}s regarding system updates.`}
                    </P>
                  </Div>
                </Cell>
                <Cell width={COLS[1]} align="center">
                  <Switch
                    checked={channel.push_notification}
                    onCheckedChange={() => handleToggle(channel._id, 'push', channel.push_notification)}
                  />
                </Cell>
                <Cell width={COLS[2]} align="center">
                  <Switch checked={channel.mail} onCheckedChange={() => handleToggle(channel._id, 'mail', channel.mail)} />
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="flex-row flex-wrap gap-2">
                    <Button
                      onClick={() => toast.success('Viewing Email Template')}
                      accessibilityLabel="Edit email template"
                      className="flex-row items-center gap-1.5 h-11 px-3 rounded-lg border border-slate-300 bg-white"
                    >
                      <UiIcon as={Edit} size={14} className="text-slate-700" />
                      <Span className="text-xs font-semibold text-slate-700">Email</Span>
                    </Button>
                    <Button
                      onClick={() => toast.success('Viewing Push Template')}
                      accessibilityLabel="Edit push template"
                      className="flex-row items-center gap-1.5 h-11 px-3 rounded-lg border border-slate-300 bg-white"
                    >
                      <UiIcon as={Edit} size={14} className="text-slate-700" />
                      <Span className="text-xs font-semibold text-slate-700">Push</Span>
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <P className="text-xs text-slate-500 mt-3">{filteredChannels.length} active event triggers</P>
    </AdminPage>
  );
};
export default NotificationChannels;
