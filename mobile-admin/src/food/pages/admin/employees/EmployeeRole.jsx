/* Ported from Frontend/src/modules/Food/pages/admin/employees/EmployeeRole.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { UserCog, ChevronDown, Trash2, Search, Download, Edit, Settings, FileText, FileSpreadsheet, Code, Columns } from 'lucide-react-native';
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
import { Button, CheckBox, Div, Form, HScroll, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COL_WIDTH = { si: 60, roleName: 190, modules: 280, createdAt: 150, actions: 100 };
const COL_LABEL = { si: 'SI', roleName: 'Role name', modules: 'Modules', createdAt: 'Created at', actions: 'Action' };
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
  const { columns } = useLayoutWidth();
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
      label: 'Spanish - español(ES)',
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
  const activeLabel = activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label;
  const shownKeys = Object.keys(columnsConfig).filter((key) => visibleColumns[key]);
  const cols = shownKeys.map((key) => COL_WIDTH[key]);
  const labels = shownKeys.map((key) => COL_LABEL[key]);
  const renderCell = (role, index, key) => {
    if (key === 'si') return String(index + 1);
    if (key === 'roleName')
      return (
        <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
          {role.roleName}
        </Span>
      );
    if (key === 'modules')
      return (
        <Div className="flex-row flex-wrap gap-1">
          {role.modules.map((module, idx) => (
            <StatusBadge key={idx} tone="neutral" label={module} />
          ))}
        </Div>
      );
    if (key === 'createdAt') return role.createdAt;
    return (
      <Div className="flex-row items-center gap-1">
        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${role.roleName}`}>
          <UiIcon as={Edit} size={16} className="text-blue-600" />
        </Button>
        <Button onClick={() => handleDelete(role.id)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Delete ${role.roleName}`}>
          <UiIcon as={Trash2} size={16} className="text-red-600" />
        </Button>
      </Div>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UserCog}
        title="Employee Role"
        subtitle="Define which modules a role can reach"
        breadcrumb={[{ label: 'Food' }, { label: 'Employees' }, { label: 'Employee role' }]}
      />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <HScroll className="mb-4" contentClassName="flex-row items-center gap-1 border-b border-slate-200">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? 'border-blue-600' : 'border-transparent'}`}
              >
                <Span className={`text-sm font-semibold ${activeLanguage === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
              </Button>
            ))}
          </HScroll>

          <Field label={`Role name (${activeLabel})`}>
            <Input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Role name example" className={INPUT} />
          </Field>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Module permission</SectionTitle>
          <Div className="flex-row items-center gap-3 h-11 mb-1" onClick={() => handleSelectAll(!allSelected)}>
            <CheckBox checked={allSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="w-5 h-5" />
            <Span className="text-sm font-semibold text-slate-700 flex-1">Select all</Span>
          </Div>
          <Div className={`grid grid-cols-${columns} gap-x-3`}>
            {modulePermissions.map((permission) => (
              <Div key={permission.id} className="flex-row items-center gap-3 h-11" onClick={() => handlePermissionChange(permission.id, !permissions[permission.id])}>
                <CheckBox
                  checked={permissions[permission.id] || false}
                  onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                  className="w-5 h-5"
                />
                <Span className="text-sm text-slate-700 flex-1" numberOfLines={2}>
                  {permission.label}
                </Span>
              </Div>
            ))}
          </Div>
        </Card>

        <Div className="flex-row flex-wrap items-center justify-end gap-2 mb-4">
          <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button type="submit" className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
          </Button>
        </Div>
      </Form>

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredRoles.length} total</Span>}>Employee role table</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Search by name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
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

      {filteredRoles.length === 0 ? (
        <EmptyState icon={UserCog} title="No roles found" message="Nothing matches this search. Create a role with the form above." />
      ) : cols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the roles." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={cols}>
          <THead cols={cols} labels={labels} />
          <TBody>
            {filteredRoles.map((role, index, arr) => (
              <Row key={role.id} last={index === arr.length - 1}>
                {shownKeys.map((key, ci) => (
                  <Cell key={key} width={cols[ci]} align={key === 'actions' ? 'center' : 'left'}>
                    {renderCell(role, index, key)}
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
