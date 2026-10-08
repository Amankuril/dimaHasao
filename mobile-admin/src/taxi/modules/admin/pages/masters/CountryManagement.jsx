/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/masters/CountryManagement.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Globe } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
} from '../../../../../admin/ui';
import { Button, Div, HScroll, Img, Input, Span, Icon as UiIcon } from '../../../../../components/web';

const COLS = [180, 90, 110, 80];

const CountryManagement = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [countries, setCountries] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fetchCountries = async (page = 1) => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get(`/admin/countries?page=${page}&limit=10&search=${searchTerm}`);
      setCountries(res.data?.results || []);
      setPagination(
        res.data?.paginator || {
          current_page: 1,
          last_page: 1,
          total: 0,
        },
      );
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load countries');
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCountries(1);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);
  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/countries/${id}`, {
        active: !currentStatus,
      });
      toast.success('Status updated successfully');
      fetchCountries(pagination.current_page);
    } catch {
      toast.error('Failed to update status');
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Globe}
        title="Countries"
        subtitle="The countries the taxi app is available in"
        breadcrumb={[{ label: 'App settings' }, { label: 'Countries' }]}
        actions={
          <Button className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add country</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search countries…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load countries" message={loadError} onRetry={() => fetchCountries(pagination.current_page)} />
      ) : countries.length === 0 ? (
        <EmptyState
          title="No countries yet"
          message={searchTerm ? `Nothing matches “${searchTerm}”.` : 'Add a country to make the app available there.'}
          actionLabel="Refresh"
          onAction={() => fetchCountries(1)}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Country name', 'Icon', 'Status', 'Action']} />
            <TBody>
              {countries.map((country, i) => (
                <Row key={country._id} last={i === countries.length - 1}>
                  <Cell width={COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                      {country.name}
                    </Span>
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 items-center justify-center bg-slate-50">
                      {country.flag ? (
                        <Img src={country.flag} alt={country.name} className="w-full h-full" contentFit="cover" />
                      ) : (
                        <UiIcon as={Globe} size={18} className="text-slate-400" />
                      )}
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <Button
                      onClick={() => toggleStatus(country._id, country.active)}
                      accessibilityLabel={`Toggle ${country.name} status`}
                      className="h-11 justify-center"
                    >
                      <Div className={`w-11 h-6 rounded-full justify-center ${country.active ? 'bg-green-700' : 'bg-slate-300'}`}>
                        <Div className={`w-4 h-4 bg-white rounded-full ${country.active ? 'self-end mr-1' : 'ml-1'}`} />
                      </Div>
                    </Button>
                  </Cell>
                  <Cell width={COLS[3]} align="right">
                    <Button
                      accessibilityLabel={`Edit ${country.name}`}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-slate-200 bg-white"
                    >
                      <UiIcon as={Edit} size={16} className="text-slate-600" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>

          <Pagination
            page={pagination.current_page}
            pages={pagination.last_page}
            total={pagination.total}
            onPrev={() => fetchCountries(pagination.current_page - 1)}
            onNext={() => fetchCountries(pagination.current_page + 1)}
          />

          {pagination.last_page > 1 ? (
            <HScroll className="mt-2" contentClassName="flex-row items-center gap-2">
              {[...Array(pagination.last_page)].map((_, i) => (
                <Button
                  key={i}
                  onClick={() => fetchCountries(i + 1)}
                  accessibilityLabel={`Go to page ${i + 1}`}
                  className={`min-w-[44px] h-11 px-3 rounded-lg items-center justify-center ${
                    pagination.current_page === i + 1 ? 'bg-blue-600' : 'border border-slate-300 bg-white'
                  }`}
                >
                  <Span className={`text-sm font-semibold ${pagination.current_page === i + 1 ? 'text-white' : 'text-slate-700'}`}>
                    {i + 1}
                  </Span>
                </Button>
              ))}
            </HScroll>
          ) : null}
        </>
      )}
    </AdminPage>
  );
};
export default CountryManagement;
