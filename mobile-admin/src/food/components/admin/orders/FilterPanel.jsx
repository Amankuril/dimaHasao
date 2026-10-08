/* Ported from Frontend/src/modules/Food/components/admin/orders/FilterPanel.jsx (tools/port.js first pass). */
import { X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { Button, Div, H2, Input, Label, Option, Overlay, ScrollDiv, Select, Icon as UiIcon } from '../../../../components/web';
export default function FilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset, restaurants = [] }) {
  const [localFilters, setLocalFilters] = useState(filters);
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);
  if (!isOpen) return null;
  const today = new Date().toISOString().split('T')[0];
  const sanitizeAmountInput = (value) => {
    if (value === '') return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return String(Math.max(0, parsed));
  };
  const clampDateValue = (value) => {
    if (!value) return '';
    return value > today ? today : value;
  };
  return (
    <Overlay className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <H2 className="text-xl font-bold text-slate-900">Filter Orders</H2>
          <Button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <UiIcon as={X} className="w-5 h-5 text-slate-600" />
          </Button>
        </Div>

        <ScrollDiv className="flex-shrink p-6 space-y-6">
          {/* Payment Status Filter */}
          <Div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Payment Status</Label>
            <Div className="flex flex-wrap gap-2">
              {['All', 'paid', 'pending', 'failed', 'refunded'].map((status) => (
                <Button
                  key={status}
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      paymentStatus: status === 'All' ? '' : status,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${localFilters.paymentStatus === status || (status === 'All' && !localFilters.paymentStatus) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </Div>
          </Div>

          {/* Delivery Type Filter */}
          <Div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Type</Label>
            <Div className="flex flex-wrap gap-2">
              {['All', 'home_delivery', 'take_away', 'dine_in'].map((type) => (
                <Button
                  key={type}
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      deliveryType: type === 'All' ? '' : type,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${localFilters.deliveryType === type || (type === 'All' && !localFilters.deliveryType) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {type
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </Button>
              ))}
            </Div>
          </Div>

          {/* Amount Range */}
          <Div className="grid grid-cols-2 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Min Amount ($)</Label>
              <Input
                type="number"
                value={localFilters.minAmount || ''}
                min="0"
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    minAmount: sanitizeAmountInput(e.target.value),
                  }))
                }
                placeholder="0"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Max Amount ($)</Label>
              <Input
                type="number"
                value={localFilters.maxAmount || ''}
                min="0"
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    maxAmount: sanitizeAmountInput(e.target.value),
                  }))
                }
                placeholder="10000"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
          </Div>

          {/* Date Range */}
          <Div className="grid grid-cols-2 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">From Date</Label>
              <Input
                type="date"
                value={localFilters.fromDate || ''}
                max={localFilters.toDate ? clampDateValue(localFilters.toDate) : today}
                onChange={(e) =>
                  setLocalFilters((prev) => {
                    const nextFromDate = clampDateValue(e.target.value);
                    const nextToDate = prev.toDate && prev.toDate < nextFromDate ? nextFromDate : prev.toDate;
                    return {
                      ...prev,
                      fromDate: nextFromDate,
                      toDate: nextToDate,
                    };
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">To Date</Label>
              <Input
                type="date"
                value={localFilters.toDate || ''}
                min={localFilters.fromDate || undefined}
                max={today}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    toDate: clampDateValue(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Div>
          </Div>

          {/* Restaurant Filter */}
          {restaurants.length > 0 && (
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Restaurant</Label>
              <Select
                value={localFilters.restaurant || ''}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Option value="">All Restaurants</Option>
                {restaurants.map((rest) => (
                  <Option key={rest} value={rest}>
                    {rest}
                  </Option>
                ))}
              </Select>
            </Div>
          )}
        </ScrollDiv>

        <Div className=" bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              setFilters(localFilters);
              onApply();
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
          >
            Apply Filters
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
