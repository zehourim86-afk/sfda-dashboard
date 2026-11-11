// MAH portal — Overview: pipeline, action items, in-progress list, live metrics.
import { useEffect, useState } from 'react';
import {
  apiFetch, PIPELINE, ACTION_ORDER, actionFor, actionKey, stateOf, needsAction, isInProgress, StateBadge, SectorBadge,
  shipmentName, shipmentRef, shipmentSector, objectionDeadline, objectionDaysLeft, deadlineUrgency, rejectionDate, daysUntil, fmtDate, timeAgo,
  Ring, Empty, Icon, SECTOR_LABELS,
} from './mahShared';
import { usePerformance } from './MahIntelligence';

const REG_ACTION_DAYS = 30; // expiring registrations become action items at 30 days or less
const truncate = (text, n) => (text && text.length > n ? `${text.slice(0, n - 1)}…` : text);
// Badge for days until a registration expires (GET /products/expiring)
function expiryBadge(days) {
  if (days < 0) return { tone: 'red', text: `Expired ${-days}d ago` };
  return { tone: days <= 7 ? 'red' : days <= 30 ? 'amber' : 'blue', text: `Expires in ${days}d` };
}

const ACTIONS_PER_PAGE = 5;
const ACTION_FILTERS = [
  { key: 'all', label: 'All', states: null },
  { key: 'rejected', label: 'Rejected', states: ['SFDA_REJECTED'] },
  // Everything blocked on the MAH's own work: validation issues, drafts, SFDA info requests
  { key: 'fix', label: 'Fix needed', states: ['PREPARING', 'DRAFT', 'SFDA_INFO_REQUESTED', 'BROKER_DECLINED', 'PENDING_AGREEMENT'] },
  { key: 'ready', label: 'Ready', states: ['READY_TO_SUBMIT'] },
];

// Rejected shipments: the action depends on where the objection dossier is (objection_status, migration 026).
// Once the clearance company files it (OBJECTION_FILED) it is no longer the MAH's action.
const OBJECTION_ITEMS = {
  DRAFTING: { button: 'Continue dossier →', why: 'Objection dossier in progress' },
  RETURNED_TO_MAH: { button: 'Revise dossier →', why: 'Dossier returned by your clearance company — revise and resubmit' },
  SUBMITTED_TO_CLEARANCE: { tone: 'blue', button: 'View dossier →', why: 'Dossier with your clearance company for filing' },
};
const keyOf = actionKey;
const ORDER = ACTION_ORDER;
const isObjectionItem = (s) => keyOf(s) === 'SFDA_REJECTED';
function itemFor(s) {
  const a = actionFor(s);
  return a && isObjectionItem(s) ? { ...a, ...OBJECTION_ITEMS[s.objection_status] } : a;
}
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

// Demo spotlight: the curated DEMO-* shipments from demo_seed_v2.sql, in masaar_id order
const isDemo = (s) => (s.masaar_id || '').startsWith('DEMO-');
// The seed stores the full shipment name (with batch) in notes; real shipments use the product name
const demoName = (s, productsById) => s.shipment_name || s.notes || shipmentName(s, productsById);
function demoScore(score) {
  if (score == null) return { tone: 'none', text: '—' };
  if (score >= 85) return { tone: 'green', text: `✓ ${score}/100` };
  if (score >= 60) return { tone: 'amber', text: `⚠ ${score}/100` };
  return { tone: 'red', text: `✗ ${score}/100` };
}

