/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliverymanBonus.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Gift, Plus, Loader2 } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
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
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};
const COLS = [60, 150, 180, 120, 200, 150];
const LABELS = ['SI', 'Transaction ID', 'Deliveryman', 'Amount', 'Reference', 'Date'];
export default function DeliverymanBonus() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_deliveryman_bonus_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    deliveryPartnerId: '',
    amount: '',
    reference: '',
  });
  const { tablet } = useLayoutWidth();
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    adminAPI
      .getDeliveryPartners({
        limit: 1000,
        status: 'approved',
      })
      .then((res) => {
        if (res?.data?.success) {
          setDeliveryPartners(res.data.data.deliveryPartners || []);
        }
      })
      .catch(() => {});
  }, []);
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDeliveryPartnerBonusTransactions({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      if (response?.data?.success) {
        setTransactions(response.data.data.transactions || []);
        setTotalItems(response.data.data.pagination?.total ?? (response.data.data.transactions || []).length);
      } else {
        setTransactions([]);
        setTotalItems(0);
        toast.error(response?.data?.message || 'Failed to fetch bonus transactions');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch bonus transactions');
      setTransactions([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, debouncedSearch]);
  const handleAddBonus = async (e) => {
    e.preventDefault();
    if (!form.deliveryPartnerId) {
      toast.error('Please select a delivery partner');
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      setSubmitting(true);
      await adminAPI.addDeliveryPartnerBonus(form.deliveryPartnerId, amount, form.reference.trim());
      toast.success('Bonus added successfully');
      setIsAddOpen(false);
      setForm({
        deliveryPartnerId: '',
        amount: '',
        reference: '',
      });
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add bonus');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Gift}
        title="Deliveryman Bonus"
        subtitle={loading ? 'Loading bonus transactions…' : `${totalItems} bonus transaction${totalItems === 1 ? '' : 's'} paid to delivery partners`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Bonus' }]}
        actions={
          <Button type="button" onClick={() => setIsAddOpen(true)} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add Bonus</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="text"
            placeholder="Search by name, phone, transaction ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No bonus transactions yet"
          message={debouncedSearch ? 'No bonus matches this search. Try a different name, phone or transaction ID.' : 'Bonuses you pay out to delivery partners are listed here.'}
          actionLabel="Add Bonus"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {transactions.map((tx, index) => (
              <Row key={tx.transactionId || tx._id || index} last={index === transactions.length - 1}>
                <Cell width={COLS[0]}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                <Cell width={COLS[1]}>{tx.transactionId || 'N/A'}</Cell>
                <Cell width={COLS[2]}>
                  <Div className="gap-0.5">
                    <Span className="text-sm font-medium text-slate-900">{tx.deliveryman || 'Unknown'}</Span>
                    {tx.deliveryId ? <Span className="text-xs text-slate-500">{tx.deliveryId}</Span> : null}
                  </Div>
                </Cell>
                <Cell width={COLS[3]} align="right">
                  <Span className="text-sm font-semibold text-slate-900">{formatCurrency(tx.amount ?? tx.bonus)}</Span>
                </Cell>
                <Cell width={COLS[4]}>{tx.reference || '—'}</Cell>
                <Cell width={COLS[5]}>{formatDate(tx.createdAt)}</Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <AdminListPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          try {
            localStorage.setItem('admin_deliveryman_bonus_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="transactions"
        className="mt-3 rounded-xl border border-slate-200"
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-white p-5 gap-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Add Delivery Bonus</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleAddBonus} className="gap-4">
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-4'}>
              <Field label="Delivery Partner" required className={tablet ? 'flex-1 min-w-[220px]' : undefined}>
                <Select
                  required
                  value={form.deliveryPartnerId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deliveryPartnerId: e.target.value,
                    })
                  }
                  className={INPUT}
                >
                  <Option value="">Select delivery partner</Option>
                  {deliveryPartners.map((dp) => (
                    <Option key={dp._id} value={dp._id}>
                      {dp.name} {dp.phone ? `(${dp.phone})` : ''}
                    </Option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount (₹)" required className={tablet ? 'flex-1 min-w-[180px]' : undefined}>
                <Input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                  className={INPUT}
                  placeholder="e.g. 500"
                />
              </Field>
            </Div>
            <Field label="Reference" hint="Optional — shown with the transaction">
              <Input
                type="text"
                value={form.reference}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reference: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="e.g. Performance bonus"
              />
            </Field>
            <DialogFooter className="flex-row justify-end gap-2 mt-1">
              <Button type="button" onClick={() => setIsAddOpen(false)} disabled={submitting} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button type="submit" disabled={submitting} className={BTN_PRIMARY}>
                {submitting ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                <Span className={BTN_TEXT_PRIMARY}>Add Bonus</Span>
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
