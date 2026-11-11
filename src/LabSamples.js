// Lab Portal — Samples: every sample assigned to this lab, filterable by stage.
import { useState } from 'react';
import { SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate } from './mahShared';
import { ChipRow, daysSince } from './clearanceShared';
import { mahCompany, SamplingBadge, matchesSearch } from './sfdaShared';
import { labStage, labAction, ColdChainTag } from './labShared';
import { EmptyState } from './PortalComponents';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'pending', label: 'Pending Receipt', test: s => labStage(s) === 'pending' },
  { key: 'analysis', label: 'In Analysis', test: s => labStage(s) === 'analysis' },
  { key: 'results', label: 'Results Submitted', test: s => labStage(s) === 'results' },
  { key: 'complete', label: 'Complete', test: s => labStage(s) === 'complete' || labStage(s) === 'rejected' },
];
const receivedDate = (s) => (s.sampling_state === 'SAMPLE_AT_LAB' || labStage(s) === 'results' || labStage(s) === 'complete' ? s.state_entered_at : null);

export default function LabSamples({ samples, productsById, openSample }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const test = FILTERS.find(f => f.key === filter).test;
  const rows = samples.filter(s => test(s) && matchesSearch(s, q, productsById))
    .sort((a, b) => new Date(a.state_entered_at) - new Date(b.state_entered_at));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Samples</h1>
          <p className="mah-muted">{samples.length} sample{samples.length === 1 ? '' : 's'} assigned to your lab</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by stage" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: samples.filter(f.test).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name or MSR ID..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search samples" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {samples.length === 0 ? <EmptyState icon="🧪" title="No samples assigned" description="SFDA sampling orders will appear here" />
          : rows.length === 0 ? <EmptyState icon="🔍" title="No samples match" description="Try another filter or search" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH company</th><th>Sector</th><th>Sampling state</th><th>Received</th><th>Days at lab</th><th>Cold chain</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map(s => {
                  const a = labAction(s);
                  const recv = receivedDate(s);
                  return (
                    <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openSample(s)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) openSample(s); }}>
                      <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                      <td>{mahCompany(s)}</td>
                      <td><SectorBadge sector={shipmentSector(s)} /></td>
                      <td><SamplingBadge value={s.sampling_state} />{s.lab_rejected_at && <div className="mah-row-sub mah-text-red">Rejected</div>}</td>
                      <td>{recv ? fmtDate(recv) : <span className="mah-muted">—</span>}</td>
                      <td>{s.sampling_state === 'SAMPLE_AT_LAB' ? `${daysSince(s.state_entered_at)}d` : <span className="mah-muted">—</span>}</td>
                      <td>{s.cold_chain ? <ColdChainTag sample={s} /> : <span className="mah-muted">—</span>}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {a ? <button className={`mah-btn mah-btn-sm mah-btn-${a.tone === 'blue' ? 'primary' : a.tone}`} onClick={() => openSample(s)}>{a.button}</button>
                          : <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => openSample(s)}>View</button>}
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