function DemoSpotlight({ shipments, productsById, openShipment }) {
  const demos = shipments.filter(isDemo).sort((a, b) => a.masaar_id.localeCompare(b.masaar_id));
  if (demos.length === 0) return null;
  return (
    <section className="mah-demo-spotlight" aria-label="Demo shipments">
      <div className="mah-demo-head">
        <h2 className="mah-demo-title">✦ Demo Shipments</h2>
        <span className="mah-demo-pill">PIF Demo</span>
      </div>
      <div className="mah-demo-grid">
        {demos.map(s => {
          const name = demoName(s, productsById);
          const score = demoScore(s.integrity_score);
          const sector = shipmentSector(s);
          return (
            <button key={s.id} className="mah-demo-card" onClick={() => openShipment(s)}>
              <div className="mah-demo-row">
                <span className="mah-demo-ref">{shipmentRef(s)}</span>
                <StateBadge state={s.current_state} />
              </div>
              <div className="mah-demo-name" title={name}>{truncate(name, 35)}</div>
              <div className="mah-demo-row">
                <span className="mah-demo-sector">{SECTOR_LABELS[sector] || sector || '—'}</span>
                <span className={`mah-demo-score is-${score.tone}`}>{score.text}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MahOverview({ token, shipments, productsById, openShipment, navigate, onNewShipment }) {
  const [actionSearch, setActionSearch] = useState('');
  const { data: perf } = usePerformance(token);
  // Registrations expiring within 90 days (or expired), soonest first
  const [expiring, setExpiring] = useState(null);
  const [expiringError, setExpiringError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch(token, '/products/expiring')
      .then(d => { if (!cancelled) { setExpiring(d.products || []); setExpiringError(null); } })
      .catch(e => { if (!cancelled) setExpiringError(e.message); });
    return () => { cancelled = true; };
  }, [token]);
  const expiringSoon = (expiring || []).filter(p => p.days_until_expiry <= REG_ACTION_DAYS);
  const [actionFilter, setActionFilter] = useState('all');
  const [actionPage, setActionPage] = useState(1);

  const counts = PIPELINE.map(col => ({ ...col, count: shipments.filter(s => col.states.includes(stateOf(s))).length }));
  const actions = shipments.filter(needsAction).sort(compareActions);
  const q = actionSearch.trim().toLowerCase();
  const filterStates = ACTION_FILTERS.find(f => f.key === actionFilter).states;
  const filteredActions = actions
    .filter(s => !filterStates || filterStates.includes(keyOf(s)))
    .filter(s => !q || shipmentName(s, productsById).toLowerCase().includes(q) || (s.masaar_id || '').toLowerCase().includes(q));
  const pageCount = Math.max(1, Math.ceil(filteredActions.length / ACTIONS_PER_PAGE));
  const page = Math.min(actionPage, pageCount);
  const pageStart = (page - 1) * ACTIONS_PER_PAGE;
  const visibleActions = filteredActions.slice(pageStart, pageStart + ACTIONS_PER_PAGE);

  const inProgress = shipments.filter(isInProgress)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  // Shipments with an open cancellation request (flag from the shipments list endpoint)
  const cancelRequested = shipments.filter(s => s.cancellation_requested);

  // Closest deadline: objection windows and upcoming ETAs
  const deadlines = [
    ...shipments.filter(s => stateOf(s) === 'SFDA_REJECTED' && !isLegacyRejection(s))
      .map(s => ({ s, date: objectionDeadline(s), what: 'Objection deadline' })),
    ...shipments.filter(isInProgress).filter(s => s.eta).map(s => ({ s, date: s.eta, what: 'ETA' })),
  ]
    .map(d => ({ ...d, days: daysUntil(d.date) }))
    .filter(d => d.days !== null && d.days >= 0)
    .sort((a, b) => a.days - b.days);
  const closest = deadlines[0];


  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Good to see you</h1>
          <p className="mah-muted">{actions.length} shipment{actions.length === 1 ? '' : 's'} need your attention · {inProgress.length} in progress</p>
        </div>
        <button className="mah-btn mah-btn-primary" onClick={onNewShipment}><Icon name="plus" size={16} /> New Shipment</button>
      </div>

      <DemoSpotlight shipments={shipments} productsById={productsById} openShipment={openShipment} />

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
              <span className="mah-count-pill mah-tone-red">{actions.length + expiringSoon.length}</span>
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
            {expiringSoon.map(p => (
              <div key={`reg-${p.id}`} className="mah-action-row mah-edge-amber">
                <div className="mah-action-main">
                  <div className="mah-row-title">Registration expiring — {p.name_en}</div>
                  <div className="mah-row-sub">
                    {p.days_until_expiry < 0 ? `Expired ${-p.days_until_expiry} days ago` : `${p.days_until_expiry} days until expiry`}
                    {p.sfda_reg_number && <> · <span className="mah-mono">{p.sfda_reg_number}</span></>}
                    {p.active_shipments_count > 0 && <> · {p.active_shipments_count} active shipment{p.active_shipments_count === 1 ? '' : 's'}</>}
                  </div>
                </div>
                <button className="mah-btn mah-btn-sm mah-btn-amber" onClick={() => navigate('products')}>Renew →</button>
              </div>
            ))}
            {actions.length === 0
              ? (cancelRequested.length === 0 && expiringSoon.length === 0 && <Empty title="Nothing needs your action">New shipments and SFDA decisions will appear here.</Empty>)
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
              <Ring value={perf?.first_time_right_rate ?? 0} size={96} stroke={9}
                label={perf?.first_time_right_rate == null ? '—' : `${Math.round(perf.first_time_right_rate)}%`} />
              <div>
                <div className="mah-metric-name">First-time-right rate</div>
                <div className="mah-muted mah-small">Shipments released without an SFDA query</div>
              </div>
            </div>
            <div className="mah-metric-line">
              <span>Avg cycle time</span>
              <strong>{perf?.avg_cycle_time_days == null ? '—' : `${perf.avg_cycle_time_days}d`}</strong>
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
              {expiring && (
                <span className={`mah-count-pill mah-tone-${expiring.length ? 'amber' : 'green'}`}>{expiring.length}</span>
              )}
            </div>
            {expiringError ? <div className="mah-alert mah-alert-red">{expiringError}</div>
              : !expiring ? <div className="mah-loading">Checking registrations…</div>
                : expiring.length === 0
                  ? <Empty title="No registrations expiring in the next 90 days ✓" />
                  : expiring.slice(0, 6).map(p => {
                    const badge = expiryBadge(p.days_until_expiry);
                    return (
                      <button key={p.id} className="mah-list-row mah-expiry-row" onClick={() => navigate('products')}>
                        <div className="mah-action-main">
                          <div className="mah-row-title" title={p.name_en}>{truncate(p.name_en, 25)}</div>
                          <div className="mah-row-sub mah-mono">{p.sfda_reg_number || 'No reg. number'}</div>
                          {p.active_shipments_count > 0 && (
                            <div className="mah-small mah-text-amber">
                              {p.active_shipments_count} active shipment{p.active_shipments_count === 1 ? '' : 's'} affected
                            </div>
                          )}
                        </div>
                        <span className={`mah-badge mah-tone-${badge.tone}`}>{badge.text}</span>
                      </button>
                    );
                  })}
          </section>
        </aside>
      </div>
    </div>
  );
}
