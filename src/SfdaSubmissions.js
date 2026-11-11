// SFDA Observer — Submissions: shipments with SFDA awaiting a decision (SUBMITTED + SFDA_INFO_REQUESTED).
import { useState } from 'react';
import { stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate } from './mahShared';
import { ChipRow, daysSince } from './clearanceShared';
import { mahCompany, submittedAt, fmtDays, matchesSearch, WAITING_STATES } from './sfdaShared';
import { EmptyState } from './PortalComponents';

const FILTERS = [
  { key: 'all', label: 'All', states: WAITING_STATES },
  { key: 'submitted', label: 'Submitted', states: ['SUBMITTED'] },
  { key: 'info', label: 'Info Requested', states: ['SFDA_INFO_REQUESTED'] },
];
const SLOW_DAYS = 14;

export default function SfdaSubmissions({ shipments, productsById, orgsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const states = FILTERS.find(f => f.key === filter).states;
  const rows = shipments
    .filter(s => states.includes(stateOf(s)) && matchesSearch(s, q, productsById))
    .sort((a, b) => new Date(submittedAt(a) || 0) - new Date(submittedAt(b) || 0));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Submissions</h1>
          <p className="mah-muted">Shipments awaiting an SFDA decision, oldest first</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by state" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: shipments.filter(s => f.states.includes(stateOf(s))).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name, MSR ID or Faseh ref..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search submissions" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? (filter === 'all' && !q
          ? <EmptyState icon="📥" title="No submissions waiting" description="Shipments filed with SFDA and awaiting a decision will appear here" />
          : <EmptyState icon="🔍" title="No submissions match" description="Try another filter or search" />) : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH company</th><th>Sector</th><th>Faseh ref</th><th>Submitted</th><th>Days waiting</th><th>State</th></tr></thead>
              <tbody>
                {rows.map(s => {
                  const days = daysSince(submittedAt(s));
                  return (
                    <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openShipment(s)}
                      onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                      <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                      <td>{mahCompany(s, orgsById)}</td>
                      <td><SectorBadge sector={shipmentSector(s)} /></td>
                      <td className="mah-mono">{s.faseh_request_number || '—'}</td>
                      <td>{fmtDate(submittedAt(s))}</td>
                      <td className={days > SLOW_DAYS ? 'mah-text-amber' : ''}>{fmtDays(days)}</td>
                      <td><StateBadge state={s.current_state} /></td>
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
