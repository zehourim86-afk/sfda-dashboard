// Shared helpers for the Admin Panel (Admin*.js files). Builds on mahShared.js, clearanceShared.js and sfdaShared.js.
import { useState } from 'react';
import { apiFetch, stateOf, StateBadge, shipmentName, CLOSED_STATES } from './mahShared';
import { getStateLabel, SHIPMENT_STATES } from './constants';
import { daysSince } from './clearanceShared';

export { SHIPMENT_STATES };

// Mirror of TRANSITIONS in sfda-platform/src/routes/stateMachine.js. DEMARA_ADMIN may take every one,
// and may also withdraw any shipment that is not closed. The server re-checks every move.
const TRANSITIONS = {
  DRAFT: ['PREPARING', 'WITHDRAWN'],
  PREPARING: ['READY_TO_SUBMIT', 'DRAFT'],
  READY_TO_SUBMIT: ['WITH_BROKER', 'PREPARING'],
  WITH_BROKER: ['SUBMITTED', 'PREPARING'],
  SUBMITTED: ['SFDA_INFO_REQUESTED', 'SAMPLING', 'SFDA_RELEASED', 'SFDA_REJECTED'],
  SFDA_INFO_REQUESTED: ['SUBMITTED'],
  SAMPLING: ['SFDA_RELEASED', 'PARTIALLY_RELEASED', 'SFDA_REJECTED'],
  SFDA_RELEASED: ['CLOSED_RELEASED'],
  PARTIALLY_RELEASED: ['CLOSED_RELEASED'],
  SFDA_REJECTED: ['OBJECTION_FILED', 'DISPOSITION_PENDING'],
  OBJECTION_FILED: ['SFDA_RELEASED', 'SFDA_REJECTED'],
  DISPOSITION_PENDING: ['CLOSED_REEXPORTED', 'CLOSED_DESTROYED'],
};
export function nextStates(state) {
  const next = [...(TRANSITIONS[state] || [])];
  if (!CLOSED_STATES.includes(state) && !next.includes('WITHDRAWN')) next.push('WITHDRAWN');
  return next;
}
export const isClosedState = (s) => CLOSED_STATES.includes(stateOf(s));

export const INFO_REQUEST_OPTIONS = [
  { value: 'CLEARANCE_HANDLED', label: 'Clearance company handles it' },
  { value: 'MAH_INPUT_NEEDED', label: 'MAH input needed' },
];

// ── Organisations ────────────────────────────────────
export const ORG_TYPE_LABELS = {
  IMPORTER: 'MAH / Importer', MAH: 'MAH / Importer', CLEARANCE_COMPANY: 'Clearance', LAB: 'Laboratory',
  SHIPPING_COMPANY: 'Shipping', SFDA: 'SFDA', MANUFACTURER: 'Manufacturer', NOTIFIED_BODY: 'Notified body', OTHER: 'Other',
};
export const MAH_ORG_TYPES = ['IMPORTER', 'MAH', 'DISTRIBUTOR'];
export const orgTypeLabel = (t) => ORG_TYPE_LABELS[t] || (t ? t.replace(/_/g, ' ').toLowerCase() : '—');
// Shipments an organisation is involved in (as owner, broker or lab)
export const orgShipments = (org, shipments) => shipments.filter(s =>
  [s.org_id, s.clearance_company_id, s.lab_id, s.shipping_company_id].some(id => id != null && String(id) === String(org.id)));

const REJECTED = ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];
const DECIDED = [...REJECTED, 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'CUSTOMS_RELEASED', 'CLOSED_RELEASED', 'CONDITIONALLY_RELEASED'];
// % of decided shipments that were rejected, or null when nothing is decided
export function rejectionRate(list) {
  const decided = list.filter(s => DECIDED.includes(stateOf(s)));
  if (!decided.length) return null;
  return Math.round((decided.filter(s => REJECTED.includes(stateOf(s))).length / decided.length) * 100);
}
export const lastActivity = (list) => list.reduce((max, s) => (!max || new Date(s.updated_at) > new Date(max) ? s.updated_at : max), null);

