// Shared helpers for the SFDA Observer Portal (Sfda*.js files). Builds on mahShared.js and clearanceShared.js.
// ShipmentModal is also used by the Admin Panel.
import { useEffect, useState } from 'react';
import {
  apiFetch, stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector,
  fmtDate, fmtDateTime, Empty,
} from './mahShared';
import { TimelineTab } from './MahShipmentDetail';
import { SAMPLING_STEPS, SAMPLING_LABELS, CUSTOMS_LABELS, daysSince } from './clearanceShared';

// ── State groups ─────────────────────────────────────
export const WAITING_STATES = ['SUBMITTED', 'SFDA_INFO_REQUESTED'];
export const RELEASED_DECISIONS = ['SFDA_RELEASED', 'CLOSED_RELEASED'];
export const PARTIAL_DECISIONS = ['PARTIALLY_RELEASED'];
export const REJECTED_DECISIONS = ['SFDA_REJECTED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];
export const DECIDED_STATES = [...RELEASED_DECISIONS, ...PARTIAL_DECISIONS, ...REJECTED_DECISIONS];

export const SAMPLING_TONES = {
  SAMPLING_ORDERED: 'blue', SAMPLE_COLLECTED: 'amber', SAMPLE_AT_LAB: 'purple', RESULTS_SUBMITTED: 'green',
};
export function SamplingBadge({ value }) {
  if (!value || value === 'NOT_APPLICABLE') return <span className="mah-muted">—</span>;
  return <span className={`mah-badge mah-tone-${SAMPLING_TONES[value] || 'grey'}`}>{SAMPLING_LABELS[value] || value}</span>;
}

// ── Shipment fields ──────────────────────────────────
// MAH company: the organisation that owns the shipment, else the importer name on the record
export function mahCompany(s, orgsById) {
  return orgsById?.[s.org_id]?.name_en || s.importer_name || s.importer_full_name || '—';
}
// When the shipment reached SFDA
export const submittedAt = (s) => s.faseh_filed_at || (WAITING_STATES.includes(stateOf(s)) ? s.state_entered_at : null);
export const decisionAt = (s) => s.sfda_decided_at || s.state_entered_at;
export function decisionKind(s) {
  const st = stateOf(s);
  if (RELEASED_DECISIONS.includes(st)) return { label: 'Released', tone: 'green' };
  if (PARTIAL_DECISIONS.includes(st)) return { label: 'Partially released', tone: 'amber' };
  if (REJECTED_DECISIONS.includes(st)) return { label: 'Rejected', tone: 'red' };
  return null;
}
// Whole days between two dates, or null
export function daysBetween(from, to) {
  if (!from || !to) return null;
  const ms = new Date(to) - new Date(from);
  return Number.isNaN(ms) ? null : Math.max(0, Math.floor(ms / 86400000));
}
export const objectionFiled = (s) => Number(s.objection_count) > 0 || !!s.objection_submitted_at;
export const fmtDays = (d) => (d == null ? '—' : `${d}d`);

export function matchesSearch(s, q, productsById, extra = []) {
  if (!q) return true;
  return [shipmentName(s, productsById), s.masaar_id, s.faseh_request_number, ...extra]
    .some(v => v && String(v).toLowerCase().includes(q));
}

// ── Internal notes (SFDA only) — saved in this browser only ──
const notesKey = (id) => `sfda_notes_${id}`;
function readNotes(id) {
  try { return JSON.parse(localStorage.getItem(notesKey(id)) || '[]'); } catch { return []; }
}
function writeNotes(id, notes) {
  try { localStorage.setItem(notesKey(id), JSON.stringify(notes)); return true; } catch { return false; }
}

function InternalNotes({ shipmentId, author }) {
  const [notes, setNotes] = useState(() => readNotes(shipmentId));
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  const add = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const next = [{ text: body, at: new Date().toISOString(), author }, ...notes];
    if (!writeNotes(shipmentId, next)) { setError('This browser blocked saving the note.'); return; }
    setNotes(next);
    setText('');
    setError(null);
  };

  return (
    <section className="mah-stack">
      <div className="mah-card-head">
        <h2>Internal notes</h2>
        <span className="mah-badge mah-tone-purple">SFDA only · this device</span>
      </div>
      <form className="mah-stack" onSubmit={add}>
        <textarea className="mah-input" rows={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)}
          placeholder="Add a note for SFDA colleagues…" aria-label="Internal note" />
        <button type="submit" className="mah-btn mah-btn-primary mah-btn-sm mah-self-start" disabled={!text.trim()}>Add note</button>
      </form>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      {notes.length === 0 ? <p className="mah-muted mah-small">No internal notes yet.</p> : (
        <ul className="sfda-notes">
          {notes.map((n, i) => (
            <li key={i}>
              <div className="mah-row-sub">{n.author || 'SFDA'} · {fmtDateTime(n.at)}</div>
              <div>{n.text}</div>
            </li>
          ))}
        </ul>
      )}
      <p className="mah-small mah-muted">Notes are stored in this browser only and are never shared with the MAH or broker.</p>
    </section>
  );
}

