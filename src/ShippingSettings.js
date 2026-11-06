// Shipping Portal — Settings: company profile, fleet and connected systems (read-only demo data).
import { useState } from 'react';
import { Tabs, DemoBanner } from './mahShared';

const TABS = [
  { key: 'profile', label: 'Company Profile' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'systems', label: 'Connected Systems' },
];

const PROFILE = [
  ['Company name', 'Saudi Logistics Co.'],
  ['CR number', '1010 334 822'],
  ['Headquarters', 'Dammam, Eastern Province'],
  ['Modes', 'Sea · Air · Land'],
  ['Ports served', 'King Abdulaziz Port (Dammam), Jeddah Islamic Port, KKIA'],
  ['Contact', 'ops@saudilogistics.com.sa · +966 13 800 1200'],
];
const FLEET = [
  { name: 'MV Gulf Carrier', type: 'Container vessel', detail: 'Sea · Dammam rotation' },
  { name: 'Flight SV-Cargo 7', type: 'Air freight', detail: 'Air · KKIA / Jeddah' },
  { name: 'Fleet T-210', type: 'Road haulage (12 trucks)', detail: 'Land · GCC land bridge' },
];
const SYSTEMS = [
  { name: 'MASAAR platform', status: 'Connected', tone: 'green' },
  { name: 'Port Community System', status: 'Not connected', tone: 'grey', badge: 'v2' },
  { name: 'Vessel tracking API', status: 'Not connected', tone: 'grey', badge: 'v2' },
];

export default function ShippingSettings() {
  const [tab, setTab] = useState('profile');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Settings</h1>
          <p className="mah-muted">Your shipping company profile. Read-only for now.</p>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <section className="mah-card">
          <DemoBanner>illustrative company details</DemoBanner>
          <div className="clr-facts-grid mah-facts">
            {PROFILE.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </section>
      )}

      {tab === 'fleet' && (
        <section className="mah-card">
          <DemoBanner>illustrative fleet</DemoBanner>
          <ul className="ship-list">
            {FLEET.map(f => (
              <li key={f.name}>
                <div className="mah-grow"><div className="mah-row-title">{f.name}</div><div className="mah-row-sub">{f.detail}</div></div>
                <span className="mah-badge mah-tone-blue">{f.type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'systems' && (
        <section className="mah-card">
          <div className="ship-systems">
            {SYSTEMS.map(sys => (
              <div key={sys.name} className={`ship-system${sys.tone === 'grey' ? ' is-dimmed' : ''}`}>
                <span className={`mah-dot mah-dot-${sys.tone === 'green' ? 'green' : 'amber'}`} />
                <span className="mah-grow mah-row-title">{sys.name}</span>
                {sys.badge && <span className="mah-badge mah-tone-grey">{sys.badge}</span>}
                <span className={`mah-small mah-text-${sys.tone === 'green' ? 'green' : 'grey'}`}>{sys.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
