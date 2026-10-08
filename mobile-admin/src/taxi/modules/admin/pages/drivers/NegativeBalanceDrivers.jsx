/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/NegativeBalanceDrivers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileSearch, Search, WalletMinimal } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, TableSkeleton, EmptyState, ErrorState, INPUT } from '../../../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = () => `${API_BASE_URL}/admin/wallet/drivers/negative-balance`;
const NegativeBalanceDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [paginator, setPaginator] = useState(null);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const fetchRows = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
    setLoading(true);
    setLoadError('');
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });
      if (String(nextSearch || '').trim()) {
        params.set('search', String(nextSearch).trim());
      }
      const res = await fetch(`${BASE()}?${params.toString()}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.data?.results || []);
        setPaginator(data.data?.paginator || null);
        setSummary(
          data.data?.summary || {
            total_outstanding: 0,
          },
        );
      } else {
        setLoadError(data?.message || 'Could not load negative balance drivers');
      }
    } catch (err) {
      setLoadError(err?.message || 'Could not load negative balance drivers');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRows({
      nextPage: 1,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
    setPage(1);
  }, [itemsPerPage]);
  useEffect(() => {
    const id = setTimeout(() => {
      fetchRows({
        nextPage: 1,
        nextLimit: itemsPerPage,
        nextSearch: searchTerm,
      });
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [searchTerm]);
  useEffect(() => {
    fetchRows({
      nextPage: page,
      nextLimit: itemsPerPage,
      nextSearch: searchTerm,
    });
  }, [page]);
  const totalPages = useMemo(() => Math.max(1, Number(paginator?.last_page || 1)), [paginator]);
  const safePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages]);
  const totalEntries = useMemo(() => Number(paginator?.total || 0), [paginator]);
  const COLS = [150, 120, 140, 170, 130, 120, 120, 60];
  const driverCode = (item) =>
    item.driver_code ||
    item.referralCode ||
    (item.mobile
      ? `DRV${String(item.mobile).slice(-4)}${String(item._id || '')
          .slice(-6)
          .toUpperCase()}`.replace(/\W/g, '')
      : 'N/A');
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={WalletMinimal}
        title="Negative Balance Drivers"
        subtitle={`Total outstanding ₹ ${Number(summary.total_outstanding || 0).toFixed(2)}`}
        breadcrumb={[{ label: 'Driver Wallet' }, { label: 'Negative Balance Drivers' }]}
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search drivers"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value) || 10)} className={INPUT}>
            {[10, 25, 50, 100].map((n) => (
              <Option key={n} value={n}>
                Show {n}
              </Option>
            ))}
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load drivers" message={loadError} onRetry={() => fetchRows({ nextPage: safePage })} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No negative balances"
          message={searchTerm ? 'No driver matches this search.' : 'No driver is currently carrying a negative wallet balance.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Name', 'Driver code', 'Service location', 'Email', 'Mobile', 'Transport', 'Approved', '']} />
            <TBody>
              {rows.map((item, i) => (
                <Row key={item._id} last={i === rows.length - 1}>
                  <Cell width={COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900">{item.name || 'Unknown'}</Span>
                  </Cell>
                  <Cell width={COLS[1]}>{driverCode(item)}</Cell>
                  <Cell width={COLS[2]}>{item.service_location_name || '—'}</Cell>
                  <Cell width={COLS[3]}>{item.email || '—'}</Cell>
                  <Cell width={COLS[4]}>{item.mobile || '—'}</Cell>
                  <Cell width={COLS[5]}>{item.transport_type || '—'}</Cell>
                  <Cell width={COLS[6]}>
                    <StatusBadge status={item.approve ? 'approved' : 'pending'} label={item.approve ? 'Approved' : 'Pending'} />
                  </Cell>
                  <Cell width={COLS[7]}>
                    <Button
                      type="button"
                      onClick={() => navigate(`/taxi/admin/drivers/${item._id}`)}
                      accessibilityLabel={`View ${item.name || 'driver'}`}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                    >
                      <UiIcon as={Eye} size={16} className="text-slate-600" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={safePage}
            pages={totalPages}
            total={totalEntries}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}
    </AdminPage>
  );
};
export default NegativeBalanceDrivers;
