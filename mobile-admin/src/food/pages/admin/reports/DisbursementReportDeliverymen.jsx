/* Ported from Frontend/src/modules/Food/pages/admin/reports/DisbursementReportDeliverymen.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Filter, Truck, Eye, ArrowUpDown, Info, Settings, FileText, FileSpreadsheet, Code } from 'lucide-react-native';
import { emptyDisbursementReportDeliverymen, emptyDisbursementStats } from '../../../utils/adminFallbackData';
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

// Import icons from Transaction-report-icons
import pendingIcon from '../../../assets/Transaction-report-icons/trx1.png';
import completedIcon from '../../../assets/Transaction-report-icons/trx3.png';
import canceledIcon from '../../../assets/Transaction-report-icons/trx5.png';
import {
  Button,
  Div,
  H1,
  H2,
  H3,
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
export default function DisbursementReportDeliverymen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [disbursements, setDisbursements] = useState(emptyDisbursementReportDeliverymen);
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    deliveryMan: 'All delivery mans',
    paymentMethod: 'All Payment Method',
    status: 'All status',
    time: 'All Time',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const filteredDisbursements = useMemo(() => {
    let result = [...disbursements];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((disbursement) => disbursement.id.toLowerCase().includes(query) || disbursement.deliveryManName.toLowerCase().includes(query));
    }
    if (filters.zone !== 'All Zones') {
      // Filter by zone if needed
    }
    if (filters.deliveryMan !== 'All delivery mans') {
      result = result.filter((d) => d.deliveryManName === filters.deliveryMan);
    }
    if (filters.paymentMethod !== 'All Payment Method') {
      result = result.filter((d) => d.paymentMethod === filters.paymentMethod);
    }
    if (filters.status !== 'All status') {
      result = result.filter((d) => d.status.toLowerCase() === filters.status.toLowerCase());
    }
    return result;
  }, [disbursements, searchQuery, filters]);
  const totalDisbursements = filteredDisbursements.length;
  const handleExport = (format) => {
    if (filteredDisbursements.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'id',
        label: 'ID',
      },
      {
        key: 'deliveryManName',
        label: 'Delivery Man Info',
      },
      {
        key: 'createdAt',
        label: 'Created At',
      },
      {
        key: 'disburseAmount',
        label: 'Disburse Amount',
      },
      {
        key: 'paymentMethod',
        label: 'Payment Method',
      },
      {
        key: 'status',
        label: 'Status',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(filteredDisbursements, headers, 'disbursement_report_deliverymen');
        break;
      case 'excel':
        exportReportsToExcel(filteredDisbursements, headers, 'disbursement_report_deliverymen');
        break;
      case 'pdf':
        exportReportsToPDF(filteredDisbursements, headers, 'disbursement_report_deliverymen', 'Deliveryman Disbursement Report');
        break;
      case 'json':
        exportReportsToJSON(filteredDisbursements, 'disbursement_report_deliverymen');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const handleResetFilters = () => {
    setFilters({
      zone: 'All Zones',
      deliveryMan: 'All delivery mans',
      paymentMethod: 'All Payment Method',
      status: 'All status',
      time: 'All Time',
    });
  };
  const activeFiltersCount =
    (filters.zone !== 'All Zones' ? 1 : 0) +
    (filters.deliveryMan !== 'All delivery mans' ? 1 : 0) +
    (filters.paymentMethod !== 'All Payment Method' ? 1 : 0) +
    (filters.status !== 'All status' ? 1 : 0) +
    (filters.time !== 'All Time' ? 1 : 0);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <UiIcon as={Truck} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Delivery Man Disbursement Report</H1>
          </Div>
        </Div>

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Pending Disbursements */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <Div className="absolute top-4 right-4">
              <Div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <UiIcon as={Info} className="w-3 h-3 text-white" />
              </Div>
            </Div>
            <Div className="flex flex-col items-center text-center">
              <Div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 relative">
                <Img src={pendingIcon} alt="Pending" className="w-10 h-10" />
              </Div>
              <P className="text-2xl font-bold text-green-600 mb-1">{emptyDisbursementStats.pending}</P>
              <P className="text-sm text-slate-600">Pending Disbursements</P>
            </Div>
          </Div>

          {/* Completed Disbursements */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <Div className="absolute top-4 right-4">
              <Div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <UiIcon as={Info} className="w-3 h-3 text-white" />
              </Div>
            </Div>
            <Div className="flex flex-col items-center text-center">
              <Div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center mb-4">
                <Img src={completedIcon} alt="Completed" className="w-10 h-10" />
              </Div>
              <P className="text-2xl font-bold text-slate-900 mb-1">{emptyDisbursementStats.completed}</P>
              <P className="text-sm text-slate-600">Completed Disbursements</P>
            </Div>
          </Div>

          {/* Canceled Transactions */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <Div className="absolute top-4 right-4">
              <Div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <UiIcon as={Info} className="w-3 h-3 text-white" />
              </Div>
            </Div>
            <Div className="flex flex-col items-center text-center">
              <Div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 relative">
                <Img src={canceledIcon} alt="Canceled" className="w-10 h-10" />
              </Div>
              <P className="text-2xl font-bold text-red-600 mb-1">{emptyDisbursementStats.canceled}</P>
              <P className="text-sm text-slate-600">Canceled Transactions</P>
            </Div>
          </Div>
        </Div>

        {/* Search Data Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <H3 className="text-sm font-semibold text-slate-700 mb-4">Search Data</H3>
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
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Man</Label>
                <Select
                  value={filters.deliveryMan}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      deliveryMan: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All delivery mans">All delivery mans</Option>
                  <Option value="Kathryn Murphy">Kathryn Murphy</Option>
                  <Option value="Leslie Alexander">Leslie Alexander</Option>
                  <Option value="Jhon Doe">Jhon Doe</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</Label>
                <Select
                  value={filters.paymentMethod}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Payment Method">All Payment Method</Option>
                  <Option value="6cash">6cash</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Status</Label>
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All status">All status</Option>
                  <Option value="Pending">Pending</Option>
                  <Option value="Completed">Completed</Option>
                  <Option value="Canceled">Canceled</Option>
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

        {/* Total Disbursements Table Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">Total Disbursements {totalDisbursements}</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Search by id"
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

          {/* Table */}
            <Table cols={[70, 110, 200, 140, 140, 150, 120, 80]} className="w-full">
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
                      <Span>Id</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Delivery Man Info</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Created At</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Disburse Amount</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Payment Method</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Status</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredDisbursements.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                        <P className="text-sm text-slate-500">No disbursements match your search</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  filteredDisbursements.map((disbursement) => (
                    <Tr key={disbursement.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{disbursement.sl}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{disbursement.id}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{disbursement.deliveryManName}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{disbursement.createdAt}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{disbursement.disburseAmount}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{disbursement.paymentMethod}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{disbursement.status}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Eye} className="w-4 h-4" />
                        </Button>
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
            <P className="text-sm text-slate-700">Deliveryman disbursement report settings and preferences will be available here.</P>
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
