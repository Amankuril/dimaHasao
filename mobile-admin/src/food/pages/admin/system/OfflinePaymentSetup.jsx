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
  ArrowUpDown,
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
import { Button, Div, H1, H3, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
  const tableCols = [
    visibleColumns.sl && 70,
    visibleColumns.name && 180,
    visibleColumns.paymentInfo && 200,
    visibleColumns.requiredInfo && 220,
    visibleColumns.status && 110,
    visibleColumns.actions && 110,
  ].filter(Boolean);
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-7xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Briefcase} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">Offline Payment Method Setup</H1>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3">
          <Div className="flex gap-2">
            {['All', 'Active', 'Inactive'].map((tab) => (
              <Button
                key={tab.toLowerCase()}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.toLowerCase() ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab}
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
                placeholder="Search by name, payment info..."
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
            <Button className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
              <UiIcon as={Plus} className="w-3.5 h-3.5" />
              <Span>Add New Method</Span>
            </Button>
          </Div>
        </Div>

        {/* Payment Methods Table */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div className="mb-4">
            <Div className="flex items-center gap-2">
              <Span className="text-xs font-semibold text-slate-700">Payment Methods</Span>
              <Span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredMethods.length}</Span>
            </Div>
          </Div>
            <Table cols={tableCols} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  {visibleColumns.sl && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SL</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.name && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Payment Method Name</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.paymentInfo && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Payment Info</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.requiredInfo && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Required Info From Customer</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.status && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Status</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.actions && <Th className="px-3 py-2 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredMethods.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center">
                      <P className="text-xs text-slate-500">No payment methods found</P>
                    </Td>
                  </Tr>
                ) : (
                  filteredMethods.map((method, index) => (
                    <Tr key={method.id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.sl && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.name && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{method.name}</Span>
                        </Td>
                      )}
                      {visibleColumns.paymentInfo && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{method.paymentInfo}</Span>
                        </Td>
                      )}
                      {visibleColumns.requiredInfo && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{method.requiredInfo}</Span>
                        </Td>
                      )}
                      {visibleColumns.status && (
                        <Td className="px-3 py-2.5">
                          <ToggleSwitch enabled={method.status} onToggle={() => handleStatusToggle(method.id)} />
                        </Td>
                      )}
                      {visibleColumns.actions && (
                        <Td className="px-3 py-2.5 whitespace-nowrap text-center">
                          <Div className="flex items-center justify-center gap-2">
                            <Button type="button" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <UiIcon as={Pencil} className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleDelete(method.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <UiIcon as={Trash2} className="w-3.5 h-3.5" />
                            </Button>
                          </Div>
                        </Td>
                      )}
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
        </Div>
      </Div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Delete Payment Method</DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            <P className="text-xs text-slate-700">{`Are you sure you want to delete "${selectedMethod?.name}"? This action cannot be undone.`}</P>
          </Div>
          <Div className="px-6 pb-6 flex items-center justify-end gap-3">
            <Button
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-md"
            >
              Delete
            </Button>
          </Div>
        </DialogContent>
      </Dialog>

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
