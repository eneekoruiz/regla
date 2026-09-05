import type { KeyboardEvent } from 'react';

/** Keep keyboard navigation inside the active modal, including disabled send states. */
export function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>): void {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, summary, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  const active = document.activeElement;
  if (!first || !last) {
    event.preventDefault();
    dialog.focus();
  } else if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || active === dialog)) {
    event.preventDefault();
    first.focus();
  }
}
