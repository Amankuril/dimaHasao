/* Ported from Frontend/src/modules/Food/pages/admin/system/NotificationChannels.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Bell, Info, Search, Download, ChevronDown, Settings, FileText, FileSpreadsheet, Code, Check, Columns, ArrowUpDown } from 'lucide-react-native';
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
import { Button, Div, H1, H3, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
function ToggleSwitch({ enabled, onToggle }) {
  return (
    <Button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-all ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}
    >
      <Span className="h-5 w-5 rounded-full bg-white shadow-sm" />
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
  const tableCols = [
    visibleColumns.si && 70,
    visibleColumns.topics && 240,
    visibleColumns.pushNotification && 150,
    visibleColumns.mail && 90,
    visibleColumns.sms && 90,
  ].filter(Boolean);
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2 mb-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Bell} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">Notification Channels Setup</H1>
          </Div>
          <P className="text-xs text-slate-600 ml-9">From here you setup who can see what types of notification from StackFood</P>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
          <Div className="flex gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.label}
              </Button>
            ))}
          </Div>
        </Div>

        {/* Search and Actions Section */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Div className="relative flex-1 min-w-[250px]">
              <Input
                type="text"
                placeholder="Search by topic or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1.5 w-full text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <UiIcon as={Search} className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </Div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-all">
                  <UiIcon as={Download} className="w-3.5 h-3.5" />
                  <Span className="font-bold">Export</Span>
                  <UiIcon as={ChevronDown} className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                  <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                  <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                  <UiIcon as={Code} className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
            >
              <UiIcon as={Settings} className="w-4 h-4" />
            </Button>
          </Div>
        </Div>

        {/* Table */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div className="mb-4">
            <Div className="flex items-center gap-2">
              <Span className="text-xs font-semibold text-slate-700">Notifications</Span>
              <Span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredNotifications.length}</Span>
            </Div>
          </Div>
            <Table cols={tableCols} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  {visibleColumns.si && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SI</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.topics && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Topics</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.pushNotification && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Push Notification</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.mail && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Mail</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.sms && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SMS</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredNotifications.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center">
                      <P className="text-xs text-slate-500">No notifications found</P>
                    </Td>
                  </Tr>
                ) : (
                  filteredNotifications.map((notification, index) => (
                    <Tr key={notification.id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-3 py-3">
                          <Span className="text-xs text-slate-700">{index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.topics && (
                        <Td className="px-3 py-3">
                          <Div>
                            <P className="text-xs font-medium text-slate-900 mb-1">{notification.topic}</P>
                            <P className="text-[10px] text-slate-600">{notification.description}</P>
                          </Div>
                        </Td>
                      )}
                      {visibleColumns.pushNotification && (
                        <Td className="px-3 py-3">
                          <Button
                            type="button"
                            className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          >
                            {notification.pushNotification}
                          </Button>
                        </Td>
                      )}
                      {visibleColumns.mail && (
                        <Td className="px-3 py-3">
                          <ToggleSwitch enabled={notification.mail} onToggle={() => handleMailToggle(notification.id)} />
                        </Td>
                      )}
                      {visibleColumns.sms && (
                        <Td className="px-3 py-3">
                          {notification.sms !== false ? (
                            <ToggleSwitch enabled={notification.sms} onToggle={() => handleSMSToggle(notification.id)} />
                          ) : (
                            <Button
                              type="button"
                              className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            >
                              N/A
                            </Button>
                          )}
                        </Td>
                      )}
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
        </Div>
      </Div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-4 h-4" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <H3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <Div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-xs text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