// ── Alerts ───────────────────────────────────────────
export const DISPOSITION_ALERT_DAYS = 14;
// Pending cancellation requests: CANCELLATION_REQUESTED entries without a later rejection, on open shipments.
// audit = rows from GET /admin/audit-log (or null when unavailable)
export function pendingCancellations(audit, shipmentsById) {
  if (!audit) return [];
  const rejectedAt = {};
  for (const e of audit) {
    if (e.action === 'CANCELLATION_REJECTED' && (!rejectedAt[e.shipment_id] || e.occurred_at > rejectedAt[e.shipment_id])) {
      rejectedAt[e.shipment_id] = e.occurred_at;
    }
  }
  const latest = {};
  for (const e of audit) {
    if (e.action !== 'CANCELLATION_REQUESTED') continue;
    const s = shipmentsById[e.shipment_id];
    if (!s || isClosedState(s)) continue;
    if (rejectedAt[e.shipment_id] && new Date(rejectedAt[e.shipment_id]) >= new Date(e.occurred_at)) continue;
    if (!latest[e.shipment_id] || e.occurred_at > latest[e.shipment_id].occurred_at) latest[e.shipment_id] = e;
  }
  return Object.values(latest);
}

// Every alert as { key, kind, shipment, why }. withdrawals = audit rows with to_state WITHDRAWN (null = unknown).
export function buildAlerts(shipments, { cancellations = [], withdrawals = null } = {}) {
  const alerts = [];
  for (const s of shipments) {
    const st = stateOf(s);
    if (st === 'SFDA_REJECTED' && Number(s.objection_count) >= 2) {
      alerts.push({ kind: 'objections', shipment: s, why: `${s.objection_count} objection rounds — decide on further escalation`, tone: 'red' });
    }
    if (st === 'DISPOSITION_PENDING' && daysSince(s.state_entered_at) > DISPOSITION_ALERT_DAYS) {
      alerts.push({ kind: 'disposition', shipment: s, why: `Disposition pending over ${DISPOSITION_ALERT_DAYS} days — deadline at risk`, tone: 'red' });
    }
    if (st === 'WITHDRAWN' && withdrawals) {
      const entry = withdrawals.filter(e => e.shipment_id === s.id).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))[0];
      if (!entry || !(entry.notes || '').trim()) {
        alerts.push({ kind: 'withdrawn', shipment: s, why: 'Withdrawn with no notes — data quality issue', tone: 'amber' });
      }
    }
  }
  for (const c of cancellations) {
    const s = shipments.find(x => x.id === c.shipment_id);
    if (s) alerts.push({ kind: 'cancellation', shipment: s, why: `Cancellation requested${c.actor_name ? ` by ${c.actor_name}` : ''}`, tone: 'amber' });
  }
  return alerts.map(a => ({ ...a, key: `${a.kind}-${a.shipment.id}` }));
}

// ── Modals ───────────────────────────────────────────
function ModalShell({ title, onClose, children, footer }) {
  return (
    // stopPropagation: these modals can open on top of another modal's backdrop
    <div className="mah-modal-backdrop adm-modal-layer" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="mah-modal adm-modal-sm" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <strong>{title}</strong>
          <button className="mah-ai-close sfda-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mah-modal-body">{children}</div>
        <div className="mah-modal-foot">{footer}</div>
      </div>
    </div>
  );
}

