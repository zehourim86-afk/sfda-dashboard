// Clearance Portal — Shipments list (assigned shipments only; brokers don't create shipments).
import { useState } from 'react';
import { stateOf, shipmentSector, StateBadge, SectorBadge, shipmentName, shipmentRef, fmtDate, timeAgo, Empty } from './mahShared';
import { ChipRow, COMPLETED_STATES } from './clearanceShared';

// Row 1 — status. Shipments before hand-over (DRAFT…READY_TO_SUBMIT), OBJECTION_FILED and
// SFDA_REJECTED fall in no group, so they show under "All" only.
const inStates = (states) => (s) => states.includes(stateOf(s));
const STATUS_FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'filing', label: 'Needs Filing', test: inStates(['WITH_BROKER']) },
  { key: 'active', label: 'Active',
    test: inStates(['SUBMITTED', 'SAMPLING', 'SFDA_INFO_REQUESTED', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'DISPOSITION_PENDING']) },
  { key: 'completed', label: 'Completed', test: inStates(COMPLETED_STATES) },
];
// Row 2 — sector, independent of the status filter
const SECTOR_FILTERS = [
  { key: 'all', label: 'All Sectors', test: () => true },
  { key: 'food_supplement', label: 'Food Supplement', test: s => shipmentSector(s) === 'food_supplement' },
  { key: 'cosmetic', label: 'Cosmetics', test: s => shipmentSector(s) === 'cosmetic' },
  { key: 'food', label: 'Food', test: s => shipmentSector(s) === 'food' },
];
const byKey = (list, key) => list.find(f => f.key === key);

export default function ClearanceShipments({ shipments, productsById, openShipment }) {
  const [status, setStatus] = useState('all');
  const [sector, setSector] = useState('all');
  const [search, setSearch] = useState('');

  // Status counts follow the sector filter
  const inSector = shipments.filter(byKey(SECTOR_FILTERS, sector).test);
  const q = search.trim().toLowerCase();
  const rows = inSector
    .filter(byKey(STATUS_FILTERS, status).test)
    .filter(s => !q || [shipmentName(s, productsById), s.masaar_id, s.faseh_request_number, s.bl_awb_number, s.importer_name]
      .some(v => v && String(v).toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Shipments</h1>
          <p className="mah-muted">{shipments.length} shipments assigned to you</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by status" value={status} onChange={setStatus}
          options={STATUS_FILTERS.map(f => ({ ...f, count: inSector.filter(f.test).length }))}>
          <input className="mah-input mah-search mah-filter-search" placeholder="Search name, MSR ID, B/L..." value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Search shipments" />
        </ChipRow>
        <ChipRow label="Filter by sector" value={sector} onChange={setSector} options={SECTOR_FILTERS} />
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? (
          <Empty title="No shipments match">Try another filter or search.</Empty>
        ) : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead>
                <tr><th>Shipment</th><th>MAH Company</th><th>Sector</th><th>State</th><th>Faseh Ref</th><th>ETA</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s)} tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                    <td>
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
                    </td>
                    <td>{s.importer_name || <span className="mah-muted">—</span>}</td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td><StateBadge state={s.current_state} /></td>
                    <td className="mah-mono">{s.faseh_request_number || <span className="mah-muted">—</span>}</td>
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
