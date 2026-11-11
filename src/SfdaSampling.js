// SFDA Observer — Sampling: shipments in SAMPLING with their sub-track status.
import { useState } from 'react';
import { stateOf, SectorBadge, shipmentName, shipmentRef, shipmentSector } from './mahShared';
import { ChipRow, daysSince } from './clearanceShared';
import { mahCompany, fmtDays, SamplingBadge } from './sfdaShared';
import { EmptyState } from './PortalComponents';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'SAMPLING_ORDERED', label: 'Sampling Ordered' },
  { key: 'SAMPLE_COLLECTED', label: 'Sample Collected' },
  { key: 'SAMPLE_AT_LAB', label: 'At Lab' },
  { key: 'RESULTS_SUBMITTED', label: 'Results Submitted' },
];

export default function SfdaSampling({ shipments, productsById, orgsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const sampling = shipments.filter(s => stateOf(s) === 'SAMPLING');
  const matches = (s, key) => key === 'all' || s.sampling_state === key;
  const rows = sampling.filter(s => matches(s, filter))
    .sort((a, b) => new Date(a.state_entered_at || 0) - new Date(b.state_entered_at || 0));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Sampling</h1>
          <p className="mah-muted">Shipments SFDA has ordered for sampling, longest in sampling first</p>
        </div>
      </div>

      <ChipRow label="Filter by sampling step" value={filter} onChange={setFilter}
        options={FILTERS.map(f => ({ ...f, count: sampling.filter(s => matches(s, f.key)).length }))} />

      <section className="mah-card mah-card-flush">
        {sampling.length === 0 ? <EmptyState icon="🧪" title="No shipments in sampling" description="Shipments SFDA orders for sampling will appear here" />
          : rows.length === 0 ? <EmptyState icon="🔍" title="No shipments at this sampling step" description="Try another sampling step" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH company</th><th>Sector</th><th>Sampling state</th><th>Location</th><th>Lab</th><th>Days in sampling</th></tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openShipment(s, 'sampling')}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s, 'sampling'); }}>
                    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                    <td>{mahCompany(s, orgsById)}</td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td><SamplingBadge value={s.sampling_state} /></td>
                    <td>{s.sampling_location || <span className="mah-muted">—</span>}</td>
                    <td>{s.sampling_lab_name || s.lab_name || <span className="mah-muted">—</span>}</td>
                    <td>{fmtDays(daysSince(s.state_entered_at))}</td>
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
