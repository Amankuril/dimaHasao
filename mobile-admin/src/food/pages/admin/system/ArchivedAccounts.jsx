/* Ported from Frontend/src/modules/Food/pages/admin/system/ArchivedAccounts.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Search, User, Smartphone, Mail, Calendar, Trash2, Shield, UserX, Store, Truck, RefreshCcw } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
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
  TableSkeleton,
  EmptyState,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Img, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
const COLS = [210, 190, 140, 160, 170];
const LABELS = ['Account information', 'Contact details', 'Role & status', 'Deletion activity', 'Re-registration'];
const ROLE_TABS = [
  { key: 'all', label: 'All entities' },
  { key: 'user', label: 'Users' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'delivery', label: 'Delivery' },
];
export default function ArchivedAccounts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const filteredAccounts = useMemo(() => {
    let result = [...archivedAccounts];

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((acc) => acc.type === roleFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((acc) => acc.name?.toLowerCase().includes(query) || (acc.email || '').toLowerCase().includes(query) || acc.phone?.includes(query));
    }
    return result;
  }, [archivedAccounts, searchQuery, roleFilter]);
  const fetchArchivedAccounts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getArchivedAccounts();
      const data = response?.data?.data;
      const list = Array.isArray(data?.accounts) ? data.accounts : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setArchivedAccounts(list);
    } catch (error) {
      console.error('Error fetching archived accounts:', error);
      toast.error('Failed to load archived accounts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchArchivedAccounts();
  }, []);
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const ROLE_ICON = { user: User, restaurant: Store, delivery: Truck };

  // Clean phone number for display (remove _deleted_ suffix)
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.split('_')[0];
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UserX}
        title="Archived Accounts"
        subtitle="View and track deleted users, restaurants and delivery partners"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Archived accounts' }]}
        actions={
          <Button onClick={fetchArchivedAccounts} disabled={loading} className={BTN_SECONDARY} accessibilityLabel="Refresh archived accounts">
            <UiIcon as={RefreshCcw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder="Search by name, phone or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
        <Div className="flex-row flex-wrap gap-2 mt-3">
          {ROLE_TABS.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`flex-row items-center justify-center h-11 px-4 rounded-lg border ${roleFilter === tab.key ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={roleFilter === tab.key ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{tab.label}</Span>
            </Button>
          ))}
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No archived accounts found"
          message={searchQuery ? "Try adjusting your search or filters to find what you're looking for." : 'When accounts are deleted they appear here for archival tracking.'}
          actionLabel={searchQuery ? 'Clear search' : 'Refresh'}
          onAction={searchQuery ? () => setSearchQuery('') : fetchArchivedAccounts}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredAccounts.map((account, i) => (
              <Row key={account.id} last={i === filteredAccounts.length - 1}>
                <Cell width={COLS[0]}>
                  <Div className="flex-row items-center gap-2.5">
                    <Div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden shrink-0">
                      {account.profileImage ? (
                        <Img src={account.profileImage} alt={account.name} className="w-10 h-10 object-cover" />
                      ) : (
                        <Span className="text-xs font-semibold text-slate-500">{getInitials(account.name)}</Span>
                      )}
                    </Div>
                    <Div className="flex-1 min-w-0 gap-1">
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                        {account.name}
                      </Text>
                      <Div className="flex-row items-center gap-1">
                        <UiIcon as={ROLE_ICON[account.type] || User} size={11} className="text-slate-400" />
                        <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                          ID {String(account.id || '').slice(-8)}
                        </Text>
                      </Div>
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[1]}>
                  <Div className="gap-1.5">
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Smartphone} size={12} className="text-slate-400" />
                      <Text style={tw`text-xs text-slate-700 flex-1`} numberOfLines={1}>
                        {formatPhone(account.phone)}
                      </Text>
                    </Div>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Mail} size={12} className="text-slate-400" />
                      <Text style={tw`text-xs text-slate-700 flex-1`} numberOfLines={1}>
                        {account.email || 'N/A'}
                      </Text>
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div className="gap-1.5 items-start">
                    <StatusBadge tone="info" label={account.role || account.type || '—'} />
                    <StatusBadge status={account.status} tone="danger" label={account.status || 'Deleted'} />
                  </Div>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="gap-1.5">
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Calendar} size={12} className="text-slate-400" />
                      <Text style={tw`text-xs font-semibold text-slate-700 flex-1`} numberOfLines={2}>
                        {formatDate(account.deletedAt)}
                      </Text>
                    </Div>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Trash2} size={11} className="text-slate-400" />
                      <Text style={tw`text-xs text-slate-500`}>Soft deleted</Text>
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[4]}>
                  {account.newAccountCreatedAt ? (
                    <Div className="gap-1.5 items-start">
                      <Div className="flex-row items-center gap-1.5">
                        <UiIcon as={Calendar} size={12} className="text-slate-400" />
                        <Text style={tw`text-xs font-semibold text-slate-700 flex-1`} numberOfLines={2}>
                          {formatDate(account.newAccountCreatedAt)}
                        </Text>
                      </Div>
                      <StatusBadge tone="success" label="New account created" />
                    </Div>
                  ) : (
                    <StatusBadge tone="neutral" label="No re-registration" />
                  )}
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <Card className="mt-3 gap-1">
        <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Total archived records: {filteredAccounts.length}</Text>
        <Text style={tw`text-xs text-slate-500`}>
          {"Only records with 'deleted' status are shown here. Restored records are automatically moved to active lists."}
        </Text>
      </Card>
    </AdminPage>
  );
}
