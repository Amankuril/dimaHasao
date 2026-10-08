/* Ported from Frontend/src/modules/Food/pages/admin/employees/EmployeeList.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  Users,
  ChevronDown,
  Search,
  Settings,
  Edit,
  Trash2,
  ArrowUpDown,
  Download,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
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
import { Button, Div, H1, H2, H3, Input, Label, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={Users} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Employee List</H1>
          </Div>
        </Div>

        {/* Employee List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Div className="flex items-center gap-3">
              <UiIcon as={Users} className="w-5 h-5 text-slate-600" />
              <H2 className="text-xl font-bold text-slate-900">Employee List</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredEmployees.length}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search by name or email"
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
          <Table
            className="w-full"
            cols={[
              visibleColumns.si && 70,
              visibleColumns.name && 200,
              visibleColumns.phone && 150,
              visibleColumns.email && 220,
              visibleColumns.createdAt && 150,
              visibleColumns.actions && 100,
            ].filter(Boolean)}
          >
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  {visibleColumns.si && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SI</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.name && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Employee Name</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.phone && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Phone</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.email && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Email</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.createdAt && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Created At</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                      No employees found
                    </Td>
                  </Tr>
                ) : (
                  filteredEmployees.map((employee, index) => (
                    <Tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.name && (
                        <Td className="px-6 py-4">
                          <Span className="text-sm font-medium text-slate-900">{employee.name}</Span>
                        </Td>
                      )}
                      {visibleColumns.phone && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{maskPhone(employee.phone)}</Span>
                        </Td>
                      )}
                      {visibleColumns.email && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{maskEmail(employee.email)}</Span>
                        </Td>
                      )}
                      {visibleColumns.createdAt && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{employee.createdAt}</Span>
                        </Td>
                      )}
                      {visibleColumns.actions && (
                        <Td className="px-6 py-4 whitespace-nowrap text-center">
                          <Div className="flex items-center justify-center gap-2">
                            <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                              <UiIcon as={Edit} className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDelete(employee.id)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
                              <UiIcon as={Trash2} className="w-4 h-4" />
                            </Button>
                          </Div>
                        </Td>
                      )}
                    </Tr>
                  ))
                )}
              </Tbody>
          </Table>
        </Div>
      </Div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <Div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-sm text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
