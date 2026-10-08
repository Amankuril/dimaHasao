/* Ported from Frontend/src/modules/Food/pages/admin/reports/ExpenseReport.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Filter, FileText, ArrowUpDown, Settings, FileSpreadsheet, Code } from 'lucide-react-native';
import { emptyExpenseReports } from '../../../utils/adminFallbackData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import {
  A,
  Button,
  Div,
  H1,
  H2,
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
export default function ExpenseReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expenses, setExpenses] = useState(emptyExpenseReports);
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    restaurant: 'All restaurants',
    customer: 'All customers',
    type: 'All Type',
    time: 'All Time',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (expense) =>
          expense.orderId.toLowerCase().includes(query) ||
          expense.expenseType.toLowerCase().includes(query) ||
          expense.customerName.toLowerCase().includes(query),
      );
    }
    if (filters.zone !== 'All Zones') {
      // Filter by zone if needed
    }
    if (filters.restaurant !== 'All restaurants') {
      // Filter by restaurant if needed
    }
    if (filters.customer !== 'All customers') {
      result = result.filter((e) => e.customerName === filters.customer);
    }
    if (filters.type !== 'All Type') {
      result = result.filter((e) => e.expenseType === filters.type);
    }
    return result;
  }, [expenses, searchQuery, filters]);
  const totalExpenses = filteredExpenses.length;
  const handleExport = (format) => {
    if (filteredExpenses.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'orderId',
        label: 'Order ID',
      },
      {
        key: 'dateTime',
        label: 'Date & Time',
      },
      {
        key: 'expenseType',
        label: 'Expense Type',
      },
      {
        key: 'customerName',
        label: 'Customer Name',
      },
      {
        key: 'expenseAmount',
        label: 'Expense Amount',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(filteredExpenses, headers, 'expense_report');
        break;
      case 'excel':
        exportReportsToExcel(filteredExpenses, headers, 'expense_report');
        break;
      case 'pdf':
        exportReportsToPDF(filteredExpenses, headers, 'expense_report', 'Expense Report');
        break;
      case 'json':
        exportReportsToJSON(filteredExpenses, 'expense_report');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const handleResetFilters = () => {
    setFilters({
      zone: 'All Zones',
      restaurant: 'All restaurants',
      customer: 'All customers',
      type: 'All Type',
      time: 'All Time',
    });
  };
  const activeFiltersCount =
    (filters.zone !== 'All Zones' ? 1 : 0) +
    (filters.restaurant !== 'All restaurants' ? 1 : 0) +
    (filters.customer !== 'All customers' ? 1 : 0) +
    (filters.type !== 'All Type' ? 1 : 0) +
    (filters.time !== 'All Time' ? 1 : 0);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-2">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={FileText} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Expense Report</H1>
              <P className="text-sm text-slate-500 mt-1">Expense report description</P>
            </Div>
          </Div>
        </Div>

        {/* Search Data Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Zone</Label>
                <Select
                  value={filters.zone}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      zone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Zones">All Zones</Option>
                  <Option value="Zone 1">Zone 1</Option>
                  <Option value="Zone 2">Zone 2</Option>
                  <Option value="Zone 3">Zone 3</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant</Label>
                <Select
                  value={filters.restaurant}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      restaurant: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All restaurants">All restaurants</Option>
                  <Option value="Restaurant 1">Restaurant 1</Option>
                  <Option value="Restaurant 2">Restaurant 2</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Customer</Label>
                <Select
                  value={filters.customer}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      customer: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All customers">All customers</Option>
                  <Option value="Customer 1">Customer 1</Option>
                  <Option value="Customer 2">Customer 2</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Type</Label>
                <Select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Type">All Type</Option>
                  <Option value="Discount On Product">Discount On Product</Option>
                  <Option value="Cashback">Cashback</Option>
                  <Option value="Free Delivery">Free Delivery</Option>
                  <Option value="Add Fund Bonus">Add Fund Bonus</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>
            </Div>

            <Div className="flex flex-col sm:flex-row gap-4">
              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Time</Label>
                <Select
                  value={filters.time}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full sm:w-48 px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Time">All Time</Option>
                  <Option value="Today">Today</Option>
                  <Option value="This Week">This Week</Option>
                  <Option value="This Month">This Month</Option>
                  <Option value="This Year">This Year</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="flex items-end gap-2">
                <Button
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleFilterApply}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 relative ${activeFiltersCount > 0 ? 'ring-2 ring-blue-300' : ''}`}
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
        </Div>

        {/* Expense Lists Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">Expense Lists {totalExpenses}</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search by Order ID or type"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <UiIcon as={Search} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

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
            <Table cols={[70, 120, 150, 160, 190, 140]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>SI</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Order Id</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Date & Time</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Expense Type</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Customer Name</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Expense Amount</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                        <P className="text-sm text-slate-500">No expenses match your search</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <Tr key={expense.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{expense.sl}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <A href={`#order-${expense.orderId}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {expense.orderId}
                        </A>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{expense.dateTime}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{expense.expenseType}</Span>
                      </Td>
                      <Td className="px-6 py-4">
                        <Div className="flex flex-col">
                          <Span className="text-sm font-medium text-slate-900">{expense.customerName}</Span>
                          <Span className="text-xs text-slate-500">{expense.customerPhone}</Span>
                        </Div>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{expense.expenseAmount}</Span>
                      </Td>
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
              Report Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            <P className="text-sm text-slate-700">Expense report settings and preferences will be available here.</P>
          </Div>
          <Div className="px-6 pb-6 flex items-center justify-end">
            <Button
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
            >
              Close
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
