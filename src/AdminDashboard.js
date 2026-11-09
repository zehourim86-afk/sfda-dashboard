// Admin Panel — Dashboard: 18-state pipeline, alerts, integrity alerts, organisation health, platform metrics.
import { useEffect, useState } from 'react';
import { apiFetch, stateOf, STATE_TONES, shipmentName, shipmentRef, timeAgo, Empty, Icon } from './mahShared';
import { getStateLabel } from './constants';
import { daysSince } from './clearanceShared';
import { mahCompany } from './sfdaShared';
import { SHIPMENT_STATES, orgShipments, rejectionRate, lastActivity, isClosedState, orgTypeLabel } from './adminShared';

const ALERT_LABELS = {
  objections: 'Objection limit', disposition: 'Disposition overdue', cancellation: 'Cancellation request', withdrawn: 'Data quality',
};
const ORG_CARD_LIMIT = 12;
const isToday = (v) => v && new Date(v).toDateString() === new Date().toDateString();

const CHECK_LABELS = {
  MANDATORY_DOCS_COMPLETE: 'Mandatory documents missing',
  PRODUCT_SECTOR_CONSISTENCY: 'Sector mismatch',
  REGISTRATION_EXPIRY_CHECK: 'Registration expired on arrival',
  SUPPLIER_REJECTION_PATTERN: 'Supplier rejection rate',
  CONCENTRATION_OUTLIER_CHECK: 'Concentration above threshold',
};
const checkLabel = (type) => CHECK_LABELS[type] || type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

