// Shipping Portal — Overview: movement strip, active shipment cards, upcoming arrivals, metrics.
import { StateBadge, shipmentName, shipmentRef, fmtDate, daysUntil, Empty, Icon } from './mahShared';
import { mahCompany } from './sfdaShared';
import { SHIP_STAGES, shipStage, isActiveShipment, TRANSPORT, TransportTag } from './shippingShared';

// Hardcoded until the metrics backend exists
const AVG_DWELL_DAYS = 3.2;
const ON_TIME_RATE = 84;
const CARD_LIMIT = 9;

export default function ShippingOverview({ shipments, productsById, openShipment, navigate }) {
  const strip = SHIP_STAGES.map(st => ({ ...st, count: shipments.filter(s => shipStage(s) === st.key).length }));
  const active = shipments.filter(isActiveShipment);

  const upcoming = shipments
    .filter(s => { const d = daysUntil(s.eta); return d != null && d >= 0 && d <= 14; })
    .sort((a, b) => new Date(a.eta) - new Date(b.eta));
  const arrivingThisWeek = shipments.filter(s => { const d = daysUntil(s.eta); return d != null && d >= 0 && d <= 7; }).length;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Shipping overview</h1>
          <p className="mah-muted">{active.length} active shipment{active.length === 1 ? '' : 's'} · {arrivingThisWeek} arriving this week</p>
        </div>
      </div>

      <section className="mah-pipeline ship-strip" aria-label="Shipment movement">
        {strip.map(st => (
          <button key={st.key} className={`mah-pipe-col ship-pipe-${st.key}`} onClick={() => navigate('active')}>
            <span className="mah-pipe-count">{st.count}</span>
            <span className="mah-pipe-label">{st.label}</span>
          </button>
        ))}
      </section>

      <div className="mah-overview-grid">
        <div className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head">
              <h2>Active shipments</h2>
              <button className="mah-link-btn" onClick={() => navigate('active')}>View all →</button>
            </div>
            {active.length === 0 ? <Empty title="No active shipments right now" /> : (
              <div className="ship-card-grid">
                {active.slice(0, CARD_LIMIT).map(s => (
                  <div key={s.id} className="ship-card">
                    <div className="ship-card-top">
                      <span className="ship-card-mode" aria-hidden="true">{TRANSPORT[s.transport_mode]?.icon || '📦'}</span>
                      <div className="mah-grow mah-min0">
                        <div className="mah-row-title ship-ellipsis">{shipmentName(s, productsById)}</div>
                        <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
                      </div>
                      <StateBadge state={s.current_state} />
                    </div>
                    <div className="ship-card-facts">
                      <div><span>MAH</span><strong className="ship-ellipsis">{mahCompany(s)}</strong></div>
                      <div><span>Port</span><strong className="ship-ellipsis">{s.port_of_entry || '—'}</strong></div>
                      <div><span>ETA</span><strong>{fmtDate(s.eta)}</strong></div>
                      <div><span>B/L · AWB</span><strong className="ship-ellipsis">{s.bl_awb_number || '—'}</strong></div>
                    </div>
                    <button className="mah-link-btn ship-card-link" onClick={() => openShipment(s)}>View details →</button>
                  </div>
                ))}
              </div>
            )}
            {active.length > CARD_LIMIT && <button className="mah-link-btn" onClick={() => navigate('active')}>View all {active.length} →</button>}
          </section>
        </div>

        <aside className="mah-stack">
          <section className="mah-card">
            <div className="mah-card-head"><h2>Live metrics</h2><Icon name="clock" /></div>
            <div className="mah-metric-line"><span>Active shipments</span><strong>{active.length}</strong></div>
            <div className="mah-metric-line"><span>Arriving this week</span><strong>{arrivingThisWeek}</strong></div>
            <div className="mah-metric-line"><span>Avg dwell at port</span><strong>{AVG_DWELL_DAYS} days</strong></div>
            <div className="mah-metric-line"><span>On-time arrival rate</span><strong>{ON_TIME_RATE}%</strong></div>
            <p className="mah-small mah-muted">Dwell time and on-time rate are demo figures.</p>
          </section>

          <section className="mah-card">
            <div className="mah-card-head"><h2>Upcoming arrivals</h2><span className="mah-count-pill mah-tone-blue">{upcoming.length}</span></div>
            {upcoming.length === 0 ? <Empty title="No arrivals in the next 14 days" /> : upcoming.slice(0, 8).map(s => {
              const d = daysUntil(s.eta);
              return (
                <button key={s.id} className="mah-list-row" onClick={() => openShipment(s)}>
                  <div className="mah-action-main">
                    <div className="mah-row-title ship-ellipsis">{shipmentName(s, productsById)}</div>
                    <div className="mah-row-sub">{fmtDate(s.eta)} · {s.port_of_entry || 'port TBC'}</div>
                  </div>
                  <TransportTag mode={s.transport_mode} />
                  <span className="mah-badge mah-tone-blue">{d === 0 ? 'today' : `${d}d`}</span>
                </button>
              );
            })}
          </section>
        </aside>
      </div>
    </div>
  );
}
