/* Ported from Frontend/src/modules/Food/pages/admin/advertisement/AdRequests.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Search,
  Settings,
  MoreVertical,
  Building2,
  Download,
  ChevronDown,
  Filter,
  FileDown,
  FileSpreadsheet,
  FileText,
  Code,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { emptyAdRequests } from '../../../utils/adminFallbackData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import SettingsDialog from '../../../components/admin/orders/SettingsDialog';
import {
  exportAdvertisementsToCSV,
  exportAdvertisementsToExcel,
  exportAdvertisementsToPDF,
  exportAdvertisementsToJSON,
} from '../../../components/admin/advertisements/advertisementsExportUtils';
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
export default function AdRequests() {
  const [activeTab, setActiveTab] = useState('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState(emptyAdRequests);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    adsType: '',
    restaurant: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    adsId: true,
    adsTitle: true,
    restaurantInfo: true,
    adsType: true,
    duration: true,
    actions: true,
  });
  const columnsConfig = {
    si: 'Serial Number',
    adsId: 'Ads ID',
    adsTitle: 'Ads Title',
    restaurantInfo: 'Restaurant Info',
    adsType: 'Ads Type',
    duration: 'Duration',
    actions: 'Actions',
  };
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Filter by tab
    if (activeTab === 'new') {
      result = result.filter((r) => r.status === 'new' || !r.status);
    } else if (activeTab === 'update') {
      result = result.filter((r) => r.status === 'update');
    } else if (activeTab === 'denied') {
      result = result.filter((r) => r.status === 'denied');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (request) =>
          request.adsId?.toLowerCase().includes(query) ||
          request.restaurantName?.toLowerCase().includes(query) ||
          request.adsTitle?.toLowerCase().includes(query),
      );
    }

    // Filter by ads type
    if (filters.adsType) {
      result = result.filter((r) => r.adsType === filters.adsType);
    }

    // Filter by restaurant
    if (filters.restaurant) {
      result = result.filter((r) => r.restaurantName === filters.restaurant);
    }
    return result;
  }, [requests, searchQuery, activeTab, filters]);
  const activeFiltersCount = Object.values(filters).filter((v) => v).length;
  const handleExport = (format) => {
    const filename = `ad_requests_${activeTab}`;
    switch (format) {
      case 'csv':
        exportAdvertisementsToCSV(filteredRequests, filename);
        break;
      case 'excel':
        exportAdvertisementsToExcel(filteredRequests, filename);
        break;
      case 'pdf':
        exportAdvertisementsToPDF(filteredRequests, filename);
        break;
      case 'json':
        exportAdvertisementsToJSON(filteredRequests, filename);
        break;
      default:
        break;
    }
  };
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsViewOpen(true);
  };
  const handleApprove = (sl) => {
    setRequests(
      requests.map((r) =>
        r.sl === sl
          ? {
              ...r,
              status: 'approved',
            }
          : r,
      ),
    );
  };
  const handleDeny = (sl) => {
    setRequests(
      requests.map((r) =>
        r.sl === sl
          ? {
              ...r,
              status: 'denied',
            }
          : r,
      ),
    );
  };
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      adsId: true,
      adsTitle: true,
      restaurantInfo: true,
      adsType: true,
      duration: true,
      actions: true,
    });
  };
  const handleApplyFilters = () => {
    setIsFilterOpen(false);
  };
  const handleResetFilters = () => {
    setFilters({
      adsType: '',
      restaurant: '',
    });
  };
  const restaurants = [...new Set(requests.map((r) => r.restaurantName))].filter(Boolean);
  const adsTypes = [...new Set(requests.map((r) => r.adsType))].filter(Boolean);
  const tabs = [
    {
      key: 'new',
      label: 'New Request',
    },
    {
      key: 'update',
      label: 'Update Request',
    },
    {
      key: 'denied',
      label: 'Denied Requests',
    },
  ];
  const tableCols = [
    ['si', 60],
    ['adsId', 120],
    ['adsTitle', 180],
    ['restaurantInfo', 200],
    ['adsType', 130],
    ['duration', 190],
    ['actions', 132],
  ]
    .filter(([key]) => visibleColumns[key])
    .map(([, width]) => width);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <Div className="flex items-center gap-2">
            <H1 className="text-2xl font-bold text-slate-900">Advertisement Requests</H1>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredRequests.length}</Span>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="flex items-center gap-2 border-b border-slate-200 mb-4">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              {tab.label}
            </Button>
          ))}
        </Div>

        <Div className="flex items-center gap-3">
          <Div className="flex items-center gap-2">
            <H2 className="text-lg font-semibold text-slate-900">Advertisement</H2>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredRequests.length}</Span>
          </Div>

          <Div className="flex items-center gap-3 ml-auto">
            <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <Input
                type="text"
                placeholder="Search by ads ID or restaurant"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                  <UiIcon as={Download} className="w-4 h-4" />
                  <Span className="text-black font-bold">Export</Span>
                  <UiIcon as={ChevronDown} className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                  <UiIcon as={FileDown} className="w-4 h-4 mr-2" />
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
              onClick={() => setIsFilterOpen(true)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all relative ${activeFiltersCount > 0 ? 'border-emerald-500 bg-emerald-50' : ''}`}
            >
              <UiIcon as={Filter} className="w-4 h-4" />
              <Span className="text-black font-bold">Filters</Span>
              {activeFiltersCount > 0 && (
                <Span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </Span>
              )}
            </Button>

            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
            >
              <UiIcon as={Settings} className="w-5 h-5" />
            </Button>
          </Div>
        </Div>
      </Div>

      {/* Table */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Div className="overflow-x-hidden">
          <Table className="w-full" cols={tableCols}>
            <Thead className="bg-slate-50 border-b border-slate-200">
              <Tr>
                {visibleColumns.si && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>}
                {visibleColumns.adsId && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ads ID</Th>}
                {visibleColumns.adsTitle && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ads Title</Th>}
                {visibleColumns.restaurantInfo && (
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant Info</Th>
                )}
                {visibleColumns.adsType && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Ads Type</Th>}
                {visibleColumns.duration && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Duration</Th>}
                {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
              </Tr>
            </Thead>
            <Tbody className="bg-white divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <Tr>
                  <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-20 text-center">
                    <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                    <P className="text-sm text-slate-500">No requests match your search</P>
                  </Td>
                </Tr>
              ) : (
                filteredRequests.map((request) => (
                  <Tr key={request.sl} className="hover:bg-slate-50 transition-colors">
                    {visibleColumns.si && (
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{request.sl}</Span>
                      </Td>
                    )}
                    {visibleColumns.adsId && (
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{request.adsId}</Span>
                      </Td>
                    )}
                    {visibleColumns.adsTitle && (
                      <Td className="px-6 py-4">
                        <Span className="text-sm font-medium text-slate-900">{request.adsTitle}</Span>
                      </Td>
                    )}
                    {visibleColumns.restaurantInfo && (
                      <Td className="px-6 py-4">
                        <Div className="flex items-center gap-3">
                          <Div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <UiIcon as={Building2} className="w-5 h-5 text-orange-600" />
                          </Div>
                          <Div className="flex flex-col">
                            <Span className="text-sm font-medium text-slate-900">{request.restaurantName}</Span>
                            <Span className="text-xs text-slate-500">{request.restaurantEmail}</Span>
                          </Div>
                        </Div>
                      </Td>
                    )}
                    {visibleColumns.adsType && (
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{request.adsType}</Span>
                      </Td>
                    )}
                    {visibleColumns.duration && (
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{request.duration}</Span>
                      </Td>
                    )}
                    {visibleColumns.actions && (
                      <Td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors">
                              <UiIcon as={MoreVertical} className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                            <DropdownMenuItem onClick={() => handleViewRequest(request)} className="cursor-pointer">
                              <UiIcon as={Eye} className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {activeTab === 'new' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleApprove(request.sl)} className="cursor-pointer text-emerald-600">
                                  <UiIcon as={CheckCircle2} className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeny(request.sl)} className="cursor-pointer text-red-600">
                                  <UiIcon as={XCircle} className="w-4 h-4 mr-2" />
                                  Deny
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>
      </Div>

      {/* Filter Panel */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Filter} className="w-5 h-5" />
              Filter Requests
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Ads Type</Label>
              <Select
                value={filters.adsType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    adsType: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="">All Types</Option>
                {adsTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant</Label>
              <Select
                value={filters.restaurant}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="">All Restaurants</Option>
                {restaurants.map((restaurant) => (
                  <Option key={restaurant} value={restaurant}>
                    {restaurant}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
        columnsConfig={columnsConfig}
      />

      {/* View Request Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Advertisement Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <Div className="px-6 pb-6 space-y-4">
              <Div className="grid grid-cols-2 gap-4">
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Ads ID</P>
                  <P className="text-sm text-slate-900">{selectedRequest.adsId}</P>
                </Div>
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Ads Title</P>
                  <P className="text-sm text-slate-900">{selectedRequest.adsTitle}</P>
                </Div>
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Restaurant Name</P>
                  <P className="text-sm text-slate-900">{selectedRequest.restaurantName}</P>
                </Div>
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Restaurant Email</P>
                  <P className="text-sm text-slate-900">{selectedRequest.restaurantEmail}</P>
                </Div>
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Ads Type</P>
                  <P className="text-sm text-slate-900">{selectedRequest.adsType}</P>
                </Div>
                <Div>
                  <P className="text-sm font-semibold text-slate-700">Duration</P>
                  <P className="text-sm text-slate-900">{selectedRequest.duration}</P>
                </Div>
              </Div>
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
