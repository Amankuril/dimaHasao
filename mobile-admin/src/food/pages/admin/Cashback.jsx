/* Ported from Frontend/src/modules/Food/pages/admin/Cashback.jsx. */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Edit, Trash2, Calendar, RefreshCw } from 'lucide-react-native';
import { emptyCashbacks } from '../../utils/adminFallbackData';
import {
  Button,
  Div,
  Form,
  HScroll,
  H1,
  H2,
  Input,
  Label,
  Option,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../components/web';
import { alert, window } from '../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function Cashback() {
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [cashbackType, setCashbackType] = useState('all');
  const [cashbacks, setCashbacks] = useState(emptyCashbacks);
  const [formData, setFormData] = useState({
    title: 'Eid Dhamaka',
    customer: '',
    cashbackType: 'Percentage (%)',
    cashbackAmount: '',
    minPurchase: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    limitForSameUser: '',
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
      label: 'Bengali - বাংলা (BN)',
    },
    {
      key: 'ar',
      label: 'Arabic - العربية (AR)',
    },
    {
      key: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const filteredCashbacks = useMemo(() => {
    let result = [...cashbacks];
    if (cashbackType !== 'all') {
      if (cashbackType === 'Percentage') {
        result = result.filter((cb) => cb.cashbackType === 'Percentage');
      } else if (cashbackType === 'Amount') {
        result = result.filter((cb) => cb.cashbackType === 'Amount');
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((cb) => cb.name.toLowerCase().includes(query));
    }
    return result;
  }, [cashbacks, searchQuery, cashbackType]);
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    alert('Cashback offer created successfully!');
  };
  const handleReset = () => {
    setFormData({
      title: 'Eid Dhamaka',
      customer: '',
      cashbackType: 'Percentage (%)',
      cashbackAmount: '',
      minPurchase: '',
      maxDiscount: '',
      startDate: '',
      endDate: '',
      limitForSameUser: '',
    });
  };
  const handleToggleStatus = (sl) => {
    setCashbacks(
      cashbacks.map((cb) =>
        cb.sl === sl
          ? {
              ...cb,
              status: !cb.status,
            }
          : cb,
      ),
    );
  };
  const handleDelete = async (sl) => {
    if (await window.confirmAsync('Are you sure you want to delete this cashback offer?')) {
      setCashbacks(cashbacks.filter((cb) => cb.sl !== sl));
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Create Cashback Offer Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <UiIcon as={RefreshCw} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Create Cashback Offer</H1>
          </Div>

          {/* Language Tabs */}
          <HScroll className="flex items-center gap-2 border-b border-slate-200 mb-6">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </HScroll>

          <Form onSubmit={handleSubmit}>
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Title ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label})
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Customer</Label>
                <Select
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <Option value="">Select customer</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Cashback Type <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.cashbackType}
                  onChange={(e) => handleInputChange('cashbackType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <Option value="Percentage (%)">Percentage (%)</Option>
                  <Option value="Amount ($)">Amount ($)</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Cashback Amount ({formData.cashbackType === 'Percentage (%)' ? '%' : '$'}) <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="number"
                  value={formData.cashbackAmount}
                  onChange={(e) => handleInputChange('cashbackAmount', e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Minimum Purchase ($)</Label>
                <Input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => handleInputChange('minPurchase', e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Maximum Discount ($)</Label>
                <Input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => handleInputChange('maxDiscount', e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</Label>
                <Div className="relative">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">End Date</Label>
                <Div className="relative">
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Limit For Same User</Label>
                <Input
                  type="number"
                  value={formData.limitForSameUser}
                  onChange={(e) => handleInputChange('limitForSameUser', e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>
            </Div>

            <Div className="flex items-center justify-end gap-4 mt-6">
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
        </Div>

        {/* Cashback List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Cashback List</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredCashbacks.length}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Select
                value={cashbackType}
                onChange={(e) => setCashbackType(e.target.value)}
                className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <Option value="all">All CashBacks</Option>
                <Option value="Percentage">Percentage</Option>
                <Option value="Amount">Amount</Option>
              </Select>

              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: Search by title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
            </Div>
          </Div>

          {/* Table */}
          <Table cols={[60, 180, 130, 100, 200, 100, 100, 96]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Name</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">CashBack Type</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Duration</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Used</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredCashbacks.map((cashback) => (
                  <Tr key={cashback.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{cashback.sl}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span className="text-sm font-medium text-slate-900">{cashback.name}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{cashback.cashbackType}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-900">{cashback.amount}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{cashback.duration}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{cashback.totalUsed}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => handleToggleStatus(cashback.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${cashback.status ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <Div
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cashback.status ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </Button>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2">
                        <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Edit} className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(cashback.sl)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
                          <UiIcon as={Trash2} className="w-4 h-4" />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
