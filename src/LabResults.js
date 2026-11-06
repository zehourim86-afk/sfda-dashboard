// Lab Portal — Results: all samples with submitted results.
import { useState } from 'react';
import { SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate, Empty } from './mahShared';
import { ChipRow, SummaryCards, isThisMonth } from './clearanceShared';
import { mahCompany, matchesSearch } from './sfdaShared';
import { hasResults, ResultBadge } from './labShared';

// Hardcoded until the metrics backend exists
const AVG_TURNAROUND_DAYS = 5;
const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'Pass', label: 'Pass', test: s => s.sampling_overall_result === 'Pass' },
  { key: 'Fail', label: 'Fail', test: s => s.sampling_overall_result === 'Fail' },
  { key: 'Conditional Pass', label: 'Conditional Pass', test: s => s.sampling_overall_result === 'Conditional Pass' },
];

export default function LabResults({ samples, productsById, user, openSample }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const withResults = samples.filter(hasResults);
  const test = FILTERS.find(f => f.key === filter).test;
  const rows = withResults.filter(s => test(s) && matchesSearch(s, q, productsById))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const monthResults = withResults.filter(s => isThisMonth(s.updated_at));
  const rate = (states) => {
    if (monthResults.length === 0) return '—';
    return `${Math.round((monthResults.filter(s => states.includes(s.sampling_overall_result)).length / monthResults.length) * 100)}%`;
  };

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Results</h1>
          <p className="mah-muted">{withResults.length} sample{withResults.length === 1 ? '' : 's'} with submitted results</p>
        </div>
      </div>

      <SummaryCards cards={[
        { label: 'Pass rate this month', value: rate(['Pass', 'Conditional Pass']), tone: 'green' },
        { label: 'Fail rate this month', value: rate(['Fail']), tone: 'red' },
        { label: 'Avg turnaround', value: `${AVG_TURNAROUND_DAYS} days`, tone: 'blue', note: 'Demo figure' },
      ]} />

      <div className="mah-filter-rows">
        <ChipRow label="Filter by result" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: withResults.filter(f.test).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name or MSR ID..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search results" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No results match" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>Sector</th><th>Overall result</th><th>Submitted</th><th>Analyst</th><th>Documents</th></tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openSample(s)}
                    onKeyDown={e => { if (e.key === 'Enter') openSample(s); }}>
                    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td><ResultBadge value={s.sampling_overall_result} /></td>
                    <td>{fmtDate(s.updated_at)}</td>
                    <td>{user?.full_name || user?.organisation_name || '—'}</td>
                    <td>{s.sampling_results_summary ? <span className="mah-badge mah-tone-green">Uploaded</span> : <span className="mah-muted">—</span>}</td>
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
