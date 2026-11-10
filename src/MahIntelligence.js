// MAH portal — My Performance, from GET /analytics/performance (real shipment data),
// and supplier health from the suppliers' compliance scores.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, Tabs, Ring, BarList, Empty, COLORS, supplierScoreTone } from './mahShared';

// Industry reference points (MASAAR platform aggregates)
export const BENCHMARKS = {
  first_time_right: { median: 71, top: 89 },
  cycle_time: { median: 23, top: 14 },
  rejection_rate: { median: 11, top: 4 },
  query_rate: { median: 31, top: 12 },
};

// GET /analytics/performance → { data, error, loading, reload }
export function usePerformance(token) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    try {
      setData(await apiFetch(token, '/analytics/performance'));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading: !data && !error, reload };
}

const fmt1 = (v) => (v == null ? null : Number.isInteger(v) ? v : Number(v).toFixed(1));

export default function MahIntelligence({ token, suppliers }) {
  const [tab, setTab] = useState('performance');
  const perf = usePerformance(token);
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>My Performance</h1>
          <p className="mah-muted">How your imports and suppliers perform</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'performance', label: 'My Performance' },
        { key: 'suppliers', label: 'My Suppliers' },
      ]} />
      {tab === 'performance' && <Performance {...perf} />}
      {tab === 'suppliers' && <SupplierHealth suppliers={suppliers} />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mah-card-grid mah-grid-3" aria-busy="true">
      {[0, 1, 2].map(i => (
        <section key={i} className="mah-card mah-perf-skel">
          <span className="mah-skel-bar" style={{ width: '50%' }} />
          <span className="mah-skel-bar" style={{ width: '80%', height: 40 }} />
          <span className="mah-skel-bar" style={{ width: '65%' }} />
        </section>
      ))}
    </div>
  );
}