// Failed HIGH / CRITICAL integrity checks — DEMARA's fraud-detection view (GET /admin/integrity-alerts)
function IntegrityAlerts({ token, shipmentsById, productsById, openShipment }) {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch(token, '/admin/integrity-alerts')
      .then(d => { if (!cancelled) setAlerts(d.alerts || []); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <section className="mah-card">
      <div className="mah-card-head">
        <h2>Integrity Alerts</h2>
        {alerts && <span className={`mah-count-pill mah-tone-${alerts.length ? 'red' : 'green'}`}>{alerts.length}</span>}
      </div>
      {error ? <div className="mah-alert mah-alert-red">Could not load integrity alerts: {error}</div>
        : !alerts ? <div className="mah-loading">Loading integrity alerts…</div>
          : alerts.length === 0 ? (
            <Empty title="No integrity alerts">Failed high and critical integrity checks — misclassification, expired registrations, high-risk suppliers — appear here.</Empty>
          ) : (
            <div className="mah-table-wrap">
              <table className="mah-table">
                <thead><tr><th>Shipment</th><th>MAH</th><th>Check failed</th><th>Severity</th><th>Days in state</th></tr></thead>
                <tbody>
                  {alerts.map(a => {
                    const shipment = shipmentsById?.[a.shipment_id];
                    return (
                      <tr key={a.id} className={shipment ? 'mah-row-click' : undefined} tabIndex={shipment ? 0 : undefined}
                        onClick={() => shipment && openShipment(shipment)}
                        onKeyDown={e => { if (e.key === 'Enter' && shipment) openShipment(shipment); }}>
                        <td>
                          <div className="mah-row-title">{shipment ? shipmentName(shipment, productsById) : a.product_name || a.masaar_id}</div>
                          <div className="mah-row-sub mah-mono">{a.masaar_id || String(a.shipment_id).slice(0, 8)} · {getStateLabel(a.current_state)}</div>
                        </td>
                        <td>{a.mah_name || '—'}</td>
                        <td>
                          <div className="mah-row-title">{checkLabel(a.check_type)}</div>
                          {a.details && <div className="mah-row-sub" title={a.details}>{a.details.length > 110 ? `${a.details.slice(0, 110)}…` : a.details}</div>}
                        </td>
                        <td><span className={`int-sev int-sev-${a.severity}`}>{a.severity}</span></td>
                        <td className="mah-nowrap">{a.days_in_state ?? '—'}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
    </section>
  );
}

export default function AdminDashboard({ token, shipments, organisations, users, orgsById, productsById, shipmentsById, alerts, cancelAuditAvailable, openShipment, navigate }) {
  const counts = Object.fromEntries(SHIPMENT_STATES.map(st => [st, 0]));
  for (const s of shipments) if (counts[stateOf(s)] != null) counts[stateOf(s)] += 1;
  const active = shipments.filter(s => !isClosedState(s)).length;

  const orgCards = organisations
    .map(o => {
      const list = orgShipments(o, shipments);
      return { org: o, list, active: list.filter(s => !isClosedState(s)).length };
    })
    .filter(x => x.list.length > 0)
    .sort((a, b) => b.active - a.active || b.list.length - a.list.length)
    .slice(0, ORG_CARD_LIMIT);

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Platform dashboard</h1>
          <p className="mah-muted">{active} active shipments across {organisations.length} organisations · {alerts.length} alert{alerts.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <section className="adm-pipeline" aria-label="Shipments by state">
        {SHIPMENT_STATES.map(st => (
          <button key={st} className={`adm-pipe-col adm-tone-${STATE_TONES[st] || 'grey'}`} onClick={() => navigate('shipments', `state:${st}`)}
            title={`${getStateLabel(st)}: ${counts[st]}`}>
            <span className="mah-pipe-count">{counts[st]}</span>
            <span className="mah-pipe-label">{getStateLabel(st)}</span>
          </button>
        ))}
      </section>

      <div className="mah-overview-grid">
        <div className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Needs admin attention</h2>
              <span className={`mah-count-pill mah-tone-${alerts.length ? 'red' : 'green'}`}>{alerts.length}</span>
            </div>
            {!cancelAuditAvailable && (
              <p className="mah-small mah-muted">Cancellation and withdrawal checks need the audit-log endpoint, which did not respond.</p>
            )}
            {alerts.length === 0 ? <Empty title="Nothing needs attention">Objection limits, overdue dispositions, cancellation requests and unexplained withdrawals appear here.</Empty>
              : alerts.map(a => (
                <div key={a.key} className={`mah-action-row mah-edge-${a.tone}`}>
                  <div className="mah-action-main">
                    <div className="mah-row-title">{shipmentName(a.shipment, productsById)}</div>
                    <div className="mah-row-sub">
                      <span className="mah-mono">{shipmentRef(a.shipment)}</span> · {mahCompany(a.shipment, orgsById)} · {a.why}
                    </div>
                  </div>
                  <span className={`mah-badge mah-tone-${a.tone}`}>{ALERT_LABELS[a.kind]}</span>
                  <span className="mah-small mah-muted mah-nowrap">{daysSince(a.shipment.state_entered_at) ?? '—'}d in state</span>
                  <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => openShipment(a.shipment)}>Review →</button>
                </div>
              ))}
          </section>

          <IntegrityAlerts token={token} shipmentsById={shipmentsById} productsById={productsById} openShipment={openShipment} />

          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Organisation health</h2>
              <button className="mah-link-btn" onClick={() => navigate('organisations')}>All organisations →</button>
            </div>
            {orgCards.length === 0 ? <Empty title="No organisations with shipments yet" /> : (
              <div className="adm-org-grid">
                {orgCards.map(({ org, list, active: act }) => {
                  const rate = rejectionRate(list);
                  return (
                    <div key={org.id} className="adm-org-card">
                      <div className="mah-row-title">{org.name_en}</div>
                      <div className="mah-row-sub">{orgTypeLabel(org.org_type)}</div>
                      <div className="adm-org-stats">
                        <span><strong>{act}</strong> active</span>
                        <span className={rate > 30 ? 'mah-text-red' : ''}><strong>{rate == null ? '—' : `${rate}%`}</strong> rejected</span>
                      </div>
                      <div className="mah-small mah-muted">Last activity {timeAgo(lastActivity(list))}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Platform metrics</h2><Icon name="activity" /></div>
            <div className="mah-metric-line"><span>Active shipments</span><strong>{active}</strong></div>
            <div className="mah-metric-line"><span>Created today</span><strong>{shipments.filter(s => isToday(s.created_at)).length}</strong></div>
            <div className="mah-metric-line"><span>Organisations</span><strong>{organisations.length}</strong></div>
            <div className="mah-metric-line"><span>Users</span><strong>{users.length}</strong></div>
            <div className="mah-metric-line"><span>API health</span><strong className="mah-text-green adm-health-ok"><span className="mah-dot mah-dot-green" />Operational</strong></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
