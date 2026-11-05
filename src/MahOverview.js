// MAH portal — Overview: pipeline, action items, in-progress list, live metrics.
import {
  PIPELINE, ACTION_STATES, stateOf, needsAction, isInProgress, StateBadge, SectorBadge,
  shipmentName, shipmentRef, shipmentSector, objectionDeadline, daysUntil, fmtDate, timeAgo,
  expiryStatus, Ring, Empty, Icon,
} from './mahShared';

// Hardcoded until the metrics backend exists
const FIRST_TIME_RIGHT_PCT = 78;
const AVG_CYCLE_DAYS = 18;

export default function MahOverview({ shipments, products, productsById, openShipment, navigate, onNewShipment }) {
  const counts = PIPELINE.map(col => ({ ...col, count: shipments.filter(s => col.states.includes(stateOf(s))).length }));
  const actions = shipments.filter(needsAction)
    .sort((a, b) => Object.keys(ACTION_STATES).indexOf(stateOf(a)) - Object.keys(ACTION_STATES).indexOf(stateOf(b)));
  const inProgress = shipments.filter(isInProgress)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  // Closest deadline: objection windows and upcoming ETAs
  const deadlines = [
    ...shipments.filter(s => ['SFDA_REJECTED', 'OBJECTION_FILED'].includes(stateOf(s)) && !s.objection_submitted_at)
      .map(s => ({ s, date: objectionDeadline(s), what: 'Objection deadline' })),
    ...shipments.filter(isInProgress).filter(s => s.eta).map(s => ({ s, date: s.eta, what: 'ETA' })),
  ]
    .map(d => ({ ...d, days: daysUntil(d.date) }))
    .filter(d => d.days !== null && d.days >= 0)
    .sort((a, b) => a.days - b.days);
  const closest = deadlines[0];

  const expiring = products
    .filter(p => p.is_active !== false && ['expiring', 'expired'].includes(expiryStatus(p).key))
    .sort((a, b) => String(a.sfda_reg_expiry).localeCompare(String(b.sfda_reg_expiry)));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Good to see you</h1>
          <p className="mah-muted">{actions.length} shipment{actions.length === 1 ? '' : 's'} need your attention · {inProgress.length} in progress</p>
        </div>
        <button className="mah-btn mah-btn-primary" onClick={onNewShipment}><Icon name="plus" size={16} /> New Shipment</button>
      </div>

      <section className="mah-pipeline" aria-label="Shipment pipeline">
        {counts.map(col => (
          <button key={col.key} className={`mah-pipe-col mah-pipe-${col.key}`} onClick={() => navigate('shipments')}>
            <span className="mah-pipe-count">{col.count}</span>
            <span className="mah-pipe-label">{col.label}</span>
          </button>
        ))}
      </section>

      <div className="mah-overview-grid">
        <div className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Action items</h2>
              <span className="mah-count-pill mah-tone-red">{actions.length}</span>
            </div>
            {actions.length === 0
              ? <Empty title="Nothing needs your action">New shipments and SFDA decisions will appear here.</Empty>
              : actions.map(s => {
                const a = ACTION_STATES[stateOf(s)];
                const deadline = stateOf(s) === 'SFDA_REJECTED' ? objectionDeadline(s) : null;
                return (
                  <div key={s.id} className={`mah-action-row mah-edge-${a.tone}`}>
                    <div className="mah-action-main">
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub">
                        <span className="mah-mono">{shipmentRef(s)}</span> · {a.why}
                        {deadline && <> · <strong className="mah-text-red">{daysUntil(deadline)} days left</strong></>}
                      </div>
                    </div>
                    <StateBadge state={s.current_state} />
                    <button className={`mah-btn mah-btn-sm mah-btn-${a.tone}`} onClick={() => openShipment(s, a.tab)}>{a.button}</button>
                  </div>
                );
              })}
          </section>

          <section className="mah-card">
            <div className="mah-card-head">
              <h2>In progress</h2>
              <span className="mah-count-pill mah-tone-blue">{inProgress.length}</span>
            </div>
            {inProgress.length === 0
              ? <Empty title="No shipments in progress" />
              : inProgress.slice(0, 8).map(s => (
                <button key={s.id} className="mah-list-row" onClick={() => openShipment(s)}>
                  <div className="mah-action-main">
                    <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                    <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · updated {timeAgo(s.updated_at)}</div>
                  </div>
                  <SectorBadge sector={shipmentSector(s)} />
                  <StateBadge state={s.current_state} />
                </button>
              ))}
            {inProgress.length > 8 && (
              <button className="mah-link-btn" onClick={() => navigate('shipments')}>View all {inProgress.length} →</button>
            )}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Live metrics</h2></div>
            <div className="mah-metric-gauge">
              <Ring value={FIRST_TIME_RIGHT_PCT} size={96} stroke={9} label={`${FIRST_TIME_RIGHT_PCT}%`} />
              <div>
                <div className="mah-metric-name">First-time-right rate</div>
                <div className="mah-muted mah-small">Shipments released without an SFDA query</div>
              </div>
            </div>
            <div className="mah-metric-line">
              <span>Avg cycle time</span>
              <strong>{AVG_CYCLE_DAYS}d</strong>
            </div>
          </section>

          <section className="mah-card">
            <div className="mah-card-head"><h2>Closest deadline</h2><Icon name="clock" /></div>
            {closest ? (
              <button className="mah-deadline" onClick={() => openShipment(closest.s, closest.what === 'ETA' ? 'intelligence' : 'objection')}>
                <span className={`mah-deadline-days${closest.days <= 7 ? ' mah-text-red' : ''}`}>{closest.days}d</span>
                <span>
                  <strong>{closest.what}</strong>
                  <span className="mah-row-sub">{shipmentName(closest.s, productsById)} · {fmtDate(closest.date)}</span>
                </span>
              </button>
            ) : <Empty title="No upcoming deadlines" />}
          </section>

          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Registrations expiring</h2>
              <span className={`mah-count-pill mah-tone-${expiring.length ? 'amber' : 'green'}`}>{expiring.length}</span>
            </div>
            {expiring.length === 0
              ? <Empty title="No registrations expire in the next 90 days" />
              : expiring.slice(0, 5).map(p => {
                const st = expiryStatus(p);
                return (
                  <button key={p.id} className="mah-list-row" onClick={() => navigate('products')}>
                    <div className="mah-action-main">
                      <div className="mah-row-title">{p.name_en}</div>
                      <div className="mah-row-sub">{p.sfda_reg_number || 'No reg. number'}</div>
                    </div>
                    <span className={`mah-badge mah-tone-${st.tone}`}>{st.label}</span>
                  </button>
                );
              })}
          </section>
        </aside>
      </div>
    </div>
  );
}
