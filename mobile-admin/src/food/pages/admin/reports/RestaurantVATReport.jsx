/* Ported from Frontend/src/modules/Food/pages/admin/reports/RestaurantVATReport.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Filter,
  ClipboardList,
  DollarSign,
  FileText,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
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
const COLS = [60, 190, 110, 160, 130, 90];
const LABELS = ['SI', 'Restaurant Info', 'Total Order', 'Total Order Amount', 'Tax Amount', 'Action'];

export default function RestaurantVATReport() {
  const { tablet } = useLayoutWidth();
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={FileText}
        title="Restaurant Tax Report"
        subtitle="Order volume and tax collected per restaurant"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Restaurant tax' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          <Field label="Date range" hint="MM/DD/YYYY - MM/DD/YYYY">
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
              className={INPUT}
            />
          </Field>

          <Field label="Select restaurant">
            <Select
              value={filters.restaurant}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  restaurant: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All Restaurants">All Restaurants</Option>
              <Option value="Caf� Monarch">Caf� Monarch</Option>
              <Option value="Hungry Puppets">Hungry Puppets</Option>
              <Option value="Cheesy Restaurant">Cheesy Restaurant</Option>
              <Option value="Cheese Burger">Cheese Burger</Option>
              <Option value="Frying Nemo">Frying Nemo</Option>
            </Select>
          </Field>
        </Div>
        <Toolbar className="mt-3 mb-0">
          <Button onClick={handleFilterApply} className={BTN_PRIMARY}>
            <UiIcon as={Filter} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{activeFiltersCount > 0 ? `Filter (${activeFiltersCount})` : 'Filter'}</Span>
          </Button>
          <Button onClick={handleResetFilters} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
      </Card>

      <StatGrid className="mb-4">
        <StatCard label="Total orders" value={emptyRestaurantVATStats.totalOrders} icon={ClipboardList} tone="info" />
        <StatCard label="Total order amount" value={emptyRestaurantVATStats.totalOrderAmount} icon={DollarSign} tone="success" />
        <StatCard label="Total tax amount" value={emptyRestaurantVATStats.totalTaxAmount} icon={FileText} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>All restaurant taxes ({totalReports})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Ex: Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
            <UiIcon as={Search} size={16} className="text-slate-400" />
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

      {filteredReports.length === 0 ? (
        <EmptyState title="No data found" message="No restaurant tax rows match this date range or search." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredReports.map((report, i, all) => (
              <Row key={report.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{report.sl}</Cell>
                <Cell width={COLS[1]}>
                  <Div className="flex-row items-center gap-2">
                    {report.icon ? <Img src={report.icon} alt={report.restaurantName} className="w-8 h-8 rounded-lg" /> : null}
                    <Span className="text-sm text-slate-700 flex-1">{report.restaurantName}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>{report.totalOrder}</Cell>
                <Cell width={COLS[3]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{report.totalOrderAmount}</Span>
                </Cell>
                <Cell width={COLS[4]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{report.taxAmount}</Span>
                </Cell>
                <Cell width={COLS[5]} align="center">
                  <Button className="h-11 px-3 rounded-lg items-center justify-center">
                    <Span className="text-sm font-semibold text-blue-600">View</Span>
                  </Button>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

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
            <P className="text-sm text-slate-700">Restaurant VAT report settings and preferences will be available here.</P>
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
