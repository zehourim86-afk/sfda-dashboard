// Clearance Portal — Shipment detail with sub-tabs:
// Timeline | Documents | Faseh & Filing | SFDA Track | Objection (SFDA_REJECTED / OBJECTION_FILED) | Customs
// | Disposition (only in DISPOSITION_PENDING)
// The broker records Faseh filing, SFDA outcomes, sampling steps, customs steps and disposition here.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiFetch, stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector,
  SECTOR_CHECKLISTS, CHECKLIST_DOC_TYPES, fmtDate, fmtDateTime, Tabs, Icon, isDataUrl, SECTOR_LABELS,
} from './mahShared';
import RoadmapBanner from './RoadmapBanner';
import ServiceAgreementModal from './ServiceAgreementModal';
import { RISK_TONES, isPendingRequest } from './ClearanceOverview';
import { COUNTRY_FLAGS } from './mahMarketData';
import { TimelineTab, DossierReasons, ObjectionCountdown, ObjectionSteps } from './MahShipmentDetail';
import {
  SAMPLING_STEPS, SAMPLING_LABELS, CUSTOMS_STEPS, CUSTOMS_LABELS, INFO_REQUEST_LABELS,
  todayISO, fmtSAR, Toast,
} from './clearanceShared';

const READINESS_TONES = { READY: 'green', WARNING: 'amber', MISSING_INFO: 'amber', CRITICAL_ISSUE: 'red' };
const TRANSPORT_LABELS = { sea: 'Sea', air: 'Air', land: 'Land' };
const TOAST_MS = 3500;

export default function ClearanceShipmentDetail({
  token, user, shipment: initial, initialTab, productsById, organisations = [], navigate, reloadShipments, showToast: portalToast,
}) {
  const [shipment, setShipment] = useState(initial);
  const [docs, setDocs] = useState(null);
  const [shared, setShared] = useState({});
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(initialTab || 'timeline');
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [agreementOpen, setAgreementOpen] = useState(false);

  const load = useCallback(async () => {
    const [detail, documents, sharedDocs] = await Promise.allSettled([
      apiFetch(token, `/shipments/${initial.id}`),
      apiFetch(token, `/documents/${initial.id}`),
      apiFetch(token, `/documents/${initial.id}/shared`),
    ]);
    if (detail.status === 'fulfilled') { setShipment(detail.value.shipment); setError(null); } else setError(detail.reason.message);
    if (documents.status === 'fulfilled') setDocs(documents.value);
    if (sharedDocs.status === 'fulfilled') {
      setShared(Object.fromEntries((sharedDocs.value.documents || []).map(d => [d.document_type, d])));
    }
  }, [token, initial.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  // Runs one broker action: fn() does the API calls; then the shipment and list reload.
  // Returns true on success so forms can reset.
  const run = async (key, fn, successMessage) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      await load();
      reloadShipments().catch(() => {});
      if (successMessage) showToast(successMessage);
      return true;
    } catch (e) {
      setActionError(e.message);
      await load().catch(() => {});
      return false;
    } finally {
      setBusy(null);
    }
  };
  const transition = (to_state, extra = {}) =>
    apiFetch(token, `/shipments/${shipment.id}/transition`, { method: 'PUT', body: { to_state, ...extra } });

  const state = stateOf(shipment);
  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'documents', label: 'Documents' },
    { key: 'faseh', label: 'Faseh & Filing' },
    { key: 'sfda', label: 'SFDA Track' },
    ...(['SFDA_REJECTED', 'OBJECTION_FILED'].includes(state) ? [{ key: 'objection', label: 'Objection' }] : []),
    { key: 'customs', label: 'Customs' },
    ...(state === 'DISPOSITION_PENDING' ? [{ key: 'disposition', label: 'Disposition' }] : []),
  ];
  const activeTab = tabs.some(t => t.key === tab) ? tab : 'timeline';
  const sector = shipmentSector(shipment);
  const ctx = { token, shipment, state, busy, run, transition };

  // A pending engagement request: only the limited summary and accept / decline
  if (isPendingRequest(shipment)) {
    return (
      <div className="mah-page">
        <button className="mah-link-btn mah-back" onClick={() => navigate('shipments')}><Icon name="back" size={16} /> All shipments</button>
        {error && <div className="mah-alert mah-alert-red">{error}</div>}
        <EngagementRequest token={token} shipment={shipment} startDeclining={initialTab === 'decline'}
          onAccepted={async () => {
            await load();
            reloadShipments().catch(() => {});
            showToast('Engagement accepted!');
          }}
          onDeclined={() => {
            reloadShipments().catch(() => {});
            portalToast?.('Request declined. MAH has been notified.');
            navigate('overview');
          }} />
      </div>
    );
  }

  const myOrg = organisations.find(o => o.id === user?.organisation_id);
  const mahOrg = organisations.find(o => o.id === shipment.org_id);
  const showAgreement = shipment.broker_acceptance_status === 'ACCEPTED'
    && ['DRAFT', 'PREPARING', 'READY_TO_SUBMIT', 'WITH_BROKER'].includes(state);
  const mahName = shipment.mah_org_name || shipment.importer_name || 'the MAH';
  let agreementBanner = null;
  if (showAgreement && !shipment.agreement_acknowledged_clearance) {
    agreementBanner = (
      <section className="mah-broker-banner mah-broker-blue">
        <div className="mah-broker-row">
          <div className="mah-broker-text">
            <strong>✓ You accepted this engagement</strong>
            <span>Please acknowledge the service agreement to proceed with filing.</span>
          </div>
          <button className="mah-btn mah-btn-sm mah-btn-primary" onClick={() => setAgreementOpen(true)}>Review agreement →</button>
        </div>
      </section>
    );
  } else if (showAgreement && !shipment.agreement_acknowledged_mah) {
    agreementBanner = (
      <section className="mah-broker-banner mah-broker-amber">
        <div className="mah-broker-row">
          <div className="mah-broker-text">
            <strong>Agreement acknowledged by you ✓</strong>
            <span>Waiting for {mahName} to acknowledge their side.</span>
          </div>
          <button className="mah-link-btn" onClick={() => setAgreementOpen(true)}>View agreement</button>
        </div>
      </section>
    );
  } else if (showAgreement) {
    agreementBanner = (
      <section className="mah-broker-banner mah-broker-green">
        <div className="mah-broker-row">
          <div className="mah-broker-text">
            <strong>✓ Agreement in effect — proceed with filing</strong>
            <span>Acknowledged by both parties.</span>
          </div>
          <button className="mah-link-btn" onClick={() => setAgreementOpen(true)}>View agreement</button>
        </div>
      </section>
    );
  }

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
          <div><span>MAH company</span><strong>{shipment.importer_name || '—'}</strong></div>
          <div><span>Supplier</span><strong>{shipment.supplier_name || '—'}</strong></div>
          <div><span>Port</span><strong>{shipment.port_of_entry || '—'}</strong></div>
          <div><span>Transport</span><strong>{TRANSPORT_LABELS[shipment.transport_mode] || '—'}</strong></div>
          <div><span>ETA</span><strong>{fmtDate(shipment.eta)}</strong></div>
          <div><span>B/L / AWB</span><strong>{shipment.bl_awb_number || '—'}</strong></div>
          <div><span>Customs</span><strong>{CUSTOMS_LABELS[shipment.customs_state] || '—'}</strong></div>
        </div>
      </section>

      {agreementBanner}

      {error && <div className="mah-alert mah-alert-red">{error}</div>}

      <Tabs tabs={tabs} active={activeTab} onChange={(t) => { setTab(t); setActionError(null); }} />

      {actionError && <div className="mah-alert mah-alert-red" role="alert">{actionError}</div>}

      {activeTab === 'timeline' && <TimelineTab shipment={shipment} />}
      {activeTab === 'documents' && <DocumentsTab shipment={shipment} sector={sector} docs={docs} shared={shared} />}
      {activeTab === 'faseh' && <FasehTab {...ctx} />}
      {activeTab === 'sfda' && <SfdaTab {...ctx} />}
      {activeTab === 'objection' && <ObjectionTab {...ctx} />}
      {activeTab === 'customs' && <CustomsTab {...ctx} />}
      {activeTab === 'disposition' && <DispositionTab {...ctx} />}

      {agreementOpen && (
        <ServiceAgreementModal shipment={shipment} party="CLEARANCE" token={token}
          mahOrg={mahOrg} clearanceOrg={myOrg}
          onClose={() => setAgreementOpen(false)}
          onAcknowledged={async (_updated, message) => {
            await load();
            reloadShipments().catch(() => {});
            showToast(message);
          }} />
      )}

      <Toast message={toast} />
    </div>
  );
}

