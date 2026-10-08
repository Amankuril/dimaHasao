/* Ported from Frontend/src/modules/Food/pages/admin/system/OfflinePaymentSetup.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
} from 'lucide-react-native';
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
  exportPaymentMethodsToCSV,
  exportPaymentMethodsToExcel,
  exportPaymentMethodsToPDF,
  exportPaymentMethodsToJSON,
} from '../../../components/admin/payment-methods/paymentMethodsExportUtils';
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
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Input, Label, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const paymentMethods = [
  {
    id: 1,
    name: 'bkash',
    paymentInfo: 'Account Number : 017**********',
    requiredInfo: 'Name | Transaction Number',
    status: true,
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
export default function OfflinePaymentSetup() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [methods, setMethods] = useState(paymentMethods);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    sl: true,
    name: true,
    paymentInfo: true,
    requiredInfo: true,
    status: true,
    actions: true,
  });
  const filteredMethods = useMemo(() => {
    let filtered = methods.filter((method) => {
      if (activeTab === 'active') return method.status;
      if (activeTab === 'inactive') return !method.status;
      return true;
    });
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (method) =>
          method.name.toLowerCase().includes(query) || method.paymentInfo.toLowerCase().includes(query) || method.requiredInfo.toLowerCase().includes(query),
      );
    }
    return filtered;
  }, [methods, activeTab, searchQuery]);
  const handleStatusToggle = (id) => {
    setMethods((prev) =>
      prev.map((method) =>
        method.id === id
          ? {
              ...method,
              status: !method.status,
            }
          : method,
      ),
    );
  };
  const handleDelete = (id) => {
    const method = methods.find((m) => m.id === id);
    setSelectedMethod(method);
    setIsDeleteOpen(true);
  };
  const confirmDelete = () => {
    if (selectedMethod) {
      setMethods((prev) => prev.filter((method) => method.id !== selectedMethod.id));
      setIsDeleteOpen(false);
      setSelectedMethod(null);
    }
  };
  const handleExport = (format) => {
    if (filteredMethods.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportPaymentMethodsToCSV(filteredMethods);
        break;
      case 'excel':
        exportPaymentMethodsToExcel(filteredMethods);
        break;
      case 'pdf':
        exportPaymentMethodsToPDF(filteredMethods);
        break;
      case 'json':
        exportPaymentMethodsToJSON(filteredMethods);
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
      sl: true,
      name: true,
      paymentInfo: true,
      requiredInfo: true,
      status: true,
      actions: true,
    });
  };
  const columnsConfig = {
    sl: 'Serial Number',
    name: 'Payment Method Name',
    paymentInfo: 'Payment Info',
    requiredInfo: 'Required Info From Customer',
    status: 'Status',
    actions: 'Actions',
  };
  const COLUMN_SPEC = [
    { key: 'sl', label: 'SL', width: 70 },
    { key: 'name', label: 'Payment method', width: 170 },
    { key: 'paymentInfo', label: 'Payment info', width: 200 },
    { key: 'requiredInfo', label: 'Required info from customer', width: 220 },
    { key: 'status', label: 'Status', width: 120 },
    { key: 'actions', label: 'Action', width: 110 },
  ];
  const shown = COLUMN_SPEC.filter((c) => visibleColumns[c.key]);
  const tableCols = shown.map((c) => c.width);
  const tableLabels = shown.map((c) => c.label);
  const widthOf = (key) => shown.find((c) => c.key === key)?.width || 0;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Briefcase}
        title="Offline Payment Method Setup"
        subtitle="Bank and wallet methods customers can pay with offline"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Offline payment' }]}
        actions={
          <>
            <Button className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add New Method</Span>
            </Button>
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
              <UiIcon as={Settings} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className="flex-row flex-wrap gap-2 mb-3">
          {['All', 'Active', 'Inactive'].map((tab) => (
            <Button
              key={tab.toLowerCase()}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-row items-center justify-center h-11 px-4 rounded-lg border ${activeTab === tab.toLowerCase() ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={activeTab === tab.toLowerCase() ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{tab}</Span>
            </Button>
          ))}
        </Div>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder="Search by name or payment info…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      <Div className="flex-row items-center gap-2 mb-2">
        <Text style={tw`text-base font-semibold text-slate-900`}>Payment methods</Text>
        <Span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredMethods.length}</Span>
      </Div>

      {filteredMethods.length === 0 ? (
        <EmptyState
          title="No payment methods found"
          message={searchQuery || activeTab !== 'all' ? 'No method matches the current filters.' : 'Add an offline payment method to let customers pay outside the app.'}
          actionLabel={searchQuery ? 'Clear search' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState icon={Columns} title="No columns shown" message="Every column is hidden. Turn one back on in table settings." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredMethods.map((method, index) => (
              <Row key={method.id} last={index === filteredMethods.length - 1}>
                {visibleColumns.sl ? <Cell width={widthOf('sl')}>{String(index + 1)}</Cell> : null}
                {visibleColumns.name ? <Cell width={widthOf('name')}>{method.name}</Cell> : null}
                {visibleColumns.paymentInfo ? <Cell width={widthOf('paymentInfo')}>{method.paymentInfo}</Cell> : null}
                {visibleColumns.requiredInfo ? <Cell width={widthOf('requiredInfo')}>{method.requiredInfo}</Cell> : null}
                {visibleColumns.status ? (
                  <Cell width={widthOf('status')}>
                    <ToggleSwitch enabled={method.status} onToggle={() => handleStatusToggle(method.id)} label={`Toggle ${method.name}`} />
                  </Cell>
                ) : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')} align="center">
                    <Div className="flex-row items-center gap-1">
                      <Button type="button" accessibilityLabel={`Edit ${method.name}`} className="w-11 h-11 rounded-lg items-center justify-center">
                        <UiIcon as={Pencil} size={16} className="text-blue-600" />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(method.id)}
                        accessibilityLabel={`Delete ${method.name}`}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                  </Cell>
                ) : null}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>Delete Payment Method</DialogTitle>
          </DialogHeader>
          <Div className="px-5 pb-5">
            <Text style={tw`text-sm text-slate-700`}>{`Are you sure you want to delete "${selectedMethod?.name}"? This action cannot be undone.`}</Text>
          </Div>
          <Div className="px-5 pb-5 flex-row flex-wrap items-center justify-end gap-2">
            <Button onClick={() => setIsDeleteOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={confirmDelete} className={BTN_DANGER}>
              <Span className={BTN_TEXT_PRIMARY}>Delete</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>

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
