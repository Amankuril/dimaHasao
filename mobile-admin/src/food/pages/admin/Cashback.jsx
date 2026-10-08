/* Ported from Frontend/src/modules/Food/pages/admin/Cashback.jsx. */
import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, RefreshCw } from 'lucide-react-native';
import { emptyCashbacks } from '../../utils/adminFallbackData';
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
} from '../../../admin/ui';
import { Button, Div, Form, HScroll, Input, Option, Select, Span, Icon as UiIcon } from '../../../components/web';
import { alert, window } from '../../../lib/webShim';
const debugLog = (...args) => {};

const COLS = [56, 170, 140, 110, 190, 110, 120, 104];
const LABELS = ['SI', 'Name', 'Cashback Type', 'Amount', 'Duration', 'Total Used', 'Status', 'Action'];

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
  const { tablet } = useLayoutWidth();
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
      label: 'Spanish - español(ES)',
    },
  ];
  const activeLanguageLabel = activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label;
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={RefreshCw}
        title="Create Cashback Offer"
        subtitle="Set up a cashback offer and review the ones already live"
        breadcrumb={[{ label: 'Food' }, { label: 'Promotions' }, { label: 'Cashback' }]}
      />

      {/* Create Cashback Offer */}
      <Card className="mb-4">
        {/* Language Tabs */}
        <HScroll className="mb-4 border-b border-slate-200" contentClassName="flex-row items-center">
          {languageTabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveLanguage(tab.key)}
              className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? 'border-blue-600' : 'border-transparent'}`}
            >
              <Span className={`text-sm font-semibold ${activeLanguage === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
            </Button>
          ))}
        </HScroll>

        <Form onSubmit={handleSubmit}>
          <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3 mb-4`}>
            <Field label={`Title (${activeLanguageLabel})`}>
              <Input type="text" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} className={INPUT} />
            </Field>

            <Field label="Select Customer">
              <Select value={formData.customer} onChange={(e) => handleInputChange('customer', e.target.value)} className={INPUT}>
                <Option value="">Select customer</Option>
              </Select>
            </Field>

            <Field label="Cashback Type" required>
              <Select value={formData.cashbackType} onChange={(e) => handleInputChange('cashbackType', e.target.value)} className={INPUT}>
                <Option value="Percentage (%)">Percentage (%)</Option>
                <Option value="Amount ($)">Amount ($)</Option>
              </Select>
            </Field>

            <Field label={`Cashback Amount (${formData.cashbackType === 'Percentage (%)' ? '%' : '$'})`} required>
              <Input
                type="number"
                value={formData.cashbackAmount}
                onChange={(e) => handleInputChange('cashbackAmount', e.target.value)}
                placeholder="Ex: 100"
                className={INPUT}
              />
            </Field>

            <Field label="Minimum Purchase ($)">
              <Input
                type="number"
                value={formData.minPurchase}
                onChange={(e) => handleInputChange('minPurchase', e.target.value)}
                placeholder="Ex: 100"
                className={INPUT}
              />
            </Field>

            <Field label="Maximum Discount ($)">
              <Input
                type="number"
                value={formData.maxDiscount}
                onChange={(e) => handleInputChange('maxDiscount', e.target.value)}
                placeholder="Ex: 100"
                className={INPUT}
              />
            </Field>

            <Field label="Start Date">
              <Input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} className={INPUT} />
            </Field>

            <Field label="End Date">
              <Input type="date" value={formData.endDate} onChange={(e) => handleInputChange('endDate', e.target.value)} className={INPUT} />
            </Field>

            <Field label="Limit For Same User">
              <Input
                type="number"
                value={formData.limitForSameUser}
                onChange={(e) => handleInputChange('limitForSameUser', e.target.value)}
                placeholder="Ex: 5"
                className={INPUT}
              />
            </Field>
          </Div>

          <Div className={`flex-row items-center gap-2 ${tablet ? 'justify-end' : ''}`}>
            <Button type="button" onClick={handleReset} className={`${BTN_SECONDARY} ${tablet ? '' : 'flex-1'}`}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="submit" className={`${BTN_PRIMARY} ${tablet ? '' : 'flex-1'}`}>
              <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
            </Button>
          </Div>
        </Form>
      </Card>

      {/* Cashback List */}
      <Card className="mb-4">
        <SectionTitle>{`Cashback List (${filteredCashbacks.length})`}</SectionTitle>
        <Toolbar className="mb-0">
          <Select value={cashbackType} onChange={(e) => setCashbackType(e.target.value)} className={`${INPUT} min-w-[160px]`}>
            <Option value="all">All CashBacks</Option>
            <Option value="Percentage">Percentage</Option>
            <Option value="Amount">Amount</Option>
          </Select>

          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Ex: Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {filteredCashbacks.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No cashback offers"
          message={
            searchQuery || cashbackType !== 'all' ? 'No offers match your search or filter.' : 'Create a cashback offer above and it will be listed here.'
          }
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredCashbacks.map((cashback, i, all) => (
              <Row key={cashback.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{String(cashback.sl)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-semibold text-slate-900">{cashback.name}</Span>
                </Cell>
                <Cell width={COLS[2]}>{cashback.cashbackType}</Cell>
                <Cell width={COLS[3]}>
                  <Span className="text-sm font-semibold text-slate-900">{String(cashback.amount)}</Span>
                </Cell>
                <Cell width={COLS[4]}>{cashback.duration}</Cell>
                <Cell width={COLS[5]}>{String(cashback.totalUsed)}</Cell>
                <Cell width={COLS[6]}>
                  <Button
                    onClick={() => handleToggleStatus(cashback.sl)}
                    className="h-11 justify-center"
                    accessibilityLabel={`Toggle status for ${cashback.name}`}
                  >
                    <StatusBadge status={cashback.status ? 'active' : 'inactive'} />
                  </Button>
                </Cell>
                <Cell width={COLS[7]}>
                  <Div className="flex-row items-center gap-1">
                    <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${cashback.name}`}>
                      <UiIcon as={Edit} size={16} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(cashback.sl)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Delete ${cashback.name}`}
                    >
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
}
