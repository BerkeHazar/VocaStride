export type ToastKind = 'info' | 'ok' | 'bad' | 'level' | 'badge';

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const l of listeners) l(items);
}

export function toast(message: string, kind: ToastKind = 'info', ms = 3200) {
  const item: ToastItem = { id: ++seq, message, kind };
  items = [...items, item].slice(-3);
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== item.id);
    emit();
  }, ms);
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function getToasts(): ToastItem[] {
  return items;
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  l(items);
  return () => listeners.delete(l);
}
