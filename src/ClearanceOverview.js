// Clearance Portal — Overview: action queue, pipeline, in-progress list, live metrics.
import { useState } from 'react';
import { stateOf, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector, timeAgo, Empty, Icon } from './mahShared';
import { CLR_PIPELINE, AT_SFDA_STATES, brokerAction, ACTION_ORDER, daysSince } from './clearanceShared';

// Hardcoded until the metrics backend exists
const AVG_FASEH_FILING_DAYS = 2.3;
const AVG_SFDA_CLEARANCE_DAYS = 16;
const ACTION_LIMIT = 5;
const IN_PROGRESS_LIMIT = 8;
const AT_PORT_ALERT_DAYS = 30;

export default function ClearanceOverview({ shipments, productsById, openShipment, navigate }) {
  const [search, setSearch] = useState('');

  const actions = shipments
    .map(s => ({ s, a: brokerAction(s) }))
    .filter(x => x.a)
    .sort((x, y) => ACTION_ORDER[x.a.tone] - ACTION_ORDER[y.a.tone] || new Date(x.s.updated_at) - new Date(y.s.updated_at));
  const q = search.trim().toLowerCase();
  const matching = actions.filter(({ s }) => !q || shipmentName(s, productsById).toLowerCase().includes(q)
    || (s.masaar_id || '').toLowerCase().includes(q));

  const counts = CLR_PIPELINE.map(col => ({ ...col, count: shipments.filter(s => col.states.includes(stateOf(s))).length }));
  const inProgress = shipments.filter(s => AT_SFDA_STATES.includes(stateOf(s)))
    .sort((a, b) => new Date(a.faseh_filed_at || a.state_entered_at) - new Date(b.faseh_filed_at || b.state_entered_at));
  const openInfoRequests = shipments.filter(s => stateOf(s) === 'SFDA_INFO_REQUESTED').length;
  const atPortLong = inProgress.filter(s => daysSince(s.updated_at) > AT_PORT_ALERT_DAYS).length;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Broker overview</h1>
          <p className="mah-muted">{actions.length} shipment{actions.length === 1 ? '' : 's'} need your action · {inProgress.length} with SFDA</p>
        </div>
      </div>

      <section className="mah-pipeline" aria-label="Shipment pipeline">
        {counts.map(col => (
          <button key={col.key} className={`mah-pipe-col clr-pipe-${col.key}`} onClick={() => navigate('shipments')}>
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
              <span className="mah-count-pill mah-tone-red">{actions.length}</span>
            </div>
            {actions.length > 0 && (
              <input className="mah-action-search" placeholder="Search by shipment name or MSR ID..." value={search}
                onChange={e => setSearch(e.target.value)} aria-label="Search action queue" />
            )}
            {actions.length === 0
              ? <Empty title="Nothing needs your action">New hand-overs and SFDA requests will appear here.</Empty>
              : matching.length === 0
                ? <Empty title="No action items match">Try a different search.</Empty>
                : matching.slice(0, ACTION_LIMIT).map(({ s, a }) => (
                  <div key={s.id} className={`mah-action-row ${a.tone === 'purple' ? 'clr-edge-purple' : `mah-edge-${a.tone}`}`}>
                    <div className="mah-action-main">
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub">
                        <span className="mah-mono">{shipmentRef(s)}</span> · {a.why}
                        {s.importer_name && <> · {s.importer_name}</>}
                      </div>
                    </div>
                    <StateBadge state={s.current_state} />
                    <button className={`mah-btn mah-btn-sm ${a.tone === 'purple' ? 'clr-btn-purple' : `mah-btn-${a.tone}`}`}
                      onClick={() => openShipment(s, a.tab)}>{a.button}</button>
                  </div>
                ))}
            {matching.length > ACTION_LIMIT && (
              <button className="mah-link-btn" onClick={() => navigate('shipments')}>View all {matching.length} →</button>
            )}
          </section>

          <section className="mah-card">
            <div className="mah-card-head">
              <h2>In progress with SFDA</h2>
              <span className="mah-count-pill mah-tone-blue">{inProgress.length}</span>
            </div>
            {inProgress.length === 0
              ? <Empty title="No shipments with SFDA right now" />
              : inProgress.slice(0, IN_PROGRESS_LIMIT).map(s => {
                const days = daysSince(s.faseh_filed_at || s.state_entered_at);
                return (
                  <button key={s.id} className="mah-list-row" onClick={() => openShipment(s, 'sfda')}>
                    <div className="mah-action-main">
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub">
                        <span className="mah-mono">{shipmentRef(s)}</span> · {days === null ? 'submission date unknown' : `${days} day${days === 1 ? '' : 's'} since submitted`}
                      </div>
                    </div>
                    <SectorBadge sector={shipmentSector(s)} />
                    <StateBadge state={s.current_state} />
                  </button>
                );
              })}
            {inProgress.length > IN_PROGRESS_LIMIT && (
              <button className="mah-link-btn" onClick={() => navigate('sfda')}>View all {inProgress.length} →</button>
            )}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Live metrics</h2><Icon name="clock" /></div>
            <div className="mah-metric-line"><span>Avg Faseh filing time</span><strong>{AVG_FASEH_FILING_DAYS} days</strong></div>
            <div className="mah-metric-line"><span>Avg SFDA clearance time</span><strong>{AVG_SFDA_CLEARANCE_DAYS} days</strong></div>
            <button className="mah-metric-line clr-metric-btn" onClick={() => navigate('sfda')}>
              <span>Open info requests</span>
              <strong className={openInfoRequests ? 'mah-text-red' : ''}>{openInfoRequests}</strong>
            </button>
            <div className="mah-metric-line">
              <span>At port &gt;{AT_PORT_ALERT_DAYS} days</span>
              <strong className={atPortLong ? 'mah-text-amber' : ''}>{atPortLong}</strong>
            </div>
            <p className="mah-small mah-muted">Filing and clearance averages are demo figures.</p>
          </section>

          <section className="mah-card">
            <div className="mah-card-head"><h2>Recently updated</h2></div>
            {shipments.length === 0 ? <Empty title="No shipments assigned yet" /> : [...shipments]
              .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5).map(s => (
                <button key={s.id} className="mah-list-row" onClick={() => openShipment(s)}>
                  <div className="mah-action-main">
                    <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                    <div className="mah-row-sub">{timeAgo(s.updated_at)}</div>
                  </div>
                  <StateBadge state={s.current_state} />
                </button>
              ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
