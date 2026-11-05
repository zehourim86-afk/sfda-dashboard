// MAH portal — Market Intelligence:
// Opportunity Scout | Supplier Intelligence | Regulatory Radar | Benchmarking
// Content is demo seed data (mahMarketData.js); every tab says so.
import { useEffect, useRef, useState } from 'react';
import { Tabs, DemoBanner, Icon, stateOf } from './mahShared';
import {
  CATEGORY_QUICK_PICKS, findCategoryReport,
  SUPPLIER_COUNTRIES, SUPPLIER_QUICK_PICKS, NEW_SUPPLIER_CHECKLIST, findSupplierProfile, COUNTRY_FLAGS,
  RADAR_ITEMS, RADAR_SECTORS, RADAR_TYPES, RADAR_SECTOR_KEYS,
} from './mahMarketData';

const LOOKUP_DELAY_MS = 1500;
const RISK_TONES = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red' };
const SAVED_KEY = 'mah_radar_saved';

// Runs lookup(query) after a short "analysing" delay. state.status: idle | loading | done
function useDelayedLookup(lookup) {
  const [state, setState] = useState({ status: 'idle' });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = (query) => {
    clearTimeout(timer.current);
    setState({ status: 'loading', query });
    timer.current = setTimeout(() => setState({ status: 'done', query, result: lookup(query) }), LOOKUP_DELAY_MS);
  };
  return [state, run];
}

function Skeleton({ text }) {
  return (
    <div className="mah-mi-card mah-skeleton" aria-busy="true">
      <div className="mah-skel-text">{text}</div>
      <span className="mah-skel-bar" style={{ width: '60%' }} />
      <span className="mah-skel-bar" style={{ width: '90%' }} />
      <span className="mah-skel-bar" style={{ width: '75%' }} />
    </div>
  );
}

const Recommendation = ({ text }) => (
  <div className="mah-reco"><span className="mah-reco-icon">✦</span><p>{text}</p></div>
);

const RiskBadge = ({ level }) => <span className={`mah-badge mah-tone-${RISK_TONES[level]}`}>{level} risk</span>;

// "Name (Country)" → flag + text
function withFlag(entry) {
  const m = /\(([^)]+)\)\s*$/.exec(entry);
  return `${(m && COUNTRY_FLAGS[m[1]]) || '🌐'} ${entry}`;
}

export default function MahMarketIntelligence({ products = [], shipments = [], navigate }) {
  const [tab, setTab] = useState('scout');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Market Intelligence</h1>
          <p className="mah-muted">Research categories and suppliers, track regulatory change, and benchmark yourself</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'scout', label: 'Opportunity Scout' },
        { key: 'supplier', label: 'Supplier Intelligence' },
        { key: 'radar', label: 'Regulatory Radar' },
        { key: 'bench', label: 'Benchmarking' },
      ]} />
      {tab === 'scout' && <OpportunityScout navigate={navigate} />}
      {tab === 'supplier' && <SupplierIntel />}
      {tab === 'radar' && <RegulatoryRadar products={products} />}
      {tab === 'bench' && <Benchmarking shipments={shipments} />}
    </div>
  );
}

