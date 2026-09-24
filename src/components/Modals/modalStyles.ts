// Designer-personality modal tokens — shared across all modals in the app.
// Choices use pill/capsule shape; buttons use aura-button for consistency.

export const modalButton =
  'aura-button min-w-0 max-w-full disabled:cursor-not-allowed disabled:opacity-50';
export const modalPrimaryButton = `${modalButton} primary`;
export const modalSecondaryButton = modalButton;
export const modalField = 'aura-field min-w-0 max-w-full';

// Choice tile — pill / capsule shape. Used for symptom chips, flow selector, bleeding options etc.
export const modalChoice =
  'min-h-10 min-w-0 rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 active:scale-[.97]';

// Active (selected) state — warm rose brand accent
export const modalSelected =
  'border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--rose)_25%,transparent)]';

// Inactive state — understated card background
export const modalUnselected =
  'border-[var(--border-subtle)] bg-[var(--bg-card-inner)] text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--rose)_35%,var(--border-subtle))] hover:bg-[color-mix(in_srgb,var(--rose-soft)_50%,var(--bg-card-inner))]';

// Category filter pill — slightly more compact, used in symptom picker group tabs
export const modalCategoryPill =
  'min-h-9 min-w-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 active:scale-[.97]';
export const modalCategorySelected =
  'border-[var(--rose)] bg-[var(--rose)] text-white shadow-sm';
export const modalCategoryUnselected =
  'border-[var(--border-subtle)] bg-[var(--bg-card-inner)] text-[var(--text-secondary)] hover:border-[color-mix(in_srgb,var(--rose)_40%,var(--border-subtle))] hover:text-[var(--rose)]';
