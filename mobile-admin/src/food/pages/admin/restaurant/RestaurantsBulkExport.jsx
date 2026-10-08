/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantsBulkExport.jsx (tools/port.js first pass). */
import { Download, RefreshCw, FileSpreadsheet } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, SectionTitle, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
export default function RestaurantsBulkExport() {
  const handleExport = () => {
    // Handle export logic here
    alert('Exporting all restaurant data...');
  };
  const handleReset = () => {
    // Reset logic if needed
  };
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Download}
        title="Export Restaurants"
        subtitle="Export restaurant data in bulk using filters"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Bulk export' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Export all restaurant data</SectionTitle>
        <Div className="flex-row items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <UiIcon as={FileSpreadsheet} size={16} className="text-slate-500 mt-0.5" />
          <Span className="flex-1 text-sm text-slate-700">All restaurant data will be exported in Excel (.xlsx) format.</Span>
        </Div>
      </Card>

      <Div className="flex-row flex-wrap items-center justify-end gap-2">
        <Button onClick={handleReset} className={BTN_SECONDARY}>
          <UiIcon as={RefreshCw} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
        </Button>
        <Button onClick={handleExport} className={BTN_PRIMARY}>
          <UiIcon as={Download} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>Export</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
