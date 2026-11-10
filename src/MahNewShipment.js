// MAH portal — New shipment wizard (4 steps).
// Pre-arrival intelligence needs a shipment id, so the DRAFT is created when leaving
// step 2 (POST /shipments). Steps 1-2 are locked after that; step 4 opens the shipment.
// When the wizard closes, the chosen clearance company is sent an engagement request
// (POST /shipments/:id/broker-request) — it must accept before filing can begin.
import { useEffect, useState } from 'react';
import { apiFetch, SECTOR_LABELS, SectorBadge, Icon, fmtDate } from './mahShared';

export const PORTS = [
  'Jeddah Islamic Port',
  'King Abdulaziz Port Dammam',
  'Riyadh Dry Port',
  'King Khalid International Airport',
];
const TRANSPORT = [{ value: 'sea', label: 'Sea' }, { value: 'air', label: 'Air' }, { value: 'land', label: 'Land' }];
const STEPS = ['Basic info', 'Products', 'Pre-arrival intelligence', 'Confirm'];
const emptyLine = () => ({ product_id: '', quantity: '', batch_number: '' });

// Transport document field per mode: required for sea (B/L) and air (AWB), optional for land
const TRANSPORT_DOC = {
  sea: { label: 'Bill of Lading (B/L) number *', placeholder: 'e.g. MAEU1234567', required: true, helper: 'Required for sea freight' },
  air: { label: 'Air Waybill (AWB) number *', placeholder: 'e.g. 176-12345678', required: true, helper: 'Required for air freight' },
  land: { label: 'Waybill number (optional)', placeholder: 'e.g. CMR-2026-001', required: false, helper: 'Optional for land transport' },
};
// Error message, or null when the B/L / AWB is present or not needed
function blAwbError(mode, value) {
  if (!TRANSPORT_DOC[mode]?.required || (value || '').trim()) return null;
  return `B/L or AWB number is required for ${mode} transport`;
}

// ETA dates as YYYY-MM-DD in the user's local time zone (toISOString would use UTC and can be a day off)
const ETA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ETA_DEFAULT_DAYS = 30;
const localISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFromToday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localISODate(d); };
// Returns an error message, or null when the ETA is a valid date that is not in the past
function etaError(eta) {
  if (!ETA_RE.test(eta || '') || Number.isNaN(Date.parse(eta))) return 'Please select a valid arrival date';
  if (eta < localISODate(new Date())) return 'Arrival date cannot be in the past';
  return null;
}