// Inline SVG bar chart of [{ month, count }]
function MonthlyChart({ months }) {
  const max = Math.max(1, ...months.map(m => m.count));
  const W = 600;
  const H = 180;
  const pad = { l: 28, b: 28, t: 12, r: 4 };
  const slot = (W - pad.l - pad.r) / months.length;
  const barW = Math.min(30, slot * 0.6);
  const y = (v) => H - pad.b - (v / max) * (H - pad.b - pad.t);
  const ticks = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg className="mah-month-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Shipments per month: ${months.map(m => `${m.month} ${m.count}`).join(', ')}`}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={COLORS.track} strokeWidth="1" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{t}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = pad.l + i * slot + (slot - barW) / 2;
        return (
          <g key={m.key || m.month}>
            <rect x={x} y={y(m.count)} width={barW} height={Math.max(0, H - pad.b - y(m.count))} rx="3" fill={COLORS.blue}>
              <title>{`${m.month}: ${m.count} shipment${m.count === 1 ? '' : 's'}`}</title>
            </rect>
            {m.count > 0 && <text x={x + barW / 2} y={y(m.count) - 4} textAnchor="middle" fontSize="10" fill="#475569">{m.count}</text>}
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748B">{m.month.slice(0, 3)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Performance({ data, error, loading }) {
  if (error) return <div className="mah-alert mah-alert-red">Could not load performance data: {error}</div>;
  if (loading) return <Skeleton />;

  const ftr = data.first_time_right_rate;
  const cycle = data.avg_cycle_time_days;
  const rejection = data.rejection_rate;
  const query = data.sfda_query_rate;
  const sectors = data.sector_breakdown;
  const sectorTotal = Object.values(sectors).reduce((a, b) => a + b, 0);
  const pctOf = (n) => (sectorTotal ? Math.round((n / sectorTotal) * 100) : 0);
  const hasMonthly = data.monthly_shipments.some(m => m.count > 0);

  return (
    <div className="mah-stack">
      <div className="mah-card-grid mah-grid-2">
        <section className="mah-card mah-center">
          <div className="mah-card-head"><h2>First-time-right rate</h2></div>
          {ftr == null ? <Empty title="No closed shipments yet" /> : (
            <>
              <Ring value={ftr} size={130} stroke={12} label={`${fmt1(ftr)}%`} sublabel="first time"
                tone={ftr >= BENCHMARKS.first_time_right.median ? 'green' : 'amber'} />
              <p className="mah-small mah-muted">Based on {data.total_closed} closed shipment{data.total_closed === 1 ? '' : 's'} — released without an SFDA query or rejection</p>
              <p className={`mah-small mah-text-${ftr >= BENCHMARKS.first_time_right.median ? 'green' : 'amber'}`}>
                {ftr >= BENCHMARKS.first_time_right.median ? 'Above industry median' : 'Below industry median'} ({BENCHMARKS.first_time_right.median}%)
              </p>
            </>
          )}
        </section>
        <div className="mah-card-grid mah-grid-2 mah-perf-kpis">
          <section className="mah-card mah-perf-kpi">
            <span className="mah-perf-kpi-label">Avg cycle time</span>
            {cycle == null ? <strong className="mah-muted mah-perf-kpi-empty">No completed shipments yet</strong> : (
              <>
                <strong className="mah-perf-kpi-value">{fmt1(cycle)} <small>days</small></strong>
                <span className={`mah-small mah-text-${cycle <= BENCHMARKS.cycle_time.median ? 'green' : 'amber'}`}>
                  {cycle <= BENCHMARKS.cycle_time.median
                    ? `${fmt1(BENCHMARKS.cycle_time.median - cycle)} days faster than industry`
                    : `${fmt1(cycle - BENCHMARKS.cycle_time.median)} days slower than industry`}
                </span>
              </>
            )}
          </section>
          <section className="mah-card mah-perf-kpi">
            <span className="mah-perf-kpi-label">Rejection rate</span>
            {rejection == null ? <strong className="mah-muted mah-perf-kpi-empty">No submitted shipments yet</strong> : (
              <>
                <strong className="mah-perf-kpi-value">{fmt1(rejection)}%</strong>
                <span className={`mah-small mah-text-${rejection <= BENCHMARKS.rejection_rate.median ? 'green' : 'amber'}`}>
                  {rejection <= BENCHMARKS.rejection_rate.median ? 'Below industry average' : 'Above industry average — review rejection causes'}
                </span>
              </>
            )}
          </section>
          <section className="mah-card mah-perf-kpi">
            <span className="mah-perf-kpi-label">SFDA query rate</span>
            {query == null ? <strong className="mah-muted mah-perf-kpi-empty">No submitted shipments yet</strong> : (
              <>
                <strong className="mah-perf-kpi-value">{fmt1(query)}%</strong>
                <span className="mah-small mah-muted">of submissions received an SFDA query</span>
                <span className={`mah-small mah-text-${query <= BENCHMARKS.query_rate.median ? 'green' : 'amber'}`}>
                  Industry benchmark {BENCHMARKS.query_rate.median}%
                </span>
              </>
            )}
          </section>
          <section className="mah-card mah-perf-kpi">
            <span className="mah-perf-kpi-label">Shipments</span>
            <strong className="mah-perf-kpi-value">{data.total_shipments}</strong>
            <span className="mah-small mah-muted">
              {data.total_active} active · {data.total_sampling} in sampling · {data.total_closed} closed
            </span>
          </section>
        </div>
      </div>

      <section className="mah-card">
        <div className="mah-card-head"><h2>Shipments per month</h2><span className="mah-muted mah-small">Last 12 months</span></div>
        {hasMonthly ? <MonthlyChart months={data.monthly_shipments} /> : <Empty title="No shipments in the last 12 months" />}
      </section>

      <div className="mah-card-grid mah-grid-2">
        <section className="mah-card">
          <div className="mah-card-head"><h2>Sector breakdown</h2></div>
          <BarList max={Math.max(1, sectorTotal)} items={[
            { label: 'Food Supplement', value: sectors.food_supplement, display: `${sectors.food_supplement} (${pctOf(sectors.food_supplement)}%)`, tone: 'blue' },
            { label: 'Cosmetics', value: sectors.cosmetic, display: `${sectors.cosmetic} (${pctOf(sectors.cosmetic)}%)`, tone: 'purple' },
            { label: 'Food', value: sectors.food, display: `${sectors.food} (${pctOf(sectors.food)}%)`, tone: 'green' },
            ...(sectors.unknown ? [{ label: 'Not classified', value: sectors.unknown, display: `${sectors.unknown} (${pctOf(sectors.unknown)}%)`, tone: 'grey' }] : []),
          ]} />
        </section>
        <section className="mah-card">
          <div className="mah-card-head"><h2>Top SFDA rejection reasons for your shipments</h2></div>
          {data.top_rejection_reasons.length === 0 ? <Empty title="No rejection reasons recorded" /> : (
            <ol className="mah-reason-list">
              {data.top_rejection_reasons.map(r => (
                <li key={r.reason}><span>{r.reason}</span><span className="mah-badge mah-tone-red">{r.count}×</span></li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function SupplierHealth({ suppliers }) {
  const active = suppliers.filter(s => s.is_active !== false);
  const weakest = [...active].sort((a, b) => (a.compliance_score ?? 100) - (b.compliance_score ?? 100))[0];
  const label = (score) => (score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Watch' : 'At risk');
  return (
    <div className="mah-stack">
      <section className="mah-card">
        <div className="mah-card-head"><h2>Supplier health</h2></div>
        {active.length === 0 ? <Empty title="No suppliers yet" /> : (
          <div className="mah-health-grid">
            {active.map(s => {
              const score = s.compliance_score ?? 100;
              return (
                <div key={s.id} className="mah-health">
                  <Ring value={score} size={84} stroke={8} tone={supplierScoreTone(score)} label={score} sublabel="/100" />
                  <strong>{s.name}</strong>
                  <span className={`mah-small mah-text-${supplierScoreTone(score)}`}>{label(score)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="mah-card mah-tip">
        <div className="mah-card-head"><h2>Improvement tip</h2></div>
        <p>
          {weakest && (weakest.compliance_score ?? 100) < 90
            ? <>Ask <strong>{weakest.name}</strong> to send the Certificate of Analysis and Arabic label artwork before shipping. </>
            : 'Your suppliers are in good shape. '}
          Pre-checked documents cut first-submission rejections by roughly a third.
        </p>
      </section>
    </div>
  );
}
