// MAH portal — Shipment detail with sub-tabs:
// Timeline | Documents | Validation | Customs | Intelligence | Objection
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStateLabel } from './constants';
import {
  apiFetch, stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector,
  SECTOR_CHECKLISTS, CHECKLIST_DOC_TYPES, CLOSED_STATES, objectionDeadline, daysUntil, fmtDate, fmtDateTime,
  Tabs, Empty, Icon, ConfirmDialog, readFileForUpload,
} from './mahShared';
import { RiskPanel } from './MahNewShipment';

const READINESS_TONES = { READY: 'green', WARNING: 'amber', MISSING_INFO: 'amber', CRITICAL_ISSUE: 'red' };
const CUSTOMS_STEPS = ['PENDING', 'DECLARATION_FILED', 'DUTIES_PAID', 'CUSTOMS_RELEASED'];
const CUSTOMS_LABELS = {
  PENDING: 'Pending', DECLARATION_FILED: 'Declaration filed', DUTIES_PAID: 'Duties paid', CUSTOMS_RELEASED: 'Customs released',
};
const TRANSPORT_LABELS = { sea: 'Sea', air: 'Air', land: 'Land' };

export default function MahShipmentDetail({
  token, user, shipment: initial, initialTab, productsById, suppliersById, organisations, navigate, reloadShipments, showToast,
}) {
  const [shipment, setShipment] = useState(initial);
  const [docs, setDocs] = useState(null);
  const [intel, setIntel] = useState(null);
  const [intelError, setIntelError] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(initialTab || 'timeline');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    const [detail, documents, pre] = await Promise.allSettled([
      apiFetch(token, `/shipments/${initial.id}`),
      apiFetch(token, `/documents/${initial.id}`),
      apiFetch(token, `/shipments/${initial.id}/pre-arrival`),
    ]);
    if (detail.status === 'fulfilled') setShipment(detail.value.shipment);
    else setError(detail.reason.message);
    if (documents.status === 'fulfilled') setDocs(documents.value);
    if (pre.status === 'fulfilled') { setIntel(pre.value); setIntelError(null); } else setIntelError(pre.reason.message);
  }, [token, initial.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    await load();
    reloadShipments().catch(() => {});
  };

  const state = stateOf(shipment);
  const canDelete = state === 'DRAFT';
  const canCancel = !['DRAFT', ...CLOSED_STATES].includes(state);

  const doDelete = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}`, { method: 'DELETE' });
      showToast?.(`Shipment deleted — ${shipmentName(shipment, productsById)}`);
      reloadShipments?.().catch(() => {});
      navigate('shipments'); // component unmounts; no further state updates
    } catch (e) {
      setBusy(false);
      if (e.status === 403) {
        setConfirmDelete(false);
        showToast?.('Only draft shipments can be deleted. Contact your DEMARA advisor to cancel a submitted shipment.');
      } else {
        setActionError(e.message);
      }
    }
  };

  const submitCancellation = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/request-cancellation`, { method: 'POST', body: { reason: reason.trim() } });
      setCancelOpen(false);
      setReason('');
      showToast?.('Cancellation request sent to your DEMARA advisor');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const showObjection = ['SFDA_REJECTED', 'OBJECTION_FILED'].includes(state);
  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'documents', label: 'Documents' },
    { key: 'validation', label: 'Validation' },
    { key: 'customs', label: 'Customs' },
    { key: 'intelligence', label: 'Intelligence' },
    ...(showObjection ? [{ key: 'objection', label: 'Objection' }] : []),
  ];
  const activeTab = tabs.some(t => t.key === tab) ? tab : 'timeline';

  const sector = shipmentSector(shipment);
  const checklist = intel?.document_checklist?.length ? intel.document_checklist : (SECTOR_CHECKLISTS[sector] || []);
  const uploaded = Object.fromEntries((docs?.documents || []).map(d => [d.document_type, d]));
  const broker = organisations.find(o => o.id === (shipment.clearance_company_id || shipment.preferred_clearance_company_id));
  const supplierName = suppliersById[shipment.supplier_id]?.name || shipment.supplier_name;

  return (
    <div className="mah-page">
      <button className="mah-link-btn mah-back" onClick={() => navigate('shipments')}><Icon name="back" size={16} /> All shipments</button>

      <section className="mah-card mah-detail-head">
        <div className="mah-detail-title">
          <div>
            <h1>{shipmentName(shipment, productsById)}</h1>
            <div className="mah-row-sub">
              <span className="mah-mono">{shipmentRef(shipment)}</span>
              {shipment.faseh_request_number && <> · Faseh {shipment.faseh_request_number}</>}
            </div>
          </div>
          <div className="mah-detail-badges">
            <SectorBadge sector={sector} />
            <StateBadge state={shipment.current_state} />
          </div>
        </div>
        <div className="mah-facts mah-facts-row">
          <div><span>Supplier</span><strong>{supplierName || '—'}</strong></div>
          <div><span>Port</span><strong>{shipment.port_of_entry || '—'}</strong></div>
          <div><span>Transport</span><strong>{TRANSPORT_LABELS[shipment.transport_mode] || '—'}</strong></div>
          <div><span>ETA</span><strong>{fmtDate(shipment.eta)}</strong></div>
          <div><span>B/L / AWB</span><strong>{shipment.bl_awb_number || '—'}</strong></div>
          <div><span>Clearance company</span><strong>{broker?.name_en || shipment.clearance_company_name || '—'}</strong></div>
          <div><span>Customs</span><strong>{CUSTOMS_LABELS[shipment.customs_state] || '—'}</strong></div>
        </div>
      </section>

      {error && <div className="mah-alert mah-alert-red">{error}</div>}

      <Tabs tabs={tabs} active={activeTab} onChange={setTab} />

      {activeTab === 'timeline' && <TimelineTab shipment={shipment} />}
      {activeTab === 'documents' && (
        <DocumentsTab token={token} shipment={shipment} checklist={checklist} uploaded={uploaded} onChanged={refresh} />
      )}
      {activeTab === 'validation' && (
        <ValidationTab token={token} shipment={shipment} checklist={checklist} uploaded={uploaded}
          docsLoaded={!!docs} broker={broker} onChanged={refresh} goTo={setTab} showToast={showToast} />
      )}
      {activeTab === 'customs' && <CustomsTab token={token} user={user} shipment={shipment} onChanged={refresh} />}
      {activeTab === 'intelligence' && (
        <section className="mah-card">
          <div className="mah-card-head"><h2>Pre-arrival intelligence</h2></div>
          {intelError ? <div className="mah-alert mah-alert-red">{intelError}</div>
            : intel ? <RiskPanel intel={intel} /> : <div className="mah-loading">Scoring shipment…</div>}
        </section>
      )}
      {activeTab === 'objection' && showObjection && (
        <ObjectionTab token={token} shipment={shipment} onChanged={refresh} />
      )}

      {(canDelete || canCancel) && (
        <div className="mah-detail-actions">
          {canDelete && (
            <button className="mah-btn mah-btn-outline-red" onClick={() => { setActionError(null); setConfirmDelete(true); }}>
              <Icon name="x" size={15} /> Delete shipment
            </button>
          )}
          {canCancel && (
            <button className="mah-btn mah-btn-outline-amber" onClick={() => { setActionError(null); setReason(''); setCancelOpen(true); }}>
              Request cancellation
            </button>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog title="Delete shipment" confirmLabel="Delete shipment" tone="red" busy={busy} error={actionError}
          message={`Delete ${shipmentName(shipment, productsById)}? This cannot be undone. The shipment and all its documents will be permanently deleted.`}
          onConfirm={doDelete} onClose={() => { if (!busy) setConfirmDelete(false); }} />
      )}

      {cancelOpen && (
        <ConfirmDialog title="Request cancellation" confirmLabel="Send request →" tone="amber" busy={busy} error={actionError}
          confirmDisabled={reason.trim().length < 20} onConfirm={submitCancellation}
          onClose={() => { if (!busy) setCancelOpen(false); }}>
          <p className="mah-muted mah-small">
            Cancellation requests are reviewed by your DEMARA advisor. The shipment will continue in its current state until the request is approved.
          </p>
          <label className="mah-field">
            <span>Reason for cancellation</span>
            <textarea className="mah-input" rows={4} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why should this shipment be cancelled? (at least 20 characters)" />
            <small className={reason.trim().length < 20 ? 'mah-text-amber' : 'mah-muted'}>{reason.trim().length}/20 minimum</small>
          </label>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ── Timeline ─────────────────────────────────────────
// Also used by the Clearance Portal's shipment detail
export function TimelineTab({ shipment }) {
  const entries = shipment.audit_log || [];
  if (entries.length === 0) return <section className="mah-card"><Empty title="No timeline events yet" /></section>;
  return (
    <section className="mah-card">
      <ol className="mah-timeline">
        {entries.map(e => (
          <li key={e.id}>
            <span className="mah-tl-dot" />
            <div className="mah-tl-body">
              <div className="mah-tl-head">
                <strong>{e.action ? e.action.replace(/_/g, ' ') : e.trigger_event}</strong>
                <span className="mah-muted mah-small">{fmtDateTime(e.occurred_at)}</span>
              </div>
              {e.action && <div className="mah-small">{e.trigger_event}</div>}
              <div className="mah-row-sub">
                {e.actor_name || e.actor_role || 'System'}
                {e.from_state !== e.to_state && <> · {getStateLabel(e.from_state)} → {getStateLabel(e.to_state)}</>}
              </div>
              {e.notes && <div className="mah-tl-note">{e.notes}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Documents ────────────────────────────────────────
function DocumentsTab({ token, shipment, checklist, uploaded, onChanged }) {
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState(null);
  const inputs = useRef({});

  async function upload(docType, file) {
    if (!file) return;
    setBusyType(docType);
    setError(null);
    try {
      const content = await readFileForUpload(file);
      await apiFetch(token, `/documents/${shipment.id}/upload`, {
        method: 'POST', body: { document_type: docType, file_name: file.name, file_content: content },
      });
      await onChanged();
    } catch (e) {
      setError(`${file.name}: ${e.message}`);
    } finally {
      setBusyType(null);
    }
  }

  if (checklist.length === 0) {
    return <section className="mah-card"><Empty title="No sector set">This shipment has no sector, so there is no document checklist.</Empty></section>;
  }

  return (
    <section className="mah-card">
      <div className="mah-card-head">
        <h2>Document checklist</h2>
        <span className="mah-muted mah-small">Each upload is checked by the MASAAR AI validator</span>
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      <div className="mah-doc-grid">
        {checklist.map(name => {
          const docType = CHECKLIST_DOC_TYPES[name];
          const doc = docType && uploaded[docType];
          const tone = doc ? READINESS_TONES[doc.readiness_status] || 'grey' : null;
          return (
            <div key={name} className={`mah-doc-slot${doc ? ' is-uploaded' : ''}`}>
              <div className="mah-doc-icon">{doc ? <Icon name="check" /> : <Icon name="upload" />}</div>
              <div className="mah-grow">
                <div className="mah-row-title">{name}</div>
                {doc ? (
                  <div className="mah-row-sub">
                    {doc.file_name} · <span className={`mah-text-${tone}`}>{(doc.readiness_status || 'Checked').replace(/_/g, ' ')}</span>
                    {doc.validation_result?.score != null && <> · score {doc.validation_result.score}</>}
                  </div>
                ) : (
                  <div className="mah-row-sub">{docType ? 'Missing' : 'Not uploadable in MASAAR yet — send to your broker'}</div>
                )}
              </div>
              {docType && (
                <>
                  <input type="file" hidden accept=".pdf,.txt,.doc,.docx,.jpg,.png"
                    ref={el => { inputs.current[docType] = el; }}
                    onChange={e => { upload(docType, e.target.files[0]); e.target.value = ''; }} />
                  <button className={`mah-btn mah-btn-sm ${doc ? 'mah-btn-ghost' : 'mah-btn-primary'}`}
                    disabled={busyType !== null} onClick={() => inputs.current[docType]?.click()}>
                    {busyType === docType ? 'Checking…' : doc ? 'Replace' : 'Upload'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Validation ───────────────────────────────────────
const PROGRESS_STEPS = {
  DRAFT: {
    to: 'PREPARING', label: 'Start document preparation →', notes: 'MAH started document preparation',
    toast: 'Shipment moved to Preparing',
  },
  PREPARING: {
    to: 'READY_TO_SUBMIT', label: 'Mark as Ready to Submit →', notes: 'MAH marked shipment ready',
    toast: 'Shipment is now Ready to Submit',
    help: 'All required documents must be uploaded before handing over to your broker',
  },
};

function ValidationTab({ token, shipment, checklist, uploaded, docsLoaded, broker, onChanged, goTo, showToast }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const missing = checklist.filter(n => CHECKLIST_DOC_TYPES[n] && !uploaded[CHECKLIST_DOC_TYPES[n]]);
  const manual = checklist.filter(n => !CHECKLIST_DOC_TYPES[n]);
  const checked = checklist.map(n => uploaded[CHECKLIST_DOC_TYPES[n]]).filter(Boolean);
  const critical = checked.filter(d => d.readiness_status === 'CRITICAL_ISSUE');
  const blocking = missing.length + critical.length;
  const state = stateOf(shipment);
  const canConfirm = state === 'READY_TO_SUBMIT' && !!broker;
  const step = PROGRESS_STEPS[state];
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState(null);

  async function advance() {
    setMoving(true);
    setMoveError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/transition`, {
        method: 'PUT', body: { to_state: step.to, notes: step.notes },
      });
      await onChanged();
      showToast?.(step.toast);
    } catch (e) {
      setMoveError(e.message);
    } finally {
      setMoving(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch(token, `/shipments/${shipment.id}/confirm`, {
        method: 'POST', body: { confirmed: true, notes: notes.trim() || undefined },
      });
      setDone(data);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mah-stack">
      {step && (
        <section className="mah-card mah-state-step">
          <button className="mah-btn mah-btn-primary" onClick={advance} disabled={moving}>
            {moving ? 'Updating…' : step.label}
          </button>
          {step.help && <p className="mah-small mah-muted">{step.help}</p>}
          {moveError && <div className="mah-alert mah-alert-red">{moveError}</div>}
        </section>
      )}

      <section className="mah-card">
        <div className="mah-card-head">
          <h2>Layer 1 · Completeness</h2>
          <span className={`mah-badge mah-tone-${missing.length ? 'red' : 'green'}`}>{missing.length ? `${missing.length} missing` : 'Complete'}</span>
        </div>
        {missing.length === 0
          ? <p className="mah-muted">All uploadable required documents are in.</p>
          : (
            <ul className="mah-issue-list">
              {missing.map(n => <li key={n} className="mah-issue-red"><Icon name="alert" size={14} /> {n} is missing</li>)}
            </ul>
          )}
        {manual.length > 0 && (
          <p className="mah-small mah-muted">Not checked here (no upload type yet): {manual.join(', ')}</p>
        )}
        {missing.length > 0 && <button className="mah-link-btn" onClick={() => goTo('documents')}>Upload documents →</button>}
      </section>

      <section className="mah-card">
        <div className="mah-card-head">
          <h2>Layer 2 · Consistency</h2>
          <span className="mah-badge mah-tone-grey">Checking…</span>
        </div>
        <p className="mah-muted">Cross-document checks (names, batches, quantities, dates) are coming in a later release.</p>
      </section>

      <section className="mah-card">
        <div className="mah-card-head">
          <h2>Layer 3 · AI advisory</h2>
          <span className={`mah-badge mah-tone-${critical.length ? 'red' : 'blue'}`}>{critical.length ? `${critical.length} critical` : `${checked.length} reviewed`}</span>
        </div>
        {checked.length === 0
          ? <p className="mah-muted">Upload documents to get the AI review.</p>
          : checklist.filter(n => uploaded[CHECKLIST_DOC_TYPES[n]]).map(n => {
            const d = uploaded[CHECKLIST_DOC_TYPES[n]];
            const v = d.validation_result || {};
            return (
              <div key={n} className={`mah-ai-row mah-edge-${READINESS_TONES[d.readiness_status] || 'grey'}`}>
                <div className="mah-tl-head">
                  <strong>{n}</strong>
                  <span className="mah-small">{(d.readiness_status || '').replace(/_/g, ' ')}{v.score != null ? ` · ${v.score}/100` : ''}</span>
                </div>
                {v.summary && <div className="mah-small">{v.summary}</div>}
                {v.issues?.length > 0 && <ul className="mah-small mah-ai-issues">{v.issues.map(i => <li key={i}>{i}</li>)}</ul>}
              </div>
            );
          })}
        <p className="mah-small mah-muted">Advisory only — fix critical issues before handing over.</p>
      </section>

      <section className="mah-card mah-confirm-card">
        <div className="mah-card-head"><h2>Confirm & hand to broker</h2></div>
        {done ? (
          <div className="mah-alert mah-alert-green">
            Confirmed by {done.quality_record.confirmed_by} at {fmtDateTime(done.confirmed_at)} — handed to {broker?.name_en || 'the broker'}.
          </div>
        ) : (
          <>
            {state === 'READY_TO_SUBMIT' && (
              <p className="mah-muted mah-small">
                {!broker ? 'No clearance company chosen yet — set one before confirming.'
                  : `As RA lead you confirm the dossier is complete. It goes to ${broker.name_en}.`}
              </p>
            )}
            {state === 'READY_TO_SUBMIT' && docsLoaded && blocking > 0 && (
              <div className="mah-alert mah-alert-amber">
                {blocking} open issue{blocking === 1 ? '' : 's'} above — check before handing over.
              </div>
            )}
            <textarea className="mah-input" rows={2} placeholder="Notes for the quality record (optional)"
              value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} disabled={!canConfirm} />
            {error && <div className="mah-alert mah-alert-red">{error}</div>}
            <button className="mah-btn mah-btn-green" onClick={confirm} disabled={!canConfirm || busy}>
              {busy ? 'Confirming…' : 'Confirm & Hand to Broker'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

// ── Customs ──────────────────────────────────────────
const CUSTOMS_ACTIONS = {
  PENDING: { action: 'DECLARATION_FILED', label: 'File declaration', field: 'zatca_ref', input: 'ZATCA declaration ref' },
  DECLARATION_FILED: { action: 'DUTIES_PAID', label: 'Record duties paid', field: 'duties_amount', input: 'Duties amount (SAR)' },
  DUTIES_PAID: { action: 'GATE_OUT', label: 'Record gate out', field: 'gate_out_at', input: 'Gate-out time' },
};

function CustomsTab({ token, user, shipment, onChanged }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const current = shipment.customs_state || 'PENDING';
  const step = CUSTOMS_STEPS.indexOf(current);
  const canAct = ['CLEARANCE_COMPANY', 'DEMARA_ADMIN'].includes(user?.role);
  const next = CUSTOMS_ACTIONS[current];

  async function act() {
    setBusy(true);
    setError(null);
    const v = next.field === 'duties_amount' ? Number(value)
      : next.field === 'gate_out_at' ? new Date(value).toISOString() : value.trim();
    try {
      await apiFetch(token, `/shipments/${shipment.id}/customs`, { method: 'PUT', body: { action: next.action, [next.field]: v } });
      setValue('');
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mah-card">
      <div className="mah-card-head"><h2>Customs track (ZATCA)</h2>{!canAct && <span className="mah-muted mah-small">Read-only — updated by your clearance company</span>}</div>
      <ol className="mah-progress">
        {CUSTOMS_STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'is-done' : i === step ? 'is-active' : ''}>
            <span className="mah-step-num">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>
            <span>{CUSTOMS_LABELS[s]}</span>
          </li>
        ))}
      </ol>
      <div className="mah-facts">
        <div><span>ZATCA declaration ref</span><strong>{shipment.zatca_declaration_ref || '—'}</strong></div>
        <div><span>Duties amount</span><strong>{shipment.duties_amount != null ? `SAR ${Number(shipment.duties_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</strong></div>
        <div><span>Duties paid</span><strong>{fmtDateTime(shipment.duties_paid_at)}</strong></div>
        <div><span>Customs released</span><strong>{fmtDateTime(shipment.customs_released_at)}</strong></div>
        <div><span>Gate out</span><strong>{fmtDateTime(shipment.gate_out_at)}</strong></div>
      </div>
      {canAct && next && (
        <div className="mah-inline-form">
          <input className="mah-input" placeholder={next.input} value={value} onChange={e => setValue(e.target.value)}
            type={next.field === 'duties_amount' ? 'number' : next.field === 'gate_out_at' ? 'datetime-local' : 'text'} />
          <button className="mah-btn mah-btn-primary" disabled={busy || !value} onClick={act}>{busy ? 'Saving…' : next.label}</button>
        </div>
      )}
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
    </section>
  );
}

// ── Objection ────────────────────────────────────────
function ObjectionTab({ token, shipment, onChanged }) {
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [newReasons, setNewReasons] = useState([{ reason_text: '', response_text: '' }]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const state = stateOf(shipment);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch(token, `/shipments/${shipment.id}/objection`);
      setData(d);
      setDrafts(Object.fromEntries(d.objections.map(o => [o.reason_index, o.response_text || ''])));
    } catch (e) {
      setError(e.message);
    }
  }, [token, shipment.id]);
  useEffect(() => { load(); }, [load]);

  const deadline = objectionDeadline(shipment);
  const daysLeft = daysUntil(deadline);
  const rows = data?.objections || [];
  const submitted = !!(data?.submitted_at || shipment.objection_submitted_at);
  const allAnswered = rows.length > 0 && rows.every(o => (o.response_text || '').trim());

  const run = async (key, fn) => {
    setBusy(key);
    setError(null);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(null); }
  };

  const fileObjection = () => run('file', async () => {
    const reasons = newReasons.filter(r => r.reason_text.trim())
      .map((r, i) => ({ reason_index: i, reason_text: r.reason_text.trim(), response_text: r.response_text.trim() || null }));
    await apiFetch(token, `/shipments/${shipment.id}/objection`, { method: 'POST', body: { rejection_reasons: reasons } });
    await load();
    await onChanged();
  });
  // Reasons the clearance company recorded from the SFDA notice: file them with the MAH's responses
  const recorded = state === 'SFDA_REJECTED' && rows.length > 0;
  const fileRecorded = () => run('file', async () => {
    const reasons = rows.map(o => ({
      reason_index: o.reason_index, reason_text: o.reason_text, response_text: (drafts[o.reason_index] || '').trim() || null,
    }));
    await apiFetch(token, `/shipments/${shipment.id}/objection`, { method: 'POST', body: { rejection_reasons: reasons } });
    await load();
    await onChanged();
  });
  const save = (idx) => run(`save-${idx}`, async () => {
    await apiFetch(token, `/shipments/${shipment.id}/objection/${idx}`, { method: 'PUT', body: { response_text: drafts[idx]?.trim() || null } });
    await load();
  });
  const submit = () => run('submit', async () => {
    await apiFetch(token, `/shipments/${shipment.id}/objection/submit`, { method: 'POST' });
    await load();
    await onChanged();
  });

  return (
    <div className="mah-stack">
      <section className={`mah-card mah-countdown${daysLeft !== null && daysLeft <= 10 ? ' is-urgent' : ''}`}>
        <div className="mah-countdown-days">{daysLeft === null ? '—' : Math.max(daysLeft, 0)}<span>days left</span></div>
        <div>
          <strong>Objection deadline · {fmtDate(deadline)}</strong>
          <div className="mah-row-sub">SFDA allows 60 days from the rejection to file a reasoned objection.</div>
          {data && <div className="mah-small">{data.completion_pct}% of reasons answered{submitted && ` · submitted ${fmtDateTime(data.submitted_at)}`}</div>}
        </div>
      </section>

      {error && <div className="mah-alert mah-alert-red">{error}</div>}

      {state === 'SFDA_REJECTED' && data && rows.length === 0 && (
        <section className="mah-card">
          <div className="mah-card-head"><h2>Start objection dossier</h2></div>
          <p className="mah-muted mah-small">Enter each rejection reason from the SFDA notice. You can write responses now or later.</p>
          {newReasons.map((r, i) => (
            <div key={i} className="mah-reason-card">
              <div className="mah-reason-num">Reason {i + 1}</div>
              <input className="mah-input" placeholder="SFDA rejection reason" value={r.reason_text}
                onChange={e => setNewReasons(prev => prev.map((x, j) => (j === i ? { ...x, reason_text: e.target.value } : x)))} />
              <textarea className="mah-input" rows={2} placeholder="Your response (optional for now)" value={r.response_text}
                onChange={e => setNewReasons(prev => prev.map((x, j) => (j === i ? { ...x, response_text: e.target.value } : x)))} />
            </div>
          ))}
          <div className="mah-row-actions">
            <button className="mah-btn mah-btn-ghost" onClick={() => setNewReasons(prev => [...prev, { reason_text: '', response_text: '' }])}>
              <Icon name="plus" size={16} /> Add reason
            </button>
            <button className="mah-btn mah-btn-red" onClick={fileObjection}
              disabled={busy !== null || !newReasons.some(r => r.reason_text.trim())}>
              {busy === 'file' ? 'Filing…' : 'File objection'}
            </button>
          </div>
        </section>
      )}

      {recorded && (
        <div className="mah-alert mah-alert-amber">
          Your clearance company recorded {rows.length} rejection reason{rows.length === 1 ? '' : 's'} from the SFDA notice.
          Write your responses below, then file the objection.
        </div>
      )}

      {rows.map(o => {
        const dirty = (drafts[o.reason_index] || '') !== (o.response_text || '');
        return (
          <section key={o.id} className={`mah-card mah-reason-card mah-edge-${(o.response_text || '').trim() ? 'green' : 'red'}`}>
            <div className="mah-reason-num">Reason {o.reason_index + 1}</div>
            <div className="mah-row-title">{o.reason_text}</div>
            <textarea className="mah-input" rows={3} placeholder="Your response to this reason" disabled={submitted}
              value={drafts[o.reason_index] ?? ''} onChange={e => setDrafts(prev => ({ ...prev, [o.reason_index]: e.target.value }))} />
            {!submitted && !recorded && (
              <div className="mah-row-actions">
                <span className="mah-small mah-muted">{o.responded_at ? `Saved ${fmtDateTime(o.responded_at)}` : 'Not answered yet'}</span>
                <button className="mah-btn mah-btn-sm mah-btn-primary" disabled={!dirty || busy !== null} onClick={() => save(o.reason_index)}>
                  {busy === `save-${o.reason_index}` ? 'Saving…' : 'Save response'}
                </button>
              </div>
            )}
          </section>
        );
      })}

      {recorded && (
        <section className="mah-card mah-row-actions">
          <span className="mah-small mah-muted">Responses can also be added after filing, before you submit the dossier.</span>
          <button className="mah-btn mah-btn-red" disabled={busy !== null} onClick={fileRecorded}>
            {busy === 'file' ? 'Filing…' : 'File objection'}
          </button>
        </section>
      )}

      {rows.length > 0 && !submitted && !recorded && (
        <section className="mah-card mah-row-actions">
          <span className="mah-small mah-muted">{allAnswered ? 'All reasons answered — ready to submit.' : 'Every reason needs a saved response before you can submit.'}</span>
          <button className="mah-btn mah-btn-red" disabled={!allAnswered || busy !== null} onClick={submit}>
            {busy === 'submit' ? 'Submitting…' : 'Submit objection dossier'}
          </button>
        </section>
      )}
      {submitted && <div className="mah-alert mah-alert-green">Objection dossier submitted {fmtDateTime(data?.submitted_at)}.</div>}
    </div>
  );
}
