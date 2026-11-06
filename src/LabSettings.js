// Lab Portal — Settings: lab profile, analysts and connected systems (read-only demo data).
import { useState } from 'react';
import { Tabs, DemoBanner, Icon } from './mahShared';

const TABS = [
  { key: 'profile', label: 'Lab Profile' },
  { key: 'analysts', label: 'Analysts' },
  { key: 'systems', label: 'Connected Systems' },
];

const PROFILE = [
  ['Lab name', 'KKIA Pharmaceutical Lab — Riyadh'],
  ['SFDA appointment number', 'LAB-SA-0031'],
  ['ISO 17025 accreditation', 'Accredited — SAAC-2271'],
  ['Scope', 'Food supplements, cosmetics, food chemistry & microbiology'],
  ['Port coverage', 'King Khalid International Airport'],
  ['Contact', 'lab@kkia-pharmalab.sa · +966 11 555 0031'],
  ['Average turnaround', '5.2 days'],
];
const ANALYSTS = [
  { name: 'Ahmed Al-Rashidi', role: 'Lead analyst', focus: 'Chromatography (HPLC/GC)' },
  { name: 'Layla Al-Mutairi', role: 'Senior analyst', focus: 'Microbiology' },
  { name: 'Yousef Al-Dossary', role: 'Analyst', focus: 'Heavy metals & contaminants' },
];
const SYSTEMS = [
  { name: 'MASAAR platform', status: 'Connected', tone: 'green' },
  { name: 'SFDA eSampling', status: 'Not connected', tone: 'grey', badge: 'v2' },
];

export default function LabSettings({ user }) {
  const [tab, setTab] = useState('profile');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Settings</h1>
          <p className="mah-muted">Your laboratory profile. Read-only for now.</p>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <section className="mah-card">
          <DemoBanner>illustrative laboratory details</DemoBanner>
          <div className="clr-facts-grid mah-facts">
            {PROFILE.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </section>
      )}

      {tab === 'analysts' && (
        <section className="mah-card">
          <DemoBanner>illustrative analyst roster</DemoBanner>
          <ul className="lab-list">
            {ANALYSTS.map(a => (
              <li key={a.name}>
                <div className="mah-grow"><div className="mah-row-title">{a.name}</div><div className="mah-row-sub">{a.focus}</div></div>
                <span className="mah-badge mah-tone-blue">{a.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'systems' && (
        <section className="mah-card">
          <div className="lab-systems">
            {SYSTEMS.map(sys => (
              <div key={sys.name} className={`lab-system${sys.tone === 'grey' ? ' is-dimmed' : ''}`}>
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
