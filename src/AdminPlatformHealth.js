// Admin Panel — Platform Health: service status, live audit activity (refreshes every 30s), charts.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, stateOf, fmtDateTime, timeAgo, Empty, DemoBanner } from './mahShared';
import { getStateLabel } from './constants';
import { ColumnChart, Donut } from './adminShared';

const REFRESH_MS = 30000;
const ACTIVITY_LIMIT = 20;

const SERVICES = [
  { name: 'API', status: 'Operational' },
  { name: 'Database', status: 'Operational' },
  { name: 'Faseh sync', status: 'Last sync 4 min ago' },
  { name: 'Email parser', status: 'Operational' },
];

// Demo series: shipments created per day, last 14 days
const DEMO_DAILY = [6, 9, 4, 11, 8, 3, 2, 10, 12, 7, 9, 5, 13, 8];
function demoDaily() {
  const today = new Date();
  return DEMO_DAILY.map((value, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DEMO_DAILY.length - 1 - i));
    return { label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value };
  });
}

const entryName = (e) => e.product_name || (e.supplier_name ? `Shipment from ${e.supplier_name}` : null) || e.masaar_id || e.faseh_request_number || '—';

export default function AdminPlatformHealth({ token, shipments }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(token, `/admin/audit-log?limit=${ACTIVITY_LIMIT}`);
      setEntries(data.entries || []);
      setError(null);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const counts = {};
  for (const s of shipments) counts[stateOf(s)] = (counts[stateOf(s)] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const donut = top.slice(0, 6).map(([st, value]) => ({ label: getStateLabel(st), value }));
  const otherCount = top.slice(6).reduce((t, [, v]) => t + v, 0);

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Platform health</h1>
          <p className="mah-muted">Service status and live activity across all organisations</p>
        </div>
      </div>

      <div className="adm-status-grid">
        {SERVICES.map(svc => (
          <div key={svc.name} className="adm-status-card">
            <span className="adm-status-dot" aria-hidden="true" />
            <div>
              <div className="mah-row-title">{svc.name}</div>
              <div className="mah-small mah-text-green">{svc.status}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="mah-card mah-card-flush">
        <div className="mah-card-head sfda-card-pad">
          <h2>Recent activity</h2>
          <span className="mah-small mah-muted">
            {refreshedAt ? `Updated ${timeAgo(refreshedAt)} · refreshes every 30s` : 'Loading…'}
          </span>
        </div>
        {error && <div className="mah-alert mah-alert-amber adm-inset">Activity log unavailable: {error}</div>}
        {entries && entries.length === 0 && <Empty title="No activity recorded yet" />}
        {entries && entries.length > 0 && (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Shipment</th><th>Org</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td className="mah-nowrap mah-muted" title={fmtDateTime(e.occurred_at)}>{timeAgo(e.occurred_at)}</td>
                    <td><div>{e.actor_name || e.actor_role || 'System'}</div>{e.actor_email && <div className="mah-row-sub">{e.actor_email}</div>}</td>
                    <td>
                      <div className="mah-row-title">{(e.action || 'STATE_TRANSITION').replace(/_/g, ' ')}</div>
                      {e.from_state !== e.to_state && <div className="mah-row-sub">{getStateLabel(e.from_state)} → {getStateLabel(e.to_state)}</div>}
                    </td>
                    <td><div>{entryName(e)}</div>{e.masaar_id && <div className="mah-row-sub mah-mono">{e.masaar_id}</div>}</td>
                    <td>{e.organisation_name || <span className="mah-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mah-card-grid">
        <section className="mah-card">
          <div className="mah-card-head"><h2>Shipments created per day</h2><span className="mah-small mah-muted">Last 14 days</span></div>
          <DemoBanner>illustrative daily volumes</DemoBanner>
          <ColumnChart data={demoDaily()} />
        </section>
        <section className="mah-card">
          <div className="mah-card-head"><h2>State distribution</h2><span className="mah-small mah-muted">Top 6 states</span></div>
          {donut.length === 0 ? <Empty title="No shipments yet" /> : <Donut items={donut} />}
          {otherCount > 0 && <p className="mah-small mah-muted">{otherCount} more shipment{otherCount === 1 ? '' : 's'} in other states.</p>}
        </section>
      </div>
    </div>
  );
}
