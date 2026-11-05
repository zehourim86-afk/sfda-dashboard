// MAH portal — My Insights. Performance and market figures are demo data for now;
// supplier health rings use real compliance scores.
import { useState } from 'react';
import { Tabs, Ring, BarList, DemoBanner, Empty, scoreTone } from './mahShared';

const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const HEATMAP = [
  { label: 'Released', tone: 'green', values: [3, 5, 4, 6, 8, 7, 5, 9, 11, 8, 10, 12] },
  { label: 'Rejected', tone: 'red', values: [1, 0, 1, 2, 0, 1, 0, 1, 2, 0, 1, 0] },
];
const REJECTION_CAUSES = [
  { label: 'Arabic label errors', value: 4 },
  { label: 'Expired / missing CoA', value: 3 },
  { label: 'Registration mismatch', value: 2 },
  { label: 'Lab non-conformity', value: 1 },
];
const MARKET_REJECTIONS = [
  { label: 'Labelling non-compliance', value: 31, display: '31%' },
  { label: 'Unregistered product', value: 22, display: '22%' },
  { label: 'Lab result failure', value: 18, display: '18%' },
  { label: 'Missing certificates', value: 16, display: '16%' },
  { label: 'Expired shelf life', value: 13, display: '13%' },
];
const DWELL = [
  { label: 'Food', value: 4.2, display: '4.2 d', tone: 'green' },
  { label: 'Cosmetics', value: 6.8, display: '6.8 d', tone: 'amber' },
  { label: 'Food Supplement', value: 8.1, display: '8.1 d', tone: 'red' },
];
const COUNTRIES = [
  { name: 'China', share: '18%' }, { name: 'United States', share: '12%' }, { name: 'Germany', share: '9%' },
  { name: 'India', share: '8%' }, { name: 'UAE', share: '7%' }, { name: 'France', share: '6%' },
  { name: 'Italy', share: '5%' }, { name: 'South Korea', share: '4%' },
];

export default function MahIntelligence({ suppliers }) {
  const [tab, setTab] = useState('performance');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>My Insights</h1>
          <p className="mah-muted">How your imports perform, and how the Saudi market behaves</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'performance', label: 'My Performance' },
        { key: 'suppliers', label: 'My Suppliers' },
        { key: 'market', label: 'Saudi Market' },
      ]} />
      {tab === 'performance' && <Performance />}
      {tab === 'suppliers' && <SupplierHealth suppliers={suppliers} />}
      {tab === 'market' && <Market />}
    </div>
  );
}

function Performance() {
  const max = Math.max(...HEATMAP.flatMap(r => r.values));
  return (
    <div className="mah-stack">
      <DemoBanner>performance figures are illustrative until enough shipment history exists</DemoBanner>
      <section className="mah-card">
        <div className="mah-card-head"><h2>Last 12 months</h2></div>
        <div className="mah-heatmap">
          <span />
          {MONTHS.map(m => <span key={m} className="mah-heat-month">{m}</span>)}
          {HEATMAP.map(row => (
            <div key={row.label} className="mah-heat-row">
              <span className="mah-heat-label">{row.label}</span>
              {row.values.map((v, i) => (
                <span key={i} className={`mah-heat-cell mah-fill-${row.tone}`} title={`${MONTHS[i]}: ${v}`}
                  style={{ opacity: v === 0 ? 0.08 : 0.2 + (v / max) * 0.8 }} />
              ))}
            </div>
          ))}
        </div>
      </section>
      <div className="mah-card-grid mah-grid-3">
        <section className="mah-card mah-center">
          <div className="mah-card-head"><h2>First-time-right</h2></div>
          <Ring value={78} size={120} stroke={11} label="78%" sublabel="of shipments" />
          <p className="mah-small mah-muted">Released without an SFDA query. Market: 64%.</p>
        </section>
        <section className="mah-card">
          <div className="mah-card-head"><h2>Avg cycle time</h2></div>
          <BarList items={[
            { label: 'You', value: 18, display: '18 d', tone: 'blue' },
            { label: 'Sector benchmark', value: 24, display: '24 d', tone: 'grey' },
          ]} />
          <p className="mah-small mah-text-green">6 days faster than benchmark</p>
        </section>
        <section className="mah-card">
          <div className="mah-card-head"><h2>Rejection rate</h2><strong className="mah-text-red">9%</strong></div>
          <BarList items={REJECTION_CAUSES} tone="red" />
        </section>
      </div>
    </div>
  );
}

function SupplierHealth({ suppliers }) {
  const active = suppliers.filter(s => s.is_active !== false);
  const weakest = [...active].sort((a, b) => (a.compliance_score ?? 100) - (b.compliance_score ?? 100))[0];
  return (
    <div className="mah-stack">
      <section className="mah-card">
        <div className="mah-card-head"><h2>Supplier health</h2></div>
        {active.length === 0 ? <Empty title="No suppliers yet" /> : (
          <div className="mah-health-grid">
            {active.map(s => (
              <div key={s.id} className="mah-health">
                <Ring value={s.compliance_score ?? 100} size={84} stroke={8} />
                <strong>{s.name}</strong>
                <span className={`mah-small mah-text-${scoreTone(s.compliance_score ?? 100)}`}>
                  {(s.compliance_score ?? 100) >= 85 ? 'Healthy' : (s.compliance_score ?? 100) >= 70 ? 'Watch' : 'At risk'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mah-card mah-tip">
        <div className="mah-card-head"><h2>Improvement tip</h2></div>
        <p>
          {weakest && (weakest.compliance_score ?? 100) < 85
            ? <>Ask <strong>{weakest.name}</strong> to send the Certificate of Analysis and Arabic label artwork before shipping. </>
            : 'Your suppliers are in good shape. '}
          Pre-checked documents cut first-submission rejections by roughly a third.
        </p>
      </section>
    </div>
  );
}

function Market() {
  return (
    <div className="mah-stack">
      <DemoBanner>Saudi market figures are illustrative sample data, not official SFDA statistics</DemoBanner>
      <div className="mah-card-grid">
        <section className="mah-card">
          <div className="mah-card-head"><h2>Top rejection reasons</h2></div>
          <BarList items={MARKET_REJECTIONS} tone="red" />
        </section>
        <section className="mah-card">
          <div className="mah-card-head"><h2>Faseh dwell time by sector</h2></div>
          <BarList items={DWELL} />
        </section>
      </div>
      <section className="mah-card">
        <div className="mah-card-head"><h2>Top import countries</h2></div>
        <div className="mah-country-grid">
          {COUNTRIES.map((c, i) => (
            <div key={c.name} className="mah-country">
              <span className="mah-country-rank">{i + 1}</span>
              <span className="mah-grow">{c.name}</span>
              <strong>{c.share}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
