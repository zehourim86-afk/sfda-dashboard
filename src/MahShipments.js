// MAH portal — Shipments & Tracking list.
import { useState } from 'react';
import {
  stateOf, shipmentSector, StateBadge, SectorBadge,
  shipmentName, shipmentRef, fmtDate, timeAgo, Empty, Icon,
} from './mahShared';

// Row 1 — status groups. CONDITIONALLY_RELEASED and CUSTOMS_RELEASED are in no group, so they show under "All" only.
const inStates = (states) => (s) => states.includes(stateOf(s));
const STATUS_FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'action', label: 'Action Required',
    test: inStates(['DRAFT', 'PREPARING', 'READY_TO_SUBMIT', 'SFDA_REJECTED', 'SFDA_INFO_REQUESTED', 'OBJECTION_FILED']) },
  { key: 'active', label: 'Active',
    test: inStates(['WITH_BROKER', 'SUBMITTED', 'SAMPLING', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'DISPOSITION_PENDING']) },
  { key: 'completed', label: 'Completed',
    test: inStates(['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN']) },
];

// Row 2 — sector, independent of the status filter
const SECTOR_FILTERS = [
  { key: 'all', label: 'All Sectors', test: () => true },
  { key: 'food_supplement', label: 'Food Supplement', test: s => shipmentSector(s) === 'food_supplement' },
  { key: 'cosmetic', label: 'Cosmetics', test: s => shipmentSector(s) === 'cosmetic' },
  { key: 'food', label: 'Food', test: s => shipmentSector(s) === 'food' },
];
const byKey = (list, key) => list.find(f => f.key === key);

export default function MahShipments({ shipments, productsById, suppliersById, openShipment, onNewShipment }) {
  const [status, setStatus] = useState('all');
  const [sector, setSector] = useState('all');
  const [search, setSearch] = useState('');

  // Status counts follow the sector filter
  const inSector = shipments.filter(byKey(SECTOR_FILTERS, sector).test);
  const q = search.trim().toLowerCase();
  const rows = inSector
    .filter(byKey(STATUS_FILTERS, status).test)
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

      <div className="mah-filter-rows">
        <div className="mah-filter-row" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} className={`mah-action-chip${status === f.key ? ' is-active' : ''}`}
              aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label}
              <span className="mah-chip-count">{inSector.filter(f.test).length}</span>
            </button>
          ))}
          <input className="mah-input mah-search mah-filter-search" placeholder="Search name, MSR ID, B/L..." value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Search shipments" />
        </div>
        <div className="mah-filter-row" role="group" aria-label="Filter by sector">
          {SECTOR_FILTERS.map(f => (
            <button key={f.key} className={`mah-action-chip${sector === f.key ? ' is-active' : ''}`}
              aria-pressed={sector === f.key} onClick={() => setSector(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
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
