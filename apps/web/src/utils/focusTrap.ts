import type { KeyboardEvent } from "react";

const FOCUSABLE =
  "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]";

// Mantiene el foco dentro de un diálogo al navegar con Tab / Shift+Tab
export function trapTab(
  event: KeyboardEvent<HTMLElement>,
  container: HTMLElement | null,
) {
  if (event.key !== "Tab" || !container) {
    return;
  }

  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === container || active === first)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
}
