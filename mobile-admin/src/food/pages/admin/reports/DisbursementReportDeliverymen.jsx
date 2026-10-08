/* Ported from Frontend/src/modules/Food/pages/admin/reports/DisbursementReportDeliverymen.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Filter, Truck, Eye, Settings, FileText, FileSpreadsheet, Code, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { emptyDisbursementReportDeliverymen, emptyDisbursementStats } from '../../../utils/adminFallbackData';
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
const COLS = [60, 110, 180, 140, 140, 150, 130, 90];
const LABELS = ['SI', 'Id', 'Delivery Man Info', 'Created At', 'Disburse Amount', 'Payment Method', 'Status', 'Action'];
export default function DisbursementReportDeliverymen() {
  const { tablet } = useLayoutWidth();
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Truck}
        title="Delivery Man Disbursement Report"
        subtitle="Payouts owed to and settled with delivery riders"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Deliveryman disbursement' }]}
      />

      <StatGrid className="mb-4">
        <StatCard label="Pending disbursements" value={emptyDisbursementStats.pending} icon={Clock} tone="warning" />
        <StatCard label="Completed disbursements" value={emptyDisbursementStats.completed} icon={CheckCircle2} tone="success" />
        <StatCard label="Canceled transactions" value={emptyDisbursementStats.canceled} icon={XCircle} tone="danger" />
      </StatGrid>

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

          <Field label="Delivery Man">
            <Select
              value={filters.deliveryMan}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  deliveryMan: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All delivery mans">All delivery mans</Option>
              <Option value="Kathryn Murphy">Kathryn Murphy</Option>
              <Option value="Leslie Alexander">Leslie Alexander</Option>
              <Option value="Jhon Doe">Jhon Doe</Option>
            </Select>
          </Field>

          <Field label="Payment method">
            <Select
              value={filters.paymentMethod}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All Payment Method">All Payment Method</Option>
              <Option value="6cash">6cash</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
            </Select>
          </Field>

          <Field label="Status">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="All status">All status</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Canceled">Canceled</Option>
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
        <SectionTitle>Total disbursements ({totalDisbursements})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              placeholder="Search by id"
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

      {filteredDisbursements.length === 0 ? (
        <EmptyState title="No data found" message="No disbursements match your search or filters." actionLabel="Reset filters" onAction={handleResetFilters} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredDisbursements.map((disbursement, i, all) => (
              <Row key={disbursement.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{disbursement.sl}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900">{disbursement.id}</Span>
                </Cell>
                <Cell width={COLS[2]}>{disbursement.deliveryManName}</Cell>
                <Cell width={COLS[3]}>{disbursement.createdAt}</Cell>
                <Cell width={COLS[4]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{disbursement.disburseAmount}</Span>
                </Cell>
                <Cell width={COLS[5]}>{disbursement.paymentMethod}</Cell>
                <Cell width={COLS[6]}>
                  <StatusBadge status={disbursement.status} />
                </Cell>
                <Cell width={COLS[7]} align="center">
                  <Button accessibilityLabel="View disbursement" className="w-11 h-11 rounded-lg items-center justify-center">
                    <UiIcon as={Eye} size={16} className="text-blue-600" />
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
            <P className="text-sm text-slate-700">Deliveryman disbursement report settings and preferences will be available here.</P>
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
