/* Ported from Frontend/src/modules/Food/pages/admin/reports/RestaurantVATReport.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Filter,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  AlertCircle,
  Settings,
  FileSpreadsheet,
  Code,
} from 'lucide-react-native';
import { emptyRestaurantVATReports, emptyRestaurantVATStats } from '../../../utils/adminFallbackData';
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
  Button,
  Div,
  H1,
  H2,
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
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
export default function RestaurantVATReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState(emptyRestaurantVATReports);
  const [filters, setFilters] = useState({
    dateRange: '',
    restaurant: 'All Restaurants',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((report) => report.restaurantName?.toLowerCase().includes(query));
    }
    if (filters.restaurant !== 'All Restaurants') {
      result = result.filter((r) => r.restaurantName === filters.restaurant);
    }
    return result;
  }, [reports, searchQuery, filters]);
  const totalReports = filteredReports.length;
  const handleExport = (format) => {
    if (filteredReports.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'restaurantName',
        label: 'Restaurant Info',
      },
      {
        key: 'totalOrder',
        label: 'Total Order',
      },
      {
        key: 'totalOrderAmount',
        label: 'Total Order Amount',
      },
      {
        key: 'taxAmount',
        label: 'Tax Amount',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(filteredReports, headers, 'restaurant_vat_report');
        break;
      case 'excel':
        exportReportsToExcel(filteredReports, headers, 'restaurant_vat_report');
        break;
      case 'pdf':
        exportReportsToPDF(filteredReports, headers, 'restaurant_vat_report', 'Restaurant VAT Report');
        break;
      case 'json':
        exportReportsToJSON(filteredReports, 'restaurant_vat_report');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const handleResetFilters = () => {
    setFilters({
      dateRange: '',
      restaurant: 'All Restaurants',
    });
  };
  const activeFiltersCount = (filters.dateRange ? 1 : 0) + (filters.restaurant !== 'All Restaurants' ? 1 : 0);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen overflow-x-hidden">
      <Div className="w-full max-w-full">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <H1 className="text-2xl font-bold text-slate-900">Restaurant Tax Report</H1>
        </Div>

        {/* Filter Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <Div className="flex flex-wrap gap-4 flex-1">
              <Div className="relative flex-1 min-w-[200px]">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</Label>
                <Div className="relative">
                  <UiIcon as={Calendar} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    value={filters.dateRange}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: e.target.value,
                      }))
                    }
                    placeholder="11/27/2025 - 12/03/2025"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>

              <Div className="relative flex-1 min-w-[200px]">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Restaurant</Label>
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
                  <Option value="All Restaurants">All Restaurants</Option>
                  <Option value="Caf� Monarch">Caf� Monarch</Option>
                  <Option value="Hungry Puppets">Hungry Puppets</Option>
                  <Option value="Cheesy Restaurant">Cheesy Restaurant</Option>
                  <Option value="Cheese Burger">Cheese Burger</Option>
                  <Option value="Frying Nemo">Frying Nemo</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>
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

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Orders Card */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div className="flex-1">
                <P className="text-sm font-bold text-slate-900 mb-1">Total Orders</P>
                <P className="text-xs text-slate-600 mb-2">Total Orders</P>
                <P className="text-3xl font-bold text-blue-600">{emptyRestaurantVATStats.totalOrders}</P>
                <P className="text-lg font-semibold text-blue-600 mt-1">{emptyRestaurantVATStats.totalOrders}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UiIcon as={ClipboardList} className="w-7 h-7 text-blue-600" />
              </Div>
            </Div>
          </Div>

          {/* Total Order Amount Card */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div className="flex-1">
                <P className="text-sm font-bold text-slate-900 mb-1">Total Order Amount</P>
                <P className="text-xs text-slate-600 mb-2">Total Order Amount</P>
                <P className="text-3xl font-bold text-green-600">{emptyRestaurantVATStats.totalOrderAmount}</P>
                <P className="text-lg font-semibold text-green-600 mt-1">{emptyRestaurantVATStats.totalOrderAmount}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <UiIcon as={DollarSign} className="w-7 h-7 text-yellow-600" />
              </Div>
            </Div>
          </Div>

          {/* Total Tax Amount Card */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div className="flex-1">
                <P className="text-sm font-bold text-slate-900 mb-1">Total Tax Amount</P>
                <P className="text-xs text-slate-600 mb-2">Total Tax Amount</P>
                <P className="text-3xl font-bold text-red-600">{emptyRestaurantVATStats.totalTaxAmount}</P>
                <P className="text-lg font-semibold text-red-600 mt-1">{emptyRestaurantVATStats.totalTaxAmount}</P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <UiIcon as={FileText} className="w-7 h-7 text-purple-600" />
              </Div>
            </Div>
          </Div>
        </Div>

        {/* All Restaurant Taxes Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">All Restaurant Taxes</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          {/* Table or Empty State */}
          {filteredReports.length === 0 ? (
            <Div className="py-20 text-center">
              <Div className="flex flex-col items-center justify-center">
                <Div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center mb-4">
                  <UiIcon as={AlertCircle} className="w-12 h-12 text-slate-500" />
                </Div>
                <P className="text-lg font-semibold text-slate-700 mb-2">No Data Found</P>
              </Div>
            </Div>
          ) : (
              <Table cols={[70, 200, 110, 150, 120, 80]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant Info</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Order</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Order Amount</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Tax Amount</Th>
                    <Th className="px-4 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <Tr key={report.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{report.sl}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Div className="flex items-center gap-3">
                          {report.icon && <Img src={report.icon} alt={report.restaurantName} className="w-8 h-8 rounded" />}
                          <Span className="text-sm text-slate-700">{report.restaurantName}</Span>
                        </Div>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{report.totalOrder}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{report.totalOrderAmount}</Span>
                      </Td>
                      <Td className="px-4 py-3 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{report.taxAmount}</Span>
                      </Td>
                      <Td className="px-4 py-3 text-center">
                        <Button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
          )}
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
            <P className="text-sm text-slate-700">Restaurant VAT report settings and preferences will be available here.</P>
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