// ── Engagement request (broker_acceptance_status PENDING) ──
const MIN_DECLINE_REASON = 10;

function EngagementRequest({ token, shipment, startDeclining, onAccepted, onDeclined }) {
  const [mode, setMode] = useState(startDeclining ? 'decline' : null); // null | 'decline' | 'accept'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mahName = shipment.mah_org_name || 'the MAH';
  const country = shipment.supplier_country;
  const reasonLength = reason.trim().length;

  const respond = async (body, after) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/shipments/${shipment.id}/broker-response`, { method: 'POST', body });
      await after();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="clr-engagement">
      <div className="mah-page-head">
        <div>
          <h1>New Engagement Request</h1>
          <p className="mah-muted">Review the shipment details and decide whether to accept this engagement</p>
        </div>
      </div>

      <section className="mah-card">
        <div className="mah-card-head">
          <h2>{mahName} — {shipment.shipment_name || 'Shipment'}</h2>
          <span className="mah-mono mah-small">{shipmentRef(shipment)}</span>
        </div>
        <div className="mah-facts">
          <div><span>MAH company</span><strong>{mahName}</strong></div>
          <div><span>Sector</span><strong><SectorBadge sector={shipment.sector} /></strong></div>
          <div><span>Product category</span><strong>{SECTOR_LABELS[shipment.sector] || shipment.product_category || '—'}</strong></div>
          <div><span>Supplier origin</span><strong>{country ? `${COUNTRY_FLAGS[country] || '🌐'} ${country}` : '—'}</strong></div>
          <div><span>Port of entry</span><strong>{shipment.port_of_entry || '—'}</strong></div>
          <div><span>Transport mode</span><strong>{TRANSPORT_LABELS[shipment.transport_mode] || '—'}</strong></div>
          <div><span>Expected arrival</span><strong>{fmtDate(shipment.eta)}</strong></div>
          <div><span>Pre-arrival risk</span><strong>
            {shipment.risk_band
              ? <span className={`mah-badge mah-tone-${RISK_TONES[shipment.risk_band] || 'grey'}`}>{shipment.risk_band}</span>
              : '—'}
          </strong></div>
          <div><span>Documents prepared</span><strong>{shipment.document_count ?? 0} document{shipment.document_count === 1 ? '' : 's'} ready</strong></div>
        </div>
      </section>

      <div className="mah-alert mah-alert-blue">
        <Icon name="shield" size={16} />
        Full shipment details including supplier information, product specifications and documents will be shared
        after you accept this engagement.
      </div>

      <section className="mah-card clr-engagement-actions">
        {mode === 'decline' ? (
          <div className="clr-decline-form">
            <label className="mah-field">
              <span>Reason for declining (required, min {MIN_DECLINE_REASON} chars)</span>
              <textarea className="mah-input" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                maxLength={2000} disabled={busy} autoFocus />
            </label>
            <span className="clr-char-count">{reasonLength} / {MIN_DECLINE_REASON}+ characters</span>
            <div className="clr-engagement-buttons">
              <button className="mah-btn mah-btn-ghost" onClick={() => { setMode(null); setError(null); }} disabled={busy}>Cancel</button>
              <button className="mah-btn mah-btn-red" disabled={busy || reasonLength < MIN_DECLINE_REASON}
                onClick={() => respond({ decision: 'DECLINE', reason: reason.trim() }, onDeclined)}>
                {busy ? 'Declining…' : 'Confirm decline →'}
              </button>
            </div>
          </div>
        ) : mode === 'accept' ? (
          <div className="clr-engagement-buttons">
            <strong className="mah-grow">Accept this shipment from {mahName}?</strong>
            <button className="mah-btn mah-btn-ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</button>
            <button className="mah-btn mah-btn-navy" disabled={busy}
              onClick={() => respond({ decision: 'ACCEPT' }, onAccepted)}>
              {busy ? 'Accepting…' : 'Yes, accept →'}
            </button>
          </div>
        ) : (
          <div className="clr-engagement-buttons">
            <button className="mah-btn mah-btn-outline-red" onClick={() => setMode('decline')}>Decline</button>
            <button className="mah-btn mah-btn-navy" onClick={() => setMode('accept')}>Accept engagement →</button>
          </div>
        )}
        {error && <div className="mah-alert mah-alert-red">{error}</div>}
      </section>
    </div>
  );
}

// Audit entries matching a test, newest first, as a compact list
function HistoryList({ entries, empty }) {
  if (entries.length === 0) return <p className="mah-muted mah-small">{empty}</p>;
  return (
    <ol className="mah-timeline">
      {entries.map(e => (
        <li key={e.id}>
          <span className="mah-tl-dot" />
          <div className="mah-tl-body">
            <div className="mah-tl-head">
              <strong>{e.trigger_event}</strong>
              <span className="mah-muted mah-small">{fmtDateTime(e.occurred_at)}</span>
            </div>
            <div className="mah-row-sub">{e.actor_name || e.actor_role || 'System'}</div>
            {e.notes && <div className="mah-tl-note">{e.notes}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Documents (read-only) ────────────────────────────
function DocumentsTab({ shipment, sector, docs, shared }) {
  const [viewing, setViewing] = useState(null);
  const checklist = SECTOR_CHECKLISTS[sector] || [];
  const uploaded = Object.fromEntries((docs?.documents || []).map(d => [d.document_type, d]));
  const checklistTypes = new Set(checklist.map(n => CHECKLIST_DOC_TYPES[n]).filter(Boolean));
  const others = (docs?.documents || []).filter(d => !checklistTypes.has(d.document_type));

  const slot = (name, doc, docType) => {
    const tone = doc ? READINESS_TONES[doc.readiness_status] || 'grey' : null;
    const content = doc && shared[doc.document_type];
    return (
      <div key={name} className={`mah-doc-slot${doc ? ' is-uploaded' : ''}`}>
        <div className="mah-doc-icon">{doc ? <Icon name="check" /> : <Icon name="file-text" />}</div>
        <div className="mah-grow">
          <div className="mah-row-title">{name}</div>
          {doc ? (
            <div className="mah-row-sub">
              {doc.file_name} · <span className={`mah-text-${tone}`}>{(doc.readiness_status || 'Checked').replace(/_/g, ' ')}</span>
              {doc.validation_result?.score != null && <> · score {doc.validation_result.score}</>}
              {!content && <> · not shared with you yet</>}
            </div>
          ) : (
            <div className="mah-row-sub">{docType === null ? 'Sent outside MASAAR by the MAH' : 'Not uploaded by the MAH yet'}</div>
          )}
        </div>
        {content && <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => setViewing(content)}>View</button>}
      </div>
    );
  };

  return (
    <section className="mah-card">
      <div className="mah-card-head">
        <h2>Document checklist</h2>
        <span className="mah-muted mah-small">Read-only — the MAH uploads documents</span>
      </div>
      {!docs ? <div className="mah-loading">Loading documents…</div> : (
        <>
          {checklist.length === 0 && <p className="mah-muted mah-small">This shipment has no sector, so there is no checklist.</p>}
          <div className="mah-doc-grid">
            {checklist.map(name => {
              const docType = CHECKLIST_DOC_TYPES[name];
              return slot(name, docType ? uploaded[docType] : null, docType);
            })}
            {others.map(d => slot(d.label || d.document_type, d, d.document_type))}
          </div>
          {shipment.document_confirmed_at && (
            <p className="mah-small mah-muted">Documents confirmed by the MAH {fmtDateTime(shipment.document_confirmed_at)}.</p>
          )}
        </>
      )}

      {viewing && (
        <div className="mah-modal-backdrop" onClick={() => setViewing(null)}>
          <div className="mah-modal" role="dialog" aria-label={viewing.file_name} onClick={e => e.stopPropagation()}>
            <div className="mah-modal-head">
              <strong>{viewing.label || viewing.document_type} · {viewing.file_name}</strong>
              <button className="mah-ai-close" onClick={() => setViewing(null)} aria-label="Close">×</button>
            </div>
            <div className="mah-modal-body">
              {viewing.validation_result?.summary && <div className="mah-alert mah-alert-amber">{viewing.validation_result.summary}</div>}
              {!viewing.file_content ? (
                <pre className="clr-doc-content">No content stored for this document.</pre>
              ) : isDataUrl(viewing.file_content) ? (
                viewing.file_content.startsWith('data:image/') ? (
                  <img className="clr-doc-image" src={viewing.file_content} alt={viewing.file_name} />
                ) : (
                  <a className="mah-btn mah-btn-primary mah-self-start" href={viewing.file_content}
                    download={viewing.file_name} target="_blank" rel="noreferrer">Open / download file</a>
                )
              ) : (
                <pre className="clr-doc-content">{viewing.file_content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Faseh & Filing ───────────────────────────────────
function FasehTab({ shipment, state, busy, run, transition }) {
  const [ref, setRef] = useState(shipment.faseh_request_number || '');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const fasehRef = ref.trim();
    run('faseh', () => transition('SUBMITTED', {
      faseh_request_number: fasehRef,
      faseh_filed_at: date,
      notes: `${fasehRef} filed${notes.trim() ? ` — ${notes.trim()}` : ''}`,
    }), 'Filed successfully — shipment is now SUBMITTED');
  };

  const history = (shipment.audit_log || []).filter(e =>
    (e.from_state === 'WITH_BROKER' && e.to_state === 'SUBMITTED') || e.to_state === 'WITH_BROKER'
    || /faseh/i.test(`${e.trigger_event} ${e.notes || ''}`));

  return (
    <div className="mah-stack">
      <section className="mah-card">
        <div className="mah-card-head"><h2>Filing status</h2><StateBadge state={shipment.current_state} /></div>
        <div className="mah-facts mah-facts-row">
          <div><span>Faseh request number</span><strong className="mah-mono">{shipment.faseh_request_number || '—'}</strong></div>
          <div><span>Date filed</span><strong>{fmtDate(shipment.faseh_filed_at)}</strong></div>
        </div>
      </section>

      {state === 'WITH_BROKER' ? (
        <section className="mah-card clr-action-card">
          <div className="mah-card-head"><h2>File Faseh declaration</h2></div>
          <form className="mah-stack" onSubmit={submit}>
            <div className="mah-form-grid">
              <label className="mah-field">
                <span>Faseh reference number *</span>
                <input className="mah-input mah-mono" value={ref} onChange={e => setRef(e.target.value)} required maxLength={100} />
              </label>
              <label className="mah-field">
                <span>Filing date</span>
                <input className="mah-input" type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} required />
              </label>
            </div>
            <label className="mah-field">
              <span>Notes (optional)</span>
              <textarea className="mah-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1500} />
            </label>
            <div className="mah-row-actions">
              <span className="mah-small mah-muted">Moves the shipment to SUBMITTED and notifies the MAH.</span>
              <button type="submit" className="mah-btn mah-btn-primary" disabled={!ref.trim() || busy !== null}>
                {busy === 'faseh' ? 'Filing…' : 'Submit to Faseh →'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <p className="mah-muted mah-small">Filing is available while the shipment is With Broker.</p>
      )}

      <section className="mah-card">
        <div className="mah-card-head"><h2>Filing history</h2></div>
        <HistoryList entries={history} empty="No Faseh activity yet." />
      </section>
    </div>
  );
}

// ── SFDA Track ───────────────────────────────────────
function SfdaTab(ctx) {
  const { token, shipment, state } = ctx;
  const [reasons, setReasons] = useState(null);

  const loadReasons = useCallback(async () => {
    try {
      const d = await apiFetch(token, `/shipments/${shipment.id}/objection`);
      setReasons(d.objections || []);
    } catch {
      setReasons([]);
    }
  }, [token, shipment.id]);
  useEffect(() => {
    if (['SFDA_REJECTED', 'OBJECTION_FILED'].includes(state)) loadReasons();
  }, [state, loadReasons, shipment.updated_at]);

  const history = (shipment.audit_log || []).filter(e =>
    ['SUBMITTED', 'SFDA_INFO_REQUESTED', 'SAMPLING', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'SFDA_REJECTED', 'OBJECTION_FILED'].includes(e.to_state)
    || (e.action || '').startsWith('SAMPLING_') || e.action === 'REJECTION_REASONS_RECORDED');

  return (
    <div className="mah-stack">
      <section className="mah-card">
        <div className="mah-card-head"><h2>SFDA status</h2><StateBadge state={shipment.current_state} /></div>
        <div className="mah-facts mah-facts-row">
          <div><span>Info request</span><strong>{INFO_REQUEST_LABELS[shipment.info_request_type] || '—'}</strong></div>
          <div><span>Sampling</span><strong>{SAMPLING_LABELS[shipment.sampling_state] || '—'}</strong></div>
          <div><span>Last SFDA decision</span><strong>{fmtDateTime(shipment.sfda_decided_at)}</strong></div>
          <div><span>Objection rounds rejected</span><strong>{shipment.objection_count ?? 0}</strong></div>
        </div>
      </section>

      {['SUBMITTED', 'SAMPLING'].includes(state) && (
        <RoadmapBanner title="Faseh Auto-Sync — Coming in next release" badge="Roadmap"
          description="In production, MASAAR will sync with Faseh every 15 minutes. SFDA decisions will update automatically and both MAH and clearance will be notified instantly — no manual recording needed." />
      )}
      {state === 'SUBMITTED' && <SubmittedActions {...ctx} onReasons={loadReasons} />}
      {state === 'SFDA_INFO_REQUESTED' && <InfoRequestActions {...ctx} />}
      {state === 'SAMPLING' && <SamplingActions {...ctx} onReasons={loadReasons} />}
      {state === 'SFDA_REJECTED' && <RejectedPanel {...ctx} reasons={reasons} onReasons={loadReasons} />}
      {state === 'OBJECTION_FILED' && (
        <section className="mah-card">
          <div className="mah-card-head"><h2>Objection filed with SFDA</h2></div>
          <p className="mah-muted mah-small">
            {shipment.objection_faseh_ref ? `Faseh reference ${shipment.objection_faseh_ref}` : 'Objection filed'}
            {shipment.objection_filed_at ? ` on ${fmtDateTime(shipment.objection_filed_at)}` : ''}.
            {' '}Record SFDA's answer to the objection below when it arrives.
          </p>
          <DecisionButtons {...ctx} decisions={['SFDA_RELEASED', 'SFDA_REJECTED']} onReasons={loadReasons} />
        </section>
      )}
      {!['SUBMITTED', 'SFDA_INFO_REQUESTED', 'SAMPLING', 'SFDA_REJECTED', 'OBJECTION_FILED'].includes(state) && (
        <p className="mah-muted mah-small">No SFDA action is open for a shipment that is {state.replace(/_/g, ' ').toLowerCase()}.</p>
      )}

      <section className="mah-card">
        <div className="mah-card-head"><h2>SFDA history</h2></div>
        <HistoryList entries={history} empty="No SFDA activity yet." />
      </section>
    </div>
  );
}

const DECISION_LABELS = { SFDA_RELEASED: 'Record SFDA release', PARTIALLY_RELEASED: 'Record SFDA partial release', SFDA_REJECTED: 'Record SFDA rejection' };

// Released / partially released / rejected buttons with their confirm or reasons form
function DecisionButtons({ shipment, state, busy, run, transition, token, decisions, onReasons, labels = DECISION_LABELS }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="clr-action-buttons">
        {decisions.map(d => (
          <button key={d} className={`mah-btn ${d === 'SFDA_REJECTED' ? 'mah-btn-red' : d === 'PARTIALLY_RELEASED' ? 'mah-btn-amber' : 'mah-btn-green'}${open === d ? ' clr-is-open' : ''}`}
            onClick={() => setOpen(open === d ? null : d)} disabled={busy !== null}>
            {labels[d]}
          </button>
        ))}
      </div>
      {open && open !== 'SFDA_REJECTED' && (
        <div className="clr-confirm" role="alertdialog" aria-label="Confirm SFDA decision">
          <span>Confirm SFDA has {open === 'SFDA_RELEASED' ? 'released' : 'partially released'} this shipment?</span>
          <button className="mah-btn mah-btn-ghost mah-btn-sm" onClick={() => setOpen(null)}>Cancel</button>
          <button className={`mah-btn mah-btn-sm ${open === 'SFDA_RELEASED' ? 'mah-btn-green' : 'mah-btn-amber'}`} disabled={busy !== null}
            onClick={async () => { if (await run('decision', () => transition(open), `Recorded — shipment is now ${open.replace(/_/g, ' ')}`)) setOpen(null); }}>
            {busy === 'decision' ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      )}
      {open === 'SFDA_REJECTED' && (
        <RejectionForm token={token} shipment={shipment} busy={busy} run={run}
          before={state === 'SFDA_REJECTED' ? null : (notes) => transition('SFDA_REJECTED', { notes })}
          onDone={() => { setOpen(null); onReasons(); }} />
      )}
    </>
  );
}

// 1–5 rejection reasons. `before(notes)` moves the shipment to SFDA_REJECTED first (null if already there).
function RejectionForm({ token, shipment, busy, run, before, onDone }) {
  const [count, setCount] = useState(1);
  const [texts, setTexts] = useState(['', '', '', '', '']);
  const reasons = texts.slice(0, count).map(t => t.trim());
  const complete = reasons.every(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run('reject', async () => {
      if (before) await before(reasons.map((r, i) => `${i + 1}. ${r}`).join(' | '));
      await apiFetch(token, `/shipments/${shipment.id}/objection-reasons`, {
        method: 'POST', body: { reasons: reasons.map((reason_text, reason_index) => ({ reason_index, reason_text })) },
      });
    }, before ? 'Rejection recorded — the MAH has been notified' : 'Rejection reasons recorded');
    if (ok) onDone();
  };

  return (
    <form className="clr-inline-panel" onSubmit={submit}>
      <p className="clr-record-note">Enter the rejection reasons exactly as stated in the SFDA decision notice.</p>
      <label className="mah-field clr-narrow">
        <span>Number of rejection reasons</span>
        <select className="mah-input" value={count} onChange={e => setCount(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {reasons.map((_, i) => (
        <label key={i} className="mah-field">
          <span>Reason {i + 1}</span>
          <input className="mah-input" value={texts[i]} maxLength={1000} placeholder="As written in the SFDA notice"
            onChange={e => setTexts(prev => prev.map((t, j) => (j === i ? e.target.value : t)))} />
        </label>
      ))}
      <div className="mah-row-actions">
        <span className="mah-small mah-muted">The MAH answers these reasons when filing an objection.</span>
        <button type="submit" className="mah-btn mah-btn-red" disabled={!complete || busy !== null}>
          {busy === 'reject' ? 'Recording…' : 'Record rejection →'}
        </button>
      </div>
    </form>
  );
}

function SubmittedActions(ctx) {
  const { shipment, busy, run, transition, token } = ctx;
  const [open, setOpen] = useState(null);
  const [infoType, setInfoType] = useState('CLEARANCE_HANDLED');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayISO());

  const recordInfo = (e) => {
    e.preventDefault();
    run('info', () => transition('SFDA_INFO_REQUESTED', { info_request_type: infoType, notes: query.trim() || undefined }),
      'Information request recorded');
  };
  const recordSampling = (e) => {
    e.preventDefault();
    run('sampling', async () => {
      await transition('SAMPLING', { notes: `Sampling at ${location.trim()} on ${date}` });
      await apiFetch(token, `/shipments/${shipment.id}/sampling`, {
        method: 'PUT', body: { sampling_state: 'SAMPLING_ORDERED', sampling_location: location.trim(), scheduled_date: date },
      });
    }, 'Sampling order recorded');
  };
  const toggle = (k) => setOpen(open === k ? null : k);

  return (
    <section className="mah-card clr-action-card">
      <div className="mah-card-head"><h2>Record SFDA decision received from Faseh</h2></div>
      <p className="clr-record-note">SFDA makes all decisions independently. Use this section to record decisions you have received from SFDA via Faseh or official notice.</p>
      <div className="clr-action-buttons">
        <button className={`mah-btn mah-btn-amber${open === 'info' ? ' clr-is-open' : ''}`} onClick={() => toggle('info')} disabled={busy !== null}>Record information request</button>
        <button className={`mah-btn clr-btn-purple${open === 'sampling' ? ' clr-is-open' : ''}`} onClick={() => toggle('sampling')} disabled={busy !== null}>Record sampling notice</button>
      </div>

      {open === 'info' && (
        <form className="clr-inline-panel" onSubmit={recordInfo}>
          <label className="mah-field clr-narrow">
            <span>Info request type</span>
            <select className="mah-input" value={infoType} onChange={e => setInfoType(e.target.value)}>
              <option value="CLEARANCE_HANDLED">Clearance handled</option>
              <option value="MAH_INPUT_NEEDED">MAH input needed</option>
            </select>
          </label>
          <label className="mah-field">
            <span>Query description</span>
            <textarea className="mah-input" rows={3} value={query} onChange={e => setQuery(e.target.value)} maxLength={2000} />
          </label>
          <div className="mah-row-actions">
            <span className="mah-small mah-muted">{infoType === 'MAH_INPUT_NEEDED' ? 'The MAH is told their input is needed.' : 'The MAH is told you are handling it.'}</span>
            <button type="submit" className="mah-btn mah-btn-amber" disabled={busy !== null}>{busy === 'info' ? 'Recording…' : 'Record →'}</button>
          </div>
        </form>
      )}

      {open === 'sampling' && (
        <form className="clr-inline-panel" onSubmit={recordSampling}>
          <div className="mah-form-grid">
            <label className="mah-field">
              <span>Sampling location (as notified by SFDA)</span>
              <input className="mah-input" value={location} onChange={e => setLocation(e.target.value)} required maxLength={200} placeholder="e.g. Jeddah Islamic Port, Warehouse 4" />
            </label>
            <label className="mah-field">
              <span>Sampling date (as notified by SFDA)</span>
              <input className="mah-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </label>
          </div>
          <div className="mah-row-actions">
            <span className="mah-small mah-muted">Records that SFDA has ordered physical sampling of this shipment.</span>
            <button type="submit" className="mah-btn clr-btn-purple" disabled={!location.trim() || busy !== null}>{busy === 'sampling' ? 'Recording…' : 'Record →'}</button>
          </div>
        </form>
      )}

      <DecisionButtons {...ctx} decisions={['SFDA_RELEASED', 'SFDA_REJECTED']} />
    </section>
  );
}

function InfoRequestActions({ shipment, busy, run, transition }) {
  return (
    <section className="mah-card clr-action-card">
      <div className="mah-card-head">
        <h2>Open information request</h2>
        <span className={`mah-badge mah-tone-${shipment.info_request_type === 'MAH_INPUT_NEEDED' ? 'amber' : 'blue'}`}>
          {INFO_REQUEST_LABELS[shipment.info_request_type] || 'Type not set'}
        </span>
      </div>
      <p className="mah-muted mah-small">Once you have sent your response to SFDA via Faseh, record it here. SFDA then continues its review.</p>
      <div>
        <button className="mah-btn mah-btn-primary" disabled={busy !== null}
          onClick={() => run('resolve', () => transition('SUBMITTED', { notes: 'Info request resolved' }), 'Resubmitted — shipment is now SUBMITTED')}>
          {busy === 'resolve' ? 'Saving…' : 'Record response submitted to SFDA'}
        </button>
      </div>
    </section>
  );
}

function SamplingActions(ctx) {
  const { token, shipment, busy, run } = ctx;
  const [labName, setLabName] = useState(shipment.sampling_lab_name || '');
  const [summary, setSummary] = useState('');
  const current = SAMPLING_STEPS.indexOf(shipment.sampling_state);
  const STEP_BUTTONS = [
    { state: 'SAMPLE_COLLECTED', label: 'Sample Collected' },
    { state: 'SAMPLE_AT_LAB', label: 'Sample at Lab' },
    { state: 'RESULTS_SUBMITTED', label: 'Results Submitted' },
  ];
  const next = STEP_BUTTONS.find(b => SAMPLING_STEPS.indexOf(b.state) === current + 1);

  const advance = () => run('step', () => apiFetch(token, `/shipments/${shipment.id}/sampling`, {
    method: 'PUT',
    body: {
      sampling_state: next.state,
      ...(next.state === 'SAMPLE_AT_LAB' && labName.trim() ? { lab_name: labName.trim() } : {}),
      ...(next.state === 'RESULTS_SUBMITTED' && summary.trim() ? { results_summary: summary.trim() } : {}),
    },
  }), `Sampling updated — ${next.label.toLowerCase()}`);

  return (
    <section className="mah-card clr-action-card">
      <div className="mah-card-head">
        <h2>Sampling sub-track</h2>
        <span className="mah-badge mah-tone-purple">{SAMPLING_LABELS[shipment.sampling_state]}</span>
      </div>
      <ol className="mah-progress">
        {SAMPLING_STEPS.map((s, i) => (
          <li key={s} className={i < current ? 'is-done' : i === current ? 'is-active' : ''}>
            <span className="mah-step-num">{i < current ? <Icon name="check" size={12} /> : i + 1}</span>
            <span>{SAMPLING_LABELS[s]}</span>
          </li>
        ))}
      </ol>
      <div className="mah-facts mah-facts-row">
        <div><span>Location</span><strong>{shipment.sampling_location || '—'}</strong></div>
        <div><span>Scheduled</span><strong>{fmtDate(shipment.sampling_scheduled_date)}</strong></div>
        <div><span>Lab</span><strong>{shipment.sampling_lab_name || '—'}</strong></div>
      </div>
      {shipment.sampling_results_summary && <div className="mah-tl-note">{shipment.sampling_results_summary}</div>}

      {next && (
        <div className="clr-inline-panel">
          {next.state === 'SAMPLE_AT_LAB' && (
            <label className="mah-field"><span>Lab name (optional)</span>
              <input className="mah-input" value={labName} onChange={e => setLabName(e.target.value)} maxLength={200} />
            </label>
          )}
          {next.state === 'RESULTS_SUBMITTED' && (
            <label className="mah-field"><span>Results summary (optional)</span>
              <textarea className="mah-input" rows={2} value={summary} onChange={e => setSummary(e.target.value)} maxLength={4000} />
            </label>
          )}
          <div className="clr-action-buttons">
            {STEP_BUTTONS.map(b => (
              <button key={b.state} className={`mah-btn ${b === next ? 'clr-btn-purple' : 'mah-btn-ghost'}`}
                disabled={b !== next || busy !== null} onClick={advance}>
                {busy === 'step' && b === next ? 'Saving…' : b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="clr-subhead">Record SFDA decision received from Faseh</div>
      <p className="clr-record-note">SFDA makes all decisions independently. Use this section to record decisions you have received from SFDA via Faseh or official notice.</p>
      {current < SAMPLING_STEPS.indexOf('RESULTS_SUBMITTED') && (
        <p className="mah-small mah-muted">Lab results are not recorded yet — record the decision once SFDA issues it.</p>
      )}
      <DecisionButtons {...ctx} decisions={['SFDA_RELEASED', 'PARTIALLY_RELEASED', 'SFDA_REJECTED']} />
    </section>
  );
}

function RejectedPanel({ token, shipment, busy, run, reasons, onReasons }) {
  return (
    <section className="mah-card clr-action-card">
      <div className="mah-card-head"><h2>Rejection reasons</h2><span className="mah-badge mah-tone-red">Rejected</span></div>
      {reasons === null ? <div className="mah-loading">Loading…</div>
        : reasons.length > 0 ? (
          <>
            <ol className="clr-reasons">{reasons.map(r => <li key={r.id}>{r.reason_text}</li>)}</ol>
            <p className="mah-small mah-muted">Recorded for the MAH, who decides whether to object (60-day window) or choose re-export / destruction.</p>
          </>
        ) : (
          <>
            <p className="mah-small mah-muted">No reasons recorded yet. Enter them from the SFDA notice so the MAH can respond.</p>
            <RejectionForm token={token} shipment={shipment} busy={busy} run={run} before={null} onDone={onReasons} />
          </>
        )}
    </section>
  );
}

// ── Customs ──────────────────────────────────────────
function CustomsTab({ token, shipment, state, busy, run }) {
  const [zatca, setZatca] = useState('');
  const [filedOn, setFiledOn] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [gateOut, setGateOut] = useState('');
  const current = shipment.customs_state || 'PENDING';
  const step = CUSTOMS_STEPS.indexOf(current);

  const customs = (body, message) => run('customs', () => apiFetch(token, `/shipments/${shipment.id}/customs`, { method: 'PUT', body }), message);
  const history = (shipment.audit_log || []).filter(e => (e.action || '').startsWith('CUSTOMS_')
    || (e.action === 'SHIPMENT_CLOSED' && e.to_state === 'CLOSED_RELEASED'));

  return (
    <div className="mah-stack">
      <section className="mah-card">
        <div className="mah-card-head"><h2>Customs track (ZATCA)</h2><span className="mah-badge mah-tone-blue">{CUSTOMS_LABELS[current]}</span></div>
        <ol className="mah-progress">
          {CUSTOMS_STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'is-done' : i === step ? 'is-active' : ''}>
              <span className="mah-step-num">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>
              <span>{CUSTOMS_LABELS[s]}</span>
            </li>
          ))}
        </ol>
        <div className="mah-facts mah-facts-row">
          <div><span>ZATCA ref</span><strong className="mah-mono">{shipment.zatca_declaration_ref || '—'}</strong></div>
          <div><span>Duties</span><strong>{fmtSAR(shipment.duties_amount)}</strong></div>
          <div><span>Duties paid</span><strong>{fmtDateTime(shipment.duties_paid_at)}</strong></div>
          <div><span>Gate out</span><strong>{fmtDateTime(shipment.gate_out_at)}</strong></div>
        </div>
      </section>

      {current === 'PENDING' && (
        <form className="mah-card clr-action-card" onSubmit={e => { e.preventDefault(); customs({ action: 'DECLARATION_FILED', zatca_ref: zatca.trim(), filed_at: filedOn }, 'Customs declaration filed'); }}>
          <div className="mah-card-head"><h2>Step 1 · File customs declaration</h2></div>
          <div className="mah-form-grid">
            <label className="mah-field"><span>ZATCA reference *</span>
              <input className="mah-input mah-mono" value={zatca} onChange={e => setZatca(e.target.value)} required maxLength={100} />
            </label>
            <label className="mah-field"><span>Filing date</span>
              <input className="mah-input" type="date" value={filedOn} max={todayISO()} onChange={e => setFiledOn(e.target.value)} />
            </label>
          </div>
          <div className="mah-row-actions"><span />
            <button type="submit" className="mah-btn mah-btn-primary" disabled={!zatca.trim() || busy !== null}>{busy === 'customs' ? 'Saving…' : 'File Customs Declaration'}</button>
          </div>
        </form>
      )}
      {current === 'DECLARATION_FILED' && (
        <form className="mah-card clr-action-card" onSubmit={e => { e.preventDefault(); customs({ action: 'DUTIES_PAID', duties_amount: Number(amount) }, 'Duties payment recorded'); }}>
          <div className="mah-card-head"><h2>Step 2 · Record duties payment</h2></div>
          <label className="mah-field clr-narrow"><span>Duties amount (SAR) *</span>
            <input className="mah-input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </label>
          <div className="mah-row-actions"><span />
            <button type="submit" className="mah-btn mah-btn-primary" disabled={amount === '' || Number(amount) < 0 || busy !== null}>{busy === 'customs' ? 'Saving…' : 'Record Duties Payment'}</button>
          </div>
        </form>
      )}
      {current === 'DUTIES_PAID' && (
        <form className="mah-card clr-action-card" onSubmit={e => { e.preventDefault(); customs({ action: 'GATE_OUT', gate_out_at: new Date(gateOut).toISOString() }, state === 'SFDA_RELEASED' ? 'Gate-out recorded — shipment closed' : 'Gate-out recorded'); }}>
          <div className="mah-card-head"><h2>Step 3 · Record gate-out</h2></div>
          <label className="mah-field clr-narrow"><span>Gate-out date and time *</span>
            <input className="mah-input" type="datetime-local" value={gateOut} onChange={e => setGateOut(e.target.value)} required />
          </label>
          {state === 'SFDA_RELEASED'
            ? <div className="mah-alert mah-alert-green">SFDA has released this shipment, so recording gate-out also closes it (Closed — Released).</div>
            : <p className="mah-small mah-muted">The shipment closes automatically once SFDA has released it and gate-out is recorded.</p>}
          <div className="mah-row-actions"><span />
            <button type="submit" className="mah-btn mah-btn-primary" disabled={!gateOut || busy !== null}>{busy === 'customs' ? 'Saving…' : 'Record Gate-Out'}</button>
          </div>
        </form>
      )}
      {current === 'CUSTOMS_RELEASED' && <div className="mah-alert mah-alert-green">Customs released {fmtDateTime(shipment.customs_released_at)}.</div>}

      <section className="mah-card">
        <div className="mah-card-head"><h2>Customs history</h2></div>
        <HistoryList entries={history} empty="No customs activity yet." />
      </section>
    </div>
  );
}

// ── Disposition ──────────────────────────────────────
function DispositionTab({ busy, run, transition }) {
  const [re, setRe] = useState({ country: '', ref: '', date: todayISO() });
  const [de, setDe] = useState({ facility: '', date: todayISO(), method: '' });
  const setR = (k) => (e) => setRe(prev => ({ ...prev, [k]: e.target.value }));
  const setD = (k) => (e) => setDe(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="mah-card-grid">
      <form className="mah-card clr-action-card" onSubmit={e => {
        e.preventDefault();
        run('reexport', () => transition('CLOSED_REEXPORTED', { notes: `Re-export to ${re.country.trim()} — ref ${re.ref.trim()}, scheduled ${re.date}` }),
          'Re-export confirmed — shipment closed');
      }}>
        <div className="mah-card-head"><h2>Option A · Re-export</h2></div>
        <label className="mah-field"><span>Destination country *</span><input className="mah-input" value={re.country} onChange={setR('country')} required maxLength={100} /></label>
        <label className="mah-field"><span>Re-export reference *</span><input className="mah-input mah-mono" value={re.ref} onChange={setR('ref')} required maxLength={100} /></label>
        <label className="mah-field"><span>Scheduled date</span><input className="mah-input" type="date" value={re.date} onChange={setR('date')} required /></label>
        <button type="submit" className="mah-btn mah-btn-primary" disabled={!re.country.trim() || !re.ref.trim() || busy !== null}>
          {busy === 'reexport' ? 'Saving…' : 'Confirm Re-export →'}
        </button>
      </form>
      <form className="mah-card clr-action-card" onSubmit={e => {
        e.preventDefault();
        run('destroy', () => transition('CLOSED_DESTROYED', { notes: `Destruction at ${de.facility.trim()} on ${de.date}${de.method.trim() ? ` — ${de.method.trim()}` : ''}` }),
          'Destruction confirmed — shipment closed');
      }}>
        <div className="mah-card-head"><h2>Option B · Destruction</h2></div>
        <label className="mah-field"><span>Destruction facility *</span><input className="mah-input" value={de.facility} onChange={setD('facility')} required maxLength={150} /></label>
        <label className="mah-field"><span>Scheduled date</span><input className="mah-input" type="date" value={de.date} onChange={setD('date')} required /></label>
        <label className="mah-field"><span>Destruction method</span>
          <select className="mah-input" value={de.method} onChange={setD('method')}>
            <option value="">— Select —</option>
            <option>Incineration</option>
            <option>Landfill (approved)</option>
            <option>Chemical neutralisation</option>
            <option>Other (see SFDA order)</option>
          </select>
        </label>
        <button type="submit" className="mah-btn mah-btn-red" disabled={!de.facility.trim() || busy !== null}>
          {busy === 'destroy' ? 'Saving…' : 'Confirm Destruction →'}
        </button>
      </form>
    </div>
  );
}

// ── Objection (SFDA_REJECTED / OBJECTION_FILED) ──────
// The MAH prepares the dossier; the broker reviews it, then files it with SFDA via Faseh or returns it
// with a note (GET /objection/dossier, POST /objection/return-to-mah, POST /objection/file-with-sfda).
const MIN_RETURN_NOTE = 10;
const OBJECTION_DECISION_LABELS = {
  SFDA_RELEASED: 'Record objection upheld → SFDA Released',
  SFDA_REJECTED: 'Record objection rejected → Back to SFDA Rejected',
};

function ObjectionTab(ctx) {
  const { token, shipment, state, busy, run } = ctx;
  const [dossier, setDossier] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [note, setNote] = useState('');
  const [mode, setMode] = useState(null); // null | 'return' | 'file'
  const [fasehRef, setFasehRef] = useState('');
  const [filingNotes, setFilingNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await apiFetch(token, `/shipments/${shipment.id}/objection/dossier`);
      setDossier(d);
      setNote(d.objection_clearance_note || '');
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message);
    }
  }, [token, shipment.id]);
  useEffect(() => { load(); }, [load, shipment.updated_at]);

  if (!dossier) {
    return (
      <section className="mah-card">
        {loadError ? <div className="mah-alert mah-alert-red">Could not load the objection dossier: {loadError}</div>
          : <div className="mah-loading">Loading objection dossier…</div>}
      </section>
    );
  }

  const status = dossier.objection_status || (state === 'OBJECTION_FILED' ? 'FILED_WITH_SFDA' : null);
  const mahName = shipment.mah_org_name || shipment.importer_name || 'The MAH';
  const noteOk = note.trim().length >= MIN_RETURN_NOTE;

  const returnToMah = async () => {
    const ok = await run('obj-return', () => apiFetch(token, `/shipments/${shipment.id}/objection/return-to-mah`, {
      method: 'POST', body: { note: note.trim() },
    }), 'Dossier returned to MAH with comments');
    if (ok) setMode(null);
  };
  const fileWithSfda = async (e) => {
    e.preventDefault();
    const ref = fasehRef.trim();
    const ok = await run('obj-file', () => apiFetch(token, `/shipments/${shipment.id}/objection/file-with-sfda`, {
      method: 'POST', body: { faseh_objection_ref: ref, filing_notes: filingNotes.trim() || undefined },
    }), `Objection filed with SFDA. Faseh reference: ${ref}`);
    if (ok) { setMode(null); setFasehRef(''); setFilingNotes(''); }
  };

  // ── MAH still preparing ──
  if (!status || status === 'DRAFTING') {
    return (
      <section className="mah-card mah-obj-waiting">
        <h2>MAH is preparing the objection dossier</h2>
        <p className="mah-muted">
          {status === 'DRAFTING'
            ? `Dossier in progress — ${dossier.reason_count} reason${dossier.reason_count === 1 ? '' : 's'} entered so far`
            : 'No objection started yet'}
        </p>
        <p className="mah-small mah-muted">You will be notified when the MAH submits the dossier for your review.</p>
        {state === 'SFDA_REJECTED' && <ObjectionCountdown days={dossier.days_remaining} rejectionDate={dossier.rejection_date} />}
      </section>
    );
  }

  // ── Waiting for this broker ──
  if (status === 'SUBMITTED_TO_CLEARANCE') {
    return (
      <div className="mah-stack">
        <section className="mah-obj-banner is-navy">
          <strong>Objection dossier ready for review</strong>
          <span>Submitted by {mahName} on {fmtDateTime(dossier.objection_submitted_to_clearance_at)}</span>
          <span>Review the dossier below and either file it with SFDA via Faseh or return it to MAH with comments.</span>
        </section>
        <ObjectionCountdown days={dossier.days_remaining} rejectionDate={dossier.rejection_date} />
        <ObjectionSteps done={2} />
        <DossierReasons reasons={dossier.reasons} />

        <section className="mah-card mah-stack">
          <label className="mah-field">
            <span>Add a customs note (optional)</span>
            <textarea className="mah-input" rows={3} maxLength={2000} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Comments on the dossier" />
            <small>This note is for your internal reference and will be visible to the MAH if you return the dossier</small>
          </label>

          <div className="clr-action-buttons">
            <button className={`mah-btn mah-btn-outline-amber${mode === 'return' ? ' clr-is-open' : ''}`}
              onClick={() => setMode(mode === 'return' ? null : 'return')} disabled={busy !== null || !noteOk}
              title={noteOk ? '' : `Write a note of at least ${MIN_RETURN_NOTE} characters to return the dossier`}>
              Return to MAH
            </button>
            <button className={`mah-btn mah-btn-navy${mode === 'file' ? ' clr-is-open' : ''}`}
              onClick={() => setMode(mode === 'file' ? null : 'file')} disabled={busy !== null}>
              File with SFDA via Faseh →
            </button>
          </div>
          {!noteOk && <p className="mah-small mah-muted">Returning the dossier needs a note of at least {MIN_RETURN_NOTE} characters.</p>}

          {mode === 'return' && (
            <div className="clr-confirm" role="alertdialog" aria-label="Return dossier to MAH">
              <span>
                <strong>Return dossier to MAH?</strong> MAH will be notified with your comments and must resubmit before you can file.
              </span>
              <button className="mah-btn mah-btn-ghost mah-btn-sm" onClick={() => setMode(null)}>Cancel</button>
              <button className="mah-btn mah-btn-sm mah-btn-amber" disabled={busy !== null || !noteOk} onClick={returnToMah}>
                {busy === 'obj-return' ? 'Returning…' : 'Return to MAH'}
              </button>
            </div>
          )}
          {mode === 'file' && (
            <form className="clr-inline-panel" onSubmit={fileWithSfda}>
              <label className="mah-field">
                <span>Faseh objection reference number *</span>
                <input className="mah-input" value={fasehRef} onChange={e => setFasehRef(e.target.value)} maxLength={100}
                  placeholder="FASEH-OBJ-2026-XXXXX" required autoFocus />
              </label>
              <label className="mah-field">
                <span>Filing notes (optional)</span>
                <textarea className="mah-input" rows={2} maxLength={2000} value={filingNotes} onChange={e => setFilingNotes(e.target.value)} />
              </label>
              <div className="mah-row-actions">
                <span className="mah-small mah-muted">The shipment moves to Objection Filed and the MAH is notified.</span>
                <button type="submit" className="mah-btn mah-btn-navy" disabled={busy !== null || !fasehRef.trim()}>
                  {busy === 'obj-file' ? 'Filing…' : 'Confirm filing →'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    );
  }

  // ── Returned to the MAH ──
  if (status === 'RETURNED_TO_MAH') {
    const returned = (shipment.audit_log || []).find(e => e.action === 'OBJECTION_RETURNED_TO_MAH');
    return (
      <div className="mah-stack">
        <section className="mah-obj-returned">
          <strong>Dossier returned to MAH</strong>
          <span>Returned on {fmtDateTime(returned?.occurred_at)} with your comments</span>
          {dossier.objection_clearance_note && <p className="mah-obj-note">{dossier.objection_clearance_note}</p>}
          <span>Waiting for MAH to revise and resubmit</span>
        </section>
        {state === 'SFDA_REJECTED' && <ObjectionCountdown days={dossier.days_remaining} rejectionDate={dossier.rejection_date} />}
        <DossierReasons reasons={dossier.reasons} />
      </div>
    );
  }

  // ── Filed with SFDA ──
  return (
    <div className="mah-stack">
      <section className="mah-obj-banner is-green">
        <strong>✓ Objection filed with SFDA</strong>
        <span>Faseh reference: <strong className="mah-mono">{dossier.objection_faseh_ref || '—'}</strong></span>
        <span>Filed on {fmtDateTime(dossier.objection_filed_at)}</span>
      </section>
      <ObjectionSteps done={3} />
      <DossierReasons reasons={dossier.reasons} />
      {state === 'OBJECTION_FILED' && (
        <section className="mah-card clr-action-card">
          <div className="mah-card-head"><h2>Record SFDA objection decision</h2></div>
          <p className="mah-small mah-muted">When SFDA responds to the objection, record its decision here.</p>
          <DecisionButtons {...ctx} decisions={['SFDA_RELEASED', 'SFDA_REJECTED']} labels={OBJECTION_DECISION_LABELS} onReasons={load} />
        </section>
      )}
    </div>
  );
}
