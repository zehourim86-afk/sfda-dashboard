// MAH portal — New shipment wizard (4 steps).
// Pre-arrival intelligence needs a shipment id, so the DRAFT is created when leaving
// step 2 (POST /shipments). Steps 1-2 are locked after that; step 4 opens the shipment.
import { useState } from 'react';
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

export default function MahNewShipment({ token, products, suppliers, organisations, navigate, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({
    supplier_id: '', port_of_entry: PORTS[0], transport_mode: 'sea', eta: '', bl_awb_number: '', preferred_clearance_company_id: '',
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [created, setCreated] = useState(null);
  const [intel, setIntel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [duplicate, setDuplicate] = useState(null);

  const activeProducts = products.filter(p => p.is_active !== false);
  const activeSuppliers = suppliers.filter(s => s.is_active !== false);
  const clearanceCompanies = organisations.filter(o => o.org_type === 'CLEARANCE_COMPANY');
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
    setBusy(true);
    setError(null);
    setDuplicate(null);
    const body = {
      product_id: filledLines[0].product_id,
      supplier_id: info.supplier_id || undefined,
      port_of_entry: info.port_of_entry,
      transport_mode: info.transport_mode,
      eta: info.eta || undefined,
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

  return (
    <div className="mah-modal-backdrop" role="dialog" aria-modal="true" aria-label="New shipment">
      <div className="mah-modal">
        <div className="mah-modal-head">
          <h2>New shipment</h2>
          <button className="mah-icon-btn" onClick={() => (created ? onCreated(created) : onClose())} aria-label="Close"><Icon name="x" /></button>
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
                <input type="date" className="mah-input" value={info.eta} onChange={setField('eta')} disabled={locked} />
              </label>
              <label className="mah-field">
                <span>{info.transport_mode === 'air' ? 'AWB number' : 'B/L or AWB number'}</span>
                <input className="mah-input" value={info.bl_awb_number} onChange={setField('bl_awb_number')} maxLength={100}
                  placeholder="e.g. MSCU1234567" disabled={locked} />
              </label>
              <label className="mah-field">
                <span>Preferred clearance company</span>
                <select className="mah-input" value={info.preferred_clearance_company_id}
                  onChange={setField('preferred_clearance_company_id')} disabled={locked}>
                  <option value="">— Decide later —</option>
                  {clearanceCompanies.map(o => <option key={o.id} value={o.id}>{o.name_en}</option>)}
                </select>
                <small>Needed before the shipment can be handed to a broker.</small>
              </label>
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
              <div><span>Clearance company</span><strong>{broker?.name_en || 'Decide later'}</strong></div>
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
            </div>
          )}
        </div>

        <div className="mah-modal-foot">
          {step > 0 && !(locked && step <= 2) && (
            <button className="mah-btn mah-btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>← Back</button>
          )}
          <span className="mah-grow" />
          {step === 0 && <button className="mah-btn mah-btn-primary" onClick={() => setStep(1)}>Next: products →</button>}
          {step === 1 && (
            <button className="mah-btn mah-btn-primary" disabled={busy || !!lineError || activeProducts.length === 0}
              title={lineError || ''} onClick={() => (locked ? setStep(2) : createDraft())}>
              {busy ? 'Creating…' : locked ? 'Next →' : 'Create draft & check →'}
            </button>
          )}
          {step === 2 && <button className="mah-btn mah-btn-primary" onClick={() => setStep(3)}>Next: confirm →</button>}
          {step === 3 && <button className="mah-btn mah-btn-primary" onClick={() => onCreated(created)}>Open shipment →</button>}
        </div>
      </div>
    </div>
  );
}
