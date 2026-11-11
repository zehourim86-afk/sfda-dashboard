// MAH portal — Shipment detail with sub-tabs:
// Timeline | Documents | Validation | Customs | Intelligence | Objection | Disposition | Certificate (CLOSED_RELEASED)
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, getStateLabel } from './constants';
import {
  apiFetch, stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector,
  CLOSED_STATES, fmtDate, fmtDateTime,
  Tabs, Empty, Icon, ConfirmDialog, readFileForUpload, PRE_BROKER_STATES, agreementInEffect,
} from './mahShared';
import RoadmapBanner from './RoadmapBanner';
import { RiskPanel } from './MahNewShipment';
import ServiceAgreementModal from './ServiceAgreementModal';
import IntegrityDashboard from './IntegrityDashboard';
import ClearanceCertificate from './ClearanceCertificate';
import { FasehSyncBar } from './FasehSync';
import { SkeletonLoader, ErrorBanner, Spinner } from './PortalComponents';

const READINESS_TONES = { READY: 'green', WARNING: 'amber', MISSING_INFO: 'amber', CRITICAL_ISSUE: 'red' };
const CUSTOMS_STEPS = ['PENDING', 'DECLARATION_FILED', 'DUTIES_PAID', 'CUSTOMS_RELEASED'];
const CUSTOMS_LABELS = {
  PENDING: 'Pending', DECLARATION_FILED: 'Declaration filed', DUTIES_PAID: 'Duties paid', CUSTOMS_RELEASED: 'Customs released',
};
const TRANSPORT_LABELS = { sea: 'Sea', air: 'Air', land: 'Land' };
const DISPOSITION_STATES = ['DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];

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
  const [loaded, setLoaded] = useState(false); // full record (incl. audit_log) has arrived

  const load = useCallback(async () => {
    const [detail, pre, requirements] = await Promise.allSettled([
      apiFetch(token, `/shipments/${initial.id}`),
      apiFetch(token, `/shipments/${initial.id}/pre-arrival`),
      apiFetch(token, `/shipments/${initial.id}/document-requirements`),
    ]);
    if (requirements.status === 'fulfilled') { setReqs(requirements.value); setReqError(null); } else setReqError(requirements.reason.message);
    if (detail.status === 'fulfilled') { setShipment(detail.value.shipment); setError(null); setLoaded(true); }
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
        showToast?.('Only draft shipments can be deleted. Contact your DEMARA advisor to cancel a submitted shipment.', 'warning');
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
  const showDisposition = DISPOSITION_STATES.includes(state);
  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'documents', label: 'Documents' },
    { key: 'validation', label: 'Validation' },
    { key: 'customs', label: 'Customs' },
    { key: 'intelligence', label: 'Intelligence' },
    ...(showObjection ? [{ key: 'objection', label: 'Objection' }] : []),
    ...(showDisposition ? [{ key: 'disposition', label: 'Disposition' }] : []),
    ...(state === 'CLOSED_RELEASED' ? [{ key: 'certificate', label: 'Certificate' }] : []),
  ];
  const activeTab = tabs.some(t => t.key === tab) ? tab : 'timeline';

  const sector = shipmentSector(shipment);
  const broker = organisations.find(o => o.id === (shipment.clearance_company_id || shipment.preferred_clearance_company_id));
  const supplierName = suppliersById[shipment.supplier_id]?.name || shipment.supplier_name;

  return (
    <div className="mah-page">
      <button className="mah-link-btn mah-back" onClick={() => navigate('shipments')}><Icon name="back" size={16} /> All shipments</button>

      {!loaded && !shipment.masaar_id ? (
        error ? null : (
          <section className="mah-card mah-detail-head" aria-busy="true">
            <SkeletonLoader type="line" width="45%" height={24} />
            <SkeletonLoader type="line" width="25%" height={12} />
            <div className="pc-skel-pipeline">{Array.from({ length: 7 }, (_, i) => <div key={i}><SkeletonLoader type="stat" height={16} /></div>)}</div>
          </section>
        )
      ) : (
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
          <div>
            <span>B/L / AWB</span>
            <strong>{shipment.bl_awb_number || '—'}</strong>
            {!shipment.bl_awb_number && ['sea', 'air'].includes(shipment.transport_mode) && (
              <span className="mah-missing-flag">Missing — required for customs</span>
            )}
          </div>
          <div><span>Clearance company</span><strong>{broker?.name_en || shipment.clearance_company_name || '—'}</strong></div>
          <div><span>Customs</span><strong>{CUSTOMS_LABELS[shipment.customs_state] || '—'}</strong></div>
        </div>
      </section>
      )}

      {PRE_BROKER_STATES.includes(state) && (
        <BrokerStatusBanner token={token} shipment={shipment} organisations={organisations}
          onChanged={refresh} showToast={showToast} />
      )}

      {error && (
        <ErrorBanner error={error} message="Could not load this shipment" onRetry={() => { setError(null); load(); }} />
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setTab} />

      {activeTab === 'timeline' && (loaded ? <TimelineTab shipment={shipment} />
        : error ? null : <section className="mah-card"><SkeletonLoader type="list" count={4} /></section>)}
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
            {intelError ? <ErrorBanner compact error={intelError} message="Could not score this shipment" onRetry={load} />
              : intel ? <RiskPanel intel={intel} /> : <div className="mah-loading"><Spinner label="Scoring shipment…" /></div>}
          </section>
          {['SUBMITTED', 'SAMPLING'].includes(state) && (shipment.faseh_sync_active
            ? <FasehSyncBar compact lastSyncAt={shipment.faseh_last_synced_at || shipment.faseh_connection_last_sync_at} />
            : (
              <RoadmapBanner compact title="Faseh & SFDA Sync" badge="Coming soon"
                description="MASAAR will automatically track SFDA decisions for this shipment via Faseh sync. Your clearance company will be notified of any SFDA action instantly." />
            ))}
        </div>
      )}
      {activeTab === 'objection' && showObjection && (
        <ObjectionTab token={token} shipment={shipment} name={shipmentName(shipment, productsById)}
          onChanged={refresh} showToast={showToast} />
      )}
      {activeTab === 'disposition' && showDisposition && (
        <DispositionTab token={token} shipment={shipment} name={shipmentName(shipment, productsById)}
          supplierCountry={suppliersById[shipment.supplier_id]?.country || shipment.shipment_country}
          onChanged={refresh} showToast={showToast} />
      )}
      {activeTab === 'certificate' && state === 'CLOSED_RELEASED' && (
        <ClearanceCertificate shipment={shipment} token={token} apiUrl={API_URL} showToast={showToast} />
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
        {reqError ? <ErrorBanner compact error={reqError} message="Could not load the document checklist" onRetry={onChanged} />
          : <SkeletonLoader type="list" count={5} />}
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
      {reqs.cold_chain?.required && (
        <div className="mah-coldchain-banner" role="note">
          <strong>❄ Cold chain product — temperature logger certificate required</strong>
          <span>
            This product requires continuous cold chain from {reqs.cold_chain.supplier_country || 'the supplier country'} to{' '}
            {reqs.cold_chain.port_of_entry || shipment.port_of_entry || 'the port of entry'}. Upload the temperature logger
            certificate from your shipping company.
          </span>
        </div>
      )}
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
// The validator says it could not read the file (binary PDF / image) — whatever score it gave
const UNREADABLE_RE = /binary|extract|cannot|could not|unreadable|not be read|no text|text layer/i;
const isUnreadable = (d) => {
  const v = d.validation_result || {};
  return [v.summary, ...(v.issues || []), ...(v.recommendations || [])]
    .some(m => typeof m === 'string' && UNREADABLE_RE.test(m));
};
// A score that means something: a readable document the AI scored above 0
const realScore = (d) => (!isUnreadable(d) && docScore(d) > 0 ? docScore(d) : null);
const listNames = (items) => items.map(i => i.name).join(', ');

// Donut score: integrity score and the AI score of readable documents, 60/40 when both exist.
// → { score, basis } — score null when neither exists
function displayScore(aiDocScore, integrityScore) {
  if (integrityScore != null && aiDocScore == null) return { score: integrityScore, basis: 'Integrity score' };
  if (integrityScore != null) return { score: Math.round(aiDocScore * 0.4 + integrityScore * 0.6), basis: 'Combined score' };
  if (aiDocScore != null) return { score: aiDocScore, basis: 'AI doc score' };
  return { score: null, basis: null };
}

// TODO: Replace with Anthropic API call after demo
// POST https://api.anthropic.com/v1/messages
// Pass document scores + sector as context, return an AI-generated summary paragraph
function generateSummaryText({ documents, required, reviewed, score, layer1Complete }) {
  const docLine = `${documents.length} of ${required} documents uploaded, ${reviewed} analyzed by AI.`;

  // Only readable documents can be weak; unreadable ones are reported separately
  const critical = documents.filter(d => d.readiness_status === 'CRITICAL_ISSUE' && !isUnreadable(d));
  const weak = documents.filter(d => realScore(d) != null && realScore(d) < 70);
  const binary = documents.filter(isUnreadable);
  let issueLine;
  if (critical.length) issueLine = `Critical issues found in: ${listNames(critical)}.`;
  else if (weak.length) issueLine = `${listNames(weak)} ${weak.length === 1 ? 'requires' : 'require'} attention before submission.`;
  else if (binary.length) issueLine = `${binary.length} document${binary.length === 1 ? '' : 's'} uploaded in binary format — text format recommended for AI analysis.`;
  else issueLine = documents.length ? 'All analyzed documents meet requirements.' : 'No documents analyzed yet.';

  let advice;
  if (!layer1Complete) advice = 'Complete document upload before proceeding.';
  else if (score == null) advice = 'Run the integrity check below to assess this shipment.';
  else if (score >= 85) advice = 'Shipment is ready to proceed to broker.';
  else if (score >= 70) advice = 'Review flagged documents before proceeding.';
  else advice = 'Address critical issues before submission to avoid SFDA rejection.';

  return `${docLine} ${issueLine} ${advice}`;
}

// Score donut: 140px, ring from radius 42 to 60. score null → grey "—"
function SummaryDonut({ score, color }) {
  const r = 51;
  const c = 2 * Math.PI * r;
  const filled = score == null ? 0 : (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <svg className="mah-ais-donut" width="140" height="140" viewBox="0 0 140 140" role="img"
      aria-label={score == null ? 'Not yet assessed' : `MASAAR score ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke={GREY} strokeWidth="18" />
      {filled > 0 && (
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="18"
          strokeDasharray={`${filled} ${c}`} transform="rotate(-90 70 70)" />
      )}
      <text x="70" y="66" textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="700" fill={color}>{score ?? '—'}</text>
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
function AiValidationSummary({ documents, required, layer1Complete, shipmentSector, loading, tiers, integrityScore, layer2 }) {
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

  // AI score over readable documents only (null when none has a real score)
  const scoredDocs = documents.filter(d => realScore(d) != null);
  const reviewed = scoredDocs.length;
  const aiDocScore = reviewed ? Math.round(scoredDocs.reduce((a, d) => a + realScore(d), 0) / reviewed) : null;
  const binaryCount = documents.filter(isUnreadable).length;
  const { score, basis } = displayScore(aiDocScore, integrityScore);
  const issueCount = documents.filter(d => (realScore(d) != null && realScore(d) < 70)
    || (d.readiness_status === 'CRITICAL_ISSUE' && !isUnreadable(d))).length;
  const verdict = score == null ? { label: 'Not yet assessed', color: '#94A3B8' } : VERDICTS.find(v => score >= v.min);
  const text = generateSummaryText({ documents, required, reviewed, score, layer1Complete, shipmentSector });

  // Layer 1 — completeness
  const mandatoryMissing = tiers.mandatory[1] - tiers.mandatory[0];
  const recommendedMissing = tiers.recommended[1] - tiers.recommended[0];
  const layer1 = mandatoryMissing > 0
    ? { status: 'FAILED', text: `${plural(mandatoryMissing, 'mandatory doc')} missing`, badge: { tone: 'red', text: `${mandatoryMissing} missing` } }
    : recommendedMissing > 0
      ? { status: 'WARNING', text: `${plural(recommendedMissing, 'recommended doc')} missing`, badge: { tone: 'amber', text: plural(recommendedMissing, 'warning') } }
      : { status: 'PASSED', text: 'All mandatory documents uploaded' };
  // Layer 3 — AI review, judged on readable documents only
  const weakDocs = scoredDocs.filter(d => realScore(d) < 70).length;
  const skipped = binaryCount ? ` · ${plural(binaryCount, 'binary format doc')} skipped` : '';
  const layer3 = aiDocScore != null
    ? {
      status: aiDocScore >= 70 ? 'PASSED' : aiDocScore >= 50 ? 'WARNING' : 'FAILED',
      text: `${plural(reviewed, 'document')} reviewed · avg ${aiDocScore}/100${skipped}`,
      badge: weakDocs ? { tone: aiDocScore < 50 ? 'red' : 'amber', text: `${weakDocs} below 70` } : null,
    }
    : binaryCount
      ? { status: 'PENDING', text: 'Documents in binary format — text format recommended for AI analysis' }
      : { status: 'PENDING', text: 'No documents reviewed yet' };
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
          <span className="mah-ais-caption">{basis || 'MASAAR AI Score'}</span>
        </div>

        <div className="mah-ais-col-layers">
          <LayerCard name="Layer 1 · Completeness" {...layer1} />
          <LayerCard name="Layer 2 · Consistency" {...layer2} />
          <LayerCard name="Layer 3 · AI Advisory" {...layer3} />
          <LayerCard name="Layer 4 · Integrity" {...layer4} />
        </div>

        <div className="mah-ais-col-docs">
          <div className="mah-ais-docs-title">Document Scores</div>
          {documents.length === 0 ? <p className="mah-ais-docs-empty">Upload documents to see scores</p>
            : documents.map(d => {
              // Coloured only for a real score; unreadable / unscored documents get a full grey bar and "—"
              const s = realScore(d);
              const binary = isUnreadable(d);
              const color = barColor(s);
              const label = s != null ? `${d.name}: ${s} out of 100` : binary ? `${d.name}: binary format, not scored` : `${d.name}: no score`;
              return (
                <div key={d.document_type} className="mah-ais-doc" title={binary ? 'Binary format — upload a text version for AI analysis' : undefined}>
                  <div className="mah-ais-doc-head">
                    <span className="mah-ais-doc-name" title={d.name}>{truncate(d.name, 20)}</span>
                    <span className="mah-ais-doc-score" style={{ color: s == null ? '#94A3B8' : color }}>
                      {binary && <span className="mah-ais-doc-binary">Binary format</span>}{s ?? '—'}
                    </span>
                  </div>
                  <div className="mah-ais-doc-track" role="img" aria-label={label}>
                    <div className="mah-ais-doc-fill" style={{ width: s == null ? '100%' : `${Math.min(100, s)}%`, background: color }} />
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

// ── Layer 2 · Consistency (integrity engine, check_layer 2) ──
const SEVERITY_TONES = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'amber', LOW: 'blue', INFO: 'grey' };
const CHECK_STATUS_TONES = { PASSED: 'green', WARNING: 'amber', FAILED: 'red', PENDING: 'grey', NOT_APPLICABLE: 'grey' };

// Summary card for Layer 2. integrity: GET /integrity-check result (undefined while loading)
function layer2Status(integrity) {
  const ran = !!integrity?.checked_at;
  const checks = (integrity?.checks || []).filter(c => c.check_layer === 2);
  const failed = checks.filter(c => c.status === 'FAILED').length;
  const warnings = checks.filter(c => c.status === 'WARNING').length;
  if (!ran) return { status: 'PENDING', text: 'Run integrity check to see consistency results' };
  if (failed) {
    return { status: 'FAILED', text: `${plural(failed, 'consistency failure')} — review before submission`, badge: { tone: 'red', text: `${failed} failed` } };
  }
  if (warnings) return { status: 'WARNING', text: plural(warnings, 'consistency warning'), badge: { tone: 'amber', text: plural(warnings, 'warning') } };
  return { status: 'PASSED', text: 'All consistency checks passed' };
}

function ConsistencyRow({ check }) {
  return (
    <div className={`mah-l2-row is-${check.status.toLowerCase()}`}>
      <div className="mah-tl-head">
        <strong>{check.label}</strong>
        <span className={`mah-badge mah-tone-${SEVERITY_TONES[check.severity] || 'grey'}`}>{check.severity || 'INFO'}</span>
      </div>
      {check.details && <div className="mah-small">{check.details}</div>}
      {check.status === 'FAILED' && <div className="mah-l2-note">This issue may cause SFDA rejection</div>}
    </div>
  );
}

function ConsistencySection({ integrity, error, running, onRun }) {
  const [open, setOpen] = useState(false);
  const checks = (integrity?.checks || []).filter(c => c.check_layer === 2);
  const failed = checks.filter(c => c.status === 'FAILED');
  const warnings = checks.filter(c => c.status === 'WARNING');
  const rest = checks.filter(c => c.status !== 'FAILED' && c.status !== 'WARNING');
  const passed = rest.filter(c => c.status === 'PASSED').length;
  const summary = layer2Status(integrity);
  const ran = !!integrity?.checked_at;

  let body;
  if (running) body = <div className="mah-loading"><Spinner label="Running checks…" /></div>;
  else if (integrity === undefined && !error) body = <SkeletonLoader type="list" count={3} />;
  else if (!ran) {
    body = (
      <div className="mah-l2-empty">
        <p className="mah-muted">Run integrity check to see consistency results</p>
        <button className="mah-btn mah-btn-sm mah-btn-primary" onClick={onRun} disabled={running}>{running ? 'Running…' : 'Run check →'}</button>
      </div>
    );
  } else if (checks.length === 0) body = <p className="mah-text-green">No consistency issues found</p>;
  else {
    body = (
      <>
        {failed.map(c => <ConsistencyRow key={c.check_type} check={c} />)}
        {warnings.map(c => <ConsistencyRow key={c.check_type} check={c} />)}
        {rest.length > 0 && (
          <div className="mah-l2-passed">
            <button className="mah-tier-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
              <span>
                <span className="mah-badge mah-tone-green">{failed.length + warnings.length === 0 ? 'All passed' : `${passed} passed`}</span>
                {rest.length > passed && <span className="mah-small mah-muted"> · {rest.length - passed} not applicable or pending</span>}
              </span>
              <span className="mah-small mah-muted">{open ? 'Hide ▾' : 'Show checks ▸'}</span>
            </button>
            {open && rest.map(c => (
              <div key={c.check_type} className="mah-l2-row is-passed">
                <div className="mah-tl-head">
                  <strong>{c.label}</strong>
                  <span className={`mah-badge mah-tone-${CHECK_STATUS_TONES[c.status] || 'grey'}`}>{c.status.replace(/_/g, ' ')}</span>
                </div>
                {c.details && <div className="mah-small">{c.details}</div>}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const badgeTone = { PASSED: 'green', WARNING: 'amber', FAILED: 'red', PENDING: 'grey' }[summary.status];
  return (
    <section className="mah-card">
      <div className="mah-card-head">
        <h2>Layer 2 · Consistency</h2>
        <span className={`mah-badge mah-tone-${badgeTone}`}>{ran ? LAYER_STATUS_LABELS[summary.status] : 'Not run'}</span>
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      {body}
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
  // Stored integrity result (GET /integrity-check) for Layer 2; undefined while loading
  const [integrity, setIntegrity] = useState(undefined);
  const [integrityError, setIntegrityError] = useState(null);
  const [integrityRunning, setIntegrityRunning] = useState(false);
  const loadIntegrity = useCallback(async () => {
    try {
      setIntegrity(await apiFetch(token, `/shipments/${shipment.id}/integrity-check`));
      setIntegrityError(null);
    } catch (e) {
      setIntegrity(null);
      setIntegrityError(`Could not load consistency checks: ${e.message}`);
    }
  }, [token, shipment.id]);
  useEffect(() => { loadIntegrity(); }, [loadIntegrity, integrityKey]);
  // The dashboard reports a score whenever it loads or runs the checks — refresh Layer 2 with it
  const handleScore = useCallback((score) => { setIntegrityScore(score); loadIntegrity(); }, [loadIntegrity]);
  async function runIntegrity() {
    setIntegrityRunning(true);
    setIntegrityError(null);
    try {
      setIntegrity(await apiFetch(token, `/shipments/${shipment.id}/integrity-check`, { method: 'POST' }));
      setIntegrityKey(k => k + 1); // reload the dashboard too
    } catch (e) {
      setIntegrityError(`Integrity check failed: ${e.message}`);
    } finally {
      setIntegrityRunning(false);
    }
  }

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
        layer2={layer2Status(integrity)}
      />

      <section className="int-section" aria-labelledby="int-section-title">
        <h2 className="int-section-title" id="int-section-title">Regulatory Integrity Checks</h2>
        <IntegrityDashboard shipmentId={shipment.id} token={token} apiUrl={API_URL}
          sector={shipmentSector(shipment)} refreshKey={integrityKey} onScore={handleScore} />
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

      <ConsistencySection integrity={integrity} error={integrityError} running={integrityRunning} onRun={runIntegrity} />

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
// DEMARA guidance per rejection reason: the first key the reason text contains wins, else 'default'
const DEMARA_GUIDANCE = {
  halal: {
    title: 'Halal Certificate Issue',
    guidance: 'SFDA only recognizes certificates from approved bodies: IFANCA, JAKIM, MUI, BPJPH, CICOT, and Turkey Diyanet. If your certificate is from another body, you must obtain a new one from an approved body before filing the objection. Contact your supplier immediately.',
    action: 'Request new Halal certificate from SFDA-recognized body',
    urgency: 'HIGH',
  },
  'certificate of analysis': {
    title: 'CoA Issue',
    guidance: 'SFDA requires CoA from an ISO 17025 accredited laboratory. Ensure the CoA includes: test methods, specification ranges, actual results, lab accreditation number, and analyst signature. A CoA missing any of these will be rejected again.',
    action: 'Obtain new CoA from ISO 17025 lab with all required fields',
    urgency: 'HIGH',
  },
  registration: {
    title: 'SFDA Registration Issue',
    guidance: 'Verify your product registration is active and covers the imported quantity and presentation. Check expiry date, dosage form, and pack size match exactly. If registration has lapsed, an objection cannot succeed — apply for renewal immediately.',
    action: 'Verify registration status on SFDA eServices portal',
    urgency: 'CRITICAL',
  },
  label: {
    title: 'Labelling Issue',
    guidance: 'Saudi labelling requirements mandate: Arabic language for all mandatory information, country of origin in Arabic, storage conditions, expiry date in Hijri or Gregorian calendar, and manufacturer details. Missing any of these is grounds for rejection.',
    action: 'Prepare corrected label artwork addressing all SFDA comments',
    urgency: 'MEDIUM',
  },
  ingredient: {
    title: 'Ingredient/Composition Issue',
    guidance: 'SFDA requires full INCI declaration for cosmetics and complete ingredient list for supplements. Verify all ingredients are on the SFDA permitted list. Prohibited ingredients cannot be objected — the product must be reformulated.',
    action: 'Cross-check all ingredients against SFDA permitted list',
    urgency: 'HIGH',
  },
  storage: {
    title: 'Storage/Cold Chain Issue',
    guidance: 'Cold chain products require continuous temperature monitoring from manufacture to port. Submit temperature logger data showing unbroken cold chain. If cold chain was breached, the objection cannot succeed for this batch.',
    action: 'Obtain temperature logger certificate from shipping company',
    urgency: 'HIGH',
  },
  stability: {
    title: 'Stability Study Issue',
    guidance: 'SFDA requires stability data under Saudi climatic conditions (Zone IVB: 40°C/75% RH). ICH Q1A guidelines apply. Studies must cover the full shelf life claimed on the label.',
    action: 'Request stability study data from manufacturer covering Zone IVB conditions',
    urgency: 'HIGH',
  },
  default: {
    title: 'SFDA Rejection Response',
    guidance: 'Review the SFDA rejection notice carefully and address each point specifically. Your objection must directly respond to the stated reason with supporting documentation. Vague responses are rejected. Contact your DEMARA advisor for case-specific guidance.',
    action: 'Contact DEMARA advisor for case-specific guidance',
    urgency: 'MEDIUM',
  },
};
const URGENCY_LABELS = { CRITICAL: 'Critical', HIGH: 'High priority', MEDIUM: 'Advisory' };
const DEMARA_ADVICE_EMAIL = 'advice@demara.sa';

function guidanceFor(reasonText) {
  const text = (reasonText || '').toLowerCase();
  const key = Object.keys(DEMARA_GUIDANCE).find(k => k !== 'default' && text.includes(k));
  return DEMARA_GUIDANCE[key || 'default'];
}

function DemaraGuidance({ reason }) {
  const g = guidanceFor(reason);
  return (
    <div className="mah-guidance">
      <div className="mah-guidance-head">
        <span className="mah-guidance-brand">✦ DEMARA Guidance</span>
        <span className={`mah-guidance-pill is-${g.urgency.toLowerCase()}`}>{URGENCY_LABELS[g.urgency]}</span>
      </div>
      <p className="mah-guidance-text"><strong>{g.title}.</strong> {g.guidance}</p>
      <div className="mah-guidance-action">
        <strong>→ Recommended action:</strong>
        <span>{g.action}</span>
      </div>
    </div>
  );
}

// ── Objection dossier: shared pieces (also used by the Clearance Portal) ──
// GET /shipments/:id/objection/dossier drives both sides. objection_status (migration 026):
//   null → DRAFTING → SUBMITTED_TO_CLEARANCE ⇄ RETURNED_TO_MAH → FILED_WITH_SFDA (shipment OBJECTION_FILED)
const OBJECTION_STEPS = ['Prepare dossier', 'Submit to clearance', 'Clearance files with SFDA'];
const filled = (text) => !!(text || '').trim();
const DOSSIER_PRINT_CLASS = 'dossier-printing';

// done = number of finished steps (0–3); the next one is shown as in progress
export function ObjectionSteps({ done }) {
  return (
    <ol className="mah-obj-steps" aria-label="Objection progress">
      {OBJECTION_STEPS.map((label, i) => {
        const cls = i < done ? 'is-done' : i === done ? 'is-active' : '';
        return (
          <li key={label} className={cls}>
            <span className="mah-step-num">{i < done ? '✓' : i === done && i === 2 ? '⏳' : i + 1}</span>
            <span>Step {i + 1}: {label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Days left on the 60-day objection window
export function ObjectionCountdown({ days, rejectionDate }) {
  const deadline = rejectionDate ? new Date(new Date(rejectionDate).getTime() + 60 * 24 * 60 * 60 * 1000) : null;
  return (
    <section className={`mah-card mah-countdown${days !== null && days <= 10 ? ' is-urgent' : ''}`}>
      <div className="mah-countdown-days">{days === null || days === undefined ? '—' : Math.max(days, 0)}<span>days left</span></div>
      <div>
        <strong>Objection deadline · {fmtDate(deadline)}</strong>
        <div className="mah-row-sub">SFDA allows 60 days from the rejection to file a reasoned objection.</div>
      </div>
    </section>
  );
}

// Read-only reasons and responses
export function DossierReasons({ reasons }) {
  if (!reasons?.length) return <p className="mah-muted mah-small">No rejection reasons in this dossier.</p>;
  return reasons.map((r, i) => (
    <section key={r.reason_index} className={`mah-card mah-reason-card mah-edge-${filled(r.response_text) ? 'green' : 'amber'}`}>
      <div className="mah-reason-head">
        <span className="mah-reason-num">Reason {i + 1}</span>
        <span className={`mah-small mah-text-${filled(r.response_text) ? 'green' : 'amber'}`}>
          {filled(r.response_text) ? '✓ Response added' : '⚠ Response needed'}
        </span>
      </div>
      <div className="mah-dossier-label">SFDA rejection reason</div>
      <div className="mah-row-title">{r.reason_text || '—'}</div>
      <div className="mah-dossier-label">MAH response</div>
      <p className="mah-dossier-response">{filled(r.response_text) ? r.response_text : <span className="mah-muted">No response yet</span>}</p>
    </section>
  ));
}

function DossierProgress({ reasons }) {
  const total = reasons.length;
  const answered = reasons.filter(r => filled(r.response_text)).length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="mah-obj-progress">
      <div className="mah-small"><strong>{answered} of {total}</strong> reason{total === 1 ? ' has a response' : 's have responses'}</div>
      <div className="mah-obj-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="mah-obj-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Prints only the dossier (window.print on .mah-dossier-print)
function printDossier() {
  const done = () => { document.body.classList.remove(DOSSIER_PRINT_CLASS); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  document.body.classList.add(DOSSIER_PRINT_CLASS);
  window.print();
}

function ObjectionTab({ token, shipment, name, onChanged, showToast }) {
  const [dossier, setDossier] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [drafts, setDrafts] = useState({});      // reason_index → { reason_text, response_text }
  const [saveState, setSaveState] = useState({}); // reason_index → 'saving' | 'saved' | 'error'
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch(token, `/shipments/${shipment.id}/objection/dossier`);
      setDossier(d);
      setDrafts(Object.fromEntries(d.reasons.map(r => [r.reason_index, { reason_text: r.reason_text || '', response_text: r.response_text || '' }])));
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
    }
  }, [token, shipment.id]);
  useEffect(() => { load(); }, [load, shipment.current_state]);

  const state = stateOf(shipment);
  const status = dossier?.objection_status || (state === 'OBJECTION_FILED' ? 'FILED_WITH_SFDA' : null);
  const reasons = dossier?.reasons || [];
  const clearanceName = dossier?.clearance_company_name || 'your clearance company';
  const round = dossier ? dossier.current_round : (shipment.objection_count || 0) + 1;

  const run = async (key, fn) => {
    setBusy(key);
    setError(null);
    try { return await fn(); } catch (e) { setError(e.message); return false; } finally { setBusy(null); }
  };

  // Saves one field if it changed since the last save. Returns false on failure.
  async function saveField(idx, field) {
    const reason = reasons.find(r => r.reason_index === idx);
    const value = (drafts[idx]?.[field] || '').trim();
    if (!reason || value === (reason[field] || '').trim()) return true;
    setSaveState(prev => ({ ...prev, [idx]: 'saving' }));
    try {
      const { objection } = await apiFetch(token, `/shipments/${shipment.id}/objection/${idx}`, {
        method: 'PUT', body: { [field]: field === 'response_text' ? value || null : value },
      });
      setDossier(prev => ({ ...prev, reasons: prev.reasons.map(r => (r.reason_index === idx ? { ...r, ...objection } : r)) }));
      setSaveState(prev => ({ ...prev, [idx]: 'saved' }));
      return true;
    } catch (e) {
      setSaveState(prev => ({ ...prev, [idx]: 'error' }));
      setError(e.message);
      return false;
    }
  }
  async function saveAll() {
    for (const r of reasons) {
      if (!(await saveField(r.reason_index, 'reason_text'))) return false;
      if (!(await saveField(r.reason_index, 'response_text'))) return false;
    }
    return true;
  }
  const setDraft = (idx, field, value) => setDrafts(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));

  const startDossier = () => run('start', async () => {
    await apiFetch(token, `/shipments/${shipment.id}/objection`, {
      method: 'POST', body: { rejection_reasons: [{ reason_index: 0, reason_text: '' }] },
    });
    await load();
    await onChanged();
  });
  const addReason = () => run('add', async () => {
    const next = reasons.reduce((m, r) => Math.max(m, r.reason_index), -1) + 1;
    const { objection } = await apiFetch(token, `/shipments/${shipment.id}/objection/${next}`, { method: 'PUT', body: { reason_text: '' } });
    setDossier(prev => ({ ...prev, reasons: [...prev.reasons, objection] }));
    setDrafts(prev => ({ ...prev, [next]: { reason_text: '', response_text: '' } }));
  });
  const removeReason = (idx) => run(`remove-${idx}`, async () => {
    await apiFetch(token, `/shipments/${shipment.id}/objection/${idx}`, { method: 'DELETE' });
    setDossier(prev => ({ ...prev, reasons: prev.reasons.filter(r => r.reason_index !== idx) }));
  });
  const saveProgress = () => run('save', async () => { if (await saveAll()) showToast?.('Progress saved'); });
  const submit = () => run('submit', async () => {
    if (!(await saveAll())) return;
    await apiFetch(token, `/shipments/${shipment.id}/objection/submit-to-clearance`, { method: 'POST' });
    setConfirmOpen(false);
    showToast?.(`Dossier submitted to ${clearanceName}`);
    await load();
    await onChanged();
  });

  if (!dossier) {
    return (
      <section className="mah-card">
        {loadError ? <ErrorBanner compact error={loadError} message="Could not load the objection dossier" onRetry={load} />
          : <SkeletonLoader type="card" count={2} />}
      </section>
    );
  }

  const countdown = state === 'SFDA_REJECTED' && <ObjectionCountdown days={dossier.days_remaining} rejectionDate={dossier.rejection_date} />;
  const errorBox = error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>;

  // ── No dossier yet ──
  if (!status) {
    return (
      <div className="mah-stack">
        {countdown}
        {errorBox}
        <section className="mah-card mah-obj-start">
          <h2>Start your objection dossier</h2>
          <p className="mah-muted">
            Enter each rejection reason from the SFDA notice below. You can save your progress and return at any time.
            When complete, submit to your clearance company for filing.
          </p>
          <button className="mah-btn mah-btn-navy mah-self-start" onClick={startDossier} disabled={busy !== null}>
            {busy === 'start' ? 'Starting…' : 'Start dossier →'}
          </button>
        </section>
      </div>
    );
  }

  // ── Drafting / returned: editable ──
  if (status === 'DRAFTING' || status === 'RETURNED_TO_MAH') {
    const answered = reasons.filter(r => filled(drafts[r.reason_index]?.response_text)).length;
    return (
      <div className="mah-stack">
        {countdown}
        {status === 'RETURNED_TO_MAH' && (
          <section className="mah-obj-returned" role="alert">
            <strong>⚠ Returned by {clearanceName}</strong>
            {dossier.objection_clearance_note && <p className="mah-obj-note">{dossier.objection_clearance_note}</p>}
            <span>Please address the comments above and resubmit when ready.</span>
          </section>
        )}
        {round >= 2 && (
          <section className="mah-round-warning" role="alert">
            <div className="mah-round-warning-title">⚠ Second Objection Round</div>
            <p>
              You are filing a second objection for this shipment. SFDA allows limited objection rounds. If this objection is
              rejected, further escalation will require referral to the SFDA Grievance Committee through your DEMARA advisor.
            </p>
            <p>
              <strong>DEMARA Recommendation:</strong> Before filing, ensure your dossier is complete and addresses ALL previous
              rejection reasons with new supporting evidence. Repeating the same response will not succeed.
            </p>
            <a className="mah-btn mah-btn-sm mah-btn-outline-amber" href={`mailto:${DEMARA_ADVICE_EMAIL}`}>Contact DEMARA Advisor →</a>
          </section>
        )}
        <ObjectionSteps done={0} />
        {errorBox}

        {reasons.map((r, i) => {
          const d = drafts[r.reason_index] || { reason_text: '', response_text: '' };
          const saving = saveState[r.reason_index];
          return (
            <section key={r.reason_index} className={`mah-card mah-reason-card mah-edge-${filled(d.response_text) ? 'green' : 'amber'}`}>
              <div className="mah-reason-head">
                <span className="mah-reason-num">Reason {i + 1}</span>
                <span className="mah-small mah-muted" aria-live="polite">
                  {saving === 'saving' ? 'Saving…' : saving === 'saved' ? '✓ Saved' : saving === 'error' ? 'Not saved' : ''}
                </span>
              </div>
              <label className="mah-field">
                <span>SFDA rejection reason</span>
                <input className="mah-input" value={d.reason_text} maxLength={2000} placeholder="As written in the SFDA rejection notice"
                  onChange={e => setDraft(r.reason_index, 'reason_text', e.target.value)}
                  onBlur={() => saveField(r.reason_index, 'reason_text')} />
              </label>
              {filled(d.reason_text) && <DemaraGuidance reason={d.reason_text} />}
              <label className="mah-field">
                <span>Your response to SFDA</span>
                <textarea className="mah-input" rows={4} maxLength={10000}
                  placeholder="Address this rejection reason specifically with supporting evidence"
                  value={d.response_text} onChange={e => setDraft(r.reason_index, 'response_text', e.target.value)}
                  onBlur={() => saveField(r.reason_index, 'response_text')} />
              </label>
              <div className="mah-row-actions">
                <span className={`mah-small mah-text-${filled(d.response_text) ? 'green' : 'amber'}`}>
                  {filled(d.response_text) ? '✓ Response added' : '⚠ Response needed'}
                </span>
                {reasons.length > 1 && (
                  <button className="mah-link-btn mah-small" onClick={() => removeReason(r.reason_index)} disabled={busy !== null}>
                    Remove reason
                  </button>
                )}
              </div>
            </section>
          );
        })}

        <button className="mah-btn mah-btn-ghost mah-self-start" onClick={addReason} disabled={busy !== null}>
          <Icon name="plus" size={16} /> {busy === 'add' ? 'Adding…' : 'Add another reason'}
        </button>

        <section className="mah-card mah-stack">
          <DossierProgress reasons={reasons.map(r => ({ response_text: drafts[r.reason_index]?.response_text }))} />
          <div className="mah-obj-actions">
            <button className="mah-btn mah-btn-ghost" onClick={saveProgress} disabled={busy !== null}>
              {busy === 'save' ? 'Saving…' : 'Save progress'}
            </button>
            <button className="mah-btn mah-btn-navy" onClick={() => { setError(null); setConfirmOpen(true); }} disabled={busy !== null}>
              Submit to clearance →
            </button>
          </div>
        </section>

        {confirmOpen && (
          <ConfirmDialog title={`Submit dossier to ${clearanceName}?`} confirmLabel="Submit anyway" cancelLabel="Continue editing"
            tone="navy" busy={busy === 'submit'} error={error} onConfirm={submit}
            onClose={() => { if (busy !== 'submit') setConfirmOpen(false); }}>
            <p>
              Once submitted, you cannot edit the dossier until your clearance company reviews it and either files it or
              returns it with comments.
            </p>
            <p className="mah-small"><strong>{answered} of {reasons.length}</strong> reasons have responses</p>
            {answered < reasons.length && (
              <div className="mah-alert mah-alert-amber">
                {reasons.length - answered} reason{reasons.length - answered === 1 ? ' has' : 's have'} no response yet. Your clearance
                company can return the dossier if it is incomplete.
              </div>
            )}
          </ConfirmDialog>
        )}
      </div>
    );
  }

  // ── Submitted to clearance: locked ──
  if (status === 'SUBMITTED_TO_CLEARANCE') {
    return (
      <div className="mah-stack">
        {countdown}
        <section className="mah-obj-banner is-blue">
          <strong>✓ Dossier submitted to clearance</strong>
          <span>Submitted on {fmtDateTime(dossier.objection_submitted_to_clearance_at)}</span>
          <span>
            {clearanceName} is reviewing your dossier and will file it with SFDA via Faseh. You will be notified when it is filed.
          </span>
        </section>
        <ObjectionSteps done={2} />
        <div className="mah-alert mah-alert-grey">🔒 Locked for review — cannot edit while clearance is reviewing</div>
        <DossierReasons reasons={reasons} />
      </div>
    );
  }

  // ── Filed with SFDA ──
  return (
    <div className="mah-stack">
      <section className="mah-obj-banner is-green">
        <strong>✓ Objection filed with SFDA</strong>
        <span>Filed on {fmtDateTime(dossier.objection_filed_at)}</span>
        <span>Faseh reference: <strong className="mah-mono">{dossier.objection_faseh_ref || '—'}</strong></span>
        <span>SFDA will review your objection and respond. This typically takes 2-4 weeks.</span>
      </section>
      <ObjectionSteps done={3} />
      <button className="mah-btn mah-btn-ghost mah-self-start" onClick={printDossier}>Download dossier PDF</button>
      <div className="mah-dossier-print">
        <div className="mah-dossier-print-head">
          <h2>Objection dossier — {name}</h2>
          <div className="mah-row-sub">
            <span className="mah-mono">{dossier.masaar_id}</span> · Round {round} · Faseh {dossier.objection_faseh_ref || '—'}
            {' '}· Filed {fmtDateTime(dossier.objection_filed_at)} · Clearance: {clearanceName}
          </div>
        </div>
        <DossierReasons reasons={reasons} />
      </div>
    </div>
  );
}

// ── Disposition (Stage 9) ────────────────────────────
// DISPOSITION_PENDING: the MAH asks its clearance company for re-export or supervised destruction
// (POST /shipments/:id/disposition-request). The clearance company closes the shipment once done.
const REEXPORT_COUNTRIES = [
  'China', 'Egypt', 'France', 'Germany', 'India', 'Indonesia', 'Italy', 'Japan', 'Jordan', 'Malaysia',
  'Netherlands', 'Pakistan', 'South Korea', 'Spain', 'Switzerland', 'Turkey', 'United Arab Emirates',
  'United Kingdom', 'United States',
];
const DESTRUCTION_REASONS = [
  'Re-export not feasible',
  'Supplier refused return',
  'Product safety concern',
  'Cost of re-export exceeds product value',
  'Other',
];
const DISPOSITION_RECORD_STATES = ['SFDA_REJECTED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

// Downloads a self-contained HTML record of the disposition: shipment facts + disposition history
function downloadDispositionRecord(shipment, name) {
  const entries = (shipment.audit_log || []).filter(e => e.action === 'DISPOSITION_REQUEST_SENT'
    || (DISPOSITION_RECORD_STATES.includes(e.to_state) && e.from_state !== e.to_state));
  const facts = [
    ['Shipment', name],
    ['MASAAR ID', shipment.masaar_id],
    ['Outcome', getStateLabel(stateOf(shipment))],
    ['Completed', fmtDateTime(shipment.state_entered_at)],
    ['Re-export reference', shipment.re_export_reference],
    ['Destruction reference', shipment.destruction_reference],
    ['Destruction witnessed by', shipment.destruction_witnessed_by],
    ['Port of entry', shipment.port_of_entry],
  ].filter(([, v]) => v);
  const rows = entries.map(e => `<tr><td>${escapeHtml(fmtDateTime(e.occurred_at))}</td><td>${escapeHtml(e.trigger_event || e.action)}`
    + `${e.notes ? `<br><span class="muted">${escapeHtml(e.notes)}</span>` : ''}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Disposition record — ${escapeHtml(shipment.masaar_id || name)}</title>
<style>body{font-family:system-ui,sans-serif;color:#0F1A4A;max-width:760px;margin:32px auto;padding:0 16px}
table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #E2E8F0;padding:8px;text-align:left;font-size:14px}
th{background:#F8FAFC;width:35%}h1{font-size:22px}h2{font-size:16px;margin-top:28px}.muted{color:#64748B;font-size:12px}</style></head>
<body><h1>MASAAR disposition record</h1><p class="muted">Generated ${escapeHtml(new Date().toLocaleString('en-GB'))}</p>
<table>${facts.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
<h2>Disposition history</h2>
<table><tr><th>When</th><th>Event</th></tr>${rows || '<tr><td colspan="2">No entries</td></tr>'}</table>
</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `disposition-record-${shipment.masaar_id || shipment.id}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DispositionTab({ token, shipment, name, supplierCountry, onChanged, showToast }) {
  const state = stateOf(shipment);
  const [form, setForm] = useState(null); // 'REEXPORT' | 'DESTRUCTION' | null
  const [destination, setDestination] = useState(supplierCountry || '');
  const [reexportReason, setReexportReason] = useState('SFDA rejected — returning to supplier');
  const [destructionReason, setDestructionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const countries = supplierCountry && !REEXPORT_COUNTRIES.includes(supplierCountry)
    ? [supplierCountry, ...REEXPORT_COUNTRIES] : REEXPORT_COUNTRIES;
  // audit_log is newest first
  const lastRequest = (shipment.audit_log || []).find(e => e.action === 'DISPOSITION_REQUEST_SENT');

  const open = (type) => { setError(null); setNotes(''); setForm(type); };
  const canSend = form === 'REEXPORT' ? !!destination : !!destructionReason;

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = form === 'REEXPORT'
      ? { type: 'REEXPORT', destination, reason: reexportReason.trim() || undefined, notes: notes.trim() || undefined }
      : { type: 'DESTRUCTION', reason: destructionReason, notes: notes.trim() || undefined };
    try {
      await apiFetch(token, `/shipments/${shipment.id}/disposition-request`, { method: 'POST', body });
      showToast?.(form === 'REEXPORT' ? 'Re-export request sent to your clearance company' : 'Destruction request sent to your clearance company');
      setForm(null);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <section className="mah-card mah-dispo-head">
      <h2>Disposition — Shipment {name}</h2>
      <StateBadge state={shipment.current_state} />
    </section>
  );

  if (state === 'CLOSED_REEXPORTED' || state === 'CLOSED_DESTROYED') {
    const reexported = state === 'CLOSED_REEXPORTED';
    return (
      <div className="mah-stack">
        {header}
        <section className={`mah-card mah-dispo-done ${reexported ? 'is-reexported' : 'is-destroyed'}`}>
          <strong className="mah-dispo-done-title">✓ {reexported ? 'Re-export completed' : 'Destruction completed'}</strong>
          <div className="mah-facts">
            {reexported
              ? <div><span>Re-export reference</span><strong>{shipment.re_export_reference || '—'}</strong></div>
              : (
                <>
                  <div><span>Destruction reference</span><strong>{shipment.destruction_reference || '—'}</strong></div>
                  <div><span>Witnessed by</span><strong>{shipment.destruction_witnessed_by || '—'}</strong></div>
                </>
              )}
            <div><span>Completion date</span><strong>{fmtDate(shipment.state_entered_at)}</strong></div>
          </div>
          <button className="mah-btn mah-btn-ghost mah-self-start" onClick={() => downloadDispositionRecord(shipment, name)}>
            Download disposition record →
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mah-stack">
      {header}
      <div className="mah-alert mah-alert-amber">
        Your shipment has been rejected by SFDA and is pending disposition. You have two options: re-export the goods to the
        country of origin, or arrange for supervised destruction. Your clearance company will coordinate with SFDA and customs.
      </div>
      {lastRequest && (
        <div className="mah-alert mah-alert-blue">
          Request sent {fmtDateTime(lastRequest.occurred_at)}: {lastRequest.notes || lastRequest.trigger_event}. Your clearance
          company has been notified.
        </div>
      )}

      <div className="mah-dispo-options">
        <section className={`mah-card mah-dispo-option${form === 'REEXPORT' ? ' is-active' : ''}`}>
          <div className="mah-dispo-icon" aria-hidden="true">✈</div>
          <h3>Re-export</h3>
          <p>Return goods to country of origin or another permitted destination. Requires SFDA re-export permit and customs coordination.</p>
          <span className="mah-small mah-muted">Typically 14-30 days</span>
          {form !== 'REEXPORT' && (
            <button className="mah-btn mah-btn-outline-blue mah-self-start" onClick={() => open('REEXPORT')}>Request re-export →</button>
          )}
        </section>
        <section className={`mah-card mah-dispo-option${form === 'DESTRUCTION' ? ' is-active' : ''}`}>
          <div className="mah-dispo-icon" aria-hidden="true">🗑</div>
          <h3>Supervised Destruction</h3>
          <p>Goods destroyed under SFDA supervision at an approved facility. Required when re-export is not possible.</p>
          <span className="mah-small mah-muted">Typically 7-21 days</span>
          {form !== 'DESTRUCTION' && (
            <button className="mah-btn mah-btn-outline-red mah-self-start" onClick={() => open('DESTRUCTION')}>Request destruction →</button>
          )}
        </section>
      </div>

      {form && (
        <form className="mah-card mah-stack" onSubmit={send}>
          <div className="mah-card-head"><h2>{form === 'REEXPORT' ? 'Re-export request' : 'Destruction request'}</h2></div>
          {form === 'REEXPORT' ? (
            <>
              <label className="mah-field">
                <span>Destination country *</span>
                <select className="mah-input" value={destination} onChange={e => setDestination(e.target.value)} required>
                  <option value="">Select a country…</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="mah-field">
                <span>Reason</span>
                <input className="mah-input" value={reexportReason} maxLength={500} onChange={e => setReexportReason(e.target.value)} />
              </label>
            </>
          ) : (
            <label className="mah-field">
              <span>Reason for destruction *</span>
              <select className="mah-input" value={destructionReason} onChange={e => setDestructionReason(e.target.value)} required>
                <option value="">Select a reason…</option>
                {DESTRUCTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}
          <label className="mah-field">
            <span>Notes (optional)</span>
            <textarea className="mah-input" rows={3} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          {error && <div className="mah-alert mah-alert-red">{error}</div>}
          <div className="mah-remove-warning-actions">
            <button type="button" className="mah-btn mah-btn-ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button type="submit" className="mah-btn mah-btn-primary" disabled={busy || !canSend}>
              {busy ? 'Sending…' : 'Send request to clearance →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
