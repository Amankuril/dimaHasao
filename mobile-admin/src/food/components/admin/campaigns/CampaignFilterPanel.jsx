/* Ported from Frontend/src/modules/Food/components/admin/campaigns/CampaignFilterPanel.jsx. */
import { X } from 'lucide-react-native';
import { Card, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { Button, Div, H2, Input, Overlay, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
export default function CampaignFilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset }) {
  if (!isOpen) return null;
  return (
    <Overlay className="fixed inset-0 bg-black/50 z-50 items-center justify-center p-4" onClick={onClose} onClose={onClose}>
      <Card padded={false} className="w-full max-w-2xl max-h-[90%] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Div className="border-b border-slate-200 px-4 py-3 flex-row items-center justify-between gap-2">
          <H2 className="text-base font-semibold text-slate-900 flex-1">Filter Campaigns</H2>
          <Button onClick={onClose} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Close filters">
            <UiIcon as={X} size={18} className="text-slate-600" />
          </Button>
        </Div>

        <ScrollDiv className="flex-shrink" contentStyle={{ padding: 16, gap: 12 }}>
          {/* Status Filter */}
          <Field label="Status">
            <Div className="flex-row flex-wrap items-center gap-2">
              {['All', 'Active', 'Inactive'].map((status) => {
                const selected = filters.status === status || (status === 'All' && !filters.status);
                return (
                  <Button
                    key={status}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        status: status === 'All' ? '' : status,
                      }))
                    }
                    className={`px-4 h-11 rounded-lg items-center justify-center ${selected ? 'bg-blue-600' : 'bg-slate-100'}`}
                  >
                    <Span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{status}</Span>
                  </Button>
                );
              })}
            </Div>
          </Field>

          {/* Date Range */}
          <Field label="From Date">
            <Input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  fromDate: e.target.value,
                }))
              }
              className={INPUT}
            />
          </Field>
          <Field label="To Date">
            <Input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  toDate: e.target.value,
                }))
              }
              className={INPUT}
            />
          </Field>
        </ScrollDiv>

        <Div className="border-t border-slate-200 px-4 py-3 flex-row items-center gap-2">
          <Button onClick={onReset} className={`${BTN_SECONDARY} flex-1`}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button onClick={onApply} className={`${BTN_PRIMARY} flex-1`}>
            <Span className={BTN_TEXT_PRIMARY}>Apply Filters</Span>
          </Button>
        </Div>
      </Card>
    </Overlay>
  );
}
