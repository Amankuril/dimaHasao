/* Ported from Frontend/src/modules/Food/pages/admin/transactions/WithdrawMethod.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Plus, Eye, Edit, Settings, Columns, Wallet } from 'lucide-react-native';
import { emptyWithdrawMethods } from '../../../utils/adminFallbackData';
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
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, CheckBox, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
const COL_WIDTH = {
  si: 60,
  paymentMethodName: 190,
  methodFields: 300,
  activeStatus: 120,
  defaultMethod: 130,
  actions: 100,
};
const COL_LABEL = {
  si: 'SI',
  paymentMethodName: 'Payment method',
  methodFields: 'Method fields',
  activeStatus: 'Active',
  defaultMethod: 'Default',
  actions: 'Action',
};
export default function WithdrawMethod() {
  const [searchQuery, setSearchQuery] = useState('');
  const [methods, setMethods] = useState(emptyWithdrawMethods);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    paymentMethodName: true,
    methodFields: true,
    activeStatus: true,
    defaultMethod: true,
    actions: true,
  });
  const filteredMethods = useMemo(() => {
    if (!searchQuery.trim()) {
      return methods;
    }
    const query = searchQuery.toLowerCase().trim();
    return methods.filter((method) => method.paymentMethodName?.toLowerCase().includes(query));
  }, [methods, searchQuery]);
  const handleToggleActive = (index) => {
    const updated = [...methods];
    updated[index].activeStatus = !updated[index].activeStatus;
    setMethods(updated);
  };
  const handleToggleDefault = (index) => {
    const updated = [...methods];
    // Only one can be default, so set all to false first
    updated.forEach((m) => (m.defaultMethod = false));
    updated[index].defaultMethod = !updated[index].defaultMethod;
    setMethods(updated);
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
      paymentMethodName: true,
      methodFields: true,
      activeStatus: true,
      defaultMethod: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    paymentMethodName: 'Payment Method Name',
    methodFields: 'Method Fields',
    activeStatus: 'Active Status',
    defaultMethod: 'Default Method',
    actions: 'Actions',
  };
  const shownKeys = Object.keys(columnsConfig).filter((key) => visibleColumns[key]);
  const cols = shownKeys.map((key) => COL_WIDTH[key]);
  const labels = shownKeys.map((key) => COL_LABEL[key]);
  const renderCell = (method, index, key) => {
    if (key === 'si') return String(method.sl);
    if (key === 'paymentMethodName') return method.paymentMethodName;
    if (key === 'methodFields') {
      return (
        <Div className="gap-1.5">
          {method.methodFields.map((field, fieldIndex) => (
            <Div key={fieldIndex} className="gap-1">
              <Span className="text-sm text-slate-700" numberOfLines={3}>
                Name: {field.name} · Type: {field.type} · Placeholder: {field.placeholder}
              </Span>
              <StatusBadge tone={field.required ? 'danger' : 'info'} label={field.required ? 'Required' : 'Optional'} />
            </Div>
          ))}
        </Div>
      );
    }
    if (key === 'activeStatus') {
      return (
        <Button onClick={() => handleToggleActive(index)} accessibilityLabel={`Toggle ${method.paymentMethodName} active`} className="w-11 h-11 justify-center">
          <Div className={`w-11 h-6 rounded-full justify-center ${method.activeStatus ? 'bg-green-600' : 'bg-slate-300'}`}>
            <Div className={`w-4 h-4 rounded-full bg-white ${method.activeStatus ? 'ml-6' : 'ml-1'}`} />
          </Div>
        </Button>
      );
    }
    if (key === 'defaultMethod') {
      return (
        <Button onClick={() => handleToggleDefault(index)} accessibilityLabel={`Make ${method.paymentMethodName} default`} className="w-11 h-11 justify-center">
          <Div className={`w-11 h-6 rounded-full justify-center ${method.defaultMethod ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <Div className={`w-4 h-4 rounded-full bg-white ${method.defaultMethod ? 'ml-6' : 'ml-1'}`} />
          </Div>
        </Button>
      );
    }
    return (
      <Div className="flex-row items-center gap-1">
        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`View ${method.paymentMethodName}`}>
          <UiIcon as={Eye} size={16} className="text-blue-600" />
        </Button>
        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${method.paymentMethodName}`}>
          <UiIcon as={Edit} size={16} className="text-blue-600" />
        </Button>
      </Div>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Withdraw Method List"
        subtitle="How restaurant partners can be paid out"
        breadcrumb={[{ label: 'Food' }, { label: 'Transactions' }, { label: 'Withdraw method' }]}
        actions={
          <Button className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add method</Span>
          </Button>
        }
      />

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredMethods.length} total</Span>}>Methods</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Search method name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
          </Div>
          <Button onClick={() => setIsSettingsOpen(true)} className={BTN_SECONDARY} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
          </Button>
        </Toolbar>
      </Card>

      {filteredMethods.length === 0 ? (
        <EmptyState icon={Wallet} title="No methods found" message="Add a withdraw method so partners can request payouts." />
      ) : cols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the methods." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={cols}>
          <THead cols={cols} labels={labels} />
          <TBody>
            {filteredMethods.map((method, index, arr) => (
              <Row key={method.sl} last={index === arr.length - 1}>
                {shownKeys.map((key, ci) => (
                  <Cell key={key} width={cols[ci]} align={key === 'actions' ? 'center' : 'left'}>
                    {renderCell(method, index, key)}
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
