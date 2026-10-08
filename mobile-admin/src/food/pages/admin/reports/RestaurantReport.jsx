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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  A,
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
  LoadingState,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS = [60, 190, 110, 110, 150, 160, 180, 130, 150];
const LABELS = ['SL', 'Restaurant Name', 'Total Food', 'Total Order', 'Total Order Amount', 'Total Discount Given', 'Total Admin Commission', 'Total VAT/TAX', 'Average Ratings'];
export default function RestaurantReport() {
  const { tablet } = useLayoutWidth();
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
      <Div className="gap-1">
        <Div className="flex-row items-center gap-0.5">
          {Array.from({
            length: fullStars,
          }).map((_, index) => (
            <UiIcon as={Star} key={`full-${index}`} size={13} color={A.warning} fill={A.warning} />
          ))}
          {hasHalfStar && <UiIcon as={Star} size={13} color={A.warning} fill={A.warningSoft} />}
          {Array.from({
            length: emptyStars,
          }).map((_, index) => (
            <UiIcon as={Star} key={`empty-${index}`} size={13} color={A.textDisabled} />
          ))}
        </Div>
        <Span className="text-xs text-slate-500">
          {numericRating.toFixed(1)} ({safeReviews})
        </Span>
      </Div>
    );
  };

  if (loading && restaurants.length === 0) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Briefcase}
          title="Restaurant Report"
          subtitle="Orders, commission and ratings per restaurant"
          breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Restaurant report' }]}
        />
        <LoadingState label="Loading restaurant report…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Briefcase}
        title="Restaurant Report"
        subtitle="Orders, commission and ratings per restaurant"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Restaurant report' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Search data</SectionTitle>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          <Field label="Zone">
            <Select
              value={filters.zone}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  zone: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All Zones">All Zones</Option>
              {zones.map((zone) => (
                <Option key={zone._id} value={zone.name}>
                  {zone.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Status">
            <Select
              value={filters.all}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  all: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All">All</Option>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Field>

          <Field label="Type">
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  type: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All types">All types</Option>
              <Option value="Commission">Commission</Option>
              <Option value="Subscription">Subscription</Option>
            </Select>
          </Field>

          <Field label="Time">
            <Select
              value={filters.time}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  time: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All Time">All Time</Option>
              <Option value="Today">Today</Option>
              <Option value="This Week">This Week</Option>
              <Option value="This Month">This Month</Option>
              <Option value="This Year">This Year</Option>
            </Select>
          </Field>
        </Div>

        <Toolbar className="mt-3 mb-0">
          <Button onClick={handleFilterApply} className={BTN_PRIMARY}>
            <UiIcon as={Filter} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{activeFiltersCount > 0 ? `Filter (${activeFiltersCount})` : 'Filter'}</Span>
          </Button>
          <Button onClick={handleReset} className={BTN_SECONDARY}>
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Restaurant report ({totalItems})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Ex: search restaurant name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
            {isRefreshing ? <UiIcon as={Loader2} size={16} className="text-slate-400" /> : <UiIcon as={Search} size={16} className="text-slate-400" />}
          </Div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
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
          <Button
            onClick={() => setIsSettingsOpen(true)}
            accessibilityLabel="Report settings"
            className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
          >
            <UiIcon as={Settings} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>
      </Card>

      {restaurants.length === 0 ? (
        <EmptyState title="No data found" message="No restaurants match your search or filters." actionLabel="Reset filters" onAction={handleReset} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {restaurants.map((restaurant, i, all) => (
              <Row key={restaurant.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{restaurant.sl}</Cell>
                <Cell width={COLS[1]}>
                  <Div className="flex-row items-center gap-2">
                    <Div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 items-center justify-center shrink-0">
                      {restaurant.icon ? (
                        <Img
                          src={restaurant.icon}
                          alt={restaurant.restaurantName}
                          className="w-full h-full"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/32';
                          }}
                        />
                      ) : (
                        <Span className="text-xs font-semibold text-slate-600">{restaurant.restaurantName.charAt(0).toUpperCase()}</Span>
                      )}
                    </Div>
                    <Span className="text-sm font-medium text-slate-900 flex-1">{restaurant.restaurantName}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>{restaurant.totalFood}</Cell>
                <Cell width={COLS[3]}>{restaurant.totalOrder}</Cell>
                <Cell width={COLS[4]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{restaurant.totalOrderAmount}</Span>
                </Cell>
                <Cell width={COLS[5]} align="right">{restaurant.totalDiscountGiven}</Cell>
                <Cell width={COLS[6]} align="right">
                  <Span
                    className={`text-sm font-medium ${restaurant.totalAdminCommission.startsWith('?-') || restaurant.totalAdminCommission.startsWith('-?') ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {restaurant.totalAdminCommission}
                  </Span>
                </Cell>
                <Cell width={COLS[7]} align="right">{restaurant.totalVATTAX}</Cell>
                <Cell width={COLS[8]}>{renderStars(restaurant.averageRatings, restaurant.reviews)}</Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

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

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex-row items-center gap-2">
              <UiIcon as={Settings} size={18} className="text-slate-600" />
              Report Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-4 pb-4">
            <P className="text-sm text-slate-700">Restaurant report settings and preferences will be available here.</P>
          </Div>
          <Div className="px-4 pb-4 flex-row items-center justify-end">
            <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Close</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
