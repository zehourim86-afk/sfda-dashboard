// MAH portal — Products & Registrations (product master).
import { useState } from 'react';
import { apiFetch, SECTOR_LABELS, SectorBadge, expiryStatus, Empty, Icon } from './mahShared';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'food_supplement', label: 'Food Supplement', test: p => p.sector === 'food_supplement' },
  { key: 'cosmetic', label: 'Cosmetics', test: p => p.sector === 'cosmetic' },
  { key: 'food', label: 'Food', test: p => p.sector === 'food' },
  { key: 'expiring', label: 'Expiring', test: p => ['expiring', 'expired'].includes(expiryStatus(p).key) },
];

const FIELDS = [
  { name: 'name_en', label: 'Name (English)', required: true, max: 255 },
  { name: 'name_ar', label: 'Name (Arabic)', max: 255, dir: 'rtl' },
  { name: 'sector', label: 'Sector', required: true, options: Object.entries(SECTOR_LABELS) },
  { name: 'sfda_reg_number', label: 'SFDA registration no.', max: 100 },
  { name: 'sfda_reg_expiry', label: 'Registration expiry', type: 'date' },
  { name: 'manufacturer_name', label: 'Manufacturer', max: 255 },
  { name: 'manufacturer_country', label: 'Manufacturer country', max: 100 },
  { name: 'hs_code', label: 'HS code', max: 20 },
  { name: 'storage_conditions', label: 'Storage conditions', wide: true, placeholder: 'e.g. Store refrigerated at 2–8°C' },
];
const blank = () => Object.fromEntries(FIELDS.map(f => [f.name, f.name === 'sector' ? 'food_supplement' : '']));

// Shipments that include this product (main product or a line item)
export const productShipmentCount = (product, shipments) => shipments.filter(s =>
  s.product_id === product.id || (Array.isArray(s.line_items) && s.line_items.some(l => l.product_id === product.id))).length;

export default function MahProducts({ token, products, shipments, reloadProducts }) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null | 'new' | product id
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const active = products.filter(p => p.is_active !== false);
  const rows = active.filter(FILTERS.find(f => f.key === filter).test)
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  const startNew = () => { setForm(blank()); setEditing('new'); setError(null); };
  const startEdit = (p) => {
    setForm(Object.fromEntries(FIELDS.map(f => [f.name, p[f.name] ? String(p[f.name]).slice(0, f.type === 'date' ? 10 : undefined) : ''])));
    setEditing(p.id);
    setError(null);
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Empty optional fields are sent as null so they can be cleared on edit
    const body = Object.fromEntries(FIELDS.map(f => [f.name, form[f.name].trim() === '' ? null : form[f.name].trim()]));
    try {
      if (editing === 'new') await apiFetch(token, '/products', { method: 'POST', body });
      else await apiFetch(token, `/products/${editing}`, { method: 'PUT', body });
      await reloadProducts();
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const formView = (
    <form className="mah-card mah-inline-card" onSubmit={save}>
      <div className="mah-card-head"><h2>{editing === 'new' ? 'Add product' : 'Edit product'}</h2></div>
      <div className="mah-form-grid">
        {FIELDS.map(f => (
          <label key={f.name} className={`mah-field${f.wide ? ' mah-span-2' : ''}`}>
            <span>{f.label}{f.required && ' *'}</span>
            {f.options ? (
              <select className="mah-input" value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })}>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <input className="mah-input" type={f.type || 'text'} dir={f.dir} required={f.required} maxLength={f.max}
                placeholder={f.placeholder} value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      <div className="mah-row-actions">
        <button type="button" className="mah-btn mah-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
        <button type="submit" className="mah-btn mah-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </div>
    </form>
  );

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Products & Registrations</h1>
          <p className="mah-muted">{active.length} products in your master</p>
        </div>
        {editing === null && <button className="mah-btn mah-btn-primary" onClick={startNew}><Icon name="plus" size={16} /> Add Product</button>}
      </div>

      {editing !== null && formView}

      <div className="mah-toolbar">
        <div className="mah-filters">
          {FILTERS.map(f => (
            <button key={f.key} className={`mah-chip${filter === f.key ? ' is-active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}<span className="mah-chip-count">{active.filter(f.test).length}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? (
          <Empty title={active.length ? 'No products match this filter' : 'No products yet'}>
            {!active.length && 'Add your registered products once, then reuse them on every shipment.'}
          </Empty>
        ) : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead>
                <tr><th>Product</th><th>Sector</th><th>SFDA reg. no.</th><th>Manufacturer</th><th>Registration</th><th>Shipments</th><th /></tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const st = expiryStatus(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="mah-row-title">{p.name_en}</div>
                        {p.name_ar && <div className="mah-row-sub" dir="rtl">{p.name_ar}</div>}
                      </td>
                      <td><SectorBadge sector={p.sector} /></td>
                      <td className="mah-mono">{p.sfda_reg_number || <span className="mah-muted">—</span>}</td>
                      <td>
                        {p.manufacturer_name || <span className="mah-muted">—</span>}
                        {p.manufacturer_country && <div className="mah-row-sub">{p.manufacturer_country}</div>}
                      </td>
                      <td><span className={`mah-badge mah-tone-${st.tone}`}>{st.label}</span></td>
                      <td>{productShipmentCount(p, shipments)}</td>
                      <td><button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => startEdit(p)}>Edit</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
