/* Ported from Frontend/src/modules/Food/pages/admin/employees/EmployeeRole.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import {
  UserCog,
  ChevronDown,
  ArrowUpDown,
  Trash2,
  Search,
  Download,
  Edit,
  Settings,
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
import { Button, Div, Form, H1, H2, H3, Input, Label, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const modulePermissions = [
  // Column 1
  {
    id: 'collectCash',
    label: 'Collect cash',
  },
  {
    id: 'category',
    label: 'Category',
  },
  {
    id: 'deliveryman',
    label: 'Deliveryman',
  },
  {
    id: 'pushNotification',
    label: 'Push notification',
  },
  {
    id: 'businessSettings',
    label: 'Business settings',
  },
  {
    id: 'contactMessages',
    label: 'Contact messages',
  },
  {
    id: 'chat',
    label: 'Chat',
  },
  // Column 2
  {
    id: 'addon',
    label: 'Addon',
  },
  {
    id: 'coupon',
    label: 'Coupon',
  },
  {
    id: 'deliverymenEarning',
    label: 'Deliverymen earning provide',
  },
  {
    id: 'order',
    label: 'Order',
  },
  {
    id: 'restaurantWithdraws',
    label: 'Restaurant withdraws',
  },
  {
    id: 'disbursement',
    label: 'Disbursement',
  },
  // Column 3
  {
    id: 'banner',
    label: 'Banner',
  },
  {
    id: 'customersSection',
    label: 'Customers section',
  },
  {
    id: 'employee',
    label: 'Employee',
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
  },
  {
    id: 'posSystem',
    label: 'Pos system',
  },
  {
    id: 'advertisement',
    label: 'Advertisement',
  },
  // Column 4
  {
    id: 'campaign',
    label: 'Campaign',
  },
  {
    id: 'customerWallet',
    label: 'Customer Wallet',
  },
  {
    id: 'food',
    label: 'Food',
  },
  {
    id: 'report',
    label: 'Report',
  },
  {
    id: 'zone',
    label: 'Zone',
  },
  {
    id: 'cashback',
    label: 'Cashback',
  },
];
const initialEmployeeRoles = [
  {
    id: 1,
    roleName: 'Manager',
    modules: [
      'Addon',
      'Banner',
      'Campaign',
      'Category',
      'Coupon',
      'Custom Role',
      'CustomerList',
      'Deliveryman',
      'Employee',
      'Food',
      'Notification',
      'Order',
      'Report',
      'Settings',
      'Pos',
      'Contact Message',
    ],
    createdAt: '07 Feb 2023',
  },
  {
    id: 2,
    roleName: 'Customer Care Executive',
    modules: ['CustomerList', 'Deliveryman', 'Order', 'Restaurant'],
    createdAt: '22 Aug 2021',
  },
];
export default function EmployeeRole() {
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState(initialEmployeeRoles);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    roleName: true,
    modules: true,
    createdAt: true,
    actions: true,
  });
  const languageTabs = [
    {
      key: 'default',
      label: 'Default',
    },
    {
      key: 'en',
      label: 'English(EN)',
    },
    {
      key: 'bn',
      label: 'Bengali - বাংলা(BN)',
    },
    {
      key: 'ar',
      label: 'Arabic - العربية(AR)',
    },
    {
      key: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const handlePermissionChange = (permissionId, checked) => {
    setPermissions((prev) => ({
      ...prev,
      [permissionId]: checked,
    }));
  };
  const handleSelectAll = (checked) => {
    const allPermissions = {};
    modulePermissions.forEach((permission) => {
      allPermissions[permission.id] = checked;
    });
    setPermissions(allPermissions);
  };
  const allSelected = useMemo(() => {
    return modulePermissions.every((permission) => permissions[permission.id]);
  }, [permissions]);
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', {
      roleName,
      permissions,
    });
    alert('Employee role created successfully!');
  };
  const handleReset = () => {
    setRoleName('');
    setPermissions({});
  };
  const handleDelete = async (id) => {
    if (await window.confirmAsync('Are you sure you want to delete this role?')) {
      setRoles(roles.filter((role) => role.id !== id));
    }
  };
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const query = searchQuery.toLowerCase().trim();
    return roles.filter((role) => role.roleName.toLowerCase().includes(query));
  }, [roles, searchQuery]);
  const handleExport = (format) => {
    if (filteredRoles.length === 0) {
      alert('No data to export');
      return;
    }
    debugLog(`Exporting as ${format}`, filteredRoles);
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
      roleName: true,
      modules: true,
      createdAt: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    roleName: 'Role Name',
    modules: 'Modules',
    createdAt: 'Created At',
    actions: 'Actions',
  };

  // Split permissions into 4 columns
  const column1 = modulePermissions.slice(0, 7);
  const column2 = modulePermissions.slice(7, 13);
  const column3 = modulePermissions.slice(13, 19);
  const column4 = modulePermissions.slice(19, 26);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={UserCog} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Employee Role</H1>
          </Div>

          {/* Language Tabs */}
          <Div className="flex items-center gap-2 border-b border-slate-200">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </Div>
        </Div>

        <Form onSubmit={handleSubmit}>
          {/* Role Name Section */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">
                Role Name ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label})
              </Label>
              <Input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Role name example"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </Div>
          </Div>

          {/* Module Permission Section */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <Div className="mb-4">
              <Label className="block text-sm font-semibold text-slate-700 mb-4">Module Permission :</Label>
              <Div className="flex items-center mb-6">
                <Input
                  type="checkbox"
                  nativeID="selectAll"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <Label className="ml-2 text-sm font-semibold text-slate-700">Select All</Label>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Column 1 */}
              <Div className="space-y-3">
                {column1.map((permission) => (
                  <Div key={permission.id} className="flex items-center">
                    <Input
                      type="checkbox"
                      nativeID={permission.id}
                      checked={permissions[permission.id] || false}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <Label className="ml-2 text-sm text-slate-700">{permission.label}</Label>
                  </Div>
                ))}
              </Div>

              {/* Column 2 */}
              <Div className="space-y-3">
                {column2.map((permission) => (
                  <Div key={permission.id} className="flex items-center">
                    <Input
                      type="checkbox"
                      nativeID={permission.id}
                      checked={permissions[permission.id] || false}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <Label className="ml-2 text-sm text-slate-700">{permission.label}</Label>
                  </Div>
                ))}
              </Div>

              {/* Column 3 */}
              <Div className="space-y-3">
                {column3.map((permission) => (
                  <Div key={permission.id} className="flex items-center">
                    <Input
                      type="checkbox"
                      nativeID={permission.id}
                      checked={permissions[permission.id] || false}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <Label className="ml-2 text-sm text-slate-700">{permission.label}</Label>
                  </Div>
                ))}
              </Div>

              {/* Column 4 */}
              <Div className="space-y-3">
                {column4.map((permission) => (
                  <Div key={permission.id} className="flex items-center">
                    <Input
                      type="checkbox"
                      nativeID={permission.id}
                      checked={permissions[permission.id] || false}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <Label className="ml-2 text-sm text-slate-700">{permission.label}</Label>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>

          {/* Action Buttons */}
          <Div className="flex items-center justify-end gap-4 mb-6">
            <Button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Reset
            </Button>
            <Button type="submit" className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
              Submit
            </Button>
          </Div>
        </Form>

        {/* Employee Role Table */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Div className="flex items-center gap-3">
              <H2 className="text-xl font-bold text-slate-900">Employee Role Table</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredRoles.length}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search by Name"
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
              visibleColumns.roleName && 200,
              visibleColumns.modules && 280,
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
                  {visibleColumns.roleName && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Role Name</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.modules && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Modules</Span>
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
                {filteredRoles.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                      No roles found
                    </Td>
                  </Tr>
                ) : (
                  filteredRoles.map((role, index) => (
                    <Tr key={role.id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.roleName && (
                        <Td className="px-6 py-4">
                          <Span className="text-sm font-medium text-slate-900">{role.roleName}</Span>
                        </Td>
                      )}
                      {visibleColumns.modules && (
                        <Td className="px-6 py-4">
                          <Div className="flex flex-wrap gap-1">
                            {role.modules.map((module, idx) => (
                              <Span key={idx} className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                                {module}
                              </Span>
                            ))}
                          </Div>
                        </Td>
                      )}
                      {visibleColumns.createdAt && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{role.createdAt}</Span>
                        </Td>
                      )}
                      {visibleColumns.actions && (
                        <Td className="px-6 py-4 whitespace-nowrap text-center">
                          <Div className="flex items-center justify-center gap-2">
                            <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                              <UiIcon as={Edit} className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDelete(role.id)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
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
