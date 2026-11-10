// Shared helpers for the Clearance Portal (Clearance*.js files). Builds on mahShared.js.
import { stateOf, toDate } from './mahShared';

// Overview pipeline columns
export const CLR_PIPELINE = [
  { key: 'broker', label: 'With Broker', states: ['WITH_BROKER'] },
  { key: 'submitted', label: 'Submitted', states: ['SUBMITTED'] },
  { key: 'info', label: 'Info Requested', states: ['SFDA_INFO_REQUESTED'] },
  { key: 'sampling', label: 'Sampling', states: ['SAMPLING'] },
  { key: 'released', label: 'Released', states: ['CONDITIONALLY_RELEASED', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'CUSTOMS_RELEASED'] },
  { key: 'rejected', label: 'Rejected', states: ['SFDA_REJECTED', 'OBJECTION_FILED'] },
  { key: 'disposition', label: 'Disposition', states: ['DISPOSITION_PENDING'] },
  { key: 'closed', label: 'Closed', states: ['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN'] },
];

export const COMPLETED_STATES = ['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN'];
// With SFDA and not yet decided
export const AT_SFDA_STATES = ['SUBMITTED', 'SAMPLING', 'SFDA_INFO_REQUESTED'];
export const RELEASED_STATES = ['CONDITIONALLY_RELEASED', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'CUSTOMS_RELEASED', 'CLOSED_RELEASED'];
export const REJECTED_STATES = ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];

// What the broker has to do next, if anything: { tone, why, button, tab }
export function brokerAction(s) {
  const st = stateOf(s);
  // The MAH submitted its objection dossier: review it, then file with SFDA or return it (migration 026)
  if (st === 'SFDA_REJECTED' && s.objection_status === 'SUBMITTED_TO_CLEARANCE') {
    const n = s.objection_reason_count ?? 0;
    const m = s.objection_response_count ?? 0;
    return {
      tone: 'navy', button: 'Review dossier →', tab: 'objection',
      why: `Objection dossier ready for review — ${n} reason${n === 1 ? '' : 's'}, ${m} response${m === 1 ? '' : 's'}`,
    };
  }
  if (st === 'WITH_BROKER') return { tone: 'amber', why: 'File Faseh declaration', button: 'File →', tab: 'faseh' };
  if (st === 'SFDA_INFO_REQUESTED') return { tone: 'red', why: 'SFDA information request pending', button: 'Respond →', tab: 'sfda' };
  if (st === 'SAMPLING' && s.sampling_state === 'SAMPLE_AT_LAB') {
    return { tone: 'purple', why: 'Lab results pending', button: 'Track →', tab: 'sfda' };
  }
  return null;
}
// Objection dossiers (navy) come right after SFDA info requests, ahead of Faseh filing (amber)
export const ACTION_ORDER = { red: 0, navy: 1, amber: 2, purple: 3 };

export const SAMPLING_STEPS = ['SAMPLING_ORDERED', 'SAMPLE_COLLECTED', 'SAMPLE_AT_LAB', 'RESULTS_SUBMITTED'];
export const SAMPLING_LABELS = {
  NOT_APPLICABLE: 'Not sampled',
  SAMPLING_ORDERED: 'Sampling ordered',
  SAMPLE_COLLECTED: 'Sample collected',
  SAMPLE_AT_LAB: 'Sample at lab',
  RESULTS_SUBMITTED: 'Results submitted',
  SAMPLING_COMPLETE: 'Sampling complete',
};

export const CUSTOMS_STEPS = ['PENDING', 'DECLARATION_FILED', 'DUTIES_PAID', 'CUSTOMS_RELEASED'];
export const CUSTOMS_LABELS = {
  PENDING: 'Pending declaration', DECLARATION_FILED: 'Declaration filed', DUTIES_PAID: 'Duties paid', CUSTOMS_RELEASED: 'Released',
};
export const CUSTOMS_TONES = { PENDING: 'grey', DECLARATION_FILED: 'blue', DUTIES_PAID: 'amber', CUSTOMS_RELEASED: 'green' };

export const INFO_REQUEST_LABELS = { CLEARANCE_HANDLED: 'Clearance handled', MAH_INPUT_NEEDED: 'MAH input needed' };

// The clearance company can't read the MAH's product list, so product names come with each shipment
export const productsFromShipments = (shipments) =>
  Object.fromEntries(shipments.filter(s => s.product_id && s.product_name).map(s => [s.product_id, { name_en: s.product_name }]));

// ── Dates ────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
export function daysSince(value) {
  const d = toDate(value);
  return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY)) : null;
}
export function isThisMonth(value) {
  const d = toDate(value);
  const now = new Date();
  return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
export function isThisYear(value) {
  const d = toDate(value);
  return !!d && d.getFullYear() === new Date().getFullYear();
}
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const fmtSAR = (n) => (n == null ? '—' : `SAR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// ── Widgets ──────────────────────────────────────────
// Row of filter chips (MAH action-chip style). options = [{ key, label, count? }]
export function ChipRow({ options, value, onChange, label, children }) {
  return (
    <div className="mah-filter-row" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.key} className={`mah-action-chip${value === o.key ? ' is-active' : ''}`}
          aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
          {o.count != null && <span className="mah-chip-count">{o.count}</span>}
        </button>
      ))}
      {children}
    </div>
  );
}

// Summary cards at the top of the Faseh / SFDA / Customs pages. cards = [{ label, value, tone?, note? }]
export function SummaryCards({ cards }) {
  return (
    <div className="clr-summary">
      {cards.map(c => (
        <div key={c.label} className={`clr-summary-card clr-top-${c.tone || 'navy'}`}>
          <span className="clr-summary-label">{c.label}</span>
          <strong className="clr-summary-value">{c.value}</strong>
          {c.note && <span className="mah-small mah-muted">{c.note}</span>}
        </div>
      ))}
    </div>
  );
}

// Small toast that hides itself
export function Toast({ message }) {
  return message ? <div className="mah-toast" role="status">{message}</div> : null;
}
