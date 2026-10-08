/* Ported from Frontend/src/modules/Food/pages/admin/reports/RestaurantReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Filter,
  Briefcase,
  RefreshCw,
  Settings,
  ArrowUpDown,
  FileText,
  FileSpreadsheet,
  Code,
  Loader2,
  Star,
} from 'lucide-react-native';
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
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
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
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function RestaurantReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_restaurant_report_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    all: 'All',
    type: 'All types',
    time: 'All Time',
  });
  const [zones, setZones] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch zones for filter dropdown
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({
          limit: 1000,
        });
        if (response?.data?.success && response.data.data?.zones) {
          setZones(response.data.data.zones);
        }
      } catch (error) {
        debugError('Error fetching zones:', error);
      }
    };
    fetchZones();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearch]);

  // Fetch restaurant report data
  useEffect(() => {
    const fetchRestaurantReport = async () => {
      try {
        setIsRefreshing(true);
        const params = {
          zone: filters.zone !== 'All Zones' ? filters.zone : undefined,
          all: filters.all !== 'All' ? filters.all : undefined,
          type: filters.type !== 'All types' ? filters.type : undefined,
          time: filters.time !== 'All Time' ? filters.time : undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        };
        const response = await adminAPI.getRestaurantReport(params);
        if (response?.data?.success && response.data.data) {
          setRestaurants(response.data.data.restaurants || []);
          setTotalItems(response.data.data.total ?? 0);
        } else {
          setRestaurants([]);
          setTotalItems(0);
          if (response?.data?.message) {
            toast.error(response.data.message);
          }
        }
      } catch (error) {
        debugError('Error fetching restaurant report:', error);
        toast.error('Failed to fetch restaurant report');
        setRestaurants([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchRestaurantReport();
  }, [filters, debouncedSearch, currentPage, pageSize]);
  const handleReset = () => {
    setFilters({
      zone: 'All Zones',
      all: 'All',
      type: 'All types',
      time: 'All Time',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };
  const handleExport = (format) => {
    if (restaurants.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SL',
      },
      {
        key: 'restaurantName',
        label: 'Restaurant Name',
      },
      {
        key: 'totalFood',
        label: 'Total Food',
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
        key: 'totalDiscountGiven',
        label: 'Total Discount Given',
      },
      {
        key: 'totalAdminCommission',
        label: 'Total Admin Commission',
      },
      {
        key: 'totalVATTAX',
        label: 'Total VAT/TAX',
      },
      {
        key: 'averageRatings',
        label: 'Average Ratings',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(restaurants, headers, 'restaurant_report');
        break;
      case 'excel':
        exportReportsToExcel(restaurants, headers, 'restaurant_report');
        break;
      case 'pdf':
        exportReportsToPDF(restaurants, headers, 'restaurant_report', 'Restaurant Report');
        break;
      case 'json':
        exportReportsToJSON(restaurants, 'restaurant_report');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const activeFiltersCount =
    (filters.zone !== 'All Zones' ? 1 : 0) + (filters.all !== 'All' ? 1 : 0) + (filters.type !== 'All types' ? 1 : 0) + (filters.time !== 'All Time' ? 1 : 0);
  const renderStars = (rating, reviews) => {
    const numericRating = Number(rating || 0);
    const safeReviews = Number(reviews || 0);
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));
    return (
      <Div className="flex items-center gap-2">
        <Div className="flex items-center gap-0.5">
          {Array.from({
            length: fullStars,
          }).map((_, index) => (
            <UiIcon as={Star} key={`full-${index}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          ))}
          {hasHalfStar && <UiIcon as={Star} className="w-3.5 h-3.5 fill-amber-200 text-amber-400" />}
          {Array.from({
            length: emptyStars,
          }).map((_, index) => (
            <UiIcon as={Star} key={`empty-${index}`} className="w-3.5 h-3.5 text-slate-300" />
          ))}
        </Div>
        <Span className="text-sm text-slate-700 whitespace-nowrap">
          {numericRating.toFixed(1)} ({safeReviews})
        </Span>
      </Div>
    );
  };
  if (loading && restaurants.length === 0) {
    return (
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Div className="flex flex-col items-center gap-4">
          <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
          <P className="text-gray-600">Loading restaurant report...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <UiIcon as={Briefcase} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Restaurant Report</H1>
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
                  {zones.map((zone) => (
                    <Option key={zone._id} value={zone.name}>
                      {zone.name}
                    </Option>
                  ))}
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

              <Div className="relative">
                <Label className="block text-sm font-semibold text-slate-700 mb-2">All</Label>
                <Select
                  value={filters.all}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      all: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Option value="All">All</Option>
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
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
                  <Option value="All types">All types</Option>
                  <Option value="Commission">Commission</Option>
                  <Option value="Subscription">Subscription</Option>
                </Select>
                <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </Div>

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
            </Div>

            <Div className="flex items-end gap-3">
              <Button
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-all flex items-center gap-2"
              >
                <UiIcon as={RefreshCw} className="w-4 h-4" />
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

        {/* Restaurant Report Table Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">Restaurant Report Table {totalItems}</H2>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Ex: search restaurant nam"
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
            <Table cols={[70, 200, 110, 110, 150, 160, 180, 130, 130]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>SL</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Restaurant Name</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total Food</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total Order</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total Order Amount</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total Discount Given</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total Admin Commission</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Total VAT/TAX</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-1">
                      <Span>Average Ratings</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {restaurants.length === 0 ? (
                  <Tr>
                    <Td colSpan={9} className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center">
                        <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                        <P className="text-sm text-slate-500">No restaurants match your search</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  restaurants.map((restaurant) => (
                    <Tr key={restaurant.sl} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{restaurant.sl}</Span>
                      </Td>
                      <Td className="px-6 py-4">
                        <Div className="flex items-center gap-3">
                          <Div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {restaurant.icon ? (
                              <Img
                                src={restaurant.icon}
                                alt={restaurant.restaurantName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/32';
                                }}
                              />
                            ) : (
                              <Div className="w-full h-full bg-slate-300 flex items-center justify-center text-xs text-slate-600 font-semibold">
                                {restaurant.restaurantName.charAt(0).toUpperCase()}
                              </Div>
                            )}
                          </Div>
                          <Span className="text-sm font-medium text-slate-900">{restaurant.restaurantName}</Span>
                        </Div>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{restaurant.totalFood}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{restaurant.totalOrder}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-900">{restaurant.totalOrderAmount}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{restaurant.totalDiscountGiven}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span
                          className={`text-sm font-medium ${restaurant.totalAdminCommission.startsWith('?-') || restaurant.totalAdminCommission.startsWith('-?') ? 'text-red-600' : 'text-slate-900'}`}
                        >
                          {restaurant.totalAdminCommission}
                        </Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{restaurant.totalVATTAX}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">{renderStars(restaurant.averageRatings, restaurant.reviews)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_restaurant_report_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="restaurants"
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
            <P className="text-sm text-slate-700">Restaurant report settings and preferences will be available here.</P>
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
