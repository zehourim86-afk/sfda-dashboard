// MAH portal — Shipment detail with sub-tabs:
// Timeline | Documents | Validation | Customs | Intelligence | Objection | Certificate (CLOSED_RELEASED)
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, getStateLabel } from './constants';
import {
  apiFetch, stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector,
  CLOSED_STATES, objectionDeadline, daysUntil, fmtDate, fmtDateTime,
  Tabs, Empty, Icon, ConfirmDialog, readFileForUpload, PRE_BROKER_STATES, agreementInEffect,
} from './mahShared';
import RoadmapBanner from './RoadmapBanner';
import { RiskPanel } from './MahNewShipment';
import ServiceAgreementModal from './ServiceAgreementModal';
import IntegrityDashboard from './IntegrityDashboard';
import ClearanceCertificate from './ClearanceCertificate';

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
  const [intel, setIntel] = useState(null);
  const [intelError, setIntelError] = useState(null);
  const [error, setError] = useState(null);
  const [reqs, setReqs] = useState(null);         // GET /shipments/:id/document-requirements
  const [reqError, setReqError] = useState(null);
  const [tab, setTab] = useState(initialTab || 'timeline');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    const [detail, pre, requirements] = await Promise.allSettled([
      apiFetch(token, `/shipments/${initial.id}`),
      apiFetch(token, `/shipments/${initial.id}/pre-arrival`),
      apiFetch(token, `/shipments/${initial.id}/document-requirements`),
    ]);
    if (requirements.status === 'fulfilled') { setReqs(requirements.value); setReqError(null); } else setReqError(requirements.reason.message);
    if (detail.status === 'fulfilled') setShipment(detail.value.shipment);
    else setError(detail.reason.message);
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
    ...(state === 'CLOSED_RELEASED' ? [{ key: 'certificate', label: 'Certificate' }] : []),
  ];
  const activeTab = tabs.some(t => t.key === tab) ? tab : 'timeline';

  const sector = shipmentSector(shipment);
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

      {PRE_BROKER_STATES.includes(state) && (
        <BrokerStatusBanner token={token} shipment={shipment} organisations={organisations}
          onChanged={refresh} showToast={showToast} />
      )}

      {error && <div className="mah-alert mah-alert-red">{error}</div>}

      <Tabs tabs={tabs} active={activeTab} onChange={setTab} />

      {activeTab === 'timeline' && <TimelineTab shipment={shipment} />}
      {activeTab === 'documents' && (
        <DocumentsTab token={token} shipment={shipment} reqs={reqs} reqError={reqError} onChanged={refresh} />
      )}
      {activeTab === 'validation' && (
        <ValidationTab token={token} shipment={shipment} reqs={reqs} broker={broker} onChanged={refresh} goTo={setTab} showToast={showToast}
          organisations={organisations} />
      )}
      {activeTab === 'customs' && <CustomsTab token={token} user={user} shipment={shipment} onChanged={refresh} />}
      {activeTab === 'intelligence' && (
        <div className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Pre-arrival intelligence</h2></div>
            {intelError ? <div className="mah-alert mah-alert-red">{intelError}</div>
              : intel ? <RiskPanel intel={intel} /> : <div className="mah-loading">Scoring shipment…</div>}
          </section>
          {['SUBMITTED', 'SAMPLING'].includes(state) && (
            <RoadmapBanner compact title="Faseh & SFDA Sync" badge="Coming soon"
              description="MASAAR will automatically track SFDA decisions for this shipment via Faseh sync. Your clearance company will be notified of any SFDA action instantly." />
          )}
        </div>
      )}
      {activeTab === 'objection' && showObjection && (
        <ObjectionTab token={token} shipment={shipment} onChanged={refresh} />
      )}
      {activeTab === 'certificate' && state === 'CLOSED_RELEASED' && (
        <ClearanceCertificate shipment={shipment} token={token} apiUrl={API_URL} />
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
// Three-tier checklist (GET /shipments/:id/document-requirements):
//   MANDATORY — SFDA, can't be removed · RECOMMENDED — removable after a warning · OPTIONAL — incl. MAH custom documents
function DocumentsTab({ token, shipment, reqs, reqError, onChanged }) {
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState(null);
  const [warnRemove, setWarnRemove] = useState(null); // RECOMMENDED type whose removal warning is open
  const [prefBusy, setPrefBusy] = useState(false);
  const [recommendedOpen, setRecommendedOpen] = useState(true);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
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

  async function setPreference(body) {
    setPrefBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/document-preferences`, { method: 'PUT', body });
      await onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setPrefBusy(false);
    }
  }
  const remove = async (type) => { if (await setPreference({ action: 'REMOVE', document_type: type })) setWarnRemove(null); };
  const restore = (type) => setPreference({ action: 'RESTORE', document_type: type });
  async function addCustom(e) {
    e.preventDefault();
    const ok = await setPreference({ action: 'ADD_CUSTOM', custom_doc: { display_name: newName.trim(), notes: newNotes.trim() || undefined } });
    if (ok) { setAdding(false); setNewName(''); setNewNotes(''); setOptionalOpen(true); }
  }

  if (!reqs) {
    return (
      <section className="mah-card">
        {reqError ? <div className="mah-alert mah-alert-red">Could not load the document checklist: {reqError}</div>
          : <div className="mah-loading">Loading document checklist…</div>}
      </section>
    );
  }
  if (!reqs.sector) {
    return <section className="mah-card"><Empty title="No sector set">This shipment has no sector, so there is no document checklist.</Empty></section>;
  }

  const active = reqs.documents.filter(d => !d.is_removed);
  const removedDocs = reqs.documents.filter(d => d.is_removed);
  const mandatory = active.filter(d => d.tier === 'MANDATORY');
  const recommended = active.filter(d => d.tier === 'RECOMMENDED');
  const optional = active.filter(d => d.tier === 'OPTIONAL');
  const mandatoryMissing = reqs.mandatory_uploaded < reqs.mandatory_count;
  const optionalUploaded = optional.filter(d => d.uploaded_doc).length;

  const row = (d) => {
    const doc = d.uploaded_doc;
    const tone = doc ? READINESS_TONES[doc.readiness_status] || 'grey' : null;
    const sub = d.tier === 'MANDATORY' ? d.sfda_citation : d.description;
    return (
      <div key={d.document_type} className="mah-tier-item">
        <div className={`mah-tier-row${doc ? ' is-uploaded' : ''}`}>
          {d.tier === 'MANDATORY'
            ? <span className="mah-tier-lock" title={`Required by ${d.sfda_citation || 'SFDA regulations'} — cannot be removed`}
              aria-label={`Required by ${d.sfda_citation || 'SFDA regulations'} — cannot be removed`}>🔒</span>
            : <span className="mah-doc-icon">{doc ? <Icon name="check" /> : <Icon name="upload" />}</span>}
          <div className="mah-grow mah-tier-text">
            <div className="mah-row-title">{d.display_name}{d.is_custom && <span className="mah-badge mah-tone-grey mah-tier-custom">Custom</span>}</div>
            {sub && <div className="mah-row-sub">{sub}</div>}
          </div>
          <div className="mah-tier-status">
            {doc ? (
              <>
                <span className="mah-text-green mah-small"><strong>✓ Uploaded</strong></span>
                <span className="mah-row-sub mah-tier-file" title={doc.file_name}>
                  {doc.file_name} · <span className={`mah-text-${tone}`}>{(doc.readiness_status || 'Checked').replace(/_/g, ' ')}</span>
                  {doc.validation_result?.score != null && <> · {doc.validation_result.score}/100</>}
                </span>
                <button className="mah-link-btn mah-small" disabled={busyType !== null}
                  onClick={() => inputs.current[d.document_type]?.click()}>
                  {busyType === d.document_type ? 'Checking…' : 'Re-upload'}
                </button>
              </>
            ) : (
              <>
                <span className={`mah-small ${d.tier === 'MANDATORY' ? 'mah-text-red' : 'mah-muted'}`}>Missing</span>
                <button className="mah-btn mah-btn-sm mah-btn-primary" disabled={busyType !== null}
                  onClick={() => inputs.current[d.document_type]?.click()}>
                  {busyType === d.document_type ? 'Checking…' : 'Upload'}
                </button>
              </>
            )}
            <input type="file" hidden accept=".pdf,.txt,.doc,.docx,.jpg,.png"
              ref={el => { inputs.current[d.document_type] = el; }}
              onChange={e => { upload(d.document_type, e.target.files[0]); e.target.value = ''; }} />
          </div>
        </div>
        {d.can_remove && warnRemove !== d.document_type && (
          <button className="mah-remove-link" disabled={prefBusy}
            onClick={() => (d.tier === 'RECOMMENDED' ? setWarnRemove(d.document_type) : remove(d.document_type))}>
            Remove
          </button>
        )}
        {warnRemove === d.document_type && (
          <div className="mah-remove-warning" role="alert">
            <strong>⚠ MASAAR recommends this document</strong>
            {d.removal_warning && <p>{d.removal_warning}</p>}
            <div className="mah-remove-warning-actions">
              <button className="mah-btn mah-btn-sm mah-btn-amber" onClick={() => setWarnRemove(null)} autoFocus>Keep it</button>
              <button className="mah-btn mah-btn-sm mah-btn-ghost" disabled={prefBusy} onClick={() => remove(d.document_type)}>
                {prefBusy ? 'Removing…' : 'Remove anyway — I accept the risk'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mah-card">
      <div className="mah-card-head">
        <h2>Document checklist</h2>
        <span className="mah-muted mah-small">Each upload is checked by the MASAAR AI validator</span>
      </div>
      <div className="mah-tier-stats">
        <span className={`mah-badge mah-tone-${mandatoryMissing ? 'red' : 'green'}`}>✓ {reqs.mandatory_uploaded}/{reqs.mandatory_count} Mandatory</span>
        <span className="mah-badge mah-tone-amber">● {reqs.recommended_uploaded}/{reqs.recommended_count} Recommended</span>
        <span className="mah-badge mah-tone-grey">+ {optional.length} Optional/Custom</span>
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}

      <div className="mah-tier mah-tier-mandatory">
        <div className="mah-tier-head is-static"><span>🔒 Mandatory — Required by SFDA regulations</span></div>
        {mandatory.length ? mandatory.map(row) : <p className="mah-muted mah-small">No mandatory documents for this sector.</p>}
      </div>

      <div className="mah-tier mah-tier-recommended">
        <button className="mah-tier-head" onClick={() => setRecommendedOpen(o => !o)} aria-expanded={recommendedOpen}>
          <span>● Recommended — Based on MASAAR expertise</span>
          <span className="mah-small mah-muted">{reqs.recommended_uploaded}/{recommended.length} uploaded {recommendedOpen ? '▾' : '▸'}</span>
        </button>
        {recommendedOpen && (recommended.length ? recommended.map(row) : <p className="mah-muted mah-small">No recommended documents left on the checklist.</p>)}
      </div>

      <div className="mah-tier mah-tier-optional">
        <button className="mah-tier-head" onClick={() => setOptionalOpen(o => !o)} aria-expanded={optionalOpen}>
          <span>+ Optional &amp; Custom documents</span>
          <span className="mah-small mah-muted">{optionalUploaded}/{optional.length} uploaded {optionalOpen ? '▾' : '▸'}</span>
        </button>
        {optionalOpen && (optional.length ? optional.map(row) : <p className="mah-muted mah-small">No optional or custom documents yet.</p>)}
      </div>

      {adding ? (
        <form className="mah-tier-add" onSubmit={addCustom}>
          <label className="mah-field">
            <span>Document name *</span>
            <input className="mah-input" value={newName} onChange={e => setNewName(e.target.value)} maxLength={150} required autoFocus />
          </label>
          <label className="mah-field">
            <span>Notes / reason</span>
            <input className="mah-input" value={newNotes} onChange={e => setNewNotes(e.target.value)} maxLength={500} />
          </label>
          <div className="mah-remove-warning-actions">
            <button type="button" className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => setAdding(false)} disabled={prefBusy}>Cancel</button>
            <button type="submit" className="mah-btn mah-btn-sm mah-btn-primary" disabled={prefBusy || !newName.trim()}>
              {prefBusy ? 'Adding…' : 'Add to checklist →'}
            </button>
          </div>
        </form>
      ) : (
        <button className="mah-btn mah-btn-ghost mah-tier-add-btn" onClick={() => setAdding(true)}>+ Add a document</button>
      )}

      {removedDocs.length > 0 && (
        <div className="mah-tier-removed">
          <div className="mah-small"><strong>Removed documents (not required for this shipment)</strong></div>
          {removedDocs.map(d => (
            <div key={d.document_type} className="mah-tier-removed-row">
              <span className="mah-strike">{d.display_name}</span>
              <button className="mah-link-btn mah-small" disabled={prefBusy} onClick={() => restore(d.document_type)}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Broker engagement banner (DRAFT / PREPARING / READY_TO_SUBMIT) ──
function BrokerStatusBanner({ token, shipment, organisations, onChanged, showToast }) {
  const [picking, setPicking] = useState(false);
  const [companies, setCompanies] = useState(null);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [agreementOpen, setAgreementOpen] = useState(false);

  const status = shipment.broker_acceptance_status || 'NOT_REQUESTED';
  const currentId = shipment.preferred_clearance_company_id;
  const orgById = (id) => organisations.find(o => o.id === id);
  const brokerName = shipment.preferred_clearance_company_name || orgById(currentId)?.name_en || 'Your clearance company';

  useEffect(() => {
    if (!picking || companies) return;
    apiFetch(token, '/clearance-companies')
      .then(d => setCompanies(d.clearance_companies || []))
      .catch(() => setCompanies(organisations.filter(o => o.org_type === 'CLEARANCE_COMPANY').map(o => ({ id: o.id, name: o.name_en }))));
  }, [picking, companies, token, organisations]);

  const act = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      await onChanged().catch(() => {});
      return false;
    } finally {
      setBusy(false);
    }
  };
  const sendRequest = (name) => act(async () => {
    await apiFetch(token, `/shipments/${shipment.id}/broker-request`, { method: 'POST' });
    showToast?.(`Engagement request sent to ${name}`);
  });
  const changeAndRequest = async () => {
    const name = companies?.find(c => c.id === choice)?.name || 'the clearance company';
    const done = await act(async () => {
      await apiFetch(token, `/shipments/${shipment.id}/change-clearance`, { method: 'PUT', body: { new_clearance_company_id: choice } });
      await apiFetch(token, `/shipments/${shipment.id}/broker-request`, { method: 'POST' });
      showToast?.(`Engagement request sent to ${name}`);
    });
    if (done) { setPicking(false); setChoice(''); }
  };

  const picker = picking && (
    <div className="mah-broker-picker">
      <select className="mah-input" value={choice} onChange={e => setChoice(e.target.value)} disabled={busy || !companies}
        aria-label="New clearance company">
        <option value="">{companies ? 'Select a clearance company…' : 'Loading…'}</option>
        {(companies || []).filter(c => c.id !== currentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className="mah-btn mah-btn-sm mah-btn-primary" onClick={changeAndRequest} disabled={!choice || busy}>
        {busy ? 'Sending…' : 'Send request →'}
      </button>
      <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => { setPicking(false); setChoice(''); }} disabled={busy}>Cancel</button>
    </div>
  );

  let tone; let body; let action = null;
  if (!currentId) {
    tone = 'grey';
    body = <><strong>No clearance company selected yet.</strong><span>Select one to begin the engagement process.</span></>;
    action = !picking && <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => setPicking(true)}>Select clearance company →</button>;
  } else if (status === 'NOT_REQUESTED') {
    tone = 'grey';
    body = <><strong>Engagement request not sent yet</strong><span>{brokerName} has not been asked to take this shipment on.</span></>;
    action = !picking && (
      <div className="mah-broker-actions">
        <button className="mah-link-btn" onClick={() => setPicking(true)}>Change clearance company</button>
        <button className="mah-btn mah-btn-sm mah-btn-primary" onClick={() => sendRequest(brokerName)} disabled={busy}>
          {busy ? 'Sending…' : 'Send request →'}
        </button>
      </div>
    );
  } else if (status === 'PENDING') {
    tone = 'amber';
    body = (
      <>
        <strong><span className="mah-spinner" aria-hidden="true" /> Awaiting response from {brokerName}</strong>
        <span>Engagement request sent. They will review your request and respond shortly.</span>
      </>
    );
    action = !picking && <button className="mah-link-btn" onClick={() => setPicking(true)}>Change clearance company</button>;
  } else if (status === 'DECLINED') {
    tone = 'red';
    body = (
      <>
        <strong>✗ {brokerName} declined this request</strong>
        {shipment.broker_declined_reason && <span>Reason: {shipment.broker_declined_reason}</span>}
        <span>Please select a different clearance company.</span>
      </>
    );
    action = !picking && <button className="mah-btn mah-btn-sm mah-btn-red" onClick={() => setPicking(true)}>Select new clearance company →</button>;
  } else if (!agreementInEffect(shipment)) {
    tone = 'blue';
    body = (
      <>
        <strong>✓ {brokerName} accepted your request</strong>
        <span>{shipment.agreement_acknowledged_mah
          ? `You acknowledged the service agreement — waiting for ${brokerName} to acknowledge.`
          : 'Please review and acknowledge the service agreement to proceed.'}</span>
      </>
    );
    action = <button className="mah-btn mah-btn-sm mah-btn-primary" onClick={() => setAgreementOpen(true)}>Review agreement →</button>;
  } else {
    tone = 'green';
    const dates = [shipment.agreement_acknowledged_mah_at, shipment.agreement_acknowledged_clearance_at].filter(Boolean).sort();
    body = (
      <>
        <strong>✓ {brokerName} — Active partner</strong>
        <span>Agreement acknowledged by both parties{dates.length ? ` on ${fmtDate(dates[dates.length - 1])}` : ''}.</span>
      </>
    );
    action = <button className="mah-link-btn" onClick={() => setAgreementOpen(true)}>View agreement</button>;
  }

  return (
    <section className={`mah-broker-banner mah-broker-${tone}`} aria-live="polite">
      <div className="mah-broker-row">
        <div className="mah-broker-text">{body}</div>
        {action}
      </div>
      {picker}
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      {agreementOpen && (
        <ServiceAgreementModal shipment={shipment} party="MAH" token={token}
          mahOrg={orgById(shipment.org_id)} clearanceOrg={orgById(currentId)}
          onClose={() => setAgreementOpen(false)}
          onAcknowledged={async (_updated, message) => { showToast?.(message); await onChanged(); }} />
      )}
    </section>
  );
}

// ── Validation ───────────────────────────────────────
// ── AI validation summary ────────────────────────────
const VERDICTS = [
  { min: 85, label: 'Ready', color: '#00B87A' },
  { min: 70, label: 'Review', color: '#E8900A' },
  { min: 50, label: 'Issues', color: '#E8700A' },
  { min: 0, label: 'Critical', color: '#E0334C' },
];
const GREY = '#E2E8F0';
const barColor = (score) => (score == null ? GREY : score >= 70 ? '#00B87A' : score >= 40 ? '#E8900A' : '#E0334C');
const truncate = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
// hex colour + alpha (0–1) as #RRGGBBAA
const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const docScore = (d) => d.validation_result?.score ?? null;
const isBinaryWarning = (d) => {
  const v = d.validation_result || {};
  return [v.summary, ...(v.issues || [])].some(m => typeof m === 'string' && /binary|extract/i.test(m));
};
const listNames = (items) => items.map(i => i.name).join(', ');

// TODO: Replace with Anthropic API call after demo
// POST https://api.anthropic.com/v1/messages
// Pass document scores + sector as context, return an AI-generated summary paragraph
function generateSummaryText({ documents, required, reviewed, score, layer1Complete }) {
  const docLine = `${documents.length} of ${required} documents uploaded, ${reviewed} analyzed by AI.`;

  const critical = documents.filter(d => (docScore(d) ?? 0) < 50 && d.readiness_status === 'CRITICAL_ISSUE');
  const weak = documents.filter(d => (docScore(d) ?? 0) < 70);
  const binary = documents.filter(isBinaryWarning);
  let issueLine;
  if (critical.length) issueLine = `Critical issues found in: ${listNames(critical)}.`;
  else if (weak.length) issueLine = `${listNames(weak)} ${weak.length === 1 ? 'requires' : 'require'} attention before submission.`;
  else if (binary.length) issueLine = `${binary.length} document${binary.length === 1 ? '' : 's'} uploaded in binary format — text format recommended for AI analysis.`;
  else issueLine = documents.length ? 'All analyzed documents meet requirements.' : 'No documents analyzed yet.';

  let advice;
  if (!layer1Complete) advice = 'Complete document upload before proceeding.';
  else if (score >= 85) advice = 'Shipment is ready to proceed to broker.';
  else if (score >= 70) advice = 'Review flagged documents before proceeding.';
  else advice = 'Address critical issues before submission to avoid SFDA rejection.';

  return `${docLine} ${issueLine} ${advice}`;
}

// Score donut: 140px, ring from radius 42 to 60
function SummaryDonut({ score, color }) {
  const r = 51;
  const c = 2 * Math.PI * r;
  return (
    <svg className="mah-ais-donut" width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`MASAAR AI score ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke={GREY} strokeWidth="18" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="18"
        strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`} transform="rotate(-90 70 70)" />
      <text x="70" y="66" textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="700" fill={color}>{score}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="13" fill="#94A3B8">/100</text>
    </svg>
  );
}

const LAYER_ICONS = { PASSED: '✓', WARNING: '⚠', FAILED: '✗', PENDING: '◷' };
const LAYER_STATUS_LABELS = { PASSED: 'Passed', WARNING: 'Warning', FAILED: 'Failed', PENDING: 'Pending' };

function LayerCard({ name, status, text, badge }) {
  return (
    <div className="mah-ais-layer">
      <span className={`mah-ais-layer-icon is-${status}`} title={LAYER_STATUS_LABELS[status]} aria-label={LAYER_STATUS_LABELS[status]}>
        {LAYER_ICONS[status]}
      </span>
      <div className="mah-ais-layer-text">
        <div className="mah-ais-layer-name">{name}</div>
        <div className="mah-ais-layer-status">{text}</div>
      </div>
      {badge && <span className={`mah-badge mah-tone-${badge.tone}`}>{badge.text}</span>}
    </div>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// tiers: { mandatory: [uploaded, total], recommended: [uploaded, total], custom } from the checklist
// integrityScore: latest MASAAR integrity score, or null if never run
function AiValidationSummary({ documents, required, layer1Complete, shipmentSector, loading, tiers, integrityScore }) {
  if (loading) {
    return (
      <section className="mah-ais mah-ais-loading" aria-busy="true">
        <div className="mah-ai-summary-pulse">✦ Analyzing...</div>
        <span className="mah-skel-bar" style={{ width: '40%' }} />
        <span className="mah-skel-bar" style={{ width: '100%' }} />
        <span className="mah-skel-bar" style={{ width: '75%' }} />
      </section>
    );
  }

  const scores = documents.map(d => docScore(d) ?? 0);
  const score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const reviewedDocs = documents.filter(d => docScore(d) != null);
  const reviewed = reviewedDocs.length;
  const reviewedAvg = reviewed ? Math.round(reviewedDocs.reduce((a, d) => a + docScore(d), 0) / reviewed) : null;
  const issueCount = documents.filter(d => (docScore(d) ?? 0) < 70 || d.readiness_status === 'CRITICAL_ISSUE').length;
  const verdict = VERDICTS.find(v => score >= v.min);
  const text = generateSummaryText({ documents, required, reviewed, score, layer1Complete, shipmentSector });

  // Layer 1 — completeness
  const mandatoryMissing = tiers.mandatory[1] - tiers.mandatory[0];
  const recommendedMissing = tiers.recommended[1] - tiers.recommended[0];
  const layer1 = mandatoryMissing > 0
    ? { status: 'FAILED', text: `${plural(mandatoryMissing, 'mandatory doc')} missing`, badge: { tone: 'red', text: `${mandatoryMissing} missing` } }
    : recommendedMissing > 0
      ? { status: 'WARNING', text: `${plural(recommendedMissing, 'recommended doc')} missing`, badge: { tone: 'amber', text: plural(recommendedMissing, 'warning') } }
      : { status: 'PASSED', text: 'All mandatory documents uploaded' };
  // Layer 3 — AI review of the uploaded documents
  const weakDocs = reviewedDocs.filter(d => docScore(d) < 70).length;
  const layer3 = reviewedAvg == null
    ? { status: 'PENDING', text: 'No documents reviewed yet' }
    : {
      status: reviewedAvg >= 70 ? 'PASSED' : reviewedAvg >= 50 ? 'WARNING' : 'FAILED',
      text: `${plural(reviewed, 'document')} reviewed · avg ${reviewedAvg}/100`,
      badge: weakDocs ? { tone: reviewedAvg < 50 ? 'red' : 'amber', text: `${weakDocs} below 70` } : null,
    };
  // Layer 4 — integrity score
  const layer4 = integrityScore == null
    ? { status: 'PENDING', text: 'Run integrity check below' }
    : {
      status: integrityScore >= 85 ? 'PASSED' : integrityScore >= 60 ? 'WARNING' : 'FAILED',
      text: `Integrity score: ${integrityScore}/100`,
    };

  return (
    <section className="mah-ais" style={{ borderColor: alpha(verdict.color, 0.2) }}>
      <div className="mah-ais-head">
        <div>
          <span className="mah-ai-summary-brand" style={{ color: verdict.color }}>✦ MASAAR AI</span>
          <span className="mah-ai-summary-title">Validation Summary</span>
        </div>
        <div className="mah-ais-stats">
          {documents.length}/{required} docs complete · AI reviewed: {reviewed}/{documents.length} · Issues: {issueCount}
        </div>
      </div>

      <div className="mah-ais-cols">
        <div className="mah-ais-col-score">
          <SummaryDonut score={score} color={verdict.color} />
          <span className="mah-ais-pill" style={{ background: alpha(verdict.color, 0.15), color: verdict.color }}>{verdict.label}</span>
          <span className="mah-ais-caption">MASAAR AI Score</span>
        </div>

        <div className="mah-ais-col-layers">
          <LayerCard name="Layer 1 · Completeness" {...layer1} />
          <LayerCard name="Layer 2 · Consistency" status="PENDING" text="Cross-document checks coming soon" />
          <LayerCard name="Layer 3 · AI Advisory" {...layer3} />
          <LayerCard name="Layer 4 · Integrity" {...layer4} />
        </div>

        <div className="mah-ais-col-docs">
          <div className="mah-ais-docs-title">Document Scores</div>
          {documents.length === 0 ? <p className="mah-ais-docs-empty">Upload documents to see scores</p>
            : documents.map(d => {
              const s = docScore(d);
              const color = barColor(s);
              return (
                <div key={d.document_type} className="mah-ais-doc">
                  <div className="mah-ais-doc-head">
                    <span className="mah-ais-doc-name" title={d.name}>{truncate(d.name, 20)}</span>
                    <span className="mah-ais-doc-score" style={{ color: s == null ? '#94A3B8' : color }}>{s ?? '—'}</span>
                  </div>
                  <div className="mah-ais-doc-track" role="img" aria-label={s == null ? `${d.name}: no score` : `${d.name}: ${s} out of 100`}>
                    <div className="mah-ais-doc-fill" style={{ width: s == null ? '100%' : `${Math.max(0, Math.min(100, s))}%`, background: color }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <p className="mah-ais-text">{text}</p>
    </section>
  );
}

const PROGRESS_STEPS = {
  DRAFT: {
    to: 'PREPARING', label: 'Start document preparation →', notes: 'MAH started document preparation',
    toast: 'Shipment moved to Preparing',
  },
  PREPARING: {
    to: 'READY_TO_SUBMIT', label: 'Mark as Ready to Submit →', notes: 'MAH marked shipment ready',
    toast: 'Shipment is now Ready to Submit',
    help: 'All mandatory documents must be uploaded before marking the shipment ready',
  },
};

function ValidationTab({ token, shipment, reqs, broker, onChanged, goTo, showToast, organisations }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // Layer 1 = every MANDATORY document uploaded; RECOMMENDED ones are advisory
  const docsLoaded = !!reqs;
  const active = (reqs?.documents || []).filter(d => !d.is_removed);
  const missing = active.filter(d => d.tier === 'MANDATORY' && !d.uploaded_doc);
  const missingRecommended = active.filter(d => d.tier === 'RECOMMENDED' && !d.uploaded_doc);
  const checked = active.filter(d => d.uploaded_doc).map(d => ({ ...d.uploaded_doc, name: d.display_name }));
  const critical = checked.filter(d => d.readiness_status === 'CRITICAL_ISSUE');
  const blocking = missing.length + critical.length;
  const state = stateOf(shipment);
  const [agreementOpen, setAgreementOpen] = useState(false);
  // Hand-over needs the broker's acceptance and both agreement acknowledgements (also enforced by the API)
  const engagementBlock = shipment.broker_acceptance_status !== 'ACCEPTED' ? 'accept'
    : !shipment.agreement_acknowledged_mah ? 'mah'
      : !shipment.agreement_acknowledged_clearance ? 'clearance' : null;
  const canConfirm = state === 'READY_TO_SUBMIT' && !!broker && !engagementBlock;
  const step = PROGRESS_STEPS[state];
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState(null);
  const [missingBlock, setMissingBlock] = useState(0);
  const [recommendedWarning, setRecommendedWarning] = useState(false);
  const [integrityKey, setIntegrityKey] = useState(0); // bumped to reload the integrity dashboard
  // Latest integrity score for the summary's Layer 4: the shipment's, then whatever the dashboard loads or runs
  const [integrityScore, setIntegrityScore] = useState(shipment.integrity_score ?? null);

  // proceed = the MAH chose "Proceed anyway" past the recommended-documents warning
  async function advance(proceed = false) {
    setMoveError(null);
    setMissingBlock(0);
    setRecommendedWarning(false);
    if (step.to === 'READY_TO_SUBMIT' && missing.length > 0) {
      setMissingBlock(missing.length);
      return;
    }
    if (step.to === 'READY_TO_SUBMIT' && missingRecommended.length > 0 && !proceed) {
      setRecommendedWarning(true);
      return;
    }
    setMoving(true);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/transition`, {
        method: 'PUT', body: { to_state: step.to, notes: step.notes },
      });
      // Starting preparation runs the integrity checks (the API runs them itself on READY_TO_SUBMIT).
      // A failed check run doesn't undo the move — the dashboard offers a manual run.
      if (step.to === 'PREPARING') {
        await apiFetch(token, `/shipments/${shipment.id}/integrity-check`, { method: 'POST' }).catch(() => {});
      }
      setIntegrityKey(k => k + 1);
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
      <AiValidationSummary
        documents={checked}
        required={active.length}
        layer1Complete={!!reqs?.layer1_complete}
        shipmentSector={shipmentSector(shipment)}
        loading={!docsLoaded}
        tiers={{
          mandatory: [reqs?.mandatory_uploaded ?? 0, reqs?.mandatory_count ?? 0],
          recommended: [reqs?.recommended_uploaded ?? 0, reqs?.recommended_count ?? 0],
          custom: reqs?.custom_count ?? 0,
        }}
        integrityScore={integrityScore}
      />

      <section className="int-section" aria-labelledby="int-section-title">
        <h2 className="int-section-title" id="int-section-title">Regulatory Integrity Checks</h2>
        <IntegrityDashboard shipmentId={shipment.id} token={token} apiUrl={API_URL}
          sector={shipmentSector(shipment)} refreshKey={integrityKey} onScore={setIntegrityScore} />
      </section>

      {step && (
        <section className="mah-card mah-state-step">
          <button className="mah-btn mah-btn-primary" onClick={() => advance()} disabled={moving || !docsLoaded}>
            {moving ? 'Updating…' : step.label}
          </button>
          {step.help && <p className="mah-small mah-muted">{step.help}</p>}
          {missingBlock > 0 && missing.length > 0 && (
            <div className="mah-alert mah-alert-red">
              Cannot mark as ready — {missing.length} mandatory document{missing.length === 1 ? ' is' : 's are'} still
              missing. Upload them in the Documents tab.{' '}
              <button className="mah-link-btn" onClick={() => goTo('documents')}>Go to Documents →</button>
            </div>
          )}
          {recommendedWarning && missingRecommended.length > 0 && (
            <div className="mah-remove-warning" role="alert">
              <strong>
                ⚠ {missingRecommended.length} recommended document{missingRecommended.length === 1 ? '' : 's'} not uploaded.
              </strong>
              <p>MASAAR advises uploading these before submission to reduce rejection risk: {missingRecommended.map(d => d.display_name).join(', ')}.</p>
              <div className="mah-remove-warning-actions">
                <button className="mah-btn mah-btn-sm mah-btn-amber" onClick={() => goTo('documents')}>Upload them →</button>
                <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => advance(true)} disabled={moving}>
                  {moving ? 'Updating…' : 'Proceed anyway'}
                </button>
              </div>
            </div>
          )}
          {moveError && <div className="mah-alert mah-alert-red">{moveError}</div>}
        </section>
      )}

      <section className="mah-card">
        <div className="mah-card-head">
          <h2>Layer 1 · Completeness</h2>
          <span className={`mah-badge mah-tone-${!docsLoaded ? 'grey' : missing.length ? 'red' : 'green'}`}>
            {!docsLoaded ? 'Loading…' : missing.length ? `${missing.length} mandatory missing` : 'Complete'}
          </span>
        </div>
        {docsLoaded && missing.length === 0 && <p className="mah-muted">All mandatory documents are in.</p>}
        {(missing.length > 0 || missingRecommended.length > 0) && (
          <ul className="mah-issue-list">
            {missing.map(d => <li key={d.document_type} className="mah-issue-red"><Icon name="alert" size={14} /> {d.display_name} is missing (mandatory)</li>)}
            {missingRecommended.map(d => (
              <li key={d.document_type} className="mah-issue-amber"><Icon name="alert" size={14} /> {d.display_name} not uploaded (recommended)</li>
            ))}
          </ul>
        )}
        {(missing.length > 0 || missingRecommended.length > 0) && (
          <button className="mah-link-btn" onClick={() => goTo('documents')}>Upload documents →</button>
        )}
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
          : checked.map(d => {
            const v = d.validation_result || {};
            return (
              <div key={d.document_type} className={`mah-ai-row mah-edge-${READINESS_TONES[d.readiness_status] || 'grey'}`}>
                <div className="mah-tl-head">
                  <strong>{d.name}</strong>
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
            {engagementBlock === 'accept' && (
              <p className="mah-handover-block">Waiting for clearance company to accept your engagement request</p>
            )}
            {engagementBlock === 'mah' && (
              <p className="mah-handover-block">
                Please acknowledge the service agreement first —{' '}
                <button className="mah-link-btn" onClick={() => setAgreementOpen(true)}>Review agreement →</button>
              </p>
            )}
            {engagementBlock === 'clearance' && (
              <p className="mah-handover-block">Waiting for clearance company to acknowledge the service agreement</p>
            )}
          </>
        )}
      </section>

      {agreementOpen && (
        <ServiceAgreementModal shipment={shipment} party="MAH" token={token}
          mahOrg={organisations?.find(o => o.id === shipment.org_id)}
          clearanceOrg={organisations?.find(o => o.id === shipment.preferred_clearance_company_id)}
          onClose={() => setAgreementOpen(false)}
          onAcknowledged={async (_updated, message) => { showToast?.(message); await onChanged(); }} />
      )}
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
