// MAH portal — Suppliers (cards, expandable profile).
import { useState } from 'react';
import {
  apiFetch, Ring, Tabs, StateBadge, Empty, Icon, stateOf, shipmentName, shipmentRef, fmtDate, timeAgo,
} from './mahShared';

const REJECTED_STATES = ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];
const blank = { name: '', country: '', contact_name: '', contact_email: '', is_first_time: true };

// Shipments from a supplier: linked by id, or by name on older shipments
const supplierShipments = (supplier, shipments) => shipments.filter(s =>
  s.supplier_id === supplier.id
  || (!s.supplier_id && s.supplier_name && s.supplier_name.trim().toLowerCase() === supplier.name.trim().toLowerCase()));

export default function MahSuppliers({ token, suppliers, shipments, productsById, openShipment, reloadSuppliers }) {
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const active = suppliers.filter(s => s.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      country: form.country.trim() || null,
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
        {!adding && <button className="mah-btn mah-btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Add Supplier</button>}
      </div>

      {adding && (
        <form className="mah-card mah-inline-card" onSubmit={add}>
          <div className="mah-card-head"><h2>Add supplier</h2></div>
          <div className="mah-form-grid">
            <label className="mah-field"><span>Name *</span>
              <input className="mah-input" required maxLength={255} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="mah-field"><span>Country</span>
              <input className="mah-input" maxLength={100} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </label>
            <label className="mah-field"><span>Contact name</span>
              <input className="mah-input" maxLength={255} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </label>
            <label className="mah-field"><span>Contact email</span>
              <input className="mah-input" type="email" maxLength={255} value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
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
        <section className="mah-card"><Empty title="No suppliers yet">Add suppliers to get risk scoring on every shipment.</Empty></section>
      ) : (
        <div className="mah-supplier-grid">
          {active.map(sup => {
            const list = supplierShipments(sup, shipments).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            const lastIssue = list.find(s => REJECTED_STATES.includes(stateOf(s)));
            const open = openId === sup.id;
            return (
              <div key={sup.id} className={`mah-card mah-supplier-card${open ? ' is-open' : ''}`}>
                <button className="mah-supplier-summary" onClick={() => setOpenId(open ? null : sup.id)} aria-expanded={open}>
                  <Ring value={sup.compliance_score ?? 100} size={64} />
                  <div className="mah-grow">
                    <div className="mah-row-title">{sup.name}</div>
                    <div className="mah-row-sub">{sup.country || 'Country not set'}{sup.is_first_time && ' · first-time supplier'}</div>
                    <div className="mah-supplier-stats">
                      <span><strong>{list.length}</strong> shipments</span>
                      <span>Last issue: {lastIssue ? <strong className="mah-text-red">{timeAgo(lastIssue.updated_at)}</strong> : <strong className="mah-text-green">none</strong>}</span>
                    </div>
                  </div>
                </button>
                {open && <SupplierProfile supplier={sup} list={list} productsById={productsById} openShipment={openShipment} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierProfile({ supplier, list, productsById, openShipment }) {
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
        <div className="mah-facts">
          <div><span>Compliance score</span><strong>{supplier.compliance_score ?? 100}/100</strong></div>
          <div><span>Country</span><strong>{supplier.country || '—'}</strong></div>
          <div><span>Contact</span><strong>{supplier.contact_name || '—'}</strong></div>
          <div><span>Email</span><strong>{supplier.contact_email || '—'}</strong></div>
          <div><span>Supplier since</span><strong>{fmtDate(supplier.created_at)}</strong></div>
          <div><span>Status</span><strong>{supplier.is_first_time ? 'First-time' : 'Established'}</strong></div>
        </div>
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
