/* Ported from Frontend/src/modules/Food/components/admin/orders/FilterPanel.jsx (tools/port.js first pass). */
import { X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { Button, Div, Input, Option, Overlay, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { Field, SectionTitle, useLayoutWidth, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';

const PAYMENT_STATUSES = ['All', 'paid', 'pending', 'failed', 'refunded'];
const DELIVERY_TYPES = ['All', 'home_delivery', 'take_away', 'dine_in'];
const titleCase = (value) =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** A wrapping row of single-choice pills, each at the 44 px touch minimum. */
function PillGroup({ options, value, onSelect, label }) {
  return (
    <Field label={label}>
      <Div className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option || (option === 'All' && !value);
          return (
            <Button
              key={option}
              onClick={() => onSelect(option === 'All' ? '' : option)}
              className={`h-11 px-4 rounded-lg items-center justify-center ${selected ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
            >
              <Span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-700'}`}>{titleCase(option)}</Span>
            </Button>
          );
        })}
      </Div>
    </Field>
  );
}

export default function FilterPanel({ isOpen, onClose, filters, setFilters, onApply, onReset, restaurants = [] }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const { tablet } = useLayoutWidth();
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
  const pairClass = tablet ? 'flex-row gap-3' : 'gap-3';
  return (
    <Overlay className="absolute inset-0 bg-black/50 z-50 items-center justify-center p-4" onClick={onClose}>
      <Div className="bg-white rounded-xl w-full max-w-xl max-h-[90%] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Div className="flex-row items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <Span className="text-xl font-bold text-slate-900 flex-1">Filter Orders</Span>
          <Button onClick={onClose} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Close filters">
            <UiIcon as={X} size={18} className="text-slate-600" />
          </Button>
        </Div>

        <ScrollDiv className="px-4 py-4" contentClassName="gap-4">
          <PillGroup
            label="Payment status"
            options={PAYMENT_STATUSES}
            value={localFilters.paymentStatus}
            onSelect={(next) =>
              setLocalFilters((prev) => ({
                ...prev,
                paymentStatus: next,
              }))
            }
          />
          <PillGroup
            label="Delivery type"
            options={DELIVERY_TYPES}
            value={localFilters.deliveryType}
            onSelect={(next) =>
              setLocalFilters((prev) => ({
                ...prev,
                deliveryType: next,
              }))
            }
          />

          <Div className="gap-3">
            <SectionTitle className="mb-0">Amount range</SectionTitle>
            <Div className={pairClass}>
              <Field label="Min amount (₹)" className="flex-1">
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
                  className={INPUT}
                />
              </Field>
              <Field label="Max amount (₹)" className="flex-1">
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
                  className={INPUT}
                />
              </Field>
            </Div>
          </Div>

          <Div className="gap-3">
            <SectionTitle className="mb-0">Date range</SectionTitle>
            <Div className={pairClass}>
              <Field label="From date" className="flex-1">
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
                  className={INPUT}
                />
              </Field>
              <Field label="To date" className="flex-1">
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
                  className={INPUT}
                />
              </Field>
            </Div>
          </Div>

          {restaurants.length > 0 && (
            <Field label="Restaurant">
              <Select
                value={localFilters.restaurant || ''}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="">All Restaurants</Option>
                {restaurants.map((rest) => (
                  <Option key={rest} value={rest}>
                    {rest}
                  </Option>
                ))}
              </Select>
            </Field>
          )}
        </ScrollDiv>

        <Div className="flex-row items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <Button onClick={onReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button
            onClick={() => {
              setFilters(localFilters);
              onApply();
            }}
            className={BTN_PRIMARY}
          >
            <Span className={BTN_TEXT_PRIMARY}>Apply filters</Span>
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
