// MAH portal — Overview: pipeline, action items, in-progress list, live metrics.
import { useState } from 'react';
import {
  PIPELINE, ACTION_ORDER, actionFor, actionKey, stateOf, needsAction, isInProgress, StateBadge, SectorBadge,
  shipmentName, shipmentRef, shipmentSector, objectionDeadline, objectionDaysLeft, deadlineUrgency, rejectionDate, daysUntil, fmtDate, timeAgo,
  expiryStatus, Ring, Empty, Icon,
} from './mahShared';

// Hardcoded until the metrics backend exists
const FIRST_TIME_RIGHT_PCT = 78;
const AVG_CYCLE_DAYS = 18;

const ACTIONS_PER_PAGE = 5;
const ACTION_FILTERS = [
  { key: 'all', label: 'All', states: null },
  { key: 'rejected', label: 'Rejected', states: ['SFDA_REJECTED', 'OBJECTION_FILED'] },
  // Everything blocked on the MAH's own work: validation issues, drafts, SFDA info requests
  { key: 'fix', label: 'Fix needed', states: ['PREPARING', 'DRAFT', 'SFDA_INFO_REQUESTED', 'BROKER_DECLINED', 'PENDING_AGREEMENT'] },
  { key: 'ready', label: 'Ready', states: ['READY_TO_SUBMIT'] },
];

// An objection filed but the dossier not submitted yet: still on the 60-day clock, so it is an action item too
const objectionOpen = (s) => stateOf(s) === 'OBJECTION_FILED' && !s.objection_submitted_at;
const OBJECTION_ACTION = { key: 'OBJECTION_FILED', tone: 'red', button: 'Finish dossier →', tab: 'objection', why: 'Objection filed — dossier not submitted yet' };
const keyOf = (s) => actionKey(s) || (objectionOpen(s) ? 'OBJECTION_FILED' : null);
const itemFor = (s) => actionFor(s) || (objectionOpen(s) ? OBJECTION_ACTION : null);
const ORDER = ['SFDA_REJECTED', 'OBJECTION_FILED', ...ACTION_ORDER.filter(k => k !== 'SFDA_REJECTED')];
const isObjectionItem = (s) => ['SFDA_REJECTED', 'OBJECTION_FILED'].includes(keyOf(s));
// Rejected before migration 006 (2026-11-05): old timestamps, so no countdown — reviewed manually
const LEGACY_CUTOFF = new Date('2026-11-05T00:00:00Z');
const isLegacyRejection = (s) => {
  const d = rejectionDate(s);
  return !!d && d < LEGACY_CUTOFF;
};
const LEGACY_BADGE = { tone: 'grey', text: 'Legacy shipment — review required' };
// Days left on the objection window for rejected / objecting shipments (not legacy ones), else null
const deadlineDays = (s) => (isObjectionItem(s) && !isLegacyRejection(s) ? objectionDaysLeft(s) : null);
// Critical deadlines (3 days or less) first, then by action type, then the closest deadline
function compareActions(a, b) {
  const da = deadlineDays(a);
  const db = deadlineDays(b);
  const ca = da != null && da <= 3;
  const cb = db != null && db <= 3;
  if (ca !== cb) return ca ? -1 : 1;
  return ORDER.indexOf(keyOf(a)) - ORDER.indexOf(keyOf(b)) || (da ?? Infinity) - (db ?? Infinity);
}