// ── Sampling sub-track ───────────────────────────────
export function SamplingTrack({ shipment }) {
  const current = shipment.sampling_state;
  const reached = current === 'SAMPLING_COMPLETE' ? SAMPLING_STEPS.length : SAMPLING_STEPS.indexOf(current);
  return (
    <ol className="mah-progress" aria-label="Sampling progress">
      {SAMPLING_STEPS.map((step, i) => (
        <li key={step} className={i < reached ? 'is-done' : i === reached ? 'is-active' : ''}>
          <span className="mah-step-num">{i + 1}</span>
          <span className="mah-step-label">{SAMPLING_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

const isSamplingEntry = (e) => /sampl|lab/i.test(`${e.action || ''} ${e.trigger_event || ''}`)
  || e.to_state === 'SAMPLING' || e.from_state === 'SAMPLING';

// ── Read-only shipment detail modal ──────────────────
// focus='sampling' puts the sampling sub-track first. notesAuthor enables SFDA internal notes.
// footer = extra buttons (the Admin Panel passes its actions).
export function ShipmentModal({ token, shipment: initial, productsById, orgsById, onClose, focus, notesAuthor, footer }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(token, `/shipments/${initial.id}`)
      .then(d => { if (!cancelled) setDetail(d.shipment); })
      .catch(e => { if (!cancelled) setError(e.status === 403 || e.status === 404 ? 'Timeline and documents are not available for your role yet.' : e.message); });
    return () => { cancelled = true; };
  }, [token, initial.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = detail ? { ...initial, ...detail } : initial;
  const sampled = s.sampling_state && s.sampling_state !== 'NOT_APPLICABLE';
  const audit = detail?.audit_log || [];
  const docs = detail?.documents || [];

  const sampling = sampled && (
    <section className="mah-stack">
      <div className="mah-card-head"><h2>Sampling</h2><SamplingBadge value={s.sampling_state} /></div>
      <SamplingTrack shipment={s} />
      <div className="mah-facts">
        <div><span>Location</span><strong>{s.sampling_location || '—'}</strong></div>
        <div><span>Scheduled</span><strong>{fmtDate(s.sampling_scheduled_date)}</strong></div>
        <div><span>Lab</span><strong>{s.sampling_lab_name || s.lab_name || '—'}</strong></div>
        <div><span>Days in sampling</span><strong>{fmtDays(stateOf(s) === 'SAMPLING' ? daysSince(s.state_entered_at) : null)}</strong></div>
      </div>
      {s.sampling_results_summary && <div className="mah-tl-note">{s.sampling_results_summary}</div>}
      {focus === 'sampling' && detail && (
        <>
          <h3 className="mah-h3">Sampling timeline</h3>
          <TimelineTab shipment={{ audit_log: audit.filter(isSamplingEntry) }} />
        </>
      )}
    </section>
  );

  return (
    <div className="mah-modal-backdrop" onClick={onClose}>
      <div className="mah-modal sfda-modal" role="dialog" aria-modal="true" aria-label={shipmentName(s, productsById)} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <div>
            <strong>{shipmentName(s, productsById)}</strong>
            <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span>{s.faseh_request_number && <> · Faseh {s.faseh_request_number}</>}</div>
          </div>
          <div className="mah-detail-badges">
            <SectorBadge sector={shipmentSector(s)} />
            <StateBadge state={s.current_state} />
            <button className="mah-ai-close sfda-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="mah-modal-body">
          <div className="mah-facts">
            <div><span>MAH company</span><strong>{mahCompany(s, orgsById)}</strong></div>
            <div><span>Clearance company</span><strong>{s.clearance_company_name || '—'}</strong></div>
            <div><span>Supplier</span><strong>{s.supplier_name || '—'}</strong></div>
            <div><span>Port</span><strong>{s.port_of_entry || '—'}</strong></div>
            <div><span>ETA</span><strong>{fmtDate(s.eta)}</strong></div>
            <div><span>Submitted</span><strong>{fmtDate(submittedAt(s))}</strong></div>
            <div><span>Days in state</span><strong>{fmtDays(daysSince(s.state_entered_at))}</strong></div>
            <div><span>Customs</span><strong>{CUSTOMS_LABELS[s.customs_state] || '—'}</strong></div>
          </div>

          {focus === 'sampling' && sampling}

          {error && <div className="mah-alert mah-alert-amber">{error}</div>}

          <section className="mah-stack">
            <h2>Documents</h2>
            {!detail && !error ? <div className="mah-loading">Loading…</div>
              : docs.length === 0 ? <p className="mah-muted mah-small">No documents on record.</p> : (
                <ul className="sfda-doc-list">
                  {docs.map(d => (
                    <li key={d.id}><span className="mah-row-title">{(d.document_type || 'Document').replace(/_/g, ' ')}</span>
                      <span className="mah-muted mah-small">{d.file_name}</span></li>
                  ))}
                </ul>
              )}
          </section>

          {focus !== 'sampling' && sampling}

          <section className="mah-stack">
            <h2>Audit timeline</h2>
            {!detail && !error ? <div className="mah-loading">Loading…</div>
              : audit.length === 0 ? <Empty title="No timeline events available" /> : <TimelineTab shipment={{ audit_log: audit }} />}
          </section>

          {notesAuthor && <InternalNotes shipmentId={s.id} author={notesAuthor} />}
        </div>
        {footer && <div className="mah-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
