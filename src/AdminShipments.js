// Admin Panel — All Shipments across every organisation, with transition and withdraw actions.
import { useState } from 'react';
import { stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate, timeAgo, Empty, SECTOR_LABELS } from './mahShared';
import { getStateLabel } from './constants';
import { ChipRow } from './clearanceShared';
import { mahCompany, matchesSearch } from './sfdaShared';
import { isClosedState } from './adminShared';

const PAGE_SIZE = 50;
const SECTOR_FILTERS = [{ key: 'all', label: 'All Sectors' }, ...Object.entries(SECTOR_LABELS).map(([key, label]) => ({ key, label }))];

export default function AdminShipments({ shipments, organisations, productsById, orgsById, attentionIds, initialFilter,
  openShipment, openTransition, openWithdraw }) {
  const presetState = initialFilter?.startsWith('state:') ? initialFilter.slice(6) : null;
  const [stateFilter, setStateFilter] = useState(presetState);
  const [status, setStatus] = useState('all');
  const [sector, setSector] = useState('all');
  const [org, setOrg] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = search.trim().toLowerCase();

  const STATUS = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'attention', label: 'Needs Attention', test: s => attentionIds.has(s.id) },
    { key: 'active', label: 'Active', test: s => !isClosedState(s) },
    { key: 'completed', label: 'Completed', test: isClosedState },
  ];
  const statusTest = STATUS.find(f => f.key === status).test;
  const inOrg = (s) => org === 'all' || [s.org_id, s.clearance_company_id, s.lab_id].some(id => id != null && String(id) === org);

  const rows = shipments
    .filter(s => (!stateFilter || stateOf(s) === stateFilter) && statusTest(s)
      && (sector === 'all' || shipmentSector(s) === sector) && inOrg(s)
      && matchesSearch(s, q, productsById, [mahCompany(s, orgsById), s.clearance_company_name]))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const reset = (fn) => (v) => { fn(v); setPage(0); };

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>All shipments</h1>
          <p className="mah-muted">{shipments.length} shipments across all organisations</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by status" value={status} onChange={reset(setStatus)}
          options={STATUS.map(f => ({ ...f, count: shipments.filter(f.test).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name, MSR ID or organisation..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} aria-label="Search shipments" />
        </ChipRow>
        <ChipRow label="Filter by sector" value={sector} onChange={reset(setSector)} options={SECTOR_FILTERS} />
        <div className="mah-filter-row">
          <select className="mah-input adm-org-select" value={org} onChange={e => { setOrg(e.target.value); setPage(0); }} aria-label="Filter by organisation">
            <option value="all">All Orgs</option>
            {organisations.map(o => <option key={o.id} value={String(o.id)}>{o.name_en}</option>)}
          </select>
          {stateFilter && (
            <button className="mah-action-chip is-active" onClick={() => setStateFilter(null)} aria-label="Clear state filter">
              State: {getStateLabel(stateFilter)} ×
            </button>
          )}
        </div>
      </div>

      <section className="mah-card mah-card-flush">
        {shown.length === 0 ? <Empty title="No shipments match" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>Org / MAH</th><th>Clearance Co</th><th>Sector</th><th>State</th><th>ETA</th><th>Updated</th><th>Actions</th></tr></thead>
              <tbody>
                {shown.map(s => (
                  <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openShipment(s)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) openShipment(s); }}>
                    <td>
                      <div className="mah-row-title">{shipmentName(s, productsById)}{attentionIds.has(s.id) && <span className="adm-flag" title="Needs attention">!</span>}</div>
                      <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
                    </td>
                    <td>{mahCompany(s, orgsById)}</td>
                    <td>{s.clearance_company_name || <span className="mah-muted">—</span>}</td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td><StateBadge state={s.current_state} /></td>
                    <td className="mah-nowrap">{fmtDate(s.eta)}</td>
                    <td className="mah-nowrap mah-muted">{timeAgo(s.updated_at)}</td>
                    <td onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                      <div className="adm-row-actions">
                        <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => openTransition(s)}>Transition →</button>
                        {!isClosedState(s) && <button className="mah-btn mah-btn-sm mah-btn-red" onClick={() => openWithdraw(s)}>Withdraw</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rows.length > PAGE_SIZE && (
        <div className="mah-pager">
          <span>Showing {current * PAGE_SIZE + 1}–{Math.min(rows.length, (current + 1) * PAGE_SIZE)} of {rows.length}</span>
          <div className="mah-pager-links">
            <button className="mah-link-btn" disabled={current === 0} onClick={() => setPage(current - 1)}>← Previous</button>
            <button className="mah-link-btn" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
