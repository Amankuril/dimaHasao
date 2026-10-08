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
import { Button, Div, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const COLS = [60, 190, 130, 130, 90];
const LABELS = ['SI', 'Income Source', 'Total Income', 'Total Tax', 'Action'];
const DETAIL_COLS = [130, 120, 110, 110];
const DETAIL_LABELS = ['Order ID', 'Date', 'Amount', 'Tax'];
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function TaxReport() {
  const { tablet } = useLayoutWidth();
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
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={FileText}
          title="Generate Tax Report"
          subtitle="Income and tax collected across the district"
          breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Tax report' }]}
        />
        <LoadingState label="Loading tax report…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={FileText}
        title="Generate Tax Report"
        subtitle="Income and tax collected across the district"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Tax report' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Admin tax report</SectionTitle>
        <P className="text-sm text-slate-500 mb-3">Select the fields below and submit to generate the report.</P>

        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          <Field label="Date range type">
            <Select
              value={filters.dateRangeType}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRangeType: e.target.value,
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

          <Field label="How to calculate tax">
            <Select
              value={filters.calculateTax}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  calculateTax: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="Percentage">Percentage</Option>
              <Option value="Fixed Amount">Fixed Amount</Option>
              <Option value="Tiered">Tiered</Option>
            </Select>
          </Field>

          <Field label="Tax rate">
            <Select
              value={filters.taxRate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  taxRate: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="Select Tax Rate">Select Tax Rate</Option>
              <Option value="5%">5%</Option>
              <Option value="10%">10%</Option>
              <Option value="15%">15%</Option>
              <Option value="18%">18%</Option>
              <Option value="20%">20%</Option>
            </Select>
          </Field>
        </Div>

        <Toolbar className="mt-3 mb-0">
          <Button onClick={handleSubmit} className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
          </Button>
          <Button onClick={handleReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
      </Card>

      <StatGrid className="mb-4">
        <StatCard label="Total income" value={stats.totalIncome} icon={DollarSign} tone="info" />
        <StatCard label="Total tax" value={stats.totalTax} icon={FileText} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Tax report list ({totalItems})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Search income source…"
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

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tax report generated"
          message="Pick a date range and tax basis above, then submit to generate the report."
          actionLabel="Submit"
          onAction={handleSubmit}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {reports.map((report, i, all) => (
              <Row key={report.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{report.sl}</Cell>
                <Cell width={COLS[1]}>{report.incomeSource}</Cell>
                <Cell width={COLS[2]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{report.totalIncome}</Span>
                </Cell>
                <Cell width={COLS[3]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{report.totalTax}</Span>
                </Cell>
                <Cell width={COLS[4]} align="center">
                  <Button onClick={() => handleViewDetails(report)} accessibilityLabel="View tax details" className="h-11 px-3 rounded-lg items-center justify-center">
                    <Span className="text-sm font-semibold text-blue-600">View</Span>
                  </Button>
                </Cell>
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
            localStorage.setItem('admin_tax_report_pageSize', String(size));
          } catch {}
          setCurrentPage(1);
        }}
        itemLabel="sources"
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
            <P className="text-sm text-slate-700">Tax report settings and preferences will be available here.</P>
          </Div>
          <Div className="px-4 pb-4 flex-row items-center justify-end">
            <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Close</Span>
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
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="flex-row items-center gap-2">
              <UiIcon as={FileText} size={18} className="text-blue-600" />
              Tax Details: {selectedReport?.incomeSource}
            </DialogTitle>
          </DialogHeader>

          <ScrollDiv className="p-4 max-h-[70vh]">
            {detailLoading ? (
              <LoadingState label="Fetching order details…" />
            ) : reportDetail?.orders?.length > 0 ? (
              <DataTable cols={DETAIL_COLS}>
                <THead cols={DETAIL_COLS} labels={DETAIL_LABELS} />
                <TBody>
                  {reportDetail.orders.map((order, i, all) => (
                    <Row key={order.id} last={i === all.length - 1}>
                      <Cell width={DETAIL_COLS[0]}>
                        <Span className="text-sm font-medium text-slate-900">{order.orderId}</Span>
                      </Cell>
                      <Cell width={DETAIL_COLS[1]}>{new Date(order.date).toLocaleDateString('en-IN')}</Cell>
                      <Cell width={DETAIL_COLS[2]} align="right">{order.totalAmount}</Cell>
                      <Cell width={DETAIL_COLS[3]} align="right">
                        <Span className="text-sm font-semibold text-red-600">{order.taxAmount}</Span>
                      </Cell>
                    </Row>
                  ))}
                </TBody>
              </DataTable>
            ) : (
              <EmptyState title="No detailed orders" message="No orders were found for this income source in this period." />
            )}
          </ScrollDiv>

          <Div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex-row items-center justify-between gap-3 flex-wrap">
            <Div className="flex-row items-baseline gap-1">
              <Span className="text-sm text-slate-500">Total Tax:</Span>
              <Span className="text-sm font-bold text-red-600">{selectedReport?.totalTax}</Span>
            </Div>
            <Button onClick={() => setSelectedReport(null)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
