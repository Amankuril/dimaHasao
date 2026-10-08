/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverRatings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { Eye, Search, Star } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, TableSkeleton, EmptyState, ErrorState, INPUT } from '../../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../../components/web';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';

const COLS = [150, 130, 140, 120, 60];

const DriverRatings = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const fetchRatings = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE_URL}/admin/driver-ratings`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.data?.results || [];
          setDrivers(
            list.map((d) => ({
              id: d._id,
              name: d.name || 'Unknown',
              transport: d.transport_type || 'Taxi',
              mobile: d.mobile || '',
              rating: d.rating || 0,
            })),
          );
        } else {
          setLoadError(data?.message || 'Could not load driver ratings');
        }
      } catch (err) {
        console.error('Ratings fetch error:', err);
        setLoadError(err?.message || 'Could not load driver ratings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRatings();
  }, [reloadKey]);
  const filtered = drivers.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile.includes(searchTerm));
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Star}
        title="Driver Rating"
        subtitle="Average rating each driver has earned"
        breadcrumb={[{ label: 'Drivers' }, { label: 'Driver Rating' }]}
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load ratings" message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No driver ratings"
          message={searchTerm ? 'No driver matches this search.' : 'Ratings appear here once riders start rating trips.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Name', 'Transport type', 'Mobile number', 'Rating', '']} />
          <TBody>
            {filtered.map((driver, i) => (
              <Row key={driver.id} last={i === filtered.length - 1}>
                <Cell width={COLS[0]}>
                  <Span className="text-sm font-semibold text-slate-900">{driver.name}</Span>
                </Cell>
                <Cell width={COLS[1]}>{driver.transport}</Cell>
                <Cell width={COLS[2]}>{driver.mobile || '—'}</Cell>
                <Cell width={COLS[3]}>
                  <Div className="flex-row items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <UiIcon as={Star} key={s} size={14} className={s <= Math.round(driver.rating) ? 'text-amber-500' : 'text-slate-200'} />
                    ))}
                  </Div>
                </Cell>
                <Cell width={COLS[4]}>
                  <Button
                    onClick={() => navigate(`/taxi/admin/drivers/ratings/${driver.id}`)}
                    accessibilityLabel={`View ratings for ${driver.name}`}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                  >
                    <UiIcon as={Eye} size={16} className="text-slate-600" />
                  </Button>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
};
export default DriverRatings;