// Admin transition via the normal state machine route
export function TransitionModal({ token, shipment, productsById, onClose, onDone }) {
  const options = nextStates(stateOf(shipment)).filter(s => s !== 'WITHDRAWN');
  const [toState, setToState] = useState(options[0] || '');
  const [infoType, setInfoType] = useState(INFO_REQUEST_OPTIONS[0].value);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/transition`, {
        method: 'PUT',
        body: { to_state: toState, notes: notes.trim(), ...(toState === 'SFDA_INFO_REQUESTED' ? { info_request_type: infoType } : {}) },
      });
      await onDone(`${shipmentName(shipment, productsById)} moved to ${getStateLabel(toState)}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalShell title={`Transition — ${shipmentName(shipment, productsById)}`} onClose={onClose} footer={<>
      <button className="mah-btn mah-btn-ghost" onClick={onClose}>Cancel</button>
      <button className="mah-btn mah-btn-primary" onClick={apply} disabled={busy || !toState || !notes.trim()}>
        {busy ? 'Applying…' : 'Apply transition'}
      </button>
    </>}>
      <div className="adm-current"><span className="mah-muted mah-small">Current state</span><StateBadge state={shipment.current_state} /></div>
      {options.length === 0 ? <div className="mah-alert mah-alert-amber">No transitions are available from this state. Use Override Tools to force a state.</div> : (
        <>
          <label className="mah-field">
            <span>Move to</span>
            <select className="mah-input" value={toState} onChange={e => setToState(e.target.value)}>
              {options.map(s => <option key={s} value={s}>{getStateLabel(s)}</option>)}
            </select>
          </label>
          {toState === 'SFDA_INFO_REQUESTED' && (
            <label className="mah-field">
              <span>Who handles the request</span>
              <select className="mah-input" value={infoType} onChange={e => setInfoType(e.target.value)}>
                {INFO_REQUEST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          )}
          <label className="mah-field">
            <span>Notes (required)</span>
            <textarea className="mah-input" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Why is DEMARA making this move?" />
          </label>
        </>
      )}
      {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
    </ModalShell>
  );
}

export function WithdrawModal({ token, shipment, productsById, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const name = shipmentName(shipment, productsById);

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/transition`, { method: 'PUT', body: { to_state: 'WITHDRAWN', notes: notes.trim() } });
      await onDone(`${name} withdrawn`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Withdraw shipment" onClose={onClose} footer={<>
      <button className="mah-btn mah-btn-ghost" onClick={onClose}>Cancel</button>
      <button className="mah-btn mah-btn-red" onClick={withdraw} disabled={busy || !notes.trim()}>{busy ? 'Withdrawing…' : 'Withdraw shipment'}</button>
    </>}>
      <div className="mah-alert mah-alert-red">Withdraw shipment {name}? This cannot be undone.</div>
      <label className="mah-field">
        <span>Notes (required)</span>
        <textarea className="mah-input" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Reason for withdrawal" />
      </label>
      {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
    </ModalShell>
  );
}

export function ConfirmModal({ title, message, confirmLabel, tone = 'primary', onConfirm, onClose, busy, error }) {
  return (
    <ModalShell title={title} onClose={onClose} footer={<>
      <button className="mah-btn mah-btn-ghost" onClick={onClose}>Cancel</button>
      <button className={`mah-btn mah-btn-${tone}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>
      <p>{message}</p>
      {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
    </ModalShell>
  );
}

// ── Charts (inline SVG) ──────────────────────────────
// Categorical slots in fixed order (dataviz reference palette, light mode)
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];

// Single-series column chart. data = [{ label, value }]
export function ColumnChart({ data, height = 160, unit = '' }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const w = 100 / data.length;
  return (
    <div className="adm-columns" style={{ height }} role="img"
      aria-label={data.map(d => `${d.label}: ${d.value}${unit}`).join(', ')}>
      {data.map((d, i) => (
        <div key={i} className="adm-col" style={{ width: `${w}%` }} title={`${d.label}: ${d.value}${unit}`}>
          <span className="adm-col-value">{d.value}</span>
          <span className="adm-col-bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="adm-col-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut with a legend that also lists the values. items = [{ label, value }]
export function Donut({ items, size = 150, stroke = 22 }) {
  const total = items.reduce((t, i) => t + i.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = items.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <div className="adm-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="State distribution">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F6" strokeWidth={stroke} />
        {total > 0 && items.map((it, i) => {
          const len = (it.value / total) * c;
          const seg = (
            <circle key={it.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <title>{`${it.label}: ${it.value}`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="adm-donut-total">{total}</text>
        <text x="50%" y="62%" textAnchor="middle" className="adm-donut-sub">shipments</text>
      </svg>
      <ul className="adm-legend">
        {items.map((it, i) => (
          <li key={it.label}>
            <span className="adm-swatch" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="mah-grow">{it.label}</span>
            <strong>{it.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
