/* Ported from Frontend/src/modules/Food/pages/admin/SupportTickets.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Save } from 'lucide-react-native';
import { supportAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../components/web';
const COLS = [90, 100, 170, 170, 130, 210, 140, 120, 240, 110];
export default function SupportTickets() {
  const { tablet } = useLayoutWidth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    source: 'all',
  });
  const [editing, setEditing] = useState({});
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in-progress').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    return {
      total,
      open,
      inProgress,
      resolved,
    };
  }, [tickets]);
  const getUserLabel = (ticket) => {
    if (ticket.source === 'restaurant') return 'Restaurant Panel';
    const user = ticket.user || {};
    const name = user.name || ticket.userName || '';
    const phone = user.phone || ticket.userPhone || '';
    if (name && phone) return `${name} (${phone})`;
    if (name) return name;
    if (phone) return phone;
    const id = ticket.userId ? String(ticket.userId).slice(-6) : '';
    return id ? `#${id}` : '-';
  };
  const getRestaurantLabel = (ticket) => {
    const restaurant = ticket.restaurant || {};
    const name = restaurant.name || ticket.restaurantName || '';
    const city = restaurant.city || '';
    if (name && city) return `${name} (${city})`;
    if (name) return name;
    return '-';
  };
  const load = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.getSupportTicketsAdmin(filters);
      const list = res?.data?.data?.tickets || res?.data?.tickets || [];
      setTickets(list);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [filters.status, filters.type, filters.source]);
  const update = async (id, patch) => {
    const ticket = tickets.find((t) => String(t._id) === String(id));
    try {
      await supportAPI.updateSupportTicketAdmin(id, {
        ...patch,
        source: ticket?.source || 'user',
      });
      toast.success('Updated');
      setTickets((prev) =>
        prev.map((t) =>
          String(t._id) === String(id)
            ? {
                ...t,
                ...patch,
              }
            : t,
        ),
      );
    } catch {
      toast.error('Failed to update');
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LifeBuoy}
        title="Support Tickets"
        subtitle="Review and respond to user and restaurant support tickets"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Support tickets' }]}
      />

      <StatGrid className="mb-4">
        <StatCard label="Total tickets" value={String(stats.total)} tone="neutral" />
        <StatCard label="Open" value={String(stats.open)} tone="warning" />
        <StatCard label="In progress" value={String(stats.inProgress)} tone="info" />
        <StatCard label="Resolved" value={String(stats.resolved)} tone="success" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Source">
            <Select
              value={filters.source}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  source: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="all">All Sources</Option>
              <Option value="user">User</Option>
              <Option value="restaurant">Restaurant</Option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  status: e.target.value,
                }))
              }
              className={INPUT}
              placeholder="All Status"
            >
              <Option value="">All Status</Option>
              <Option value="open">Open</Option>
              <Option value="in-progress">In Progress</Option>
              <Option value="resolved">Resolved</Option>
            </Select>
          </Field>
          <Field label="Type" hint={filters.source === 'restaurant' ? 'Not used for restaurant tickets' : undefined}>
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  type: e.target.value,
                }))
              }
              className={INPUT}
              disabled={filters.source === 'restaurant'}
              placeholder="All Types"
            >
              <Option value="">All Types</Option>
              <Option value="order">Order</Option>
              <Option value="restaurant">Restaurant</Option>
              <Option value="other">Other</Option>
            </Select>
          </Field>
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets" message="Nothing matches these filters. Tickets raised from the apps show up here." actionLabel="Reload" onAction={load} />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Id', 'Source', 'User', 'Restaurant', 'Type', 'Issue', 'Status', 'Date', 'Response', 'Action']} />
          <TBody>
            {tickets.map((t, i, arr) => (
              <Row key={t._id} last={i === arr.length - 1}>
                <Cell width={COLS[0]}>{`#${String(t._id).slice(-6)}`}</Cell>
                <Cell width={COLS[1]}>
                  <StatusBadge tone="neutral" label={t.source || 'user'} />
                </Cell>
                <Cell width={COLS[2]}>{getUserLabel(t)}</Cell>
                <Cell width={COLS[3]}>{getRestaurantLabel(t)}</Cell>
                <Cell width={COLS[4]}>
                  <StatusBadge tone="neutral" label={t.source === 'restaurant' ? t.category || 'other' : t.type} />
                </Cell>
                <Cell width={COLS[5]}>
                  <Div className="gap-0.5">
                    <Span className="text-sm text-slate-700" numberOfLines={2}>
                      {t.issueType}
                    </Span>
                    {t.subject ? (
                      <Span className="text-xs text-slate-500" numberOfLines={2}>
                        Subject: {t.subject}
                      </Span>
                    ) : null}
                    {t.orderRef ? (
                      <Span className="text-xs text-slate-500" numberOfLines={1}>
                        Order: {t.orderRef}
                      </Span>
                    ) : null}
                  </Div>
                </Cell>
                <Cell width={COLS[6]}>
                  <Select
                    value={t.status}
                    onChange={(e) =>
                      update(t._id, {
                        status: e.target.value,
                      })
                    }
                    className="h-11 px-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  >
                    <Option value="open">Open</Option>
                    <Option value="in-progress">In Progress</Option>
                    <Option value="resolved">Resolved</Option>
                  </Select>
                </Cell>
                <Cell width={COLS[7]}>{new Date(t.createdAt).toLocaleDateString()}</Cell>
                <Cell width={COLS[8]}>
                  <Input
                    className={INPUT}
                    value={editing[t._id] ?? t.adminResponse ?? ''}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        [t._id]: e.target.value,
                      }))
                    }
                    placeholder="Write response"
                  />
                </Cell>
                <Cell width={COLS[9]}>
                  <Button
                    className={BTN_PRIMARY}
                    accessibilityLabel="Save response"
                    onClick={() =>
                      update(t._id, {
                        adminResponse: editing[t._id] ?? t.adminResponse ?? '',
                      })
                    }
                  >
                    <UiIcon as={Save} size={14} className="text-white" />
                    <Span className={BTN_TEXT_PRIMARY}>Save</Span>
                  </Button>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
}
