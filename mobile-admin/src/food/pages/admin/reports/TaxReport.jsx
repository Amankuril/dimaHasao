/* Ported from Frontend/src/modules/Food/pages/admin/reports/TaxReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Download, ChevronDown, FileText, DollarSign, Settings, FileSpreadsheet, Code, Loader2, Search } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
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
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function TaxReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_tax_report_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    dateRangeType: 'All Time',
    calculateTax: 'Percentage',
    taxRate: 'Select Tax Rate',
  });
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalIncome: '₹0.00',
    totalTax: '₹0.00',
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState(null);
  const fetchTaxReport = async () => {
    try {
      setIsRefreshing(true);
      let fromDate = null;
      let toDate = null;
      const now = new Date();
      if (filters.dateRangeType === 'Today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (filters.dateRangeType === 'This Week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        fromDate = new Date(now.getFullYear(), now.getMonth(), diff);
        toDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
      } else if (filters.dateRangeType === 'This Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (filters.dateRangeType === 'This Year') {
        fromDate = new Date(now.getFullYear(), 0, 1);
        toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
      const params = {
        fromDate: fromDate ? fromDate.toISOString() : undefined,
        toDate: toDate ? toDate.toISOString() : undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      };
      const response = await adminAPI.getTaxReport(params);
      if (response?.data?.success && response.data.data) {
        const data = response.data.data;
        setReports(data.reports || []);
        setTotalItems(data.pagination?.total ?? 0);
        setStats(
          data.stats || {
            totalIncome: '₹0.00',
            totalTax: '₹0.00',
          },
        );
      } else {
        setReports([]);
        setTotalItems(0);
        if (response?.data?.message) {
          toast.error(response.data.message);
        }
      }
    } catch (error) {
      debugError('Error fetching tax report:', error);
      toast.error('Failed to fetch tax report');
      setReports([]);
      setTotalItems(0);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.dateRangeType, debouncedSearch]);
  useEffect(() => {
    fetchTaxReport();
  }, [filters.dateRangeType, debouncedSearch, currentPage, pageSize]);
  const handleReset = () => {
    setFilters({
      dateRangeType: 'All Time',
      calculateTax: 'Percentage',
      taxRate: 'Select Tax Rate',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };
  const handleSubmit = () => {
    fetchTaxReport();
  };
  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setDetailLoading(true);
    try {
      let fromDate = null;
      let toDate = null;
      const now = new Date();
      if (filters.dateRangeType === 'Today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (filters.dateRangeType === 'This Week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        fromDate = new Date(now.getFullYear(), now.getMonth(), diff);
        toDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
      } else if (filters.dateRangeType === 'This Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (filters.dateRangeType === 'This Year') {
        fromDate = new Date(now.getFullYear(), 0, 1);
        toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
      const params = {
        fromDate: fromDate ? fromDate.toISOString() : undefined,
        toDate: toDate ? toDate.toISOString() : undefined,
      };
      const response = await adminAPI.getTaxReportDetail(report.id, params);
      if (response?.data?.success) {
        setReportDetail(response.data.data);
      } else {
        toast.error(response?.data?.message || 'Failed to fetch details');
      }
    } catch (error) {
      debugError('Error fetching tax detail:', error);
      toast.error('An error occurred while fetching details');
    } finally {
      setDetailLoading(false);
    }
  };
  const handleExport = (format) => {
    if (reports.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'incomeSource',
        label: 'Income Source',
      },
      {
        key: 'totalIncome',
        label: 'Total Income',
      },
      {
        key: 'totalTax',
        label: 'Total Tax',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(reports, headers, 'tax_report');
        break;
      case 'excel':
        exportReportsToExcel(reports, headers, 'tax_report');
        break;
      case 'pdf':
        exportReportsToPDF(reports, headers, 'tax_report', 'Tax Report');
        break;
      case 'json':
        exportReportsToJSON(reports, 'tax_report');
        break;
    }
  };
  if (loading && reports.length === 0) {
    return (
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Div className="flex flex-col items-center gap-4">
          <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
          <P className="text-gray-600">Loading tax report...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen overflow-x-hidden">
      <Div className="w-full max-w-full">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <H1 className="text-2xl font-bold text-slate-900">Generate Tax Report</H1>
        </Div>

        {/* Admin Tax Report Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <H2 className="text-lg font-semibold text-slate-900 mb-2">Admin Tax Report</H2>
          <P className="text-sm text-slate-600 mb-6">To generate you tax report please select & input following field and submit for the result.</P>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Div className="relative">
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Date Range Type</Label>
              <Select
                value={filters.dateRangeType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRangeType: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="All Time">All Time</Option>
                <Option value="Today">Today</Option>
                <Option value="This Week">This Week</Option>
                <Option value="This Month">This Month</Option>
                <Option value="This Year">This Year</Option>
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative">
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Select How to calculate tax</Label>
              <Select
                value={filters.calculateTax}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    calculateTax: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="Percentage">Percentage</Option>
                <Option value="Fixed Amount">Fixed Amount</Option>
                <Option value="Tiered">Tiered</Option>
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </Div>

            <Div className="relative">
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Tax Rates</Label>
              <Select
                value={filters.taxRate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    taxRate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="Select Tax Rate">Select Tax Rate</Option>
                <Option value="5%">5%</Option>
                <Option value="10%">10%</Option>
                <Option value="15%">15%</Option>
                <Option value="18%">18%</Option>
                <Option value="20%">20%</Option>
              </Select>
              <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </Div>
          </Div>

          <Div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleReset}
              className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Reset
            </Button>
            <Button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all">
              Submit
            </Button>
          </Div>
        </Div>

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Total Income Card */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Total Income</P>
                <P className="text-2xl font-bold text-blue-600">{stats.totalIncome}</P>
              </Div>
              <Div className="w-14 h-14 rounded-lg bg-yellow-100 flex items-center justify-center">
                <UiIcon as={DollarSign} className="w-8 h-8 text-yellow-600" />
              </Div>
            </Div>
          </Div>

          {/* Total Tax Card */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Total Tax</P>
                <P className="text-2xl font-bold text-red-600">{stats.totalTax}</P>
              </Div>
              <Div className="w-14 h-14 rounded-lg bg-pink-100 flex items-center justify-center">
                <UiIcon as={FileText} className="w-8 h-8 text-purple-600" />
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Tax Report List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">Tax Report List ({totalItems})</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[220px]">
                <Input
                  type="text"
                  placeholder="Search income source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <UiIcon as={Search} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                {isRefreshing && <UiIcon as={Loader2} className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
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
          {reports.length === 0 ? (
            <Div className="py-20 text-center">
              <Div className="flex flex-col items-center justify-center">
                <Div className="w-20 h-20 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <UiIcon as={FileText} className="w-12 h-12 text-purple-600" />
                </Div>
                <P className="text-lg font-semibold text-slate-700 mb-2">No Tax Report Generated</P>
                <P className="text-sm text-slate-500 max-w-md">To generate your tax report please select & input above field and submit for the result</P>
              </Div>
            </Div>
          ) : (
              <Table cols={[70, 180, 130, 120, 80]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Income Source</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Income</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Tax</Th>
                    <Th className="px-4 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {reports.map((report) => (
                    <Tr key={report.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{report.sl}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{report.incomeSource}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{report.totalIncome}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{report.totalTax}</Span>
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        <Button onClick={() => handleViewDetails(report)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
          )}

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_tax_report_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="sources"
          />
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
            <P className="text-sm text-slate-700">Tax report settings and preferences will be available here.</P>
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

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
      >
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="flex items-center justify-between">
              <Span className="flex items-center gap-2">
                <UiIcon as={FileText} className="w-5 h-5 text-blue-600" />
                Tax Details: {selectedReport?.incomeSource}
              </Span>
            </DialogTitle>
          </DialogHeader>

          <ScrollDiv className="p-6 max-h-[70vh]">
            {detailLoading ? (
              <Div className="flex flex-col items-center justify-center py-12">
                <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <P className="text-slate-600">Fetching order details...</P>
              </Div>
            ) : reportDetail?.orders?.length > 0 ? (
              <Table cols={[130, 120, 110, 110]} className="w-full">
                  <Thead className="bg-slate-50 border-b border-slate-200">
                    <Tr>
                      <Th className="px-4 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Order ID</Th>
                      <Th className="px-4 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date</Th>
                      <Th className="px-4 py-2 text-right text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</Th>
                      <Th className="px-4 py-2 text-right text-[10px] font-bold text-slate-700 uppercase tracking-wider">Tax</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-slate-100">
                    {reportDetail.orders.map((order) => (
                      <Tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <Td className="px-4 py-3 text-sm font-medium text-slate-900">{order.orderId}</Td>
                        <Td className="px-4 py-3 text-sm text-slate-600">{new Date(order.date).toLocaleDateString('en-IN')}</Td>
                        <Td className="px-4 py-3 text-sm text-right text-slate-700">{order.totalAmount}</Td>
                        <Td className="px-4 py-3 text-sm text-right font-semibold text-red-600">{order.taxAmount}</Td>
                      </Tr>
                    ))}
                  </Tbody>
              </Table>
            ) : (
              <Div className="text-center py-12">
                <P className="text-slate-500">No detailed orders found for this period.</P>
              </Div>
            )}
          </ScrollDiv>

          <Div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Div className="text-sm">
              <Span className="text-slate-500">Total Tax: </Span>
              <Span className="font-bold text-red-600">{selectedReport?.totalTax}</Span>
            </Div>
            <Button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Close
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
