/* Ported from Frontend/src/modules/Food/pages/admin/system/NotificationChannels.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Bell, Search, Download, ChevronDown, FileText, FileSpreadsheet, Code, Check, Columns } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import {
  exportNotificationsToCSV,
  exportNotificationsToExcel,
  exportNotificationsToPDF,
  exportNotificationsToJSON,
} from '../../../components/admin/notifications/notificationsExportUtils';
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
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Input, Label, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const adminNotifications = [
  {
    id: 1,
    topic: 'Forget Password',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Forget Password.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 2,
    topic: 'Deliveryman Self Registration',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Deliveryman Self Registration.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 3,
    topic: 'Restaurant Self Registration',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Restaurant Self Registration.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 4,
    topic: 'Campaign Join Request',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Campaign Join Request.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 5,
    topic: 'Withdraw Request',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Withdraw Request.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 6,
    topic: 'Order Refund Request',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Order Refund Request.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 7,
    topic: 'Advertisement Add',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Advertisement Add.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 8,
    topic: 'Advertisement Update',
    description: 'Choose How Admin Will Get Notified About Sent Notification On Advertisement Update.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
];
const restaurantNotifications = [
  {
    id: 1,
    topic: 'New Order Received',
    description: 'Choose How Restaurant Will Get Notified About New Order Received.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 2,
    topic: 'Order Status Update',
    description: 'Choose How Restaurant Will Get Notified About Order Status Updates.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 3,
    topic: 'Payment Received',
    description: 'Choose How Restaurant Will Get Notified About Payment Received.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 4,
    topic: 'Review Received',
    description: 'Choose How Restaurant Will Get Notified About Customer Reviews.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 5,
    topic: 'Withdrawal Request Status',
    description: 'Choose How Restaurant Will Get Notified About Withdrawal Request Status.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 6,
    topic: 'Campaign Invitation',
    description: 'Choose How Restaurant Will Get Notified About Campaign Invitations.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 7,
    topic: 'Order Cancelled',
    description: 'Choose How Restaurant Will Get Notified About Order Cancellations.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 8,
    topic: 'Food Out of Stock',
    description: 'Choose How Restaurant Will Get Notified About Food Items Out of Stock.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
];
const customerNotifications = [
  {
    id: 1,
    topic: 'Order Confirmation',
    description: 'Choose How Customer Will Get Notified About Order Confirmation.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 2,
    topic: 'Order Status Update',
    description: 'Choose How Customer Will Get Notified About Order Status Updates.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 3,
    topic: 'Order Delivered',
    description: 'Choose How Customer Will Get Notified About Order Delivery.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 4,
    topic: 'Order Cancelled',
    description: 'Choose How Customer Will Get Notified About Order Cancellation.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 5,
    topic: 'Payment Confirmation',
    description: 'Choose How Customer Will Get Notified About Payment Confirmation.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 6,
    topic: 'Promotional Offers',
    description: 'Choose How Customer Will Get Notified About Promotional Offers.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 7,
    topic: 'Refund Processed',
    description: 'Choose How Customer Will Get Notified About Refund Processing.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 8,
    topic: 'Wallet Transaction',
    description: 'Choose How Customer Will Get Notified About Wallet Transactions.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
];
const deliverymanNotifications = [
  {
    id: 1,
    topic: 'New Order Assignment',
    description: 'Choose How Deliveryman Will Get Notified About New Order Assignment.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 2,
    topic: 'Order Pickup Request',
    description: 'Choose How Deliveryman Will Get Notified About Order Pickup Requests.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 3,
    topic: 'Order Delivery Status',
    description: 'Choose How Deliveryman Will Get Notified About Order Delivery Status.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 4,
    topic: 'Payment Received',
    description: 'Choose How Deliveryman Will Get Notified About Payment Received.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 5,
    topic: 'Bonus Notification',
    description: 'Choose How Deliveryman Will Get Notified About Bonus Notifications.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 6,
    topic: 'Incentive Update',
    description: 'Choose How Deliveryman Will Get Notified About Incentive Updates.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
  {
    id: 7,
    topic: 'Shift Reminder',
    description: 'Choose How Deliveryman Will Get Notified About Shift Reminders.',
    pushNotification: 'N/A',
    mail: true,
    sms: true,
  },
  {
    id: 8,
    topic: 'Withdrawal Status',
    description: 'Choose How Deliveryman Will Get Notified About Withdrawal Status.',
    pushNotification: 'N/A',
    mail: true,
    sms: false,
  },
];
const tabs = [
  {
    id: 'admin',
    label: 'Admin',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
  },
  {
    id: 'customers',
    label: 'Customers',
  },
  {
    id: 'deliveryman',
    label: 'Deliveryman',
  },
];
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 flex-row items-center shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
export default function NotificationChannels() {
  const [activeTab, setActiveTab] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    topics: true,
    pushNotification: true,
    mail: true,
    sms: true,
  });
  const getNotificationsForTab = (tab) => {
    switch (tab) {
      case 'admin':
        return adminNotifications;
      case 'restaurant':
        return restaurantNotifications;
      case 'customers':
        return customerNotifications;
      case 'deliveryman':
        return deliverymanNotifications;
      default:
        return adminNotifications;
    }
  };
  const [notifications, setNotifications] = useState(() => getNotificationsForTab('admin'));
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) {
      return notifications;
    }
    const query = searchQuery.toLowerCase().trim();
    return notifications.filter((notif) => notif.topic.toLowerCase().includes(query) || notif.description.toLowerCase().includes(query));
  }, [notifications, searchQuery]);

  // Update notifications when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setNotifications(getNotificationsForTab(tabId));
    setSearchQuery(''); // Reset search when changing tabs
  };
  const handleMailToggle = (id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id
          ? {
              ...notif,
              mail: !notif.mail,
            }
          : notif,
      ),
    );
  };
  const handleSMSToggle = (id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id
          ? {
              ...notif,
              sms: !notif.sms,
            }
          : notif,
      ),
    );
  };
  const handleExport = (format) => {
    if (filteredNotifications.length === 0) {
      alert('No data to export');
      return;
    }
    const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    const filename = `notifications_${activeTab}`;
    switch (format) {
      case 'csv':
        exportNotificationsToCSV(filteredNotifications, filename);
        break;
      case 'excel':
        exportNotificationsToExcel(filteredNotifications, filename);
        break;
      case 'pdf':
        exportNotificationsToPDF(filteredNotifications, filename);
        break;
      case 'json':
        exportNotificationsToJSON(filteredNotifications, filename);
        break;
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      topics: true,
      pushNotification: true,
      mail: true,
      sms: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    topics: 'Topics',
    pushNotification: 'Push Notification',
    mail: 'Mail',
    sms: 'SMS',
  };
  const COLUMN_SPEC = [
    { key: 'si', label: 'SI', width: 70 },
    { key: 'topics', label: 'Topics', width: 250 },
    { key: 'pushNotification', label: 'Push notification', width: 150 },
    { key: 'mail', label: 'Mail', width: 90 },
    { key: 'sms', label: 'SMS', width: 90 },
  ];
  const shown = COLUMN_SPEC.filter((c) => visibleColumns[c.key]);
  const tableCols = shown.map((c) => c.width);
  const tableLabels = shown.map((c) => c.label);
  const widthOf = (key) => shown.find((c) => c.key === key)?.width || 0;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Bell}
        title="Notification Channels Setup"
        subtitle="Choose who is notified by push, mail and SMS for each topic"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Notification channels' }]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-xl">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsSettingsOpen(true)} accessibilityLabel="Table settings" className={BTN_SECONDARY}>
              <UiIcon as={Columns} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <SectionTitle>Audience</SectionTitle>
        <Div className="flex-row flex-wrap gap-2 mb-3">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-row items-center justify-center h-11 px-4 rounded-lg border ${activeTab === tab.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={activeTab === tab.id ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{tab.label}</Span>
            </Button>
          ))}
        </Div>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder="Search by topic or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      <Div className="flex-row items-center gap-2 mb-2">
        <Text style={tw`text-base font-semibold text-slate-900`}>Notifications</Text>
        <Span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredNotifications.length}</Span>
      </Div>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications found"
          message="No topic matches your search in this audience."
          actionLabel={searchQuery ? 'Clear search' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState icon={Columns} title="No columns shown" message="Every column is hidden. Turn one back on in table settings." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredNotifications.map((notification, index) => (
              <Row key={notification.id} last={index === filteredNotifications.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(index + 1)}</Cell> : null}
                {visibleColumns.topics ? (
                  <Cell width={widthOf('topics')}>
                    <Div className="gap-1">
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                        {notification.topic}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={3}>
                        {notification.description}
                      </Text>
                    </Div>
                  </Cell>
                ) : null}
                {visibleColumns.pushNotification ? (
                  <Cell width={widthOf('pushNotification')}>
                    <StatusBadge tone="info" label={notification.pushNotification} />
                  </Cell>
                ) : null}
                {visibleColumns.mail ? (
                  <Cell width={widthOf('mail')}>
                    <ToggleSwitch enabled={notification.mail} onToggle={() => handleMailToggle(notification.id)} label={`Toggle mail for ${notification.topic}`} />
                  </Cell>
                ) : null}
                {visibleColumns.sms ? (
                  <Cell width={widthOf('sms')}>
                    {notification.sms !== false ? (
                      <ToggleSwitch enabled={notification.sms} onToggle={() => handleSMSToggle(notification.id)} label={`Toggle SMS for ${notification.topic}`} />
                    ) : (
                      <StatusBadge tone="neutral" label="N/A" />
                    )}
                  </Cell>
                ) : null}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>Table Settings</DialogTitle>
          </DialogHeader>
          <Div className="px-5 pb-5 gap-3">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Columns} size={16} className="text-slate-500" />
              <Text style={tw`text-sm font-semibold text-slate-700`}>Visible columns</Text>
            </Div>
            <Div className="gap-1">
              {Object.entries(columnsConfig).map(([key, label]) => (
                <Label key={key} className="flex-row items-center gap-3 min-h-11 px-2 rounded-lg">
                  <Input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-5 h-5 border-slate-300 rounded" />
                  <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                  {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-blue-600" /> : null}
                </Label>
              ))}
            </Div>
            <Div className="flex-row flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button onClick={resetColumns} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
