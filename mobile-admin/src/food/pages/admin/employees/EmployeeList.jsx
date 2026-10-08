/* Ported from Frontend/src/modules/Food/pages/admin/employees/EmployeeList.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Users, ChevronDown, Search, Settings, Edit, Trash2, Download, FileText, FileSpreadsheet, Code, Columns } from 'lucide-react-native';
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
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, CheckBox, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COL_WIDTH = { si: 60, name: 190, phone: 150, email: 220, createdAt: 150, actions: 100 };
const COL_LABEL = { si: 'SI', name: 'Employee name', phone: 'Phone', email: 'Email', createdAt: 'Created at', actions: 'Action' };
const initialEmployees = [
  {
    id: 1,
    name: 'Jhon',
    phone: '+81234567890',
    email: 'jhon@gmail.com',
    createdAt: '07 Feb, 2023',
  },
  {
    id: 2,
    name: 'Monali Khan',
    phone: '+81234567891',
    email: 'test@gmail.com',
    createdAt: '22 Aug, 2021',
  },
];
export default function EmployeeList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState(initialEmployees);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    name: true,
    phone: true,
    email: true,
    createdAt: true,
    actions: true,
  });
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase().trim();
    return employees.filter((employee) => employee.name.toLowerCase().includes(query) || employee.email.toLowerCase().includes(query));
  }, [employees, searchQuery]);
  const maskPhone = (phone) => {
    if (!phone) return '';
    if (phone.length > 2) {
      return phone.slice(0, 2) + '*'.repeat(phone.length - 2);
    }
    return phone;
  };
  const maskEmail = (email) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length > 1) {
      const masked = localPart[0] + '*'.repeat(localPart.length - 1);
      return `${masked}@${domain}`;
    }
    return email;
  };
  const handleDelete = async (id) => {
    if (await window.confirmAsync('Are you sure you want to delete this employee?')) {
      setEmployees(employees.filter((employee) => employee.id !== id));
    }
  };
  const handleExport = (format) => {
    if (filteredEmployees.length === 0) {
      alert('No data to export');
      return;
    }
    debugLog(`Exporting as ${format}`, filteredEmployees);
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
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    name: 'Employee Name',
    phone: 'Phone',
    email: 'Email',
    createdAt: 'Created At',
    actions: 'Actions',
  };
  const shownKeys = Object.keys(columnsConfig).filter((key) => visibleColumns[key]);
  const cols = shownKeys.map((key) => COL_WIDTH[key]);
  const labels = shownKeys.map((key) => COL_LABEL[key]);
  const renderCell = (employee, index, key) => {
    if (key === 'si') return String(index + 1);
    if (key === 'name')
      return (
        <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
          {employee.name}
        </Span>
      );
    if (key === 'phone') return maskPhone(employee.phone);
    if (key === 'email') return maskEmail(employee.email);
    if (key === 'createdAt') return employee.createdAt;
    return (
      <Div className="flex-row items-center gap-1">
        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${employee.name}`}>
          <UiIcon as={Edit} size={16} className="text-blue-600" />
        </Button>
        <Button onClick={() => handleDelete(employee.id)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Delete ${employee.name}`}>
          <UiIcon as={Trash2} size={16} className="text-red-600" />
        </Button>
      </Div>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Users}
        title="Employee List"
        subtitle="Admin panel staff and their accounts"
        breadcrumb={[{ label: 'Food' }, { label: 'Employees' }, { label: 'Employee list' }]}
      />

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredEmployees.length} total</Span>}>Employees</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Search by name or email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
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

      {filteredEmployees.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" message="Nothing matches this search. Add an employee to give someone panel access." />
      ) : cols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the employees." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={cols}>
          <THead cols={cols} labels={labels} />
          <TBody>
            {filteredEmployees.map((employee, index, arr) => (
              <Row key={employee.id} last={index === arr.length - 1}>
                {shownKeys.map((key, ci) => (
                  <Cell key={key} width={cols[ci]} align={key === 'actions' ? 'center' : 'left'}>
                    {renderCell(employee, index, key)}
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
