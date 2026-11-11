// Shared loading, error, empty and toast components for every portal (MAH, Clearance, Lab, Shipping, SFDA, Admin).
// Styles live in mah-portal.css (.skeleton*, .pc-*), which every portal imports.
//
//   <SkeletonLoader type="card | table-row | stat | donut | list | line" count lines width height circle />
//   <ErrorBanner error onRetry message compact />        inline failure of one section
//   <EmptyState icon title description action actionLabel />
//   <PageError error onRetry />                           the whole page could not load
//   <PortalContent loading error onRetry>…</PortalContent>  portal content area: skeleton / page error / banner
//   <Spinner label />
//   useToast() → { toasts, addToast(message, type, duration), removeToast(id) };  <ToastStack toasts onClose />
import { useCallback, useEffect, useRef, useState } from 'react';

const errorText = (error) => (typeof error === 'string' ? error : error?.message || '');
const clip = (text, n = 100) => (text && text.length > n ? `${text.slice(0, n - 1)}…` : text);

// ── Skeletons ───────────────────────────────────────────────
function Bone({ width = '100%', height = 14, circle = false, className = '' }) {
  return (
    <span className={`skeleton skeleton-line${circle ? ' skeleton-circle' : ''} ${className}`}
      style={{ width, height, ...(circle ? { width: height } : {}) }} />
  );
}

const ROW_CELLS = ['38%', '14%', '18%', '12%', '10%'];
const LINE_WIDTHS = ['92%', '78%', '64%', '85%', '70%'];

export function SkeletonLoader({ type = 'line', count = 1, lines = 3, width, height, circle }) {
  const many = (render) => Array.from({ length: Math.max(1, count) }, (_, i) => render(i));
  let body;
  switch (type) {
    case 'card':
      body = many(i => (
        <div key={i} className="pc-skel-card">
          <Bone width="40%" height={18} />
          {Array.from({ length: lines }, (_, j) => <Bone key={j} width={LINE_WIDTHS[j % LINE_WIDTHS.length]} />)}
        </div>
      ));
      break;
    case 'table-row':
      body = (
        <div className="pc-skel-table">
          {many(i => (
            <div key={i} className="pc-skel-row">
              {ROW_CELLS.map((w, j) => <Bone key={j} width={w} height={j === 0 ? 16 : 12} />)}
            </div>
          ))}
        </div>
      );
      break;
    case 'stat':
      body = many(i => (
        <div key={i} className="pc-skel-stat">
          <Bone width={width || 56} height={height || 28} />
          <Bone width="60%" height={11} />
        </div>
      ));
      break;
    case 'donut':
      body = many(i => <div key={i} className="pc-skel-donut"><Bone circle height={height || 120} /></div>);
      break;
    case 'list':
      body = many(i => (
        <div key={i} className="pc-skel-list-item">
          <Bone circle height={32} />
          <div className="pc-skel-grow">
            <Bone width="55%" height={14} />
            <Bone width="80%" height={11} />
          </div>
          <Bone width={64} height={22} />
        </div>
      ));
      break;
    default:
      body = many(i => <Bone key={i} width={width} height={height} circle={circle} />);
  }
  return <div className="pc-skeleton" aria-busy="true" aria-label="Loading">{body}</div>;
}

// ── Spinner ─────────────────────────────────────────────────
export function Spinner({ label }) {
  return (
    <span className="pc-spinner-wrap" role="status">
      <span className="pc-spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

// ── Errors ──────────────────────────────────────────────────
export function ErrorBanner({ error, onRetry, message, compact = false }) {
  const detail = clip(errorText(error));
  return (
    <div className={`pc-error-banner${compact ? ' is-compact' : ''}`} role="alert">
      <span className="pc-error-icon" aria-hidden="true">✕</span>
      <div className="pc-error-text">
        <strong>{message || 'Something went wrong'}</strong>
        {detail && detail !== message && <span>{detail}</span>}
      </div>
      {onRetry && <button type="button" className="pc-btn-retry" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function PageError({ error, onRetry }) {
  const detail = clip(errorText(error));
  return (
    <div className="pc-page-error-wrap">
      <div className="pc-page-error" role="alert">
        <span className="pc-page-error-icon" aria-hidden="true">✕</span>
        <h2>Could not load data</h2>
        <p>There was a problem connecting to the MASAAR platform. This may be a temporary issue.</p>
        {detail && <code>{detail}</code>}
        {onRetry && <button type="button" className="pc-btn-navy" onClick={onRetry}>Try again</button>}
        <small>If the problem persists, contact your DEMARA administrator.</small>
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────
export function EmptyState({ icon, title, description, action, actionLabel }) {
  return (
    <div className="pc-empty">
      {icon && <div className="pc-empty-icon" aria-hidden="true">{icon}</div>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && actionLabel && <button type="button" className="pc-btn-outline" onClick={action}>{actionLabel}</button>}
    </div>
  );
}

// ── Portal content area ─────────────────────────────────────
// error: null | { message, fatal } (or an Error / string, treated as fatal).
// fatal → the primary data failed: full PageError. Otherwise a compact banner above the page.
export function PortalContent({ loading, error, onRetry, skeleton, children }) {
  if (loading) {
    return skeleton || (
      <div className="mah-page">
        <SkeletonLoader type="card" />
        <SkeletonLoader type="table-row" count={5} />
      </div>
    );
  }
  const fatal = error && (typeof error === 'string' || error instanceof Error || error.fatal);
  if (fatal) return <PageError error={error} onRetry={onRetry} />;
  return (
    <>
      {error && <ErrorBanner compact error={error} onRetry={onRetry} message="Some data could not be loaded" />}
      {children}
    </>
  );
}

// Load-error helper for portal shells: results of Promise.allSettled, index 0 = the primary data.
// Returns null, or { message, fatal } — fatal when the primary data failed.
export function loadErrorFrom(results) {
  const failed = results.filter(r => r.status === 'rejected');
  if (!failed.length) return null;
  const fatal = results[0].status === 'rejected';
  const reason = fatal ? results[0].reason : failed[0].reason;
  return { message: reason?.message || 'Request failed', fatal };
}

// ── Toasts ──────────────────────────────────────────────────
const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
const TOAST_EXIT_MS = 250;
let toastSeq = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(t => clearTimeout(t));
  }, []);

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    // Mark as leaving for the fade-out, then drop it
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    timers.current.set(id, setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, TOAST_EXIT_MS));
  }, []);

  // type: 'success' | 'error' | 'warning' | 'info'
  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    if (!message) return;
    const id = ++toastSeq;
    setToasts(prev => [...prev, { id, message, type: TOAST_ICONS[type] ? type : 'info' }]);
    timers.current.set(id, setTimeout(() => removeToast(id), duration));
  }, [removeToast]);

  return { toasts, addToast, removeToast };
}

export function ToastStack({ toasts, onClose }) {
  if (!toasts?.length) return null;
  return (
    <div className="pc-toast-stack" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`pc-toast pc-toast-${t.type}${t.leaving ? ' is-leaving' : ''}`}
          role={t.type === 'error' ? 'alert' : 'status'}>
          <span className="pc-toast-icon" aria-hidden="true">{TOAST_ICONS[t.type]}</span>
          <span className="pc-toast-msg">{t.message}</span>
          <button type="button" className="pc-toast-close" onClick={() => onClose(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}
