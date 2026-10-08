/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantsBulkExport.jsx (tools/port.js first pass). */
import { Download, RefreshCw, FileSpreadsheet } from 'lucide-react-native';
import { Button, Div, H1, H2, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-center gap-3">
          <Div className="p-2 bg-emerald-50 rounded-lg">
            <UiIcon as={Download} className="w-5 h-5 text-emerald-600" />
          </Div>
          <Div>
            <H1 className="text-2xl font-bold text-slate-900">Export Restaurants</H1>
            <P className="text-sm text-slate-500 mt-1">Export restaurant data in bulk using filters</P>
          </Div>
        </Div>
      </Div>

      {/* Export Info */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-center gap-3 mb-4">
          <Div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">1</Div>
          <H2 className="text-xl font-bold text-slate-900">Export All Restaurant Data</H2>
        </Div>
        <Div className="ml-14">
          <Div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Div className="flex items-center gap-2 text-sm text-slate-600">
              <UiIcon as={FileSpreadsheet} className="w-4 h-4 text-emerald-600" />
              <Span>All restaurant data will be exported in Excel (.xlsx) format</Span>
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Action Buttons */}
      <Div className="flex items-center justify-end gap-3">
        <Button
          onClick={handleReset}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-all flex items-center gap-2"
        >
          <UiIcon as={RefreshCw} className="w-4 h-4" />
          Reset
        </Button>
        <Button
          onClick={handleExport}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md"
        >
          <UiIcon as={Download} className="w-4 h-4" />
          Export
        </Button>
      </Div>
    </ScrollDiv>
  );
}