// ── Opportunity Scout ────────────────────────────────
function OpportunityScout({ navigate }) {
  const [query, setQuery] = useState('');
  const [lookup, run] = useDelayedLookup(findCategoryReport);
  const search = (q) => { if (q.trim()) { setQuery(q); run(q); } };
  const r = lookup.result;

  return (
    <div className="mah-stack">
      <DemoBanner>market figures and SFDA statistics are illustrative sample data</DemoBanner>
      <form className="mah-mi-card mah-mi-search" onSubmit={e => { e.preventDefault(); search(query); }}>
        <label className="mah-field">
          <span>Research a product category or HS code</span>
          <div className="mah-mi-search-row">
            <input className="mah-input" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Omega-3 supplements, HS 2106.90, Vitamin C tablets..." />
            <button type="submit" className="mah-btn mah-btn-primary" disabled={!query.trim() || lookup.status === 'loading'}>Research →</button>
          </div>
        </label>
        <div className="mah-mi-picks">
          {CATEGORY_QUICK_PICKS.map(c => (
            <button type="button" key={c} className="mah-action-chip" onClick={() => search(c)}>{c}</button>
          ))}
        </div>
      </form>

      {lookup.status === 'loading' && <Skeleton text="Analyzing Saudi market data..." />}
      {lookup.status === 'done' && !r && (
        <div className="mah-mi-card">
          <p>No market data available for this category yet. Our research team updates the database monthly.
            Contact your DEMARA advisor for a custom market assessment.</p>
        </div>
      )}
      {lookup.status === 'done' && r && (
        <article className="mah-mi-card">
          <div className="mah-mi-top">
            <div>
              <div className="mah-mi-eyebrow">{r.name} · Saudi market size</div>
              <div className="mah-mi-big">{r.market_size}</div>
            </div>
            <div className="mah-mi-badges">
              <span className={`mah-badge mah-tone-${r.growth_direction === 'up' ? 'green' : 'red'}`}>
                {r.growth_direction === 'up' ? '↑' : '↓'} {r.growth}
              </span>
              <RiskBadge level={r.risk_level} />
            </div>
          </div>
          <div className="mah-mi-metrics">
            <div><span>SFDA registered products</span><strong>{r.sfda_registered_products.toLocaleString('en-US')}</strong></div>
            <div><span>Avg clearance</span><strong>{r.avg_clearance_days} days</strong></div>
            <div><span>Rejection rate</span><strong>{r.rejection_rate}</strong></div>
          </div>
          <div className="mah-mi-cols">
            <div>
              <h3 className="mah-h3">Top importers</h3>
              <ul className="mah-mi-list">{r.top_importers.map(i => <li key={i}>{withFlag(i)}</li>)}</ul>
            </div>
            <div>
              <h3 className="mah-h3">Top rejection reasons</h3>
              <ol className="mah-mi-reasons">
                {r.top_rejection_reasons.map(x => <li key={x}><Icon name="alert" size={14} /> {x}</li>)}
              </ol>
            </div>
          </div>
          <div className="mah-mi-tags">
            <span className={`mah-badge mah-tone-${r.cold_chain_required ? 'blue' : 'grey'}`}>
              {r.cold_chain_required ? '❄ Cold chain required' : 'No cold chain'}
            </span>
            <span className={`mah-badge mah-tone-${r.halal_required ? 'green' : 'grey'}`}>
              {r.halal_required ? 'Halal certificate required' : 'Halal not required'}
            </span>
          </div>
          <Recommendation text={r.recommendation} />
          <div className="mah-row-actions">
            <button className="mah-btn mah-btn-primary" onClick={() => navigate?.('shipments')}>Start Shipment →</button>
          </div>
        </article>
      )}
    </div>
  );
}

// ── Supplier Intelligence ────────────────────────────
function SupplierIntel() {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [lookup, run] = useDelayedLookup(({ name: n, country: c }) => findSupplierProfile(n, c));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const check = (n, c) => { if (n.trim() || c) run({ name: n, country: c }); };
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };
  const p = lookup.result;
  const searched = lookup.query || {};

  return (
    <div className="mah-stack">
      <DemoBanner>supplier records, registration numbers and rates are illustrative sample data</DemoBanner>
      <form className="mah-mi-card mah-mi-search" onSubmit={e => { e.preventDefault(); check(name, country); }}>
        <div className="mah-field"><span>Research a supplier or country of origin</span></div>
        <div className="mah-mi-search-row">
          <input className="mah-input" placeholder="Supplier name" value={name} onChange={e => setName(e.target.value)} aria-label="Supplier name" />
          <select className="mah-input mah-mi-country" value={country} onChange={e => setCountry(e.target.value)} aria-label="Country">
            <option value="">Country</option>
            {SUPPLIER_COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" className="mah-btn mah-btn-primary" disabled={(!name.trim() && !country) || lookup.status === 'loading'}>Check Supplier →</button>
        </div>
        <div className="mah-mi-picks">
          {SUPPLIER_QUICK_PICKS.map(q => (
            <button type="button" key={q.label} className="mah-action-chip"
              onClick={() => { setName(q.name); setCountry(q.country); check(q.name, q.country); }}>{q.label}</button>
          ))}
        </div>
      </form>

      {lookup.status === 'loading' && <Skeleton text="Running supplier due diligence..." />}
      {lookup.status === 'done' && !p && (
        <div className="mah-mi-card">
          <p>No history found for {searched.name ? <strong>{searched.name}</strong> : 'this supplier'} in MASAAR database. For a new supplier, DEMARA recommends:</p>
          <ul className="mah-mi-checklist">{NEW_SUPPLIER_CHECKLIST.map(c => <li key={c}><span>☐</span> {c}</li>)}</ul>
        </div>
      )}
      {lookup.status === 'done' && p && (
        <article className="mah-mi-card">
          <div className="mah-mi-top">
            <div>
              <div className="mah-mi-eyebrow">Supplier due diligence</div>
              <div className="mah-mi-big">{COUNTRY_FLAGS[p.country] || '🌐'} {p.name}</div>
              <div className="mah-muted mah-small">{p.country}</div>
            </div>
            <div className="mah-mi-badges"><RiskBadge level={p.risk_level} /></div>
          </div>
          <div className="mah-mi-metrics">
            <div>
              <span>GHAD status</span>
              <strong><span className={`mah-badge mah-tone-${p.ghad_status === 'VERIFIED' ? 'green' : 'red'}`}>{p.ghad_status}</span></strong>
              <small className="mah-mono">{p.ghad_cr}</small>
            </div>
            <div>
              <span>Blacklist</span>
              <strong><span className={`mah-badge mah-tone-${p.blacklist_status === 'CLEAR' ? 'green' : 'red'}`}>{p.blacklist_status === 'CLEAR' ? 'CLEAR' : 'FLAGGED'}</span></strong>
            </div>
            <div>
              <span>Compliance score</span>
              <strong>{p.avg_compliance_score ?? '—'}{p.avg_compliance_score != null && <small>/100</small>}</strong>
            </div>
          </div>
          <div className="mah-mi-metrics mah-mi-metrics-2">
            <div><span>Saudi import history</span><strong>{p.saudi_import_history}</strong></div>
            <div><span>Rejection rate</span><strong>{p.rejection_rate}</strong></div>
          </div>
          <div>
            <h3 className="mah-h3">Issues to watch</h3>
            <div className="mah-stack mah-gap-8">
              {p.top_issues.map(i => <div key={i} className="mah-mi-issue"><Icon name="alert" size={14} /> {i}</div>)}
            </div>
          </div>
          <div>
            <h3 className="mah-h3">Certifications</h3>
            {p.certifications.length === 0
              ? <span className="mah-muted mah-small">None on record</span>
              : <div className="mah-mi-tags">{p.certifications.map(c => <span key={c} className="mah-badge mah-tone-green">{c}</span>)}</div>}
          </div>
          <Recommendation text={p.recommendation} />
          <div className="mah-row-actions">
            <button className="mah-btn mah-btn-primary" onClick={() => showToast('Supplier added to your master list')}>Add to Supplier Master →</button>
          </div>
        </article>
      )}
      {toast && <div className="mah-toast" role="status">{toast}</div>}
    </div>
  );
}