export function RiskPanel({ intel }) {
  if (!intel) return null;
  const tone = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' }[intel.risk_band];
  return (
    <div className="mah-stack">
      <div className={`mah-risk mah-risk-${tone}`}>
        <div className="mah-risk-band">{intel.risk_band}<span>risk</span></div>
        <ul className="mah-risk-reasons">
          {intel.risk_reasons.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>
      <div className="mah-facts">
        <div><span>Supplier</span><strong>{intel.supplier_first_time === null ? 'Not linked' : intel.supplier_first_time ? 'First-time supplier' : 'Known supplier'}</strong></div>
        <div><span>Similar shipments scored</span><strong>{intel.sample_size}</strong></div>
        <div><span>SFDA registration</span>
          <strong className={intel.registration_valid ? 'mah-text-green' : 'mah-text-red'}>
            {intel.registration_valid ? 'Valid on arrival' : 'Not valid on arrival'}
          </strong>
        </div>
        <div><span>Registration expires</span><strong>{fmtDate(intel.registration_expires_at)}</strong></div>
      </div>
      {intel.cold_chain_required && (
        <div className="mah-alert mah-alert-blue"><Icon name="snow" size={16} /> Cold chain required — arrange temperature-controlled handling at the port.</div>
      )}
    </div>
  );
}

export default function MahNewShipment({ token, products, suppliers, organisations, navigate, onClose, onCreated, showToast }) {
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({
    supplier_id: '', port_of_entry: PORTS[0], transport_mode: 'sea', eta: daysFromToday(ETA_DEFAULT_DAYS),
    bl_awb_number: '', preferred_clearance_company_id: '',
  });
  const [etaTouched, setEtaTouched] = useState(false);
  const [blTouched, setBlTouched] = useState(false);
  const [lines, setLines] = useState([emptyLine()]);
  const [created, setCreated] = useState(null);
  const [intel, setIntel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [duplicate, setDuplicate] = useState(null);

  const activeProducts = products.filter(p => p.is_active !== false);
  const activeSuppliers = suppliers.filter(s => s.is_active !== false);
  // Clearance companies come from GET /clearance-companies; fall back to the organisations list.
  const [clearanceCompanies, setClearanceCompanies] = useState(() =>
    organisations.filter(o => o.org_type === 'CLEARANCE_COMPANY').map(o => ({ id: o.id, name: o.name_en, faseh_connected: true })));
  useEffect(() => {
    let cancelled = false;
    apiFetch(token, '/clearance-companies')
      .then(d => { if (!cancelled && d.clearance_companies?.length) setClearanceCompanies(d.clearance_companies); })
      .catch(() => { /* keep the organisations fallback */ });
    return () => { cancelled = true; };
  }, [token]);
  const productName = (id) => products.find(p => p.id === id)?.name_en || '—';
  const setField = (k) => (e) => setInfo(prev => ({ ...prev, [k]: e.target.value }));
  const setLine = (i, k, v) => setLines(prev => prev.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const filledLines = lines.filter(l => l.product_id);
  const lineError = (() => {
    if (filledLines.length === 0) return 'Choose at least one product';
    const bad = filledLines.find(l => l.quantity !== '' && !(Number(l.quantity) > 0));
    return bad ? 'Quantities must be positive numbers' : null;
  })();

  async function createDraft(confirmDuplicate = false) {
    // The date input's value is already YYYY-MM-DD; check it before the API does
    if (etaError(info.eta) || blAwbError(info.transport_mode, info.bl_awb_number)) {
      setEtaTouched(true);
      setBlTouched(true);
      setStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    setDuplicate(null);
    const body = {
      product_id: filledLines[0].product_id,
      supplier_id: info.supplier_id || undefined,
      port_of_entry: info.port_of_entry,
      transport_mode: info.transport_mode,
      eta: info.eta,
      bl_awb_number: info.bl_awb_number.trim() || undefined,
      preferred_clearance_company_id: info.preferred_clearance_company_id || undefined,
      line_items: filledLines.map(l => ({
        product_id: l.product_id,
        quantity: l.quantity === '' ? null : Number(l.quantity),
        batch_number: l.batch_number.trim() || null,
      })),
      ...(confirmDuplicate ? { confirm_duplicate: true } : {}),
    };
    try {
      const data = await apiFetch(token, '/shipments', { method: 'POST', body });
      setCreated(data.shipment);
      setStep(2);
      try {
        setIntel(await apiFetch(token, `/shipments/${data.shipment_id}/pre-arrival`));
      } catch (e) {
        setError(`Shipment created, but pre-arrival intelligence failed: ${e.message}`);
      }
    } catch (e) {
      if (e.status === 409 && e.data?.error === 'DUPLICATE_BL_AWB') setDuplicate(e.data);
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const locked = !!created;
  const supplier = activeSuppliers.find(s => s.id === info.supplier_id);
  const broker = clearanceCompanies.find(o => o.id === info.preferred_clearance_company_id);
  const clearanceChosen = !!info.preferred_clearance_company_id;
  const transportDoc = TRANSPORT_DOC[info.transport_mode] || TRANSPORT_DOC.sea;
  const blError = blAwbError(info.transport_mode, info.bl_awb_number);

  // Leaving the wizard after the draft exists: send the engagement request once, then open the shipment.
  // A failed request is not fatal — the shipment page offers to send it again.
  async function finish() {
    if (busy) return;
    if (created?.preferred_clearance_company_id) {
      setBusy(true);
      try {
        await apiFetch(token, `/shipments/${created.id}/broker-request`, { method: 'POST' });
        showToast?.(`Engagement request sent to ${broker?.name || 'your clearance company'}`);
      } catch (e) {
        showToast?.(`Shipment created, but the engagement request was not sent: ${e.message}`);
      } finally {
        setBusy(false);
      }
    }
    onCreated(created);
  }

  return (
    <div className="mah-modal-backdrop" role="dialog" aria-modal="true" aria-label="New shipment">
      <div className="mah-modal">
        <div className="mah-modal-head">
          <h2>New shipment</h2>
          <button className="mah-icon-btn" onClick={() => (created ? finish() : onClose())} disabled={busy} aria-label="Close"><Icon name="x" /></button>
        </div>

        <ol className="mah-stepper">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
              <span className="mah-step-num">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="mah-step-label">{label}</span>
            </li>
          ))}
        </ol>

        <div className="mah-modal-body">
          {error && <div className="mah-alert mah-alert-red">{error}</div>}

          {step === 0 && (
            <div className="mah-form-grid">
              <label className="mah-field">
                <span>Supplier</span>
                <select className="mah-input" value={info.supplier_id} onChange={setField('supplier_id')} disabled={locked}>
                  <option value="">— Select supplier —</option>
                  {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.country ? ` (${s.country})` : ''}</option>)}
                </select>
                {activeSuppliers.length === 0 && (
                  <small>No suppliers yet — <button type="button" className="mah-link-btn" onClick={() => { onClose(); navigate('suppliers'); }}>add one</button></small>
                )}
              </label>
              <label className="mah-field">
                <span>Port of entry</span>
                <select className="mah-input" value={info.port_of_entry} onChange={setField('port_of_entry')} disabled={locked}>
                  {PORTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </label>
              <div className="mah-field">
                <span>Transport mode</span>
                <div className="mah-segmented">
                  {TRANSPORT.map(t => (
                    <button type="button" key={t.value} disabled={locked}
                      className={info.transport_mode === t.value ? 'is-active' : ''}
                      onClick={() => setInfo(prev => ({ ...prev, transport_mode: t.value }))}>{t.label}</button>
                  ))}
                </div>
              </div>
              <label className="mah-field">
                <span>Expected Arrival Date (ETA)</span>
                <input type="date" className="mah-input" value={info.eta} onChange={setField('eta')} disabled={locked}
                  min={localISODate(new Date())} max="9999-12-31" required
                  onBlur={() => setEtaTouched(true)} aria-invalid={!!(etaTouched && etaError(info.eta))} />
                {etaTouched && !locked && etaError(info.eta) && <small className="mah-text-red">{etaError(info.eta)}</small>}
              </label>
              <label className="mah-field">
                <span>{transportDoc.label}</span>
                <input className="mah-input" value={info.bl_awb_number} onChange={setField('bl_awb_number')} maxLength={100}
                  placeholder={transportDoc.placeholder} disabled={locked} required={transportDoc.required}
                  onBlur={() => setBlTouched(true)} aria-invalid={!!(blTouched && blError)} />
                {blTouched && !locked && blError
                  ? <small className="mah-text-red">{blError}</small>
                  : <small>{transportDoc.helper}</small>}
              </label>
              <label className="mah-field">
                <span>Clearance company *</span>
                <select className="mah-input" value={info.preferred_clearance_company_id}
                  onChange={setField('preferred_clearance_company_id')} disabled={locked} required>
                  <option value="" disabled>Select a clearance company…</option>
                  {clearanceCompanies.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <small>The selected company will receive your shipment documents once you confirm handover.</small>
              </label>
              {broker && (
                <div className="mah-alert mah-alert-blue mah-wide">
                  Once you create this shipment, {broker.name} will be notified and must accept your engagement
                  request before filing can begin. You can continue collecting documents while waiting for their response.
                </div>
              )}
            </div>
          )}

          {step === 1 && (activeProducts.length === 0 ? (
            <div className="mah-empty">
              <strong>No products in master — Add Product first</strong>
              <button className="mah-btn mah-btn-primary" onClick={() => { onClose(); navigate('products'); }}>Go to Products</button>
            </div>
          ) : (
            <div className="mah-stack">
              {lines.map((line, i) => (
                <div className="mah-line" key={i}>
                  <label className="mah-field mah-grow">
                    <span>Product {i === 0 && <em className="mah-muted">(main product)</em>}</span>
                    <select className="mah-input" value={line.product_id} onChange={e => setLine(i, 'product_id', e.target.value)} disabled={locked}>
                      <option value="">— Select product —</option>
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name_en} · {SECTOR_LABELS[p.sector]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="mah-field mah-w-120">
                    <span>Quantity</span>
                    <input type="number" min="0" step="any" className="mah-input" value={line.quantity}
                      onChange={e => setLine(i, 'quantity', e.target.value)} disabled={locked} />
                  </label>
                  <label className="mah-field mah-w-160">
                    <span>Batch number</span>
                    <input className="mah-input" value={line.batch_number} maxLength={100} placeholder="Optional"
                      onChange={e => setLine(i, 'batch_number', e.target.value)} disabled={locked} />
                  </label>
                  {lines.length > 1 && !locked && (
                    <button className="mah-icon-btn mah-line-remove" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                      aria-label="Remove line"><Icon name="x" size={16} /></button>
                  )}
                </div>
              ))}
              {!locked && (
                <button className="mah-btn mah-btn-ghost mah-self-start" onClick={() => setLines(prev => [...prev, emptyLine()])}>
                  <Icon name="plus" size={16} /> Add another product line
                </button>
              )}
              {duplicate && (
                <div className="mah-alert mah-alert-amber">
                  <div>
                    <strong>{duplicate.message}</strong>
                    <div className="mah-small">Existing: {(duplicate.existing_masaar_ids || []).join(', ')}</div>
                  </div>
                  <button className="mah-btn mah-btn-sm mah-btn-amber" onClick={() => createDraft(true)} disabled={busy}>Create anyway</button>
                </div>
              )}
            </div>
          ))}

          {step === 2 && (
            <div className="mah-stack">
              <p className="mah-muted">Draft <strong className="mah-mono">{created?.masaar_id}</strong> created. Here's what MASAAR found before arrival:</p>
              {intel ? (
                <>
                  {intel.cold_chain_required && (
                    <span className="mah-badge mah-tone-amber mah-coldchain-badge">
                      ❄ Cold chain required — temperature logger certificate will be needed
                    </span>
                  )}
                  <RiskPanel intel={intel} />
                  <div>
                    <h3 className="mah-h3">Document checklist</h3>
                    <ul className="mah-checklist">
                      {intel.document_checklist.map(d => <li key={d}><Icon name="check" size={14} /> {d}</li>)}
                    </ul>
                  </div>
                </>
              ) : !error && <div className="mah-loading">Scoring shipment…</div>}
            </div>
          )}

          {step === 3 && created && (
            <div className="mah-summary">
              <div><span>MASAAR ID</span><strong className="mah-mono">{created.masaar_id}</strong></div>
              <div><span>Sector</span><SectorBadge sector={created.sector} /></div>
              <div><span>Supplier</span><strong>{supplier?.name || '—'}</strong></div>
              <div><span>Port of entry</span><strong>{info.port_of_entry}</strong></div>
              <div><span>Transport</span><strong>{TRANSPORT.find(t => t.value === info.transport_mode)?.label}</strong></div>
              <div><span>Expected Arrival Date (ETA)</span><strong>{fmtDate(info.eta)}</strong></div>
              <div><span>B/L / AWB</span><strong>{info.bl_awb_number || '—'}</strong></div>
              <div><span>Clearance company</span><strong>{broker?.name || '—'}</strong></div>
              <div className="mah-summary-wide">
                <span>Products</span>
                <ul>
                  {filledLines.map((l, i) => (
                    <li key={i}>{productName(l.product_id)}{l.quantity ? ` × ${l.quantity}` : ''}{l.batch_number ? ` · batch ${l.batch_number}` : ''}</li>
                  ))}
                </ul>
              </div>
              {intel && <div><span>Pre-arrival risk</span><strong>{intel.risk_band}</strong></div>}
              <div><span>Status</span><strong>Draft — next: upload documents</strong></div>
              {broker && <div><span>On opening</span><strong>Engagement request goes to {broker.name}</strong></div>}
            </div>
          )}
        </div>

        <div className="mah-modal-foot">
          {step > 0 && !(locked && step <= 2) && (
            <button className="mah-btn mah-btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>← Back</button>
          )}
          <span className="mah-grow" />
          {step === 0 && (
            <button className="mah-btn mah-btn-primary" disabled={!clearanceChosen}
              title={clearanceChosen ? '' : 'Select a clearance company to continue'}
              onClick={() => {
                if (!locked && (etaError(info.eta) || blError)) { setEtaTouched(true); setBlTouched(true); return; }
                setStep(1);
              }}>
              Next: products →
            </button>
          )}
          {step === 1 && (
            <button className="mah-btn mah-btn-primary" disabled={busy || !!lineError || activeProducts.length === 0}
              title={lineError || ''} onClick={() => (locked ? setStep(2) : createDraft())}>
              {busy ? 'Creating…' : locked ? 'Next →' : 'Create draft & check →'}
            </button>
          )}
          {step === 2 && <button className="mah-btn mah-btn-primary" onClick={() => setStep(3)}>Next: confirm →</button>}
          {step === 3 && (
            <button className="mah-btn mah-btn-primary" onClick={finish} disabled={busy}>
              {busy ? 'Sending request…' : 'Open shipment →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
