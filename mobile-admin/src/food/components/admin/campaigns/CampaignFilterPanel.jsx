/* Ported from Frontend/src/modules/Food/components/admin/campaigns/CampaignFilterPanel.jsx. */
import { X } from 'lucide-react-native';
import { Button, Div, H2, Input, Label, Overlay, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
export default function CampaignFilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset }) {
  if (!isOpen) return null;
  return (
    <Overlay className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} onClose={onClose}>
      <Div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <H2 className="text-xl font-bold text-slate-900">Filter Campaigns</H2>
          <Button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <UiIcon as={X} className="w-5 h-5 text-slate-600" />
          </Button>
        </Div>

        <ScrollDiv className="flex-shrink p-6 space-y-6">
          {/* Status Filter */}
          <Div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Status</Label>
            <Div className="flex flex-wrap gap-2">
              {['All', 'Active', 'Inactive'].map((status) => (
                <Button
                  key={status}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      status: status === 'All' ? '' : status,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.status === status || (status === 'All' && !filters.status) ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {status}
                </Button>
              ))}
            </Div>
          </Div>

          {/* Date Range */}
          <Div className="grid grid-cols-2 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">From Date</Label>
              <Input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    fromDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">To Date</Label>
              <Input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    toDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </Div>
          </Div>
        </ScrollDiv>

        <Div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
          >
            Reset
          </Button>
          <Button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
          >
            Apply Filters
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
