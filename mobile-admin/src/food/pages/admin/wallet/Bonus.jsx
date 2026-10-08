/* Ported from Frontend/src/modules/Food/pages/admin/wallet/Bonus.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Wallet, Info, Calendar, Edit, Trash2 } from 'lucide-react-native';
import { emptyWalletBonuses } from '../../../utils/adminFallbackData';
import {
  Button,
  Div,
  Form,
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
} from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function Bonus() {
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [bonuses, setBonuses] = useState(emptyWalletBonuses);
  const [formData, setFormData] = useState({
    bonusTitle: '',
    shortDescription: '',
    bonusType: 'Percentage (%)',
    bonusAmount: '',
    minAddMoney: '',
    maxBonus: '',
    startDate: '',
    expireDate: '',
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
      label: 'Arabic - العربية (AR)',
    },
    {
      key: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const filteredBonuses = useMemo(() => {
    if (!searchQuery.trim()) {
      return bonuses;
    }
    const query = searchQuery.toLowerCase().trim();
    return bonuses.filter((bonus) => bonus.bonusTitle.toLowerCase().includes(query));
  }, [bonuses, searchQuery]);
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    alert('Bonus setup saved successfully!');
  };
  const handleReset = () => {
    setFormData({
      bonusTitle: '',
      shortDescription: '',
      bonusType: 'Percentage (%)',
      bonusAmount: '',
      minAddMoney: '',
      maxBonus: '',
      startDate: '',
      expireDate: '',
    });
  };
  const handleToggleStatus = (sl) => {
    setBonuses(
      bonuses.map((bonus) =>
        bonus.sl === sl
          ? {
              ...bonus,
              status: !bonus.status,
            }
          : bonus,
      ),
    );
  };
  const handleDelete = async (sl) => {
    if (await window.confirmAsync('Are you sure you want to delete this bonus?')) {
      setBonuses(bonuses.filter((bonus) => bonus.sl !== sl));
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Bonus Setup Form */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={Wallet} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Wallet Bonus Setup</H1>
          </Div>

          {/* Language Tabs */}
          <Div className="flex items-center gap-2 border-b border-slate-200 mb-6">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </Div>

          <Form onSubmit={handleSubmit}>
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bonus Title ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label})
                </Label>
                <Input
                  type="text"
                  value={formData.bonusTitle}
                  onChange={(e) => handleInputChange('bonusTitle', e.target.value)}
                  placeholder="Ex: EID Dhamaka"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Short Description ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label})
                </Label>
                <Input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                  placeholder="Ex: EID Dhamaka"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Bonus Type</Label>
                <Select
                  value={formData.bonusType}
                  onChange={(e) => handleInputChange('bonusType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <Option value="Percentage (%)">Percentage (%)</Option>
                  <Option value="Amount ($)">Amount ($)</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Div className="flex items-center gap-2">
                    <Span>Bonus Amount ({formData.bonusType === 'Percentage (%)' ? '%' : '$'})</Span>
                    <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
                  </Div>
                </Label>
                <Input
                  type="number"
                  value={formData.bonusAmount}
                  onChange={(e) => handleInputChange('bonusAmount', e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Div className="flex items-center gap-2">
                    <Span>Minimum Add Money Amount ($)</Span>
                    <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
                  </Div>
                </Label>
                <Input
                  type="number"
                  value={formData.minAddMoney}
                  onChange={(e) => handleInputChange('minAddMoney', e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Div className="flex items-center gap-2">
                    <Span>Maximum Bonus ($)</Span>
                    <UiIcon as={Info} className="w-4 h-4 text-slate-400" />
                  </Div>
                </Label>
                <Input
                  type="number"
                  value={formData.maxBonus}
                  onChange={(e) => handleInputChange('maxBonus', e.target.value)}
                  placeholder="Ex: 1000"
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
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Expire Date</Label>
                <Div className="relative">
                  <Input
                    type="date"
                    value={formData.expireDate}
                    onChange={(e) => handleInputChange('expireDate', e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
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

        {/* Bonus List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Bonus List</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredBonuses.length}</Span>
            </Div>

            <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <Input
                type="text"
                placeholder="Ex: Search by bonus title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>

          {/* Table */}
          <Table className="w-full" cols={[70, 180, 220, 130, 150, 150, 120, 100]}>
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Bonus Title</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Bonus Info</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Bonus Amount</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Started On</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Expires On</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredBonuses.map((bonus) => (
                  <Tr key={bonus.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{bonus.sl}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span className="text-sm font-medium text-slate-900">{bonus.bonusTitle}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span className="text-sm text-slate-700">{bonus.bonusInfo}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-900">{bonus.bonusAmount}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{bonus.startedOn}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{bonus.expiresOn}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => handleToggleStatus(bonus.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${bonus.status ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <Span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bonus.status ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </Button>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2">
                        <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Edit} className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(bonus.sl)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
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
