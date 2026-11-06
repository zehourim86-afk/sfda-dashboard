// Admin Panel — Override Tools: force a state, process cancellation requests, escalation job control (UI only).
import { useState } from 'react';
import { apiFetch, StateBadge, shipmentName, shipmentRef, fmtDateTime, Empty } from './mahShared';
import { getStateLabel } from './constants';
import { mahCompany, matchesSearch } from './sfdaShared';
import { SHIPMENT_STATES } from './adminShared';

const MIN_NOTES = 20;
const SEARCH_LIMIT = 8;

export default function AdminOverrideTools(props) {
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Override tools</h1>
          <p className="mah-muted">For exceptional situations only. Every action here is written to the audit log.</p>
        </div>
      </div>
      <ForceState {...props} />
      <CancellationProcessor {...props} />
      <EscalationControl />
    </div>
  );
}

// ── Tool 1 — Manual state override ───────────────────
function ForceState({ token, shipments, shipmentsById, productsById, orgsById, afterChange }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const q = search.trim().toLowerCase();
  const results = q ? shipments.filter(s => matchesSearch(s, q, productsById)).slice(0, SEARCH_LIMIT) : [];
  const selected = selectedId ? shipmentsById[selectedId] : null;
  const notesOk = notes.trim().length >= MIN_NOTES;

  const apply = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await apiFetch(token, `/admin/shipments/${selected.id}/force-state`, { method: 'PUT', body: { state: target, notes: notes.trim() } });
      const message = `${shipmentName(selected, productsById)} forced to ${getStateLabel(target)}`;
      await afterChange(message);
      setDone(message);
      setNotes('');
      setTarget('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mah-card adm-tool adm-tool-red">
      <div className="mah-card-head"><h2>1 · Manual state override</h2></div>
      <div className="mah-alert mah-alert-red">⚠ This bypasses the state machine. Use only when instructed by SFDA or legal counsel.</div>

      <label className="mah-field">
        <span>Find shipment</span>
        <input className="mah-input" value={search} onChange={e => { setSearch(e.target.value); setSelectedId(null); setDone(null); }}
          placeholder="Search by name or MSR ID…" />
      </label>
      {q && !selected && (
        results.length === 0 ? <p className="mah-muted mah-small">No shipments match.</p> : (
          <div className="adm-search-results">
            {results.map(s => (
              <button key={s.id} className="mah-list-row" onClick={() => { setSelectedId(s.id); setTarget(''); setError(null); }}>
                <div className="mah-action-main">
                  <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                  <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · {mahCompany(s, orgsById)}</div>
                </div>
                <StateBadge state={s.current_state} />
              </button>
            ))}
          </div>
        )
      )}

      {selected && (
        <div className="clr-inline-panel">
          <div className="adm-current">
            <span><strong>{shipmentName(selected, productsById)}</strong> <span className="mah-mono mah-muted">{shipmentRef(selected)}</span></span>
            <span className="mah-muted mah-small">Current</span><StateBadge state={selected.current_state} />
          </div>
          <div className="mah-form-grid">
            <label className="mah-field">
              <span>Force to state</span>
              <select className="mah-input" value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">Select a state…</option>
                {SHIPMENT_STATES.map(st => (
                  <option key={st} value={st} disabled={st === selected.current_state}>{getStateLabel(st)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mah-field">
            <span>Notes (required, at least {MIN_NOTES} characters)</span>
            <textarea className="mah-input" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Who instructed this override, and why?" />
            <small>{notes.trim().length}/{MIN_NOTES} minimum</small>
          </label>
          {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
          <div className="mah-row-actions">
            <button className="mah-btn mah-btn-ghost mah-btn-sm" onClick={() => setSelectedId(null)}>Cancel</button>
            <button className="mah-btn mah-btn-red" onClick={apply} disabled={busy || !target || !notesOk}>
              {busy ? 'Forcing…' : 'Force state'}
            </button>
          </div>
        </div>
      )}
      {done && <div className="mah-alert mah-alert-green">{done}</div>}
    </section>
  );
}

// ── Tool 2 — Cancellation request processor ──────────
function CancellationProcessor({ token, cancellations, cancelAuditAvailable, shipmentsById, productsById, orgsById, afterChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [rejecting, setRejecting] = useState(null); // shipment id
  const [reason, setReason] = useState('');

  const act = async (key, fn, message) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setRejecting(null);
      setReason('');
      await afterChange(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mah-card adm-tool">
      <div className="mah-card-head">
        <h2>2 · Cancellation requests</h2>
        <span className={`mah-count-pill mah-tone-${cancellations.length ? 'amber' : 'grey'}`}>{cancellations.length}</span>
      </div>
      {!cancelAuditAvailable && <div className="mah-alert mah-alert-amber">The audit-log endpoint did not respond, so requests can't be listed.</div>}
      {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
      {cancelAuditAvailable && cancellations.length === 0 && <Empty title="No open cancellation requests" />}
      {cancellations.map(c => {
        const s = shipmentsById[c.shipment_id];
        const name = shipmentName(s, productsById);
        return (
          <div key={c.id} className="mah-action-row mah-edge-amber adm-cancel-row">
            <div className="mah-action-main">
              <div className="mah-row-title">{name}</div>
              <div className="mah-row-sub">
                <span className="mah-mono">{shipmentRef(s)}</span> · {mahCompany(s, orgsById)} · requested by {c.actor_name || c.actor_email || 'unknown'} · {fmtDateTime(c.occurred_at)}
              </div>
              <div className="mah-tl-note">{c.notes || c.trigger_event || 'No reason given'}</div>
              {rejecting === s.id && (
                <div className="mah-inline-form adm-reject-form">
                  <input className="mah-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is the request rejected?" maxLength={2000} />
                  <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => setRejecting(null)}>Cancel</button>
                  <button className="mah-btn mah-btn-sm mah-btn-amber" disabled={!reason.trim() || busy}
                    onClick={() => act(`reject-${s.id}`, () => apiFetch(token, `/admin/shipments/${s.id}/cancellation-rejection`, {
                      method: 'POST', body: { notes: reason.trim() },
                    }), `Cancellation request for ${name} rejected`)}>
                    {busy === `reject-${s.id}` ? 'Saving…' : 'Confirm rejection'}
                  </button>
                </div>
              )}
            </div>
            <StateBadge state={s.current_state} />
            {rejecting !== s.id && (
              <div className="adm-row-actions">
                <button className="mah-btn mah-btn-sm mah-btn-ghost" disabled={!!busy} onClick={() => { setRejecting(s.id); setReason(''); }}>Reject request</button>
                <button className="mah-btn mah-btn-sm mah-btn-red" disabled={!!busy}
                  onClick={() => act(`approve-${s.id}`, () => apiFetch(token, `/shipments/${s.id}/transition`, {
                    method: 'PUT', body: { to_state: 'WITHDRAWN', notes: `Cancellation approved by DEMARA admin. Request: ${c.notes || c.trigger_event || 'no reason given'}` },
                  }), `${name} withdrawn — cancellation approved`)}>
                  {busy === `approve-${s.id}` ? 'Withdrawing…' : 'Approve cancellation'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ── Tool 3 — Escalation job control (UI only) ────────
const LAST_RUN = { at: '2026-11-06T06:00:00+03:00', checked: 42, escalated: 3, emails: 0 };

function EscalationControl() {
  const [dryRun, setDryRun] = useState(true);
  const [ranAt, setRanAt] = useState(null);

  return (
    <section className="mah-card adm-tool">
      <div className="mah-card-head">
        <h2>3 · Escalation job</h2>
        <span className={`mah-badge mah-tone-${dryRun ? 'amber' : 'green'}`}>{dryRun ? 'Dry run' : 'Live'}</span>
      </div>
      <div className="mah-demo-banner">UI ONLY — these controls do not change the server's ESCALATION_DRY_RUN setting yet</div>
      <div className="mah-row-actions">
        <label className="mah-switch">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
          <span className="mah-switch-track"><span className="mah-switch-thumb" /></span>
          ESCALATION_DRY_RUN
        </label>
        <span className="mah-grow" />
        <button className="mah-btn mah-btn-primary mah-btn-sm" onClick={() => setRanAt(new Date())}>Run escalation job now</button>
      </div>
      <div className="mah-facts">
        <div><span>Last run</span><strong>{fmtDateTime(ranAt || LAST_RUN.at)}</strong></div>
        <div><span>Shipments checked</span><strong>{LAST_RUN.checked}</strong></div>
        <div><span>Escalations found</span><strong>{LAST_RUN.escalated}</strong></div>
        <div><span>Emails sent</span><strong>{dryRun ? '0 (dry run)' : LAST_RUN.emails}</strong></div>
      </div>
      {ranAt && <p className="mah-small mah-muted">Manual run recorded locally — no job was triggered on the server.</p>}
    </section>
  );
}
