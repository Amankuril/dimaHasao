/* Ported from Frontend/src/modules/Food/pages/admin/SupportTickets.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { supportAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Button, Div, H1, Input, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr } from '../../../components/web';
export default function SupportTickets() {
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 space-y-4">
          <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Div>
              <H1 className="text-lg font-semibold text-slate-900">Support Tickets</H1>
              <P className="text-sm text-slate-500 mt-1">Review and respond to user and restaurant support tickets.</P>
            </Div>
            <Div className="flex gap-2">
              <Select
                value={filters.source}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    source: e.target.value,
                  }))
                }
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <Option value="all">All Sources</Option>
                <Option value="user">User</Option>
                <Option value="restaurant">Restaurant</Option>
              </Select>
              <Select
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <Option value="">All Status</Option>
                <Option value="open">Open</Option>
                <Option value="in-progress">In Progress</Option>
                <Option value="resolved">Resolved</Option>
              </Select>
              <Select
                value={filters.type}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    type: e.target.value,
                  }))
                }
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                disabled={filters.source === 'restaurant'}
              >
                <Option value="">All Types</Option>
                <Option value="order">Order</Option>
                <Option value="restaurant">Restaurant</Option>
                <Option value="other">Other</Option>
              </Select>
            </Div>
          </Div>
          <Div className="flex flex-wrap gap-3 text-xs">
            <Span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              <Span className="w-2 h-2 rounded-full bg-slate-400" />
              Total {stats.total}
            </Span>
            <Span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Span className="w-2 h-2 rounded-full bg-amber-500" />
              Open {stats.open}
            </Span>
            <Span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Span className="w-2 h-2 rounded-full bg-blue-500" />
              In progress {stats.inProgress}
            </Span>
            <Span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Span className="w-2 h-2 rounded-full bg-emerald-500" />
              Resolved {stats.resolved}
            </Span>
          </Div>
        </Div>
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0">
          <Table className="w-full" cols={[90, 100, 180, 180, 140, 220, 140, 120, 280, 90]}>
              <Thead>
                <Tr className="text-left text-xs uppercase text-slate-600">
                  <Th className="px-4 py-3">Id</Th>
                  <Th className="px-4 py-3">Source</Th>
                  <Th className="px-4 py-3">User</Th>
                  <Th className="px-4 py-3">Restaurant</Th>
                  <Th className="px-4 py-3">Type/Category</Th>
                  <Th className="px-4 py-3">Issue</Th>
                  <Th className="px-4 py-3">Status</Th>
                  <Th className="px-4 py-3">Date</Th>
                  <Th className="px-4 py-3">Response</Th>
                  <Th className="px-4 py-3">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y">
                {loading ? (
                  <Tr>
                    <Td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Loading...
                    </Td>
                  </Tr>
                ) : tickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      No tickets
                    </Td>
                  </Tr>
                ) : (
                  tickets.map((t) => (
                    <Tr key={t._id}>
                      <Td className="px-4 py-3">#{String(t._id).slice(-6)}</Td>
                      <Td className="px-4 py-3">
                        <Span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {t.source || 'user'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-3">{getUserLabel(t)}</Td>
                      <Td className="px-4 py-3">{getRestaurantLabel(t)}</Td>
                      <Td className="px-4 py-3">
                        <Span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {t.source === 'restaurant' ? t.category || 'other' : t.type}
                        </Span>
                      </Td>
                      <Td className="px-4 py-3">
                        <Div className="text-sm">{t.issueType}</Div>
                        {t.subject ? <Div className="text-xs text-slate-500 mt-0.5">Subject: {t.subject}</Div> : null}
                        {t.orderRef ? <Div className="text-xs text-slate-500 mt-0.5">Order: {t.orderRef}</Div> : null}
                      </Td>
                      <Td className="px-4 py-3">
                        <Select
                          value={t.status}
                          onChange={(e) =>
                            update(t._id, {
                              status: e.target.value,
                            })
                          }
                          className="border rounded px-2 py-1 text-xs bg-white"
                        >
                          <Option value="open">Open</Option>
                          <Option value="in-progress">In Progress</Option>
                          <Option value="resolved">Resolved</Option>
                        </Select>
                      </Td>
                      <Td className="px-4 py-3 text-sm">{new Date(t.createdAt).toLocaleDateString()}</Td>
                      <Td className="px-4 py-3">
                        <Input
                          className="border rounded px-2 py-1 text-sm w-64"
                          value={editing[t._id] ?? t.adminResponse ?? ''}
                          onChange={(e) =>
                            setEditing((p) => ({
                              ...p,
                              [t._id]: e.target.value,
                            }))
                          }
                          placeholder="Write response"
                        />
                      </Td>
                      <Td className="px-4 py-3">
                        <Button
                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                          onClick={() =>
                            update(t._id, {
                              adminResponse: editing[t._id] ?? t.adminResponse ?? '',
                            })
                          }
                        >
                          Save
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
          </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
