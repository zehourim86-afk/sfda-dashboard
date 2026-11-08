// Shared helpers for the MAH portal (Mah*.js files).
import { API_URL, normalizeState, getStateLabel } from './constants';

// ── API ──────────────────────────────────────────────
// Throws an Error with the server's message; err.status and err.data are set.
export async function apiFetch(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  if (!res.ok) {
    const message = res.status === 413
      ? 'File is too large to upload'
      : data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Sectors ──────────────────────────────────────────
export const SECTOR_LABELS = {
  food_supplement: 'Food Supplement',
  cosmetic: 'Cosmetics',
  food: 'Food',
};

const CATEGORY_TO_SECTOR = {
  'Food Supplement': 'food_supplement',
  Cosmetic: 'cosmetic',
  'Cosmetic Device': 'cosmetic',
  'Food Product': 'food',
  Beverage: 'food',
  'Health Food': 'food',
  'Functional Food': 'food',
};

// Sector of a shipment; older shipments only have product_category.
export const shipmentSector = (s) => s.sector || CATEGORY_TO_SECTOR[s.product_category] || null;

// Required documents per sector — same lists as the backend's SECTOR_DOCUMENT_CHECKLISTS,
// used until the pre-arrival response arrives.
export const SECTOR_CHECKLISTS = {
  food_supplement: ['Certificate of Analysis (CoA)', 'SFDA Registration/Listing Certificate', 'Halal Certificate',
    'Commercial Invoice', 'Packing List', 'Health Certificate', 'Certificate of Origin'],
  cosmetic: ['Certificate of Conformity (CoC)', 'Certificate of Analysis (CoA)', 'Commercial Invoice',
    'Packing List', 'Health Certificate', 'Certificate of Origin', 'INCI Declaration'],
  food: ['Commercial Invoice', 'Packing List', 'Certificate of Origin', 'Health Certificate',
    'Halal Certificate', 'Ingredient Declaration', 'Nutritional Facts'],
};

// Checklist name → document_type accepted by POST /documents/:id/upload.
// null = the backend has no document type for it yet, so it can't be uploaded here.
export const CHECKLIST_DOC_TYPES = {
  'Certificate of Analysis (CoA)': 'CERTIFICATE_OF_ANALYSIS',
  'SFDA Registration/Listing Certificate': 'SFDA_REGISTRATION',
  'Halal Certificate': 'HALAL_CERTIFICATE',
  'Commercial Invoice': 'COMMERCIAL_INVOICE',
  'Packing List': 'PACKING_LIST',
  'Health Certificate': 'HEALTH_CERTIFICATE',
  'Certificate of Origin': 'CERTIFICATE_OF_ORIGIN',
  'Certificate of Conformity (CoC)': 'CERTIFICATE_OF_CONFORMITY',
  'INCI Declaration': 'INCI_DECLARATION',
  'Ingredient Declaration': 'INGREDIENT_DECLARATION',
  'Nutritional Facts': 'NUTRITIONAL_FACTS',
};

// ── States ───────────────────────────────────────────
export const STATE_TONES = {
  DRAFT: 'grey',
  PREPARING: 'amber',
  READY_TO_SUBMIT: 'green',
  WITH_BROKER: 'blue',
  SUBMITTED: 'blue',
  SFDA_INFO_REQUESTED: 'amber',
  SAMPLING: 'purple',
  CONDITIONALLY_RELEASED: 'green',
  SFDA_RELEASED: 'green',
  PARTIALLY_RELEASED: 'amber',
  SFDA_REJECTED: 'red',
  OBJECTION_FILED: 'purple',
  DISPOSITION_PENDING: 'red',
  CUSTOMS_RELEASED: 'green',
  CLOSED_RELEASED: 'grey',
  CLOSED_REEXPORTED: 'grey',
  CLOSED_DESTROYED: 'grey',
  WITHDRAWN: 'grey',
};

// Overview pipeline columns
export const PIPELINE = [
  { key: 'draft', label: 'Draft', states: ['DRAFT'] },
  { key: 'validating', label: 'Validating', states: ['PREPARING'] },
  { key: 'ready', label: 'Ready', states: ['READY_TO_SUBMIT'] },
  { key: 'broker', label: 'With Broker', states: ['WITH_BROKER'] },
  { key: 'submitted', label: 'Submitted', states: ['SUBMITTED', 'SFDA_INFO_REQUESTED'] },
  { key: 'sampling', label: 'Sampling', states: ['SAMPLING'] },
  { key: 'rejected', label: 'Rejected', states: ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING'] },
  { key: 'released', label: 'Released', states: ['CONDITIONALLY_RELEASED', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'CUSTOMS_RELEASED'] },
  { key: 'closed', label: 'Closed', states: ['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN'] },
];

export const CLOSED_STATES = ['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN'];

// States where the MAH has to act, with the action button shown on the Overview
export const ACTION_STATES = {
  SFDA_REJECTED: { tone: 'red', button: 'Object →', tab: 'objection', why: 'SFDA rejected — objection window open' },
  SFDA_INFO_REQUESTED: { tone: 'amber', button: 'Respond →', tab: 'documents', why: 'SFDA requested more information' },
  PREPARING: { tone: 'amber', button: 'Fix →', tab: 'validation', why: 'Validation issues to fix' },
  DRAFT: { tone: 'amber', button: 'Start →', tab: 'validation', why: 'Start document preparation' },
  READY_TO_SUBMIT: { tone: 'green', button: 'Confirm →', tab: 'validation', why: 'Ready — RA lead confirmation needed' },
};

// Broker engagement items (migration 020) — before hand-over these take priority over the state's own item
export const PRE_BROKER_STATES = ['DRAFT', 'PREPARING', 'READY_TO_SUBMIT'];
export const BROKER_ACTIONS = {
  BROKER_DECLINED: {
    tone: 'red', button: 'Reselect →', tab: 'timeline', title: 'Clearance declined — select new company',
    why: (s) => `${s.preferred_clearance_company_name || 'Your clearance company'} declined`,
  },
  PENDING_AGREEMENT: {
    tone: 'blue', button: 'Review →', tab: 'timeline', title: 'Service agreement pending acknowledgement',
    why: () => 'Review and acknowledge',
  },
};
export const agreementInEffect = (s) => !!(s.agreement_acknowledged_mah && s.agreement_acknowledged_clearance);

// The MAH's action key for a shipment: a BROKER_ACTIONS key, an ACTION_STATES state, or null
export function actionKey(s) {
  const st = stateOf(s);
  if (PRE_BROKER_STATES.includes(st)) {
    if (s.broker_acceptance_status === 'DECLINED') return 'BROKER_DECLINED';
    if (s.broker_acceptance_status === 'ACCEPTED' && !s.agreement_acknowledged_mah) return 'PENDING_AGREEMENT';
  }
  return ACTION_STATES[st] ? st : null;
}
// { tone, button, tab, why, title? } for the Overview row, or null
export function actionFor(s) {
  const key = actionKey(s);
  if (!key) return null;
  const broker = BROKER_ACTIONS[key];
  return broker ? { ...broker, key, why: broker.why(s) } : { ...ACTION_STATES[key], key };
}
// Overview sort order, most urgent first
export const ACTION_ORDER = ['SFDA_REJECTED', 'BROKER_DECLINED', 'SFDA_INFO_REQUESTED', 'PENDING_AGREEMENT', 'PREPARING', 'DRAFT', 'READY_TO_SUBMIT'];

export const stateOf = (s) => normalizeState(s.current_state);
export const needsAction = (s) => !!actionKey(s);
export const isClosed = (s) => CLOSED_STATES.includes(stateOf(s));
export const isInProgress = (s) => !needsAction(s) && !isClosed(s);

export function StateBadge({ state }) {
  const st = normalizeState(state);
  return <span className={`mah-badge mah-tone-${STATE_TONES[st] || 'grey'}`}>{getStateLabel(st)}</span>;
}

export function SectorBadge({ sector }) {
  if (!sector) return <span className="mah-muted">—</span>;
  return <span className={`mah-sector mah-sector-${sector}`}>{SECTOR_LABELS[sector] || sector}</span>;
}

// Display name for a shipment: its product, then supplier, then its reference
export function shipmentName(s, productsById) {
  return productsById?.[s.product_id]?.name_en
    || (s.supplier_name ? `Shipment from ${s.supplier_name}` : null)
    || s.shipment_name
    || (s.faseh_request_number ? `Faseh ${s.faseh_request_number}` : 'Shipment');
}

export const shipmentRef = (s) => s.masaar_id || s.faseh_request_number || String(s.id).slice(0, 8);

// ── File upload ──────────────────────────────────────
// Reads a file for POST /documents/:id/upload. Plain-text files are sent as text (so the AI
// validator can read them); everything else (PDF, images, Office docs) is sent as a base64
// data URL — binary bytes as text break the TEXT column with "invalid byte sequence ... 0x00".
export function readFileForUpload(file) {
  const type = file.type || '';
  const textLike = type.startsWith('text/') || /\.(txt|csv|tsv|json|xml|md)$/i.test(file.name || '');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data URL for binary, raw text for text
    reader.onerror = () => reject(new Error('Could not read the file'));
    if (textLike) reader.readAsText(file); else reader.readAsDataURL(file);
  });
}
// True when stored document content is a base64 data URL rather than plain text
export const isDataUrl = (content) => typeof content === 'string' && content.startsWith('data:');

// ── Dates ────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;

// Parses 'YYYY-MM-DD' (or a timestamp) as a local date
export function toDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m && String(value).length <= 10 ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysUntil(value) {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return Math.round((day - today) / DAY);
}

export function fmtDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function fmtDateTime(value) {
  const d = toDate(value);
  return d ? d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(value);
}

export const OBJECTION_WINDOW_DAYS = 60;
export function objectionDeadline(s) {
  const base = toDate(s.state_entered_at || s.updated_at);
  return base ? new Date(base.getTime() + OBJECTION_WINDOW_DAYS * DAY) : null;
}

// Registration expiry status for a product
export function expiryStatus(product) {
  const days = daysUntil(product.sfda_reg_expiry);
  if (days === null) return { key: 'none', label: 'Not recorded', tone: 'grey' };
  if (days < 0) return { key: 'expired', label: `Expired ${fmtDate(product.sfda_reg_expiry)}`, tone: 'red' };
  if (days <= 90) return { key: 'expiring', label: `Expires in ${days}d`, tone: 'amber' };
  return { key: 'valid', label: `Valid to ${fmtDate(product.sfda_reg_expiry)}`, tone: 'green' };
}

// ── Visual pieces ────────────────────────────────────
export const COLORS = {
  navy: '#0F1A4A', blue: '#0099EE', green: '#00B87A', amber: '#E8900A', red: '#E0334C',
  purple: '#7C5FD4', grey: '#94A3B8', track: '#E2E8F0',
};

export const scoreTone = (score) => (score >= 85 ? 'green' : score >= 70 ? 'amber' : 'red');

// Circular gauge. value 0-100.
export function Ring({ value, size = 64, stroke = 7, tone, label, sublabel }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = COLORS[tone || scoreTone(v)];
  return (
    <div className="mah-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="mah-ring-label">
        <strong style={{ fontSize: size * 0.24 }}>{label ?? v}</strong>
        {sublabel && <span>{sublabel}</span>}
      </div>
    </div>
  );
}

// Horizontal bar list: items = [{ label, value, display? }]
export function BarList({ items, tone = 'blue', max }) {
  const top = max || Math.max(1, ...items.map(i => i.value));
  return (
    <div className="mah-bars">
      {items.map(i => (
        <div className="mah-bar-row" key={i.label}>
          <span className="mah-bar-label">{i.label}</span>
          <span className="mah-bar-track">
            <span className={`mah-bar-fill mah-fill-${i.tone || tone}`} style={{ width: `${(i.value / top) * 100}%` }} />
          </span>
          <span className="mah-bar-value">{i.display ?? i.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mah-tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.key} role="tab" aria-selected={active === t.key}
          className={`mah-tab${active === t.key ? ' is-active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Confirmation modal shared by MAH delete / cancellation flows.
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'red', onConfirm, onClose, busy, error, confirmDisabled, children }) {
  return (
    <div className="mah-modal-backdrop" onClick={onClose}>
      <div className="mah-modal mah-modal-sm" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <strong>{title}</strong>
          <button className="mah-ai-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mah-modal-body">
          {message && <p>{message}</p>}
          {children}
          {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
        </div>
        <div className="mah-modal-foot">
          <button className="mah-btn mah-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`mah-btn mah-btn-${tone}`} onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Roadmap notice for automatic Faseh / SFDA sync (not built yet). compact = smaller variant.
export function FasehSyncBanner({ title, description, badge, compact = false }) {
  return (
    <div className={`faseh-sync${compact ? ' faseh-sync-compact' : ''}`} role="note">
      <svg className="faseh-sync-icon" width={compact ? 16 : 18} height={compact ? 16 : 18} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" /><path d="M3 21v-5h5" />
        <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" /><path d="M21 3v5h-5" />
      </svg>
      <div className="faseh-sync-text">
        <div className="faseh-sync-title">{title}</div>
        <div className="faseh-sync-desc">{description}</div>
      </div>
      <span className="faseh-sync-badge">{badge}</span>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="mah-empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

export const DemoBanner = ({ children }) => (
  <div className="mah-demo-banner">DEMO DATA — {children || 'illustrative figures, not from your account'}</div>
);

// ── Icons (24px line icons) ──────────────────────────
const ICON_PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  flask: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10',
  factory: 'M3 21V10l6 4V10l6 4V6l6-3v18zM7 17h2M12 17h2M17 17h2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  back: 'M15 18l-6-6 6-6',
  check: 'M5 12l5 5L20 7',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  snow: 'M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  x: 'M6 6l12 12M18 6L6 18',
  'file-text': 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  building: 'M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 7h3M8 11h3M8 15h3',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.6-.7-.7-2.6z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  'x-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  'map-pin': 'M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
};

export function Icon({ name, size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
