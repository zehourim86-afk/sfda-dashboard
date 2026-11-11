// MAH portal — Suppliers (cards, expandable profile).
import { useCallback, useEffect, useState } from 'react';
import {
  apiFetch, Ring, Tabs, StateBadge, Empty, Icon, stateOf, shipmentName, shipmentRef, fmtDate, timeAgo, supplierScoreTone,
} from './mahShared';
import { EmptyState } from './PortalComponents';

const REJECTED_STATES = ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];
const blank = { name: '', country: '', contact_name: '', contact_email: '', is_first_time: true };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Inline validation: field → error message or null
function supplierErrors(form) {
  return {
    name: form.name.trim() ? null : 'This field is required',
    country: form.country.trim() ? null : 'This field is required',
    contact_email: !form.contact_email.trim() || EMAIL_RE.test(form.contact_email.trim()) ? null : 'Enter a valid email address',
  };
}

// Shipments from a supplier: linked by id, or by name on older shipments
const supplierShipments = (supplier, shipments) => shipments.filter(s =>
  s.supplier_id === supplier.id
  || (!s.supplier_id && s.supplier_name && s.supplier_name.trim().toLowerCase() === supplier.name.trim().toLowerCase()));

export default function MahSuppliers({ token, suppliers, shipments, productsById, openShipment, reloadSuppliers, showToast }) {
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({}); // field → blurred or submit attempted
  const errors = supplierErrors(form);
  const showErr = (k) => touched[k] && errors[k];
  const touch = (k) => () => setTouched(t => ({ ...t, [k]: true }));
  const cls = (k) => `mah-input${showErr(k) ? ' is-invalid' : ''}`;
  const errMsg = (k) => (showErr(k) ? <small className="mah-field-error" role="alert">{errors[k]}</small> : null);
  const startAdding = () => { setForm(blank); setTouched({}); setError(null); setAdding(true); };

  const active = suppliers.filter(s => s.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));

  async function add(e) {
    e.preventDefault();
    if (Object.values(errors).some(Boolean)) {
      setTouched({ name: true, country: true, contact_email: true });
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      country: form.country.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      is_first_time: form.is_first_time,
    };
    try {
      await apiFetch(token, '/suppliers', { method: 'POST', body });
      await reloadSuppliers();
      setAdding(false);
      setForm(blank);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Suppliers</h1>
          <p className="mah-muted">{active.length} active suppliers</p>
        </div>
        {!adding && <button className="mah-btn mah-btn-primary" onClick={startAdding}><Icon name="plus" size={16} /> Add Supplier</button>}
      </div>

      {adding && (
        <form className="mah-card mah-inline-card" onSubmit={add} noValidate>
          <div className="mah-card-head"><h2>Add supplier</h2></div>
          <div className="mah-form-grid">
            <label className="mah-field"><span>Name *</span>
              <input className={cls('name')} required maxLength={255} value={form.name} onBlur={touch('name')} aria-invalid={!!showErr('name')}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errMsg('name')}
            </label>
            <label className="mah-field"><span>Country *</span>
              <input className={cls('country')} required maxLength={100} value={form.country} onBlur={touch('country')} aria-invalid={!!showErr('country')}
                onChange={e => setForm({ ...form, country: e.target.value })} />
              {errMsg('country')}
            </label>
            <label className="mah-field"><span>Contact name</span>
              <input className="mah-input" maxLength={255} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </label>
            <label className="mah-field"><span>Contact email</span>
              <input className={cls('contact_email')} type="email" maxLength={255} value={form.contact_email} onBlur={touch('contact_email')}
                aria-invalid={!!showErr('contact_email')} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              {errMsg('contact_email')}
            </label>
            <label className="mah-check mah-span-2">
              <input type="checkbox" checked={form.is_first_time} onChange={e => setForm({ ...form, is_first_time: e.target.checked })} />
              First time importing from this supplier
            </label>
          </div>
          {error && <div className="mah-alert mah-alert-red">{error}</div>}
          <div className="mah-row-actions">
            <button type="button" className="mah-btn mah-btn-ghost" onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
            <button type="submit" className="mah-btn mah-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save supplier'}</button>
          </div>
        </form>
      )}

      {active.length === 0 ? (
        <section className="mah-card">
          <EmptyState icon="🏭" title="No suppliers yet" description="Add your first supplier to get started"
            action={adding ? undefined : startAdding} actionLabel="Add Supplier" />
        </section>
      ) : (
        <div className="mah-supplier-grid">
          {active.map(sup => {
            const list = supplierShipments(sup, shipments).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            const lastIssue = list.find(s => REJECTED_STATES.includes(stateOf(s)));
            const open = openId === sup.id;
            return (
              <div key={sup.id} className={`mah-card mah-supplier-card${open ? ' is-open' : ''}`}>
                <button className="mah-supplier-summary" onClick={() => setOpenId(open ? null : sup.id)} aria-expanded={open}>
                  <Ring value={sup.compliance_score ?? 100} size={64} tone={supplierScoreTone(sup.compliance_score ?? 100)} />
                  <div className="mah-grow">
                    <div className="mah-row-title">{sup.name}</div>
                    <div className="mah-row-sub">{sup.country || 'Country not set'}{sup.is_first_time && ' · first-time supplier'}</div>
                    <div className="mah-supplier-stats">
                      <span><strong>{list.length}</strong> shipments</span>
                      <span>Last issue: {lastIssue ? <strong className="mah-text-red">{timeAgo(lastIssue.updated_at)}</strong> : <strong className="mah-text-green">none</strong>}</span>
                    </div>
                  </div>
                </button>
                {open && (
                  <SupplierProfile supplier={sup} list={list} productsById={productsById} openShipment={openShipment}
                    token={token} reloadSuppliers={reloadSuppliers} showToast={showToast} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierProfile({ supplier, list, productsById, openShipment, token, reloadSuppliers, showToast }) {
  const [tab, setTab] = useState('overview');
  const productIds = [...new Set(list.flatMap(s => [s.product_id, ...(Array.isArray(s.line_items) ? s.line_items.map(l => l.product_id) : [])]).filter(Boolean))];
  const rejections = list.filter(s => REJECTED_STATES.includes(stateOf(s)));

  return (
    <div className="mah-supplier-profile">
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' }, { key: 'products', label: 'Products supplied' },
        { key: 'history', label: 'Shipment history' }, { key: 'compliance', label: 'Compliance history' },
      ]} />
      {tab === 'overview' && (
        <>
        <div className="mah-facts">
          <div><span>Compliance score</span><strong>{supplier.compliance_score ?? 100}/100</strong></div>
          <div><span>Country</span><strong>{supplier.country || '—'}</strong></div>
          <div><span>Contact</span><strong>{supplier.contact_name || '—'}</strong></div>
          <div><span>Email</span><strong>{supplier.contact_email || '—'}</strong></div>
          <div><span>Supplier since</span><strong>{fmtDate(supplier.created_at)}</strong></div>
          <div><span>Status</span><strong>{supplier.is_first_time ? 'First-time' : 'Established'}</strong></div>
        </div>
        <ScoreBreakdown supplier={supplier} token={token} reloadSuppliers={reloadSuppliers} showToast={showToast} />
        </>
      )}
      {tab === 'products' && (productIds.length === 0
        ? <Empty title="No products linked yet" />
        : <ul className="mah-plain-list">{productIds.map(id => <li key={id}>{productsById[id]?.name_en || 'Unknown product'}</li>)}</ul>)}
      {tab === 'history' && (list.length === 0
        ? <Empty title="No shipments from this supplier yet" />
        : list.map(s => (
          <button key={s.id} className="mah-list-row" onClick={() => openShipment(s)}>
            <div className="mah-action-main">
              <div className="mah-row-title">{shipmentName(s, productsById)}</div>
              <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
            </div>
            <StateBadge state={s.current_state} />
          </button>
        )))}
      {tab === 'compliance' && (rejections.length === 0
        ? <Empty title="No compliance issues recorded">No SFDA rejections on shipments from this supplier.</Empty>
        : rejections.map(s => (
          <div key={s.id} className="mah-ai-row mah-edge-red">
            <div className="mah-tl-head"><strong>{shipmentName(s, productsById)}</strong><span className="mah-small">{fmtDate(s.updated_at)}</span></div>
            <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · <StateBadge state={s.current_state} /></div>
          </div>
        )))}
    </div>
  );
}

// ── Compliance score breakdown (POST /suppliers/:id/recalculate, GET /suppliers/:id/score-breakdown) ──
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : '0');
const MAX_IMPACT = 30; // largest single factor (rejection rate)

function FactorRow({ label, value, impact }) {
  const tone = impact > 0 ? 'green' : impact < 0 ? 'red' : 'grey';
  return (
    <div className="mah-factor">
      <span className="mah-factor-label">{label}</span>
      <span className="mah-factor-bar" aria-hidden="true">
        <span className={`mah-factor-fill mah-fill-${tone}`} style={{ width: `${Math.min(100, (Math.abs(impact) / MAX_IMPACT) * 100)}%` }} />
      </span>
      <span className="mah-factor-value">{value}</span>
      <span className={`mah-badge mah-tone-${tone} mah-factor-impact`}>{sign(Math.round(impact * 10) / 10)}</span>
    </div>
  );
}

function ScoreBreakdown({ supplier, token, reloadSuppliers, showToast }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(token, `/suppliers/${supplier.id}/score-breakdown`));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [token, supplier.id]);
  useEffect(() => { load(); }, [load]);

  async function recalculate() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch(token, `/suppliers/${supplier.id}/recalculate`, { method: 'POST' });
      setData({ ...r, stored_score: r.score });
      await reloadSuppliers?.();
      showToast?.(`Score updated: ${r.previous_score ?? '—'} → ${r.score}/100`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const f = data?.factors;
  return (
    <section className="mah-score-breakdown">
      <div className="mah-card-head">
        <h3 className="mah-h3">Compliance Score Breakdown</h3>
        <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={recalculate} disabled={busy}>
          {busy ? 'Recalculating…' : 'Recalculate'}
        </button>
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      {!f ? (!error && <div className="mah-loading">Calculating…</div>) : (
        <>
          <FactorRow label="SFDA rejection rate" impact={-f.rejection_rate.deduction}
            value={f.rejection_rate.total ? `${f.rejection_rate.value}% rejection rate` : 'No shipments yet'} />
          <FactorRow label="Supplier history" impact={-f.first_time.deduction}
            value={f.first_time.value ? 'First-time supplier' : `${f.first_time.shipments_submitted} shipments completed`} />
          <FactorRow label="Document quality" impact={f.document_quality.adjustment}
            value={f.document_quality.avg_score != null ? `Avg AI score: ${Math.round(f.document_quality.avg_score)}/100` : 'No data'} />
          <FactorRow label="Average clearance time" impact={f.clearance_speed.adjustment}
            value={f.clearance_speed.avg_days != null ? `${f.clearance_speed.avg_days} days avg` : 'No completed shipments'} />
          <FactorRow label="Integrity check failures" impact={-f.integrity_flags.deduction}
            value={`${f.integrity_flags.count} critical/high failure${f.integrity_flags.count === 1 ? '' : 's'}`} />
          <div className="mah-factor mah-factor-total">
            <span>Compliance score: <strong className={`mah-text-${supplierScoreTone(data.score)}`}>{data.score}/100</strong></span>
            {data.stored_score != null && data.stored_score !== data.score && (
              <span className="mah-small mah-muted">Stored score {data.stored_score} — recalculate to update</span>
            )}
          </div>
          <p className="mah-small mah-muted">Based on {data.shipments_analyzed} shipment{data.shipments_analyzed === 1 ? '' : 's'} from this supplier.</p>
        </>
      )}
    </section>
  );
}
