/**
 * The handful of inputs the onboarding steps are built from.
 *
 * Kept deliberately small. The previous screens re-declared the same input
 * markup twenty-odd times with slightly different padding each time, which is
 * why no two steps looked alike.
 */
import { Check } from 'lucide-react';

/**
 * A labelled text input.
 *
 * `valid` draws the tick that tells a driver a field is accepted without them
 * having to press Continue to find out — the "is this right?" pause was the
 * main thing that made the old form feel heavy.
 */
export function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  inputMode,
  maxLength,
  valid = false,
  invalid = false,
  hint = '',
  readOnly = false,
  autoFocus = false,
}) {
  return (
    <label className="block">
      <span className="dh-label mb-1.5 px-1">{label}</span>
      <span className="dh-field flex items-center gap-3 px-4 py-3" data-invalid={invalid}>
        {Icon && <Icon size={18} strokeWidth={2.2} className="shrink-0 text-[var(--dh-muted)]" />}
        <input
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          readOnly={readOnly}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {valid && <Check size={17} strokeWidth={3} className="shrink-0 text-[var(--dh-primary)]" />}
      </span>
      {hint && <span className="mt-1 block px-1 text-[11px] font-medium text-[var(--dh-muted)]">{hint}</span>}
    </label>
  );
}

/** A labelled native select — used where the options come from the API. */
export function SelectField({ label, icon: Icon, value, onChange, options, placeholder = 'Select', invalid = false }) {
  return (
    <label className="block">
      <span className="dh-label mb-1.5 px-1">{label}</span>
      <span className="dh-field flex items-center gap-3 px-4 py-3" data-invalid={invalid}>
        {Icon && <Icon size={18} strokeWidth={2.2} className="shrink-0 text-[var(--dh-muted)]" />}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

/** A row of single-choice chips, for short option sets like gender. */
export function ChipGroup({ label, value, onChange, options, columns = 3 }) {
  return (
    <div>
      <span className="dh-label mb-1.5 block px-1">{label}</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;

          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              data-selected={value === optionValue}
              className="dh-chip h-11 px-2"
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A read-only fact, such as the phone number the driver just verified. */
export function ReadOnlyRow({ label, icon: Icon, value }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-[var(--dh-primary)]/15 bg-[var(--dh-primary-soft)] px-4 py-3">
      {Icon && <Icon size={18} strokeWidth={2.2} className="shrink-0 text-[var(--dh-primary)]" />}
      <div className="min-w-0">
        <span className="dh-label text-[var(--dh-primary)]/70">{label}</span>
        <p className="text-[15px] font-bold text-[var(--dh-text)]">{value}</p>
      </div>
    </div>
  );
}
