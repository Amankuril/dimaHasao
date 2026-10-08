/* Ported from Frontend/src/modules/Food/pages/admin/reports/CampaignOrderReport.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Briefcase,
  ChevronDown,
  Filter,
  ShoppingBag,
  RefreshCw,
  Truck,
  AlertTriangle,
  Coins,
  X,
  Search,
  Download,
  Eye,
  Printer,
  Settings,
  FileText,
  FileSpreadsheet,
  Code,
} from 'lucide-react-native';
import { emptyCampaignOrderReports, emptyCampaignOrderStats } from '../../../utils/adminFallbackData';
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
export default function CampaignOrderReport() {
  const [filters, setFilters] = useState({
    campaign: 'All Campaignes',
    restaurant: 'All restaurants',
    customer: 'All customers',
    time: 'All Time',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [orders] = useState(emptyCampaignOrderReports);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (order) =>
          order.orderId.toLowerCase().includes(query) || order.restaurant.toLowerCase().includes(query) || order.customerName.toLowerCase().includes(query),
      );
    }
    if (filters.campaign !== 'All Campaignes') {
      // Filter by campaign if needed
    }
    if (filters.restaurant !== 'All restaurants') {
      result = result.filter((o) => o.restaurant === filters.restaurant);
    }
    if (filters.customer !== 'All customers') {
      result = result.filter((o) => o.customerName === filters.customer);
    }
    return result;
  }, [orders, searchQuery, filters]);
  const handleExport = (format) => {
    if (filteredOrders.length === 0) {
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
        key: 'restaurant',
        label: 'Restaurant',
      },
      {
        key: 'customerName',
        label: 'Customer Name',
      },
      {
        key: 'orderAmount',
        label: 'Order Amount',
      },
      {
        key: 'paymentMethod',
        label: 'Payment Method',
      },
      {
        key: 'orderStatus',
        label: 'Order Status',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(filteredOrders, headers, 'campaign_order_report');
        break;
      case 'excel':
        exportReportsToExcel(filteredOrders, headers, 'campaign_order_report');
        break;
      case 'pdf':
        exportReportsToPDF(filteredOrders, headers, 'campaign_order_report', 'Campaign Order Report');
        break;
      case 'json':
        exportReportsToJSON(filteredOrders, 'campaign_order_report');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const handleResetFilters = () => {
    setFilters({
      campaign: 'All Campaignes',
      restaurant: 'All restaurants',
      customer: 'All customers',
      time: 'All Time',
    });
  };
  const activeFiltersCount =
    (filters.campaign !== 'All Campaignes' ? 1 : 0) +
    (filters.restaurant !== 'All restaurants' ? 1 : 0) +
    (filters.customer !== 'All customers' ? 1 : 0) +
    (filters.time !== 'All Time' ? 1 : 0);
  const getStatusBadge = (status) => {
    const statusColors = {
      Delivered: 'bg-green-100 text-green-800',
      Pending: 'bg-blue-100 text-blue-800',
      Canceled: 'bg-red-100 text-red-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      Failed: 'bg-orange-100 text-orange-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen overflow-x-hidden w-full max-w-full">
      <Div className="w-full max-w-full overflow-x-hidden overflow-y-visible">
        {/* Page Header - compact */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 mb-4 w-full overflow-x-hidden">
          <Div className="flex items-center gap-2 w-full">
            <UiIcon as={Briefcase} className="w-5 h-5 text-slate-700" />
            <H1 className="text-lg font-bold text-slate-900">Camapign Order Report</H1>
          </Div>
        </Div>

        {/* Filter Section - compact */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 mb-4 w-full overflow-x-hidden">
          <Div className="flex flex-col lg:flex-row lg:items-end gap-3 w-full">
            <Div className="flex flex-wrap gap-3 flex-1 w-full min-w-0">
              <Div className="relative flex-1 min-w-[180px]">
                <Label className="block text-xs font-semibold text-slate-700 mb-1">Campaign</Label>
                <Select
                  value={filters.campaign}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      campaign: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Campaignes">All Campaignes</Option>
                  <Option value="Campaign 1">Campaign 1</Option>
                  <Option value="Campaign 2">Campaign 2</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative flex-1 min-w-[180px]">
                <Label className="block text-xs font-semibold text-slate-700 mb-1">Restaurant</Label>
                <Select
                  value={filters.restaurant}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      restaurant: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All restaurants">All restaurants</Option>
                  <Option value="Hungry Puppets">Hungry Puppets</Option>
                  <Option value="Caf� Monarch">Caf� Monarch</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative flex-1 min-w-[180px]">
                <Label className="block text-xs font-semibold text-slate-700 mb-1">Customer</Label>
                <Select
                  value={filters.customer}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      customer: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All customers">All customers</Option>
                  <Option value="John Doe">John Doe</Option>
                  <Option value="V H">V H</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative flex-1 min-w-[180px]">
                <Label className="block text-xs font-semibold text-slate-700 mb-1">Time</Label>
                <Select
                  value={filters.time}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All Time">All Time</Option>
                  <Option value="Today">Today</Option>
                  <Option value="This Week">This Week</Option>
                  <Option value="This Month">This Month</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>
            </Div>

            <Div className="flex items-end gap-2 pt-1">
              <Button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={handleFilterApply}
                className={`px-4 py-2 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 relative ${activeFiltersCount > 0 ? 'ring-2 ring-blue-300' : ''}`}
              >
                <UiIcon as={Filter} className="w-3.5 h-3.5" />
                Filter
                {activeFiltersCount > 0 && (
                  <Span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </Span>
                )}
              </Button>
            </Div>
          </Div>
        </Div>

        {/* Summary Cards - compact */}
        <Div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 w-full overflow-x-hidden">
          {/* Total orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-2">
                <UiIcon as={ShoppingBag} className="w-6 h-6 text-yellow-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.totalOrders}</P>
              <P className="text-[11px] text-slate-600">Total orders</P>
            </Div>
          </Div>

          {/* In progress orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <UiIcon as={RefreshCw} className="w-6 h-6 text-blue-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.inProgressOrders}</P>
              <P className="text-[11px] text-slate-600">In progress orders</P>
            </Div>
          </Div>

          {/* On the way */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <UiIcon as={Truck} className="w-6 h-6 text-blue-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.onTheWay}</P>
              <P className="text-[11px] text-slate-600">On the way</P>
            </Div>
          </Div>

          {/* Delivered Orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                <UiIcon as={ShoppingBag} className="w-6 h-6 text-green-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.deliveredOrders}</P>
              <P className="text-[11px] text-slate-600">Delivered Orders</P>
            </Div>
          </Div>

          {/* Failed orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-2">
                <UiIcon as={AlertTriangle} className="w-6 h-6 text-yellow-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.failedOrders}</P>
              <P className="text-[11px] text-slate-600">Failed orders</P>
            </Div>
          </Div>

          {/* Refunded orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
                <UiIcon as={Coins} className="w-6 h-6 text-orange-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.refundedOrders}</P>
              <P className="text-[11px] text-slate-600">Refunded orders</P>
            </Div>
          </Div>

          {/* Canceled orders */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3">
            <Div className="flex flex-col items-center text-center">
              <Div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-2">
                <UiIcon as={X} className="w-6 h-6 text-red-600" />
              </Div>
              <P className="text-lg font-bold text-slate-900 mb-0.5">{emptyCampaignOrderStats.canceledOrders}</P>
              <P className="text-[11px] text-slate-600">Canceled orders</P>
            </Div>
          </Div>
        </Div>

        {/* Orders Table - only this card scrolls */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 w-full overflow-x-hidden flex flex-col">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 w-full">
            <H2 className="text-lg font-bold text-slate-900">Total Orders {filteredOrders.length}</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[220px]">
                <Input
                  type="text"
                  placeholder="Search by Order ID, Restaurant, Customer"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 pr-9 py-2 w-full text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <UiIcon as={Search} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all">
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
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-4 h-4" />
              </Button>
            </Div>
          </Div>

          {/* Only this area scrolls */}
            <Table cols={[60, 120, 170, 170, 120, 140, 130, 100]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">SI</Th>
                  <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Order Id</Th>
                  <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Restaurant</Th>
                  <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Customer Name</Th>
                  <Th className="px-3 py-2 text-right text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Order Amount</Th>
                  <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Payment Method</Th>
                  <Th className="px-3 py-2 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Order Status</Th>
                  <Th className="px-3 py-2 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <Tr key={order.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-3 py-2 whitespace-nowrap">
                      <Span className="text-xs font-medium text-slate-700">{order.sl}</Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap">
                      <Span className="text-xs font-medium text-slate-700">{order.orderId}</Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap">
                      <Span className="text-xs text-slate-700">{order.restaurant}</Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap">
                      <Span className={`text-xs ${order.customerNameError ? 'text-red-600 font-medium' : 'text-slate-700'}`}>{order.customerName}</Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap text-right">
                      <Div className="flex flex-col items-end">
                        <Span className="text-xs font-medium text-slate-900">{order.orderAmount}</Span>
                        <Span className={`text-[10px] ${order.orderAmountStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                          ({order.orderAmountStatus})
                        </Span>
                      </Div>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap">
                      <Span className="text-xs text-slate-700">{order.paymentMethod}</Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap text-center">
                      <Span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </Span>
                    </Td>
                    <Td className="px-3 py-2 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-1.5">
                        <Button className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors">
                          <UiIcon as={Eye} className="w-3.5 h-3.5" />
                        </Button>
                        <Button className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors">
                          <UiIcon as={Printer} className="w-3.5 h-3.5" />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))}
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
            <P className="text-sm text-slate-700">Campaign order report settings and preferences will be available here.</P>
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