export default function MahOverview({ shipments, products, productsById, openShipment, navigate, onNewShipment }) {
  const [actionSearch, setActionSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [actionPage, setActionPage] = useState(1);

  const counts = PIPELINE.map(col => ({ ...col, count: shipments.filter(s => col.states.includes(stateOf(s))).length }));
  const actions = shipments.filter(s => needsAction(s) || objectionOpen(s)).sort(compareActions);
  const q = actionSearch.trim().toLowerCase();
  const filterStates = ACTION_FILTERS.find(f => f.key === actionFilter).states;
  const filteredActions = actions
    .filter(s => !filterStates || filterStates.includes(keyOf(s)))
    .filter(s => !q || shipmentName(s, productsById).toLowerCase().includes(q) || (s.masaar_id || '').toLowerCase().includes(q));
  const pageCount = Math.max(1, Math.ceil(filteredActions.length / ACTIONS_PER_PAGE));
  const page = Math.min(actionPage, pageCount);
  const pageStart = (page - 1) * ACTIONS_PER_PAGE;
  const visibleActions = filteredActions.slice(pageStart, pageStart + ACTIONS_PER_PAGE);

  const inProgress = shipments.filter(s => isInProgress(s) && !objectionOpen(s))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  // Shipments with an open cancellation request (flag from the shipments list endpoint)
  const cancelRequested = shipments.filter(s => s.cancellation_requested);

  // Closest deadline: objection windows and upcoming ETAs
  const deadlines = [
    ...shipments.filter(s => ['SFDA_REJECTED', 'OBJECTION_FILED'].includes(stateOf(s)) && !s.objection_submitted_at && !isLegacyRejection(s))
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
            {actions.length > 0 && (
              <div className="mah-action-tools">
                <input className="mah-action-search" placeholder="Search by shipment name or ID..." value={actionSearch}
                  onChange={e => { setActionSearch(e.target.value); setActionPage(1); }} aria-label="Search action items" />
                <div className="mah-action-chips">
                  {ACTION_FILTERS.map(f => (
                    <button key={f.key} className={`mah-action-chip${actionFilter === f.key ? ' is-active' : ''}`}
                      onClick={() => { setActionFilter(f.key); setActionPage(1); }} aria-pressed={actionFilter === f.key}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {cancelRequested.map(s => (
              <div key={`cancel-${s.id}`} className="mah-action-row mah-edge-grey">
                <div className="mah-action-main">
                  <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                  <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · Cancellation requested — awaiting DEMARA review</div>
                </div>
                <StateBadge state={s.current_state} />
              </div>
            ))}
            {actions.length === 0
              ? (cancelRequested.length === 0 && <Empty title="Nothing needs your action">New shipments and SFDA decisions will appear here.</Empty>)
              : filteredActions.length === 0
                ? <Empty title="No action items match">Try a different search or filter.</Empty>
                : visibleActions.map(s => {
                const a = itemFor(s);
                const urgency = isObjectionItem(s) && isLegacyRejection(s) ? LEGACY_BADGE : deadlineUrgency(deadlineDays(s));
                return (
                  <div key={s.id} className={`mah-action-row mah-edge-${urgency?.tone || a.tone}${urgency ? ' mah-action-deadline' : ''}`}>
                    <div className="mah-action-main">
                      <div className="mah-row-title">{a.title || shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub">
                        {a.title ? shipmentName(s, productsById) : <span className="mah-mono">{shipmentRef(s)}</span>} · {a.why}
                      </div>
                      {urgency && (
                        <span className={`mah-badge mah-tone-${urgency.tone} mah-deadline-badge${urgency.critical ? ' is-critical' : ''}`}>
                          {urgency.text}
                        </span>
                      )}
                    </div>
                    <StateBadge state={s.current_state} />
                    <button className={`mah-btn mah-btn-sm mah-btn-${a.tone}`} onClick={() => openShipment(s, a.tab)}>{a.button}</button>
                  </div>
                );
              })}
            {filteredActions.length > 0 && (
              <div className="mah-pager">
                <span>Showing {pageStart + 1}–{pageStart + visibleActions.length} of {filteredActions.length}</span>
                <span className="mah-pager-links">
                  <button className="mah-link-btn" disabled={page <= 1} onClick={() => setActionPage(page - 1)}>← Previous</button>
                  <button className="mah-link-btn" disabled={page >= pageCount} onClick={() => setActionPage(page + 1)}>Next →</button>
                </span>
              </div>
            )}
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
