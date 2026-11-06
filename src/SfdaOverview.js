// SFDA Observer — Overview: status strip, waiting submissions, sampling, recent decisions, live metrics.
import { stateOf, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate, Empty, Icon } from './mahShared';
import { daysSince, isThisMonth } from './clearanceShared';
import {
  mahCompany, submittedAt, decisionAt, decisionKind, daysBetween, fmtDays, SamplingBadge,
  WAITING_STATES, DECIDED_STATES, RELEASED_DECISIONS,
} from './sfdaShared';

// Hardcoded until the metrics backend exists
const AVG_DECISION_DAYS = 14;
const AVG_SAMPLING_DAYS = 8;
const LIST_LIMIT = 10;

const STRIP = [
  { key: 'submitted', label: 'Submitted', states: ['SUBMITTED'] },
  { key: 'info', label: 'Info Requested', states: ['SFDA_INFO_REQUESTED'] },
  { key: 'sampling', label: 'Sampling', states: ['SAMPLING'] },
  { key: 'released', label: 'Released', states: RELEASED_DECISIONS },
  { key: 'rejected', label: 'Rejected', states: ['SFDA_REJECTED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'] },
];
const STRIP_PAGE = { submitted: 'submissions', info: 'submissions', sampling: 'sampling', released: 'decisions', rejected: 'decisions' };

const byDate = (fn, dir = 1) => (a, b) => dir * (new Date(fn(a) || 0) - new Date(fn(b) || 0));

export default function SfdaOverview({ shipments, productsById, orgsById, openShipment, navigate }) {
  const inStates = (states) => shipments.filter(s => states.includes(stateOf(s)));

  const waiting = inStates(WAITING_STATES).sort(byDate(submittedAt)).slice(0, LIST_LIMIT);
  const sampling = inStates(['SAMPLING']).sort(byDate(s => s.state_entered_at));
  const decided = inStates(DECIDED_STATES);
  const recentDecisions = [...decided].sort(byDate(decisionAt, -1)).slice(0, LIST_LIMIT);

  const releasedCount = decided.filter(s => RELEASED_DECISIONS.includes(stateOf(s))).length;
  const releaseRate = decided.length ? Math.round((releasedCount / decided.length) * 100) : null;
  const submittedThisMonth = shipments.filter(s => isThisMonth(s.faseh_filed_at)).length;

  const rowProps = (s, focus) => ({
    className: 'mah-row-click', tabIndex: 0, onClick: () => openShipment(s, focus),
    onKeyDown: e => { if (e.key === 'Enter') openShipment(s, focus); },
  });
  const nameCell = (s) => (
    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
  );

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>SFDA overview</h1>
          <p className="mah-muted">{inStates(WAITING_STATES).length} awaiting review · {sampling.length} in sampling · read-only view</p>
        </div>
      </div>

      <section className="mah-pipeline sfda-strip" aria-label="SFDA status">
        {STRIP.map(col => (
          <button key={col.key} className={`mah-pipe-col clr-pipe-${col.key}`} onClick={() => navigate(STRIP_PAGE[col.key])}>
            <span className="mah-pipe-count">{inStates(col.states).length}</span>
            <span className="mah-pipe-label">{col.label}</span>
          </button>
        ))}
      </section>

      <div className="mah-overview-grid">
        <div className="mah-stack">
          <section className="mah-card mah-card-flush">
            <div className="mah-card-head sfda-card-pad">
              <h2>Waiting for SFDA</h2>
              <button className="mah-link-btn" onClick={() => navigate('submissions')}>All submissions →</button>
            </div>
            {waiting.length === 0 ? <Empty title="Nothing waiting for review" /> : (
              <div className="mah-table-wrap">
                <table className="mah-table">
                  <thead><tr><th>Shipment</th><th>MAH company</th><th>Sector</th><th>Submitted</th><th>Days waiting</th></tr></thead>
                  <tbody>
                    {waiting.map(s => {
                      const days = daysSince(submittedAt(s));
                      return (
                        <tr key={s.id} {...rowProps(s)}>
                          {nameCell(s)}
                          <td>{mahCompany(s, orgsById)}</td>
                          <td><SectorBadge sector={shipmentSector(s)} /></td>
                          <td>{fmtDate(submittedAt(s))}</td>
                          <td className={days > AVG_DECISION_DAYS ? 'mah-text-amber' : ''}>{fmtDays(days)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mah-card mah-card-flush">
            <div className="mah-card-head sfda-card-pad">
              <h2>Sampling in progress</h2>
              <span className="mah-count-pill mah-tone-purple">{sampling.length}</span>
            </div>
            {sampling.length === 0 ? <Empty title="No shipments in sampling" /> : (
              <div className="mah-table-wrap">
                <table className="mah-table">
                  <thead><tr><th>Shipment</th><th>MAH company</th><th>Sampling</th><th>Days in sampling</th><th>Lab</th></tr></thead>
                  <tbody>
                    {sampling.slice(0, LIST_LIMIT).map(s => (
                      <tr key={s.id} {...rowProps(s, 'sampling')}>
                        {nameCell(s)}
                        <td>{mahCompany(s, orgsById)}</td>
                        <td><SamplingBadge value={s.sampling_state} /></td>
                        <td>{fmtDays(daysSince(s.state_entered_at))}</td>
                        <td>{s.sampling_lab_name || s.lab_name || <span className="mah-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mah-card mah-card-flush">
            <div className="mah-card-head sfda-card-pad">
              <h2>Recent decisions</h2>
              <button className="mah-link-btn" onClick={() => navigate('decisions')}>All decisions →</button>
            </div>
            {recentDecisions.length === 0 ? <Empty title="No decisions recorded yet" /> : (
              <div className="mah-table-wrap">
                <table className="mah-table">
                  <thead><tr><th>Shipment</th><th>Decision</th><th>Decision date</th><th>Submission → decision</th></tr></thead>
                  <tbody>
                    {recentDecisions.map(s => {
                      const k = decisionKind(s);
                      return (
                        <tr key={s.id} {...rowProps(s)}>
                          {nameCell(s)}
                          <td><span className={`mah-badge mah-tone-${k.tone}`}>{k.label}</span></td>
                          <td>{fmtDate(decisionAt(s))}</td>
                          <td>{fmtDays(daysBetween(s.faseh_filed_at, s.sfda_decided_at))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Live metrics</h2><Icon name="clock" /></div>
            <div className="mah-metric-line"><span>Avg decision time</span><strong>{AVG_DECISION_DAYS} days</strong></div>
            <div className="mah-metric-line"><span>Submissions this month</span><strong>{submittedThisMonth}</strong></div>
            <div className="mah-metric-line">
              <span>Release rate</span>
              <strong>{releaseRate == null ? '—' : `${releaseRate}%`}</strong>
            </div>
            <div className="mah-metric-line"><span>Avg sampling duration</span><strong>{AVG_SAMPLING_DAYS} days</strong></div>
            <p className="mah-small mah-muted">
              Release rate = released ÷ all decided ({decided.length}). Decision and sampling averages are demo figures.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
