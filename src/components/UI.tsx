import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { dismissToast, getToasts, subscribeToasts } from '../lib/toast';
import { useT } from '../lib/useT';

/* ------------------------------- halka -------------------------------- */

export function Ring({
  value,
  size = 120,
  strokeWidth = 9,
  children,
  className = '',
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  /** Ekran okuyucu etiketi; verilmezse yüzde okunur (dilden bağımsız). */
  label?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;

  // Halka ilk boyada sıfırdan dolar: sabit bir yüzde görmek yerine
  // ilerleme hissi verir. reduced-motion'da doğrudan son değer yazılır.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <span
      className={`ring-wrap ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(value * 100)}%`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="ring"
        style={{ '--v': shown } as React.CSSProperties}
      >
        <circle className="track" cx="50" cy="50" r={r} strokeWidth={strokeWidth} />
        <circle
          className="val"
          cx="50"
          cy="50"
          r={r}
          strokeWidth={strokeWidth}
          style={{ '--c': c } as React.CSSProperties}
        />
      </svg>
      {children}
    </span>
  );
}

export function Bar({ value, thin = false, label }: { value: number; thin?: boolean; label?: string }) {
  return (
    <div
      className={`bar${thin ? ' thin' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label={label}
    >
      <i style={{ '--v': Math.max(0, Math.min(1, value)) } as React.CSSProperties} />
    </div>
  );
}

/* -------------------------------- çip --------------------------------- */

export function Chip({
  on,
  onClick,
  children,
  ...rest
}: {
  on?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button type="button" className="chip" aria-pressed={!!on} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------ anahtar ------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

/* ------------------------------- sheet -------------------------------- */

const SWIPE_CLOSE = 96;

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef({ y: 0, dy: 0, active: false });
  const id = useId();
  const t = useT();

  /*
   * Kapanırken içerik hemen boşaltılırsa sheet bir anda küçülüyor ve
   * kapanış animasyonu bozuluyordu (başlık "" oluyor, gövde çöküyor).
   * Açıkken son içerik saklanır, kapanış boyunca o gösterilir.
   */
  const last = useRef<{ title: string; children: React.ReactNode; footer?: React.ReactNode }>({
    title,
    children,
    footer,
  });
  useEffect(() => {
    if (open) last.current = { title, children, footer };
  });
  const view = open ? { title, children, footer } : last.current;

  /*
   * Açılış/kapanış CSS animasyonuyla yapılır, geçişle değil.
   * Geçiş, öğenin "kapalı" hâlinin bir kare boyanmasına bağlıydı; mobilde
   * tarayıcı bu kareyi atlayınca sheet animasyonsuz beliriyordu. Animasyon
   * öğe DOM'a girdiği anda kendiliğinden başlar: zamanlama sorunu kalmaz.
   */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    /*
     * Kaydırma kilidi `body { overflow: hidden }` ile yapılmıyor.
     *
     * Overflow'u değiştirmek sayfanın kaydırma çubuğunu yok ediyor, sheet
     * kapanınca geri getiriyordu: her açılış/kapanışta sağ kenarda bir çubuk
     * yanıp sönüyordu. Bunun yerine tekerleği ve dokunmayı yutuyoruz —
     * çubuk yerinde kalır, sayfa kaymaz.
     */
    const block = (e: Event) => {
      const t = e.target;
      const body = t instanceof Element ? t.closest('.sheet-body') : null;
      // Yalnızca gerçekten kaydırılabilen sheet gövdesi kendi içinde kaysın.
      if (body && body.scrollHeight > body.clientHeight) return;
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('wheel', block, { passive: false });
    document.addEventListener('touchmove', block, { passive: false });

    // Odaklanırken sayfa kaymasın: sheet ekranın altında, kaydırma gerekmez.
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('wheel', block);
      document.removeEventListener('touchmove', block);
    };
  }, [open, onClose]);

  // Mobilde tutamaktan aşağı sürükleyerek kapatma: yerleşik hissin yarısı bu.
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    drag.current = { y: e.clientY, dy: 0, active: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };

  const onUp = () => {
    const d = drag.current;
    if (!d.active || !panel.current) return;
    d.active = false;
    const el = panel.current;
    // Eşiğin altında kalırsa yayla geri döner.
    el.style.transition = 'transform 260ms var(--ease-spring)';
    el.style.transform = '';
    window.setTimeout(() => {
      el.style.transition = '';
    }, 280);
    if (d.dy > SWIPE_CLOSE) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="backdrop"
        data-open={open}
        data-leaving={leaving}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="sheet"
        data-open={open}
        data-leaving={leaving}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={panel}
        tabIndex={-1}
      >
        <div
          className="sheet-grip"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        <div className="sheet-head">
          <h2 id={id}>{view.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="sheet-body">{view.children}</div>
        {view.footer ? <div className="sheet-foot">{view.footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}

/* ----------------------------- bildirimler ---------------------------- */

export function Toasts() {
  const items = useSyncExternalStore(
    (cb) => subscribeToasts(() => cb()),
    getToasts,
    getToasts,
  );
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-kind={t.kind} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ boş hal ------------------------------- */

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* --------------------------- sayfa başlığı ---------------------------- */

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="ph-main">
        <h1 className="display">{title}</h1>
        {sub ? <p className="ph-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="ph-actions">{actions}</div> : null}
    </div>
  );
}
