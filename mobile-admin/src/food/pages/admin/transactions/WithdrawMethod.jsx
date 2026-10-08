/* Ported from Frontend/src/modules/Food/pages/admin/transactions/WithdrawMethod.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Plus, Eye, Edit, Settings, ArrowUpDown, Check, Columns } from 'lucide-react-native';
import { emptyWithdrawMethods } from '../../../utils/adminFallbackData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Button, Div, H1, H3, Input, Label, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 relative">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-slate-900">Withdraw Method List</H1>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredMethods.length}</Span>
            </Div>
            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search Method Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
              <Button className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md">
                <UiIcon as={Plus} className="w-4 h-4" />
                Add Method
              </Button>
            </Div>
          </Div>
        </Div>

        {/* Methods Table */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Table
            className="w-full"
            cols={[
              visibleColumns.si && 70,
              visibleColumns.paymentMethodName && 200,
              visibleColumns.methodFields && 320,
              visibleColumns.activeStatus && 130,
              visibleColumns.defaultMethod && 140,
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
                  {visibleColumns.paymentMethodName && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Payment Method Name</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.methodFields && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Method Fields</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.activeStatus && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Active Status</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.defaultMethod && (
                    <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Default Method</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredMethods.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                      No methods found
                    </Td>
                  </Tr>
                ) : (
                  filteredMethods.map((method, index) => (
                    <Tr key={method.sl} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{method.sl}</Span>
                        </Td>
                      )}
                      {visibleColumns.paymentMethodName && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{method.paymentMethodName}</Span>
                        </Td>
                      )}
                      {visibleColumns.methodFields && (
                        <Td className="px-6 py-4">
                          <Div className="space-y-2">
                            {method.methodFields.map((field, fieldIndex) => (
                              <Div key={fieldIndex} className="flex items-start gap-2">
                                <Span className="text-sm text-slate-700">
                                  Name: <Span className="font-medium">{field.name}</Span> Type: <Span className="font-medium">{field.type}</Span> Placeholder:{' '}
                                  <Span className="font-medium">{field.placeholder}</Span>
                                </Span>
                                <Span
                                  className={`px-2 py-0.5 rounded text-xs font-semibold ${field.required ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                                >
                                  {field.required ? 'Required' : 'Optional'}
                                </Span>
                              </Div>
                            ))}
                          </Div>
                        </Td>
                      )}
                      {visibleColumns.activeStatus && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            onClick={() => handleToggleActive(index)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${method.activeStatus ? 'bg-green-600' : 'bg-slate-300'}`}
                          >
                            <Span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.activeStatus ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </Button>
                        </Td>
                      )}
                      {visibleColumns.defaultMethod && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            onClick={() => handleToggleDefault(index)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${method.defaultMethod ? 'bg-blue-600' : 'bg-slate-300'}`}
                          >
                            <Span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.defaultMethod ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </Button>
                        </Td>
                      )}
                      {visibleColumns.actions && (
                        <Td className="px-6 py-4 whitespace-nowrap text-center">
                          <Div className="flex items-center justify-center gap-2">
                            <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                              <UiIcon as={Eye} className="w-4 h-4" />
                            </Button>
                            <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                              <UiIcon as={Edit} className="w-4 h-4" />
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
