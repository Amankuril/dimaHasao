import { Plus, ShoppingBag, Users, Wallet } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, StatGrid, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, Pagination, EmptyState, ErrorState, LoadingState, TableSkeleton, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../admin/ui';
import { Button, Div, Icon, Input, Span } from '../components/web';

const COLS = [50, 170, 120, 130];
export default function KitAdmin() {
  return (
    <AdminPage>
      <PageHeader
        icon={ShoppingBag}
        title="Orders"
        subtitle="Every order across the district, newest first"
        breadcrumb={[{ label: 'Food' }, { label: 'Orders' }, { label: 'All orders' }]}
        actions={
          <>
            <Button className={BTN_PRIMARY}>
              <Icon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add order</Span>
            </Button>
            <Button className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Export</Span>
            </Button>
          </>
        }
      />
      <StatGrid className="mb-4">
        <StatCard label="Gross revenue" value="₹1,620" hint="Delivered order totals" icon={Wallet} tone="success" />
        <StatCard label="Orders processed" value="0" hint="Currently being processed" icon={ShoppingBag} tone="warning" />
        <StatCard label="Customers" value="16" icon={Users} tone="info" />
      </StatGrid>
      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Toolbar>
          <Input placeholder="Search by id or name" className={`${INPUT} flex-1 min-w-[180px]`} />
          <Button className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
        </Toolbar>
        <Field label="Order date" required hint="Leave empty for all time">
          <Input type="date" className={INPUT} />
        </Field>
      </Card>
      <DataTable cols={COLS} className="mb-1">
        <THead cols={COLS} labels={['SL', 'Customer', 'Status', 'Amount']} />
        <TBody>
          {[['1', 'Rahul Das', 'delivered', '₹420'], ['2', 'Priya Sen', 'pending', '₹180'], ['3', 'Amit Roy', 'cancelled', '₹0']].map((r, i, a) => (
            <Row key={r[0]} last={i === a.length - 1}>
              <Cell width={COLS[0]}>{r[0]}</Cell>
              <Cell width={COLS[1]}>{r[1]}</Cell>
              <Cell width={COLS[2]}>
                <StatusBadge status={r[2]} />
              </Cell>
              <Cell width={COLS[3]} align="right">{r[3]}</Cell>
            </Row>
          ))}
        </TBody>
      </DataTable>
      <Pagination page={1} pages={3} total={16} onPrev={() => {}} onNext={() => {}} />
      <Div className="gap-3 mt-4">
        <LoadingState />
        <TableSkeleton rows={2} />
        <EmptyState title="No orders yet" message="Orders appear here as customers place them." actionLabel="Refresh" onAction={() => {}} />
        <ErrorState message="Network request failed" onRetry={() => {}} />
      </Div>
    </AdminPage>
  );
}
