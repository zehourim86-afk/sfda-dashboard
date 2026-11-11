// Lab Portal — Overview: summary strip, action queue, in-analysis list, live metrics.
import { useState } from 'react';
import { SectorBadge, shipmentName, shipmentRef, shipmentSector, Empty, Icon } from './mahShared';
import { daysSince, isThisMonth } from './clearanceShared';
import { mahCompany, SamplingBadge } from './sfdaShared';
import { labStage, labAction, isRejected, hasResults, ColdChainTag } from './labShared';
import { EmptyState } from './PortalComponents';

// Hardcoded until the metrics backend exists
const AVG_ANALYSIS_DAYS = 5;
const ACTION_LIMIT = 5;

export default function LabOverview({ samples, productsById, openSample, navigate }) {
  const [search, setSearch] = useState('');

  const strip = [
    { key: 'pending', label: 'Pending', tone: 'blue' },
    { key: 'analysis', label: 'In Analysis', tone: 'purple' },
    { key: 'results', label: 'Results Submitted', tone: 'green' },
    { key: 'rejected', label: 'Rejected', tone: 'red' },
  ].map(c => ({ ...c, count: samples.filter(s => labStage(s) === c.key).length }));

  const q = search.trim().toLowerCase();
  const actions = samples.map(s => ({ s, a: labAction(s) })).filter(x => x.a)
    .filter(({ s }) => !q || shipmentName(s, productsById).toLowerCase().includes(q) || (s.masaar_id || '').toLowerCase().includes(q));

  const inAnalysis = samples.filter(s => s.sampling_state === 'SAMPLE_AT_LAB')
    .sort((a, b) => new Date(a.state_entered_at) - new Date(b.state_entered_at));

  const receivedThisMonth = samples.filter(s => isThisMonth(s.sampling_scheduled_date) || isThisMonth(s.updated_at)).length;
  const resultsThisMonth = samples.filter(s => hasResults(s) && isThisMonth(s.updated_at)).length;
  const rejectedCount = samples.filter(isRejected).length;
  const rejectionRate = samples.length ? Math.round((rejectedCount / samples.length) * 100) : 0;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Lab overview</h1>
          <p className="mah-muted">{actions.length} sample{actions.length === 1 ? '' : 's'} need your action · {inAnalysis.length} in analysis</p>
        </div>
      </div>

      <section className="mah-pipeline lab-strip" aria-label="Sample status">
        {strip.map(col => (
          <button key={col.key} className={`mah-pipe-col lab-pipe-${col.key}`} onClick={() => navigate('samples')}>
            <span className="mah-pipe-count">{col.count}</span>
            <span className="mah-pipe-label">{col.label}</span>
          </button>
        ))}
      </section>

      <div className="mah-overview-grid">
        <div className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Action queue</h2>
              <span className={`mah-count-pill mah-tone-${actions.length ? 'blue' : 'green'}`}>{actions.length}</span>
            </div>
            {samples.some(labAction) && (
              <input className="mah-action-search" placeholder="Search by shipment name or MSR ID..." value={search}
                onChange={e => setSearch(e.target.value)} aria-label="Search action queue" />
            )}
            {samples.length === 0
              ? <EmptyState icon="🧪" title="No samples assigned" description="SFDA sampling orders will appear here" />
              : actions.length === 0
              ? <Empty title="Nothing needs your action">Samples arriving at the lab and results pending upload appear here.</Empty>
              : actions.slice(0, ACTION_LIMIT).map(({ s, a }) => (
                <div key={s.id} className={`mah-action-row mah-edge-${a.tone}`}>
                  <div className="mah-action-main">
                    <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                    <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · {a.why}</div>
                  </div>
                  <ColdChainTag sample={s} />
                  <button className={`mah-btn mah-btn-sm mah-btn-${a.tone === 'blue' ? 'primary' : a.tone}`} onClick={() => openSample(s)}>{a.button}</button>
                </div>
              ))}
            {actions.length > ACTION_LIMIT && <button className="mah-link-btn" onClick={() => navigate('samples')}>View all {actions.length} →</button>}
          </section>

          <section className="mah-card">
            <div className="mah-card-head"><h2>In analysis</h2><span className="mah-count-pill mah-tone-purple">{inAnalysis.length}</span></div>
            {inAnalysis.length === 0 ? <Empty title="No samples in analysis right now" /> : inAnalysis.map(s => (
              <button key={s.id} className="mah-list-row" onClick={() => openSample(s)}>
                <div className="mah-action-main">
                  <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                  <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · {daysSince(s.state_entered_at)}d at lab</div>
                </div>
                <ColdChainTag sample={s} />
                <SectorBadge sector={shipmentSector(s)} />
              </button>
            ))}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Live metrics</h2><Icon name="clock" /></div>
            <div className="mah-metric-line"><span>Avg analysis time</span><strong>{AVG_ANALYSIS_DAYS} days</strong></div>
            <div className="mah-metric-line"><span>Received this month</span><strong>{receivedThisMonth}</strong></div>
            <div className="mah-metric-line"><span>Results submitted this month</span><strong>{resultsThisMonth}</strong></div>
            <div className="mah-metric-line"><span>Rejection rate</span><strong className={rejectionRate > 20 ? 'mah-text-red' : ''}>{rejectionRate}%</strong></div>
            <p className="mah-small mah-muted">Average analysis time is a demo figure. Rejection rate = rejected ÷ all assigned samples.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
