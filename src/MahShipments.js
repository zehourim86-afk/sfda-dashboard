// MAH portal — Shipments & Tracking list.
import { useState } from 'react';
import {
  needsAction, isInProgress, isClosed, shipmentSector, StateBadge, SectorBadge,
  shipmentName, shipmentRef, fmtDate, timeAgo, Empty, Icon,
} from './mahShared';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'action', label: 'Needs Action', test: needsAction },
  { key: 'progress', label: 'In Progress', test: isInProgress },
  { key: 'food_supplement', label: 'Food Supplement', test: s => shipmentSector(s) === 'food_supplement' },
  { key: 'cosmetic', label: 'Cosmetics', test: s => shipmentSector(s) === 'cosmetic' },
  { key: 'food', label: 'Food', test: s => shipmentSector(s) === 'food' },
  { key: 'closed', label: 'Closed', test: isClosed },
];

export default function MahShipments({ shipments, productsById, suppliersById, openShipment, onNewShipment }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const rows = shipments
    .filter(FILTERS.find(f => f.key === filter).test)
    .filter(s => !q || [shipmentName(s, productsById), s.masaar_id, s.faseh_request_number, s.bl_awb_number, s.supplier_name]
      .some(v => v && String(v).toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Shipments & Tracking</h1>
          <p className="mah-muted">{shipments.length} shipments in total</p>
        </div>
        <button className="mah-btn mah-btn-primary" onClick={onNewShipment}><Icon name="plus" size={16} /> New Shipment</button>
      </div>

      <div className="mah-toolbar">
        <div className="mah-filters">
          {FILTERS.map(f => (
            <button key={f.key} className={`mah-chip${filter === f.key ? ' is-active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="mah-chip-count">{shipments.filter(f.test).length}</span>
            </button>
          ))}
        </div>
        <input className="mah-input mah-search" placeholder="Search name, MSR ID, B/L…" value={search}
          onChange={e => setSearch(e.target.value)} aria-label="Search shipments" />
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? (
          <Empty title="No shipments match">Try another filter, or create a new shipment.</Empty>
        ) : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead>
                <tr><th>Shipment</th><th>Sector</th><th>Supplier</th><th>State</th><th>ETA</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s)} tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                    <td>
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
                    </td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td>{suppliersById[s.supplier_id]?.name || s.supplier_name || <span className="mah-muted">—</span>}</td>
                    <td><StateBadge state={s.current_state} /></td>
                    <td>{fmtDate(s.eta)}</td>
                    <td className="mah-muted">{timeAgo(s.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