// ── Regulatory Radar ─────────────────────────────────
function readSaved() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY)) || []); } catch { return new Set(); }
}

function RegulatoryRadar({ products }) {
  const [sector, setSector] = useState('All');
  const [type, setType] = useState('All');
  const [mineOnly, setMineOnly] = useState(false);
  const [saved, setSaved] = useState(readSaved);
  const [expanded, setExpanded] = useState(() => new Set());

  const mySectors = new Set(products.filter(p => p.is_active !== false).map(p => p.sector));
  const items = RADAR_ITEMS
    .filter(i => sector === 'All' || i.sector === sector)
    .filter(i => type === 'All' || i.type === type)
    .filter(i => !mineOnly || mySectors.has(RADAR_SECTOR_KEYS[i.sector]));

  const toggleSave = (id) => {
    const next = new Set(saved);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
  };
  const toggleMore = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="mah-stack">
      <DemoBanner>regulatory items and circular references are illustrative sample data — check the official SFDA notice before acting</DemoBanner>
      <div className="mah-mi-card mah-radar-filters">
        <div className="mah-radar-filter">
          <span>Sector</span>
          <div className="mah-action-chips">
            {['All', ...RADAR_SECTORS].map(s => (
              <button key={s} className={`mah-action-chip${sector === s ? ' is-active' : ''}`} onClick={() => setSector(s)} aria-pressed={sector === s}>{s}</button>
            ))}
          </div>
        </div>
        <div className="mah-radar-filter">
          <span>Type</span>
          <div className="mah-action-chips">
            {['All', ...RADAR_TYPES].map(t => (
              <button key={t} className={`mah-action-chip${type === t ? ' is-active' : ''}`} onClick={() => setType(t)} aria-pressed={type === t}>{t}</button>
            ))}
          </div>
        </div>
        <label className="mah-switch">
          <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
          <span className="mah-switch-track"><span className="mah-switch-thumb" /></span>
          Your categories only
          {mineOnly && mySectors.size === 0 && <span className="mah-muted mah-small">(no products in your master yet)</span>}
        </label>
      </div>

      {items.length === 0 ? (
        <div className="mah-mi-card"><p className="mah-muted">No regulatory updates match these filters.</p></div>
      ) : items.map(i => {
        const isSaved = saved.has(i.id);
        const open = expanded.has(i.id);
        return (
          <article key={i.id} className={`mah-radar-card mah-impact-${RISK_TONES[i.impact]}`}>
            <div className="mah-radar-head">
              <h3>{i.title}</h3>
              <span className="mah-muted mah-small mah-nowrap">{i.date}</span>
            </div>
            <div className="mah-mi-tags">
              <span className={`mah-badge mah-tone-${RISK_TONES[i.impact]}`}>{i.impact} impact</span>
              <span className="mah-badge mah-tone-blue">{i.sector}</span>
              <span className={`mah-badge mah-tone-${i.type === 'Recall' ? 'red' : 'purple'}`}>{i.type}</span>
            </div>
            <p className={`mah-radar-summary${open ? ' is-open' : ''}`}>{i.summary}</p>
            <button className="mah-link-btn mah-self-start" onClick={() => toggleMore(i.id)}>{open ? 'Show less' : 'Read more'}</button>
            <div className="mah-radar-action"><strong>⚠ Action required:</strong> {i.action_required}</div>
            <div className="mah-radar-foot">
              <span className="mah-muted mah-small">{i.sfda_ref}</span>
              <button className={`mah-btn mah-btn-sm ${isSaved ? 'mah-btn-green' : 'mah-btn-ghost'}`} onClick={() => toggleSave(i.id)} aria-pressed={isSaved}>
                {isSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── Benchmarking ─────────────────────────────────────
// States that mean SFDA rejected the shipment at some point
const REJECTED_STATES = ['SFDA_REJECTED', 'OBJECTION_FILED', 'DISPOSITION_PENDING', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED'];

function BenchmarkCard({ title, yours, unit = '', median, top, bottom, lowerIsBetter, betterLabel, worseLabel, noDataLabel, industryNote }) {
  const hasData = yours !== null && yours !== undefined;
  const better = hasData && (lowerIsBetter ? yours <= median : yours >= median);
  const tone = !hasData ? 'grey' : better ? 'green' : 'amber';
  // 0 = industry bottom, 100 = top quartile
  const pos = (v) => Math.max(0, Math.min(100, ((v - bottom) / (top - bottom)) * 100));
  return (
    <section className="mah-mi-card mah-bench">
      <h2>{title}</h2>
      <div className={`mah-bench-yours mah-text-${tone}`}>
        {hasData ? <>{yours}<small>{unit}</small></> : <span className="mah-bench-nodata">No data yet</span>}
        <span className="mah-bench-caption">yours</span>
      </div>
      <div className="mah-bench-scale">
        <div className="mah-bench-track">
          <span className="mah-bench-median" style={{ left: `${pos(median)}%` }} title={`Industry median ${median}${unit}`} />
          {hasData && <span className={`mah-bench-marker mah-fill-${tone}`} style={{ left: `${pos(yours)}%` }} title={`You: ${yours}${unit}`} />}
        </div>
        <div className="mah-bench-ends"><span>Industry bottom</span><span>Top quartile</span></div>
      </div>
      <div className="mah-bench-stats">
        {industryNote ? <span>{industryNote}</span> : (
          <>
            <span>Industry median <strong>{median}{unit}</strong></span>
            <span>Top quartile <strong>{top}{unit}</strong></span>
          </>
        )}
      </div>
      <div className={`mah-small mah-text-${tone === 'grey' ? 'grey' : tone}`}>{hasData ? (better ? betterLabel : worseLabel) : noDataLabel}</div>
    </section>
  );
}

function Benchmarking({ shipments }) {
  const rejected = shipments.filter(s => REJECTED_STATES.includes(stateOf(s))).length;
  const rejectionRate = shipments.length ? Math.round((rejected / shipments.length) * 100) : null;

  return (
    <div className="mah-stack">
      <DemoBanner>industry figures based on MASAAR platform aggregates</DemoBanner>
      <div className="mah-card-grid">
        <BenchmarkCard title="First-time-right rate" yours={78} unit="%" median={71} top={89} bottom={50}
          betterLabel="Above industry median ✓" worseLabel="Below industry median — review SFDA query causes" />
        <BenchmarkCard title="Average clearance cycle time" yours={18} unit=" days" median={23} top={14} bottom={35} lowerIsBetter
          betterLabel="Faster than industry median ✓" worseLabel="Slower than industry median" />
        <BenchmarkCard title="SFDA query rate" yours={22} unit="%" median={31} top={12} bottom={50} lowerIsBetter
          betterLabel="Below industry median ✓" worseLabel="Above industry median — tighten documents before submission" />
        <BenchmarkCard title="Rejection rate" yours={rejectionRate} unit="%" median={11} top={4} bottom={25} lowerIsBetter
          betterLabel="Below industry median ✓" worseLabel="Above industry median — review rejection causes"
          noDataLabel="No shipments yet" />
        <BenchmarkCard title="Objection success rate" yours={null} unit="%" median={43} top={71} bottom={10}
          noDataLabel="Start filing objections to track this metric" />
        <BenchmarkCard title="Avg days to file objection after rejection" yours={null} unit=" days" median={18} top={7} bottom={55} lowerIsBetter
          industryNote="Industry: Avg 18 days (60-day window)"
          noDataLabel="File early — SFDA responds faster to early-filed objections" />
      </div>
      <p className="mah-small mah-muted">
        Rejection rate is calculated from your shipments ({rejected} of {shipments.length} rejected by SFDA). First-time-right, cycle time and query rate are demo values until enough history exists.
      </p>
    </div>
  );
}
