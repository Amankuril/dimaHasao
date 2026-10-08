/* Ported from Frontend/src/modules/Food/pages/admin/reports/ExpenseReport.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Filter, FileText, Settings, FileSpreadsheet, Code } from 'lucide-react-native';
import { emptyExpenseReports } from '../../../utils/adminFallbackData';
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
import { A, Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';

const COLS = [60, 110, 150, 170, 180, 130];
const LABELS = ['SI', 'Order Id', 'Date & Time', 'Expense Type', 'Customer Name', 'Expense Amount'];

export default function ExpenseReport() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expenses, setExpenses] = useState(emptyExpenseReports);
  const [filters, setFilters] = useState({
    zone: 'All Zones',
    restaurant: 'All restaurants',
    customer: 'All customers',
    type: 'All Type',
    time: 'All Time',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (expense) =>
          expense.orderId.toLowerCase().includes(query) ||
          expense.expenseType.toLowerCase().includes(query) ||
          expense.customerName.toLowerCase().includes(query),
      );
    }
    if (filters.zone !== 'All Zones') {
      // Filter by zone if needed
    }
    if (filters.restaurant !== 'All restaurants') {
      // Filter by restaurant if needed
    }
    if (filters.customer !== 'All customers') {
      result = result.filter((e) => e.customerName === filters.customer);
    }
    if (filters.type !== 'All Type') {
      result = result.filter((e) => e.expenseType === filters.type);
    }
    return result;
  }, [expenses, searchQuery, filters]);
  const totalExpenses = filteredExpenses.length;
  const handleExport = (format) => {
    if (filteredExpenses.length === 0) {
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
        key: 'dateTime',
        label: 'Date & Time',
      },
      {
        key: 'expenseType',
        label: 'Expense Type',
      },
      {
        key: 'customerName',
        label: 'Customer Name',
      },
      {
        key: 'expenseAmount',
        label: 'Expense Amount',
      },
    ];
    switch (format) {
      case 'csv':
        exportReportsToCSV(filteredExpenses, headers, 'expense_report');
        break;
      case 'excel':
        exportReportsToExcel(filteredExpenses, headers, 'expense_report');
        break;
      case 'pdf':
        exportReportsToPDF(filteredExpenses, headers, 'expense_report', 'Expense Report');
        break;
      case 'json':
        exportReportsToJSON(filteredExpenses, 'expense_report');
        break;
    }
  };
  const handleFilterApply = () => {
    // Filters are already applied via useMemo
  };
  const handleResetFilters = () => {
    setFilters({
      zone: 'All Zones',
      restaurant: 'All restaurants',
      customer: 'All customers',
      type: 'All Type',
      time: 'All Time',
    });
  };
  const activeFiltersCount =
    (filters.zone !== 'All Zones' ? 1 : 0) +
    (filters.restaurant !== 'All restaurants' ? 1 : 0) +
    (filters.customer !== 'All customers' ? 1 : 0) +
    (filters.type !== 'All Type' ? 1 : 0) +
    (filters.time !== 'All Time' ? 1 : 0);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={FileText}
        title="Expense Report"
        subtitle="Discounts, cashback and delivery expenses per order"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Expense report' }]}
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
              <Option value="Zone 1">Zone 1</Option>
              <Option value="Zone 2">Zone 2</Option>
              <Option value="Zone 3">Zone 3</Option>
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
              <Option value="Restaurant 1">Restaurant 1</Option>
              <Option value="Restaurant 2">Restaurant 2</Option>
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
              <Option value="Customer 1">Customer 1</Option>
              <Option value="Customer 2">Customer 2</Option>
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
              <Option value="All Type">All Type</Option>
              <Option value="Discount On Product">Discount On Product</Option>
              <Option value="Cashback">Cashback</Option>
              <Option value="Free Delivery">Free Delivery</Option>
              <Option value="Add Fund Bonus">Add Fund Bonus</Option>
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
          <Button onClick={handleResetFilters} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Expense lists ({totalExpenses})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Search by Order ID or type"
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

      {filteredExpenses.length === 0 ? (
        <EmptyState title="No data found" message="No expenses match your search or filters." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredExpenses.map((expense, i, all) => (
              <Row key={expense.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{expense.sl}</Cell>
                <Cell width={COLS[1]}>
                  <A href={`#order-${expense.orderId}`} className="text-sm font-semibold text-blue-600">
                    {expense.orderId}
                  </A>
                </Cell>
                <Cell width={COLS[2]}>{expense.dateTime}</Cell>
                <Cell width={COLS[3]}>{expense.expenseType}</Cell>
                <Cell width={COLS[4]}>
                  <Div>
                    <Span className="text-sm font-medium text-slate-900">{expense.customerName}</Span>
                    <Span className="text-xs text-slate-500">{expense.customerPhone}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[5]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{expense.expenseAmount}</Span>
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
            <P className="text-sm text-slate-700">Expense report settings and preferences will be available here.</P>
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
