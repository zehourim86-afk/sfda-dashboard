// SFDA Observer — Decisions: released, partially released, rejected and closed shipments.
import { useState } from 'react';
import { stateOf, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate } from './mahShared';
import { ChipRow, SummaryCards, isThisMonth } from './clearanceShared';
import {
  mahCompany, decisionAt, decisionKind, daysBetween, fmtDays, objectionFiled, matchesSearch,
  DECIDED_STATES, RELEASED_DECISIONS, PARTIAL_DECISIONS, REJECTED_DECISIONS,
} from './sfdaShared';
import { EmptyState } from './PortalComponents';

// Hardcoded until objection outcomes are tracked
const OBJECTION_SUCCESS_RATE = 43;

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'released', label: 'Released', test: s => [...RELEASED_DECISIONS, ...PARTIAL_DECISIONS].includes(stateOf(s)) },
  { key: 'rejected', label: 'Rejected', test: s => REJECTED_DECISIONS.includes(stateOf(s)) },
  { key: 'objection', label: 'Objection Filed', test: objectionFiled },
];

export default function SfdaDecisions({ shipments, productsById, orgsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const decided = shipments.filter(s => DECIDED_STATES.includes(stateOf(s)));
  const test = FILTERS.find(f => f.key === filter).test;
  const rows = decided.filter(s => test(s) && matchesSearch(s, q, productsById))
    .sort((a, b) => new Date(decisionAt(b) || 0) - new Date(decisionAt(a) || 0));
  const thisMonth = (states) => decided.filter(s => states.includes(stateOf(s)) && isThisMonth(decisionAt(s))).length;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Decisions</h1>
          <p className="mah-muted">SFDA outcomes, most recent first</p>
        </div>
      </div>

      <SummaryCards cards={[
        { label: 'Released this month', value: thisMonth([...RELEASED_DECISIONS, ...PARTIAL_DECISIONS]), tone: 'green' },
        { label: 'Rejected this month', value: thisMonth(REJECTED_DECISIONS), tone: 'red' },
        { label: 'Objections filed', value: decided.filter(objectionFiled).length, tone: 'purple' },
        { label: 'Objection success rate', value: `${OBJECTION_SUCCESS_RATE}%`, tone: 'blue', note: 'Demo figure' },
      ]} />

      <div className="mah-filter-rows">
        <ChipRow label="Filter by decision" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: decided.filter(f.test).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name or MSR ID..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search decisions" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {decided.length === 0 ? <EmptyState icon="⚖️" title="No decisions recorded yet" description="SFDA releases and rejections will appear here" />
          : rows.length === 0 ? <EmptyState icon="🔍" title="No decisions match" description="Try another filter or search" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH company</th><th>Sector</th><th>Decision</th><th>Decision date</th><th>From submission</th><th>Objection</th></tr></thead>
              <tbody>
                {rows.map(s => {
                  const k = decisionKind(s);
                  return (
                    <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openShipment(s)}
                      onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                      <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                      <td>{mahCompany(s, orgsById)}</td>
                      <td><SectorBadge sector={shipmentSector(s)} /></td>
                      <td><span className={`mah-badge mah-tone-${k.tone}`}>{k.label}</span></td>
                      <td>{fmtDate(decisionAt(s))}</td>
                      <td>{fmtDays(daysBetween(s.faseh_filed_at, s.sfda_decided_at))}</td>
                      <td>{objectionFiled(s)
                        ? <span className="mah-badge mah-tone-purple">Yes{Number(s.objection_count) > 1 ? ` · ${s.objection_count} rounds` : ''}</span>
                        : <span className="mah-muted">No</span>}</td>
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
