// MAH portal — Network & Accounts. Demo content until integrations exist.
import { useState } from 'react';
import { Tabs, SECTOR_LABELS, Icon } from './mahShared';

const DEMO_BROKERS = [
  { name: 'Saudi Clearance Co', licence: 'ZATCA-CB-10442', ports: 'Jeddah · Dammam', shipments: 14, sync: 'active', synced: 'Faseh sync active · last 6 min ago' },
  { name: 'Gulf Customs', licence: 'ZATCA-CB-20817', ports: 'Riyadh Dry Port', shipments: 5, sync: 'manual', synced: 'Manual mode — broker updates status by hand' },
];

const LABS = ['Saudi Analytical Labs', 'Gulf Testing Center', 'National Reference Lab', 'King Fahad Medical City Lab', 'Specialized Medical Lab'];
const LAB_PREFS_KEY = 'mah_lab_preferences';

function readLabPrefs() {
  try { return JSON.parse(localStorage.getItem(LAB_PREFS_KEY)) || {}; } catch { return {}; }
}

export default function MahNetwork() {
  const [tab, setTab] = useState('brokers');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Network & Accounts</h1>
          <p className="mah-muted">Your clearance partners, lab preferences and connected government systems</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'brokers', label: 'Clearance Companies' },
        { key: 'labs', label: 'QC Lab Preferences' },
        { key: 'accounts', label: 'Connected Accounts' },
      ]} />
      {tab === 'brokers' && <Brokers />}
      {tab === 'labs' && <LabPreferences />}
      {tab === 'accounts' && <Accounts />}
    </div>
  );
}

function Brokers() {
  return (
    <div className="mah-stack">
      <div className="mah-card-grid">
        {DEMO_BROKERS.map(b => (
          <section key={b.name} className="mah-card">
            <div className="mah-card-head">
              <h2>{b.name}</h2>
              <span className={`mah-badge mah-tone-${b.sync === 'active' ? 'green' : 'amber'}`}>{b.sync === 'active' ? 'Faseh sync' : 'Manual mode'}</span>
            </div>
            <div className="mah-facts">
              <div><span>Customs licence</span><strong className="mah-mono">{b.licence}</strong></div>
              <div><span>Ports</span><strong>{b.ports}</strong></div>
              <div><span>Shipments handled</span><strong>{b.shipments}</strong></div>
            </div>
            <p className="mah-small mah-muted"><span className={`mah-dot mah-dot-${b.sync === 'active' ? 'green' : 'amber'}`} /> {b.synced}</p>
          </section>
        ))}
      </div>
      <button className="mah-btn mah-btn-ghost mah-self-start" onClick={() => {}} title="Coming soon">
        <Icon name="plus" size={16} /> Connect
      </button>
    </div>
  );
}

function LabPreferences() {
  const [prefs, setPrefs] = useState(readLabPrefs);
  const [saved, setSaved] = useState(false);

  const save = () => {
    try {
      localStorage.setItem(LAB_PREFS_KEY, JSON.stringify(prefs));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <section className="mah-card">
      <div className="mah-card-head"><h2>Preferred QC lab per sector</h2></div>
      <p className="mah-muted mah-small">Advisory — SFDA makes the final lab assignment when sampling is ordered.</p>
      <div className="mah-form-grid">
        {Object.entries(SECTOR_LABELS).map(([key, label]) => (
          <label key={key} className="mah-field">
            <span>{label}</span>
            <select className="mah-input" value={prefs[key] || ''}
              onChange={e => { setPrefs({ ...prefs, [key]: e.target.value }); setSaved(false); }}>
              <option value="">— No preference —</option>
              {LABS.map(l => <option key={l}>{l}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mah-row-actions">
        {saved && <span className="mah-small mah-text-green">Saved on this device</span>}
        <button className="mah-btn mah-btn-primary" onClick={save}>Save preferences</button>
      </div>
    </section>
  );
}

function Accounts() {
  return (
    <div className="mah-card-grid">
      <section className="mah-card mah-account">
        <div className="mah-card-head"><h2>Faseh</h2><span className="mah-badge mah-tone-green">Connected</span></div>
        <p className="mah-muted mah-small">SFDA import requests, via your clearance companies.</p>
        <div className="mah-facts"><div><span>Connection</span><strong>Through Saudi Clearance Co</strong></div></div>
      </section>
      <section className="mah-card mah-account">
        <div className="mah-card-head"><h2>Fasah · ZATCA</h2><span className="mah-badge mah-tone-green">Connected</span></div>
        <p className="mah-muted mah-small">Direct MAH account for customs declarations. <em>Demo data.</em></p>
        <div className="mah-facts">
          <div><span>Active declarations</span><strong>7</strong></div>
          <div><span>Last sync</span><strong>8 min ago</strong></div>
          <div><span>Duties YTD</span><strong>SAR 94,200</strong></div>
        </div>
      </section>
      <section className="mah-card mah-account is-dimmed">
        <div className="mah-card-head"><h2>SFDA eServices</h2><span className="mah-badge mah-tone-purple">v2</span></div>
        <p className="mah-muted mah-small">Product registrations and listing renewals.</p>
      </section>
      <section className="mah-card mah-account is-dimmed">
        <div className="mah-card-head"><h2>SASO Saber</h2><span className="mah-badge mah-tone-purple">v2</span></div>
        <p className="mah-muted mah-small">Product conformity certificates for regulated goods.</p>
      </section>
    </div>
  );
}
