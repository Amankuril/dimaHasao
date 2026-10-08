/* Ported from Frontend/src/modules/Food/pages/admin/SubscribedMailList.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, Mail } from 'lucide-react-native';
import { emptySubscribedEmails } from '../../utils/adminFallbackData';
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
} from '../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../components/web';
const COLS = [70, 240, 170];
export default function SubscribedMailList() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState(emptySubscribedEmails);
  const [filters, setFilters] = useState({
    subscriptionDate: '',
    sortBy: '',
    chooseFirst: '',
  });
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      return emails;
    }
    const query = searchQuery.toLowerCase().trim();
    return emails.filter((email) => email.email.toLowerCase().includes(query));
  }, [emails, searchQuery]);
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Mail}
        title="Subscribed Mail List"
        subtitle="Everyone subscribed to the newsletter"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Subscribed mail' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Subscription date">
            <Input type="date" value={filters.subscriptionDate} onChange={(e) => handleFilterChange('subscriptionDate', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Sort by">
            <Select value={filters.sortBy} onChange={(e) => handleFilterChange('sortBy', e.target.value)} className={INPUT} placeholder="Select mail sorting order">
              <Option value="">Select Mail Sorting Order</Option>
              <Option value="email-asc">Email (A-Z)</Option>
              <Option value="email-desc">Email (Z-A)</Option>
              <Option value="date-asc">Date (Oldest First)</Option>
              <Option value="date-desc">Date (Newest First)</Option>
            </Select>
          </Field>
          <Field label="Choose first" hint="Limit how many rows are returned">
            <Input type="number" value={filters.chooseFirst} onChange={(e) => handleFilterChange('chooseFirst', e.target.value)} placeholder="Ex: 100" className={INPUT} />
          </Field>
        </Div>
        <Toolbar className="mt-3 mb-0">
          <Button className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Filter</Span>
          </Button>
        </Toolbar>
      </Card>

      <Card className="mb-3">
        <SectionTitle action={<Span className="text-xs font-semibold text-slate-500">{filteredEmails.length} total</Span>}>Mail list</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input type="text" placeholder="Ex: search email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${INPUT} flex-1`} />
          </Div>
          <Button className={BTN_SECONDARY}>
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export</Span>
          </Button>
        </Toolbar>
      </Card>

      {filteredEmails.length === 0 ? (
        <EmptyState icon={Mail} title="No subscribers yet" message="Addresses appear here as customers subscribe to the newsletter." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['SI', 'Email', 'Created at']} />
          <TBody>
            {filteredEmails.map((email, i, arr) => (
              <Row key={email.sl} last={i === arr.length - 1}>
                <Cell width={COLS[0]}>{String(email.sl)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {email.email || 'NA'}
                  </Span>
                </Cell>
                <Cell width={COLS[2]}>{email.createdAt}</Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
}
