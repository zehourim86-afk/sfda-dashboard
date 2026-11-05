// Clearance Portal — Faseh & Filing: filing status across assigned shipments.
import { useState } from 'react';
import { stateOf, StateBadge, shipmentName, shipmentRef, fmtDate, Empty } from './mahShared';
import { ChipRow, SummaryCards, daysSince, isThisMonth } from './clearanceShared';

const AVG_FILING_DAYS = 2.3; // hardcoded until the metrics backend exists

// Filed = has a filing date or a Faseh number and has left WITH_BROKER (pre-hand-over shipments are neither)
const PRE_BROKER = ['DRAFT', 'PREPARING', 'READY_TO_SUBMIT'];
const isPending = (s) => stateOf(s) === 'WITH_BROKER';
const isFiled = (s) => !isPending(s) && !PRE_BROKER.includes(stateOf(s)) && !!(s.faseh_filed_at || s.faseh_request_number);
const FILTERS = [
  { key: 'pending', label: 'Pending Filing', test: isPending },
  { key: 'filed', label: 'Filed', test: isFiled },
  { key: 'all', label: 'All', test: () => true },
];

export default function ClearanceFaseh({ shipments, productsById, openShipment }) {
  const [filter, setFilter] = useState('pending');
  const rows = shipments.filter(FILTERS.find(f => f.key === filter).test)
    .sort((a, b) => (isPending(a) === isPending(b)
      ? new Date(b.faseh_filed_at || b.updated_at) - new Date(a.faseh_filed_at || a.updated_at)
      : isPending(a) ? -1 : 1));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Faseh &amp; Filing</h1>
          <p className="mah-muted">Faseh declarations for your assigned shipments</p>
        </div>
      </div>

      <SummaryCards cards={[
        { label: 'Pending filing', value: shipments.filter(isPending).length, tone: 'amber' },
        { label: 'Filed this month', value: shipments.filter(s => isThisMonth(s.faseh_filed_at)).length, tone: 'blue' },
        { label: 'Avg filing time', value: `${AVG_FILING_DAYS} days`, tone: 'green', note: 'Demo figure' },
      ]} />

      <ChipRow label="Filter by filing status" value={filter} onChange={setFilter}
        options={FILTERS.map(f => ({ ...f, count: shipments.filter(f.test).length }))} />

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No shipments here">Hand-overs from MAHs appear under Pending Filing.</Empty> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MSR ID</th><th>Faseh Ref</th><th>Filing Date</th><th>Status</th><th>Days Since Filing</th></tr></thead>
              <tbody>
                {rows.map(s => {
                  const days = daysSince(s.faseh_filed_at);
                  return (
                    <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s, 'faseh')} tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') openShipment(s, 'faseh'); }}>
                      <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub">{s.importer_name}</div></td>
                      <td className="mah-mono">{shipmentRef(s)}</td>
                      <td className="mah-mono">{s.faseh_request_number || <span className="mah-muted">—</span>}</td>
                      <td>{fmtDate(s.faseh_filed_at)}</td>
                      <td><StateBadge state={s.current_state} /></td>
                      <td>{isPending(s) ? <span className="mah-text-amber">Not filed</span> : days === null ? '—' : `${days}d`}</td>
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
