// Clearance Portal — SFDA Track: SFDA-side status across assigned shipments.
import { useState } from 'react';
import { stateOf, StateBadge, shipmentName, shipmentRef, Empty } from './mahShared';
import {
  ChipRow, SummaryCards, daysSince, isThisMonth, INFO_REQUEST_LABELS, SAMPLING_LABELS, RELEASED_STATES, REJECTED_STATES,
} from './clearanceShared';

const inStates = (states) => (s) => states.includes(stateOf(s));
const SFDA_STATES = ['SUBMITTED', 'SFDA_INFO_REQUESTED', 'SAMPLING', ...RELEASED_STATES, ...REJECTED_STATES];
const FILTERS = [
  { key: 'all', label: 'All', test: inStates(SFDA_STATES) },
  { key: 'info', label: 'Info Requested', test: inStates(['SFDA_INFO_REQUESTED']) },
  { key: 'sampling', label: 'Sampling', test: inStates(['SAMPLING']) },
  { key: 'released', label: 'Released', test: inStates(RELEASED_STATES) },
  { key: 'rejected', label: 'Rejected', test: inStates(REJECTED_STATES) },
];

export default function ClearanceSFDATrack({ shipments, productsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const rows = shipments.filter(FILTERS.find(f => f.key === filter).test)
    .sort((a, b) => new Date(a.state_entered_at) - new Date(b.state_entered_at));
  const decidedThisMonth = (states) => shipments.filter(s => states.includes(stateOf(s)) && isThisMonth(s.sfda_decided_at)).length;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>SFDA Track</h1>
          <p className="mah-muted">SFDA status of shipments you have filed (all shipments that have left your desk)</p>
        </div>
      </div>

      <SummaryCards cards={[
        { label: 'Open info requests', value: shipments.filter(inStates(['SFDA_INFO_REQUESTED'])).length, tone: 'red' },
        { label: 'In sampling', value: shipments.filter(inStates(['SAMPLING'])).length, tone: 'purple' },
        { label: 'Released this month', value: decidedThisMonth(RELEASED_STATES), tone: 'green' },
        { label: 'Rejected this month', value: decidedThisMonth(REJECTED_STATES), tone: 'red' },
      ]} />

      <ChipRow label="Filter by SFDA status" value={filter} onChange={setFilter}
        options={FILTERS.map(f => ({ ...f, count: shipments.filter(f.test).length }))} />

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No shipments here" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MSR ID</th><th>SFDA State</th><th>Info Request</th><th>Days in State</th></tr></thead>
              <tbody>
                {rows.map(s => {
                  const days = daysSince(s.state_entered_at);
                  const st = stateOf(s);
                  return (
                    <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s, 'sfda')} tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') openShipment(s, 'sfda'); }}>
                      <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub">{s.importer_name}</div></td>
                      <td className="mah-mono">{shipmentRef(s)}</td>
                      <td>
                        <StateBadge state={s.current_state} />
                        {st === 'SAMPLING' && <div className="mah-row-sub">{SAMPLING_LABELS[s.sampling_state]}</div>}
                      </td>
                      <td>{st === 'SFDA_INFO_REQUESTED' ? (INFO_REQUEST_LABELS[s.info_request_type] || 'Type not set') : <span className="mah-muted">—</span>}</td>
                      <td className={days > 14 && ['SUBMITTED', 'SFDA_INFO_REQUESTED', 'SAMPLING'].includes(st) ? 'mah-text-amber' : ''}>
                        {days === null ? '—' : `${days}d`}
                      </td>
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
