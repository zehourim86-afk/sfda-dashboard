// Clearance Portal — Customs Track: ZATCA customs status across assigned shipments.
import { useState } from 'react';
import { stateOf, StateBadge, shipmentName, shipmentRef, fmtDateTime, Empty } from './mahShared';
import { ChipRow, SummaryCards, isThisMonth, isThisYear, fmtSAR, CUSTOMS_LABELS, CUSTOMS_TONES } from './clearanceShared';

// Customs starts once the shipment is with the broker; earlier ones are left out
const PRE_BROKER = ['DRAFT', 'PREPARING', 'READY_TO_SUBMIT'];
const customsOf = (s) => s.customs_state || 'PENDING';
const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'DECLARATION_FILED', label: 'Declaration Filed' },
  { key: 'DUTIES_PAID', label: 'Duties Paid' },
  { key: 'CUSTOMS_RELEASED', label: 'Released' },
  { key: 'all', label: 'All' },
];

export default function ClearanceCustoms({ shipments, productsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const tracked = shipments.filter(s => !PRE_BROKER.includes(stateOf(s)));
  const rows = tracked.filter(s => filter === 'all' || customsOf(s) === filter)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const ytdDuties = tracked.filter(s => isThisYear(s.duties_paid_at)).reduce((sum, s) => sum + Number(s.duties_amount || 0), 0);

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Customs Track</h1>
          <p className="mah-muted">ZATCA declaration, duties and gate-out for your assigned shipments</p>
        </div>
      </div>

      <SummaryCards cards={[
        { label: 'Pending declaration', value: tracked.filter(s => customsOf(s) === 'PENDING').length, tone: 'grey' },
        { label: 'Duties paid, awaiting gate-out', value: tracked.filter(s => customsOf(s) === 'DUTIES_PAID').length, tone: 'amber' },
        { label: 'Released this month', value: tracked.filter(s => isThisMonth(s.customs_released_at)).length, tone: 'green' },
        { label: 'Total duties YTD', value: fmtSAR(ytdDuties), tone: 'blue' },
      ]} />

      <ChipRow label="Filter by customs status" value={filter} onChange={setFilter}
        options={FILTERS.map(f => ({ ...f, count: f.key === 'all' ? tracked.length : tracked.filter(s => customsOf(s) === f.key).length }))} />

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No shipments here" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MSR ID</th><th>ZATCA Ref</th><th>Customs State</th><th>Duties</th><th>Gate-out</th></tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s, 'customs')} tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s, 'customs'); }}>
                    <td>
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub"><StateBadge state={s.current_state} /></div>
                    </td>
                    <td className="mah-mono">{shipmentRef(s)}</td>
                    <td className="mah-mono">{s.zatca_declaration_ref || <span className="mah-muted">—</span>}</td>
                    <td><span className={`mah-badge mah-tone-${CUSTOMS_TONES[customsOf(s)]}`}>{CUSTOMS_LABELS[customsOf(s)]}</span></td>
                    <td>{fmtSAR(s.duties_amount)}</td>
                    <td>{fmtDateTime(s.gate_out_at)}</td>
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
