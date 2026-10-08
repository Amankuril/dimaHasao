/* Ported from Frontend/src/modules/Food/pages/admin/wallet/Bonus.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Wallet, Edit, Trash2 } from 'lucide-react-native';
import { emptyWalletBonuses } from '../../../utils/adminFallbackData';
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
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, HScroll, Input, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS = [60, 170, 210, 130, 150, 150, 110, 100];
export default function Bonus() {
  const { tablet } = useLayoutWidth();
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
      label: 'Spanish - español(ES)',
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
  const activeLabel = activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Wallet Bonus Setup"
        subtitle="Bonuses customers earn when they top up their wallet"
        breadcrumb={[{ label: 'Food' }, { label: 'Customer wallet' }, { label: 'Bonus' }]}
      />

      <Card className="mb-4">
        <HScroll className="mb-4" contentClassName="flex-row items-center gap-1 border-b border-slate-200">
          {languageTabs.map((tab) => (
            <Button key={tab.key} onClick={() => setActiveLanguage(tab.key)} className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? 'border-blue-600' : 'border-transparent'}`}>
              <Span className={`text-sm font-semibold ${activeLanguage === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
            </Button>
          ))}
        </HScroll>

        <Form onSubmit={handleSubmit}>
          <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
            <Field label={`Bonus title (${activeLabel})`}>
              <Input type="text" value={formData.bonusTitle} onChange={(e) => handleInputChange('bonusTitle', e.target.value)} placeholder="Ex: EID Dhamaka" className={INPUT} />
            </Field>
            <Field label={`Short description (${activeLabel})`}>
              <Input
                type="text"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Ex: EID Dhamaka"
                className={INPUT}
              />
            </Field>
            <Field label="Bonus type">
              <Select value={formData.bonusType} onChange={(e) => handleInputChange('bonusType', e.target.value)} className={INPUT}>
                <Option value="Percentage (%)">Percentage (%)</Option>
                <Option value="Amount ($)">Amount ($)</Option>
              </Select>
            </Field>
            <Field label={`Bonus amount (${formData.bonusType === 'Percentage (%)' ? '%' : '$'})`} hint="The bonus credited on a qualifying top-up">
              <Input type="number" value={formData.bonusAmount} onChange={(e) => handleInputChange('bonusAmount', e.target.value)} placeholder="Ex: 100" className={INPUT} />
            </Field>
            <Field label="Minimum add money amount ($)" hint="Top-ups below this earn no bonus">
              <Input type="number" value={formData.minAddMoney} onChange={(e) => handleInputChange('minAddMoney', e.target.value)} placeholder="Ex: 10" className={INPUT} />
            </Field>
            <Field label="Maximum bonus ($)" hint="Caps the bonus per top-up">
              <Input type="number" value={formData.maxBonus} onChange={(e) => handleInputChange('maxBonus', e.target.value)} placeholder="Ex: 1000" className={INPUT} />
            </Field>
            <Field label="Start date">
              <Input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} className={INPUT} />
            </Field>
            <Field label="Expire date">
              <Input type="date" value={formData.expireDate} onChange={(e) => handleInputChange('expireDate', e.target.value)} className={INPUT} />
            </Field>
          </Div>

          <Div className="flex-row flex-wrap items-center justify-end gap-2 mt-4">
            <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="submit" className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
            </Button>
          </Div>
        </Form>
      </Card>

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredBonuses.length} total</Span>}>Bonus list</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Ex: search by bonus title" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
          </Div>
        </Toolbar>
      </Card>

      {filteredBonuses.length === 0 ? (
        <EmptyState icon={Wallet} title="No wallet bonuses yet" message="Create one with the form above and it will show up here." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['SI', 'Bonus title', 'Bonus info', 'Amount', 'Started on', 'Expires on', 'Status', 'Action']} />
          <TBody>
            {filteredBonuses.map((bonus, i, arr) => (
              <Row key={bonus.sl} last={i === arr.length - 1}>
                <Cell width={COLS[0]}>{String(bonus.sl)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {bonus.bonusTitle}
                  </Span>
                </Cell>
                <Cell width={COLS[2]}>{bonus.bonusInfo}</Cell>
                <Cell width={COLS[3]} align="right">
                  <Span className="text-sm font-medium text-slate-900">{bonus.bonusAmount}</Span>
                </Cell>
                <Cell width={COLS[4]}>{bonus.startedOn}</Cell>
                <Cell width={COLS[5]}>{bonus.expiresOn}</Cell>
                <Cell width={COLS[6]}>
                  <Button onClick={() => handleToggleStatus(bonus.sl)} accessibilityLabel={`Toggle ${bonus.bonusTitle}`} className="w-11 h-11 justify-center">
                    <Div className={`w-11 h-6 rounded-full justify-center ${bonus.status ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <Div className={`w-4 h-4 rounded-full bg-white ${bonus.status ? 'ml-6' : 'ml-1'}`} />
                    </Div>
                  </Button>
                </Cell>
                <Cell width={COLS[7]} align="center">
                  <Div className="flex-row items-center gap-1">
                    <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${bonus.bonusTitle}`}>
                      <UiIcon as={Edit} size={16} className="text-blue-600" />
                    </Button>
                    <Button onClick={() => handleDelete(bonus.sl)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Delete ${bonus.bonusTitle}`}>
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
