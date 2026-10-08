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
  StatusBadge,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const COLS = [60, 120, 170, 170, 120, 140, 130, 110];
const LABELS = ['SI', 'Order Id', 'Restaurant', 'Customer Name', 'Order Amount', 'Payment Method', 'Order Status', 'Action'];
export default function CampaignOrderReport() {
  const { tablet } = useLayoutWidth();
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
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Briefcase}
        title="Campaign Order Report"
        subtitle="Orders placed through running campaigns"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Campaign orders' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          <Field label="Campaign">
            <Select
              value={filters.campaign}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  campaign: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All Campaignes">All Campaignes</Option>
              <Option value="Campaign 1">Campaign 1</Option>
              <Option value="Campaign 2">Campaign 2</Option>
            </Select>
          </Field>

          <Field label="Restaurant">
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
              <Option value="All restaurants">All restaurants</Option>
              <Option value="Hungry Puppets">Hungry Puppets</Option>
              <Option value="Caf� Monarch">Caf� Monarch</Option>
            </Select>
          </Field>

          <Field label="Customer">
            <Select
              value={filters.customer}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  customer: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All customers">All customers</Option>
              <Option value="John Doe">John Doe</Option>
              <Option value="V H">V H</Option>
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
        <StatCard label="Total orders" value={emptyCampaignOrderStats.totalOrders} icon={ShoppingBag} tone="info" />
        <StatCard label="In progress orders" value={emptyCampaignOrderStats.inProgressOrders} icon={RefreshCw} tone="warning" />
        <StatCard label="On the way" value={emptyCampaignOrderStats.onTheWay} icon={Truck} tone="info" />
        <StatCard label="Delivered orders" value={emptyCampaignOrderStats.deliveredOrders} icon={ShoppingBag} tone="success" />
        <StatCard label="Failed orders" value={emptyCampaignOrderStats.failedOrders} icon={AlertTriangle} tone="warning" />
        <StatCard label="Refunded orders" value={emptyCampaignOrderStats.refundedOrders} icon={Coins} tone="warning" />
        <StatCard label="Canceled orders" value={emptyCampaignOrderStats.canceledOrders} icon={X} tone="danger" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Total orders ({filteredOrders.length})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Search by Order ID, Restaurant, Customer"
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

      {filteredOrders.length === 0 ? (
        <EmptyState title="No campaign orders" message="No orders match your search or filters." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredOrders.map((order, i, all) => (
              <Row key={order.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{order.sl}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900">{order.orderId}</Span>
                </Cell>
                <Cell width={COLS[2]}>{order.restaurant}</Cell>
                <Cell width={COLS[3]}>
                  <Span className={`text-sm ${order.customerNameError ? 'text-red-600 font-medium' : 'text-slate-700'}`}>{order.customerName}</Span>
                </Cell>
                <Cell width={COLS[4]} align="right">
                  <Div className="items-end">
                    <Span className="text-sm font-medium text-slate-900">{order.orderAmount}</Span>
                    <Span className={`text-xs ${order.orderAmountStatus === 'Paid' ? 'text-green-700' : 'text-red-600'}`}>({order.orderAmountStatus})</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[5]}>{order.paymentMethod}</Cell>
                <Cell width={COLS[6]}>
                  <StatusBadge status={order.orderStatus} />
                </Cell>
                <Cell width={COLS[7]} align="center">
                  <Div className="flex-row items-center gap-1">
                    <Button accessibilityLabel="View order" className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Eye} size={16} className="text-blue-600" />
                    </Button>
                    <Button accessibilityLabel="Print order" className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Printer} size={16} className="text-slate-600" />
                    </Button>
                  </Div>
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
            <P className="text-sm text-slate-700">Campaign order report settings and preferences will be available here.</P>
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
