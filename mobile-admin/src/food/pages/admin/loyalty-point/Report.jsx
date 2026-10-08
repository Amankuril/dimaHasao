/* Ported from Frontend/src/modules/Food/pages/admin/loyalty-point/Report.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Filter, Settings, TrendingUp, Wallet, Scale, FileText, FileSpreadsheet, Code, Columns } from 'lucide-react-native';
import { emptyLoyaltyPointTransactions } from '../../../utils/adminFallbackData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import {
  exportLoyaltyPointsToCSV,
  exportLoyaltyPointsToExcel,
  exportLoyaltyPointsToPDF,
  exportLoyaltyPointsToJSON,
} from '../../../components/admin/loyalty-point/loyaltyPointExportUtils';
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
import { Button, Div, Input, Option, Select, Span, CheckBox, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const COL_WIDTH = {
  si: 60,
  transactionId: 150,
  customer: 180,
  credit: 110,
  debit: 110,
  balance: 110,
  transactionType: 160,
  reference: 160,
  createdAt: 150,
};
export default function Report() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState(emptyLoyaltyPointTransactions);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    customer: 'All',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    transactionId: true,
    customer: true,
    credit: true,
    debit: true,
    balance: true,
    transactionType: true,
    reference: true,
    createdAt: true,
  });
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (transaction) =>
          transaction.transactionId.toLowerCase().includes(query) ||
          transaction.customer.toLowerCase().includes(query) ||
          transaction.reference.includes(query),
      );
    }

    // Apply date filters
    if (filters.startDate) {
      result = result.filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        const startDate = new Date(filters.startDate);
        return transactionDate >= startDate;
      });
    }
    if (filters.endDate) {
      result = result.filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        return transactionDate <= endDate;
      });
    }

    // Apply customer filter
    if (filters.customer && filters.customer !== 'All') {
      result = result.filter((transaction) => transaction.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }
    return result;
  }, [transactions, searchQuery, filters]);
  const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);
  const balance = totalCredit - totalDebit;
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      customer: 'All',
    });
  };
  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportLoyaltyPointsToCSV(filteredTransactions);
        break;
      case 'excel':
        exportLoyaltyPointsToExcel(filteredTransactions);
        break;
      case 'pdf':
        exportLoyaltyPointsToPDF(filteredTransactions);
        break;
      case 'json':
        exportLoyaltyPointsToJSON(filteredTransactions);
        break;
      default:
        break;
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      transactionId: true,
      customer: true,
      credit: true,
      debit: true,
      balance: true,
      transactionType: true,
      reference: true,
      createdAt: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    transactionId: 'Transaction ID',
    customer: 'Customer',
    credit: 'Credit',
    debit: 'Debit',
    balance: 'Balance',
    transactionType: 'Transaction Type',
    reference: 'Reference',
    createdAt: 'Created At',
  };
  const activeFiltersCount = (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0) + (filters.customer !== 'All' ? 1 : 0);
  const shownKeys = Object.keys(columnsConfig).filter((key) => visibleColumns[key]);
  const cols = shownKeys.map((key) => COL_WIDTH[key]);
  const labels = shownKeys.map((key) => ({ si: 'SI', transactionId: 'Transaction id', customer: 'Customer', credit: 'Credit', debit: 'Debit', balance: 'Balance', transactionType: 'Transaction type', reference: 'Reference', createdAt: 'Created at' })[key]);
  const valueFor = (transaction, key) => {
    if (key === 'si') return String(transaction.sl);
    if (key === 'credit' || key === 'debit' || key === 'balance') return String(transaction[key]);
    return transaction[key];
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={TrendingUp}
        title="Customer Loyalty Point Report"
        subtitle="Loyalty points earned and spent across the district"
        breadcrumb={[{ label: 'Food' }, { label: 'Loyalty point' }, { label: 'Report' }]}
      />

      <Card className="mb-4">
        <SectionTitle action={activeFiltersCount > 0 ? <Span className="text-xs font-semibold text-blue-600">{activeFiltersCount} active</Span> : null}>Filter options</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Start date">
            <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="End date">
            <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Customer">
            <Select value={filters.customer} onChange={(e) => handleFilterChange('customer', e.target.value)} className={INPUT}>
              <Option value="All">All</Option>
              <Option value="jane-doe">Jane Doe</Option>
              <Option value="john-doe">John Doe</Option>
            </Select>
          </Field>
        </Div>
        <Toolbar className="mt-3 mb-0">
          <Button onClick={() => {}} className={BTN_PRIMARY}>
            <UiIcon as={Filter} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Filter</Span>
          </Button>
          <Button onClick={handleResetFilters} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
      </Card>

      <StatGrid className="mb-4">
        <StatCard label="Debit" value={totalDebit.toFixed(3)} icon={TrendingUp} tone="success" />
        <StatCard label="Credit" value={totalCredit.toFixed(3)} icon={Wallet} tone="danger" />
        <StatCard label="Balance" value={String(balance)} icon={Scale} tone="info" />
      </StatGrid>

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredTransactions.length} total</Span>}>Transactions</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Ex: search by transaction id" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
          </Div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <UiIcon as={FileText} size={16} className="mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <UiIcon as={FileSpreadsheet} size={16} className="mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <UiIcon as={FileText} size={16} className="mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <UiIcon as={Code} size={16} className="mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsSettingsOpen(true)} className={BTN_SECONDARY} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
          </Button>
        </Toolbar>
      </Card>

      {filteredTransactions.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No transactions found" message="Nothing matches these filters. Loyalty point activity appears here." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : cols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the transactions." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={cols}>
          <THead cols={cols} labels={labels} />
          <TBody>
            {filteredTransactions.map((transaction, i, arr) => (
              <Row key={transaction.sl} last={i === arr.length - 1}>
                {shownKeys.map((key, ci) => (
                  <Cell key={key} width={cols[ci]} align={key === 'credit' || key === 'debit' || key === 'balance' ? 'right' : 'left'}>
                    {valueFor(transaction, key)}
                  </Cell>
                ))}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Table Settings</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4 gap-3">
            <Div className="gap-2">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible columns</Span>
              {Object.entries(columnsConfig).map(([key, label]) => (
                <Div key={key} className="flex-row items-center gap-3 h-11" onClick={() => toggleColumn(key)}>
                  <CheckBox checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-5 h-5" />
                  <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                </Div>
              ))}
            </Div>
            <Div className="flex-row flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button onClick={resetColumns} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
