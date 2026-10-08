/* Ported from Frontend/src/modules/Food/pages/admin/loyalty-point/Report.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Filter,
  Calendar,
  Settings,
  TrendingUp,
  Wallet,
  Utensils,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
} from 'lucide-react-native';
import { emptyLoyaltyPointTransactions } from '../../../utils/adminFallbackData';
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
  exportLoyaltyPointsToCSV,
  exportLoyaltyPointsToExcel,
  exportLoyaltyPointsToPDF,
  exportLoyaltyPointsToJSON,
} from '../../../components/admin/loyalty-point/loyaltyPointExportUtils';
import {
  Button,
  Div,
  H1,
  H2,
  H3,
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
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
export default function Report() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState(emptyLoyaltyPointTransactions);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: 'All',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    transactionId: true,
    customer: true,
    credit: true,
    debit: true,
    balance: true,
    transactionType: true,
    reference: true,
    createdAt: true,
  });
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (transaction) =>
          transaction.transactionId.toLowerCase().includes(query) ||
          transaction.customer.toLowerCase().includes(query) ||
          transaction.reference.includes(query),
      );
    }

    // Apply date filters
    if (filters.startDate) {
      result = result.filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        const startDate = new Date(filters.startDate);
        return transactionDate >= startDate;
      });
    }
    if (filters.endDate) {
      result = result.filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        return transactionDate <= endDate;
      });
    }

    // Apply customer filter
    if (filters.customer && filters.customer !== 'All') {
      result = result.filter((transaction) => transaction.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }
    return result;
  }, [transactions, searchQuery, filters]);
  const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);
  const balance = totalCredit - totalDebit;
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      customer: 'All',
    });
  };
  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportLoyaltyPointsToCSV(filteredTransactions);
        break;
      case 'excel':
        exportLoyaltyPointsToExcel(filteredTransactions);
        break;
      case 'pdf':
        exportLoyaltyPointsToPDF(filteredTransactions);
        break;
      case 'json':
        exportLoyaltyPointsToJSON(filteredTransactions);
        break;
      default:
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
      transactionId: true,
      customer: true,
      credit: true,
      debit: true,
      balance: true,
      transactionType: true,
      reference: true,
      createdAt: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    transactionId: 'Transaction ID',
    customer: 'Customer',
    credit: 'Credit',
    debit: 'Debit',
    balance: 'Balance',
    transactionType: 'Transaction Type',
    reference: 'Reference',
    createdAt: 'Created At',
  };
  const activeFiltersCount = (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0) + (filters.customer !== 'All' ? 1 : 0);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <H1 className="text-2xl font-bold text-slate-900 mb-6">Customer Loyalty Point Report</H1>

        {/* Filter Options */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-2 mb-4">
            <UiIcon as={Filter} className="w-5 h-5 text-slate-600" />
            <H2 className="text-lg font-semibold text-slate-900">Filter Options</H2>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</Label>
              <Div className="relative">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">End Date</Label>
              <Div className="relative">
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Customer</Label>
              <Select
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="All">All</Option>
                <Option value="jane-doe">Jane Doe</Option>
                <Option value="john-doe">John Doe</Option>
              </Select>
            </Div>

            <Div className="flex items-end gap-2">
              <Button
                onClick={handleResetFilters}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => {}}
                className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 relative ${activeFiltersCount > 0 ? 'ring-2 ring-blue-300' : ''}`}
              >
                <UiIcon as={Filter} className="w-4 h-4" />
                Filter
                {activeFiltersCount > 0 && (
                  <Span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </Span>
                )}
              </Button>
            </Div>
          </Div>
        </Div>

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6">
            <Div className="flex items-center justify-between mb-2">
              <H3 className="text-sm font-semibold text-green-800">Debit</H3>
              <Div className="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                <UiIcon as={TrendingUp} className="w-5 h-5 text-green-700" />
              </Div>
            </Div>
            <P className="text-2xl font-bold text-green-900">{totalDebit.toFixed(3)}</P>
          </Div>

          <Div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
            <Div className="flex items-center justify-between mb-2">
              <H3 className="text-sm font-semibold text-red-800">Credit</H3>
              <Div className="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                <UiIcon as={Wallet} className="w-5 h-5 text-red-700" />
              </Div>
            </Div>
            <P className="text-2xl font-bold text-red-900">{totalCredit.toFixed(3)}</P>
          </Div>

          <Div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-6">
            <Div className="flex items-center justify-between mb-2">
              <H3 className="text-sm font-semibold text-blue-800">Balance</H3>
              <Div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                <UiIcon as={Utensils} className="w-5 h-5 text-blue-700" />
              </Div>
            </Div>
            <P className="text-2xl font-bold text-blue-900">{balance}</P>
          </Div>
        </Div>

        {/* Transactions Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex items-center gap-2 mb-4">
            <UiIcon as={TrendingUp} className="w-5 h-5 text-slate-600" />
            <H2 className="text-lg font-semibold text-slate-900">Transactions</H2>
          </Div>

          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <Input
                type="text"
                placeholder="Ex: Search by Transactionl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>

            <Div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <UiIcon as={Download} className="w-4 h-4" />
                    <Span className="text-black font-bold">Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
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
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
            </Div>
          </Div>

          {/* Table */}
          <Table
            className="w-full"
            cols={[
              visibleColumns.si && 70,
              visibleColumns.transactionId && 150,
              visibleColumns.customer && 180,
              visibleColumns.credit && 110,
              visibleColumns.debit && 110,
              visibleColumns.balance && 110,
              visibleColumns.transactionType && 160,
              visibleColumns.reference && 160,
              visibleColumns.createdAt && 150,
            ].filter(Boolean)}
          >
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  {visibleColumns.si && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>}
                  {visibleColumns.transactionId && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Transaction Id</Th>
                  )}
                  {visibleColumns.customer && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Customer</Th>}
                  {visibleColumns.credit && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Credit</Th>}
                  {visibleColumns.debit && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Debit</Th>}
                  {visibleColumns.balance && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Balance</Th>}
                  {visibleColumns.transactionType && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Transaction Type</Th>
                  )}
                  {visibleColumns.reference && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Reference</Th>}
                  {visibleColumns.createdAt && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Created At</Th>
                  )}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                      No transactions found
                    </Td>
                  </Tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <Tr key={transaction.sl} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{transaction.sl}</Span>
                        </Td>
                      )}
                      {visibleColumns.transactionId && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.transactionId}</Span>
                        </Td>
                      )}
                      {visibleColumns.customer && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-900">{transaction.customer}</Span>
                        </Td>
                      )}
                      {visibleColumns.credit && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.credit}</Span>
                        </Td>
                      )}
                      {visibleColumns.debit && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.debit}</Span>
                        </Td>
                      )}
                      {visibleColumns.balance && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-900">{transaction.balance}</Span>
                        </Td>
                      )}
                      {visibleColumns.transactionType && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.transactionType}</Span>
                        </Td>
                      )}
                      {visibleColumns.reference && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.reference}</Span>
                        </Td>
                      )}
                      {visibleColumns.createdAt && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{transaction.createdAt}</Span>
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
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
                    <Span className="text-sm text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
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
