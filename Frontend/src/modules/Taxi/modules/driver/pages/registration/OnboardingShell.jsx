/**
 * The frame every driver onboarding step sits in.
 *
 * Each step used to carry its own header, its own progress badge and its own
 * sticky footer button, which is how they drifted apart — four different step
 * counts, three different button styles, and a "Step 1 of 4" on a screen that
 * was fifth. One shell means the count is derived, not typed, and a step file
 * is just its fields.
 */
import { useMemo } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { DRIVER_BRAND_LOGO, logoFallback } from '@/shared/constants/brandLogo';

import './onboarding.css';

/** The steps a driver walks, in order. The shell derives progress from this. */
export const ONBOARDING_STEPS = ['phone', 'otp', 'personal', 'vehicle', 'documents'];

export default function OnboardingShell({
  step,
  eyebrow,
  title,
  subtitle,
  children,
  error = '',
  onBack,
  footer,
  primaryLabel = 'Continue',
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  secondary = null,
}) {
  const { index, total } = useMemo(() => {
    const position = ONBOARDING_STEPS.indexOf(step);
    return { index: position < 0 ? 0 : position, total: ONBOARDING_STEPS.length };
  }, [step]);

  const percent = Math.round(((index + 1) / total) * 100);

  return (
    <div className="dh-onboarding select-none">
      <div className="mx-auto w-full max-w-md px-5 pb-40 pt-6">
        <header className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dh-border)] bg-white text-[var(--dh-text)] transition-colors hover:border-[var(--dh-primary)] hover:text-[var(--dh-primary)]"
              >
                <ArrowLeft size={17} strokeWidth={2.5} />
              </button>
            ) : (
              <img
                src={DRIVER_BRAND_LOGO}
                onError={logoFallback}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            )}

            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dh-muted)]">
              Step {index + 1} of {total}
            </span>
          </div>

          <div
            className="dh-progress-track"
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label="Onboarding progress"
          >
            <div className="dh-progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="space-y-1.5 pt-1">
            {eyebrow && (
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dh-primary)]">
                {eyebrow}
              </p>
            )}
            <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--dh-text)]">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-[34ch] text-[14px] font-medium leading-relaxed text-[var(--dh-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </header>

        <main className="mt-6 space-y-4">{children}</main>

        {error && (
          <p role="alert" className="dh-alert mt-4 px-4 py-3">
            {error}
          </p>
        )}

        {footer && <div className="mt-6">{footer}</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[var(--dh-bg)] via-[var(--dh-bg)] to-transparent px-5 pb-7 pt-10">
        <div className="mx-auto w-full max-w-md space-y-3">
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            className="dh-cta flex h-14 w-full items-center justify-center gap-2 text-[15px]"
          >
            {primaryLoading ? <Loader2 size={18} className="animate-spin" /> : primaryLabel}
          </button>
          {secondary}
        </div>
      </div>
    </div>
  );
}
