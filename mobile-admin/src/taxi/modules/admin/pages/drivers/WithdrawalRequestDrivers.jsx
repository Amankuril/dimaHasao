/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/WithdrawalRequestDrivers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileSearch, QrCode, Search, Banknote } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, TableSkeleton, EmptyState, ErrorState, INPUT } from '../../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = () => `${API_BASE_URL}/admin/wallet/drivers/withdrawals`;
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN');
};
const WithdrawalRequestDrivers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [paginator, setPaginator] = useState(null);
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
      } else {
        setLoadError(data?.message || 'Could not load withdrawal requests');
      }
    } catch (err) {
      setLoadError(err?.message || 'Could not load withdrawal requests');
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
  const COLS = [130, 150, 120, 130, 190, 120, 110, 60];
  const driverCode = (item) =>
    item.driver?.driver_code ||
    item.driver?.referralCode ||
    (item.driver?.mobile
      ? `DRV${String(item.driver.mobile).slice(-4)}${String(item.driver_id || '')
          .slice(-6)
          .toUpperCase()}`.replace(/\W/g, '')
      : 'N/A');
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Banknote}
        title="Withdrawal Request Drivers"
        subtitle="Payout requests awaiting review"
        breadcrumb={[{ label: 'Driver Wallet' }, { label: 'Withdrawal Request Drivers' }]}
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search drivers"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)} className={INPUT}>
            {[10, 25, 50, 100].map((count) => (
              <Option key={count} value={count}>
                Show {count}
              </Option>
            ))}
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load requests" message={loadError} onRetry={() => fetchRows({ nextPage: safePage })} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No withdrawal requests"
          message={searchTerm ? 'No driver matches this search.' : 'Payout requests from drivers will appear here.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Date', 'Name', 'Driver code', 'Mobile', 'Payout', 'Requested', 'Status', '']} />
            <TBody>
              {rows.map((item, i) => (
                <Row key={item.driver_id} last={i === rows.length - 1}>
                  <Cell width={COLS[0]}>{formatDateTime(item.last_request_at)}</Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-semibold text-slate-900">{item.driver?.name || 'Unknown'}</Span>
                  </Cell>
                  <Cell width={COLS[2]}>{driverCode(item)}</Cell>
                  <Cell width={COLS[3]}>{item.driver?.mobile || '—'}</Cell>
                  <Cell width={COLS[4]}>
                    <Div className="gap-1">
                      <P className="text-sm font-semibold text-slate-900">
                        {item.driver?.bankDetails?.accountHolderName || item.driver?.bankDetails?.upiId || item.driver?.bankDetails?.accountNumber || '—'}
                      </P>
                      <Div className="flex-row flex-wrap items-center gap-2">
                        {item.driver?.bankDetails?.accountNumber ? <Span className="text-xs text-slate-500">A/C {item.driver.bankDetails.accountNumber}</Span> : null}
                        {item.driver?.bankDetails?.ifsc ? <Span className="text-xs text-slate-500">{item.driver.bankDetails.ifsc}</Span> : null}
                        {item.driver?.bankDetails?.branchName ? <Span className="text-xs text-slate-500">{item.driver.bankDetails.branchName}</Span> : null}
                        {item.driver?.bankDetails?.qrCodeImage ? <StatusBadge tone="success" label="QR" icon={QrCode} /> : null}
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[5]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">₹ {Number(item.pending_amount || 0).toFixed(2)}</Span>
                  </Cell>
                  <Cell width={COLS[6]}>
                    <StatusBadge status="requested" label="Requested" />
                  </Cell>
                  <Cell width={COLS[7]}>
                    <Button
                      type="button"
                      onClick={() =>
                        navigate(`/admin/drivers/wallet/withdrawals/${item.driver_id}${item.latest_request_id ? `?requestId=${item.latest_request_id}` : ''}`)
                      }
                      accessibilityLabel={`View withdrawal details for ${item.driver?.name || 'driver'}`}
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
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </>
      )}
    </AdminPage>
  );
};
export default WithdrawalRequestDrivers;
