// Clearance Portal — Settings. Company profile and users are demo data until their backend exists;
// the Faseh connection under Connected Accounts is live (FasehSync.js).
import { useState } from 'react';
import { Tabs, DemoBanner } from './mahShared';
import { FasehConnectionCard } from './FasehSync';

const PROFILE = {
  name: 'Al Faris Customs Clearance',
  name_ar: 'الفارس للتخليص الجمركي',
  cr_number: '1010587342',
  faseh_license: 'FSH-CB-2021-00417',
  zatca_broker_id: 'ZATCA-CB-88213',
  city: 'Jeddah',
  address: 'King Abdulaziz Road, Al Hamra District, Jeddah 23323',
  phone: '+966 12 665 4210',
  email: 'operations@alfaris-clearance.example',
  ports: ['Jeddah Islamic Port', 'King Abdulaziz International Airport', 'King Abdullah Port'],
};
const USERS = [
  { name: 'Faisal Al-Harbi', role: 'Clearance Manager', email: 'faisal@alfaris-clearance.example', status: 'Active' },
  { name: 'Nora Al-Qahtani', role: 'Faseh Filing Officer', email: 'nora@alfaris-clearance.example', status: 'Active' },
  { name: 'Yousef Bakr', role: 'Customs Agent (Port)', email: 'yousef@alfaris-clearance.example', status: 'Invited' },
];
const ACCOUNTS = [
  { name: 'Fasah (ZATCA)', desc: 'Customs declarations, duties payment and gate-out', status: 'Connected' },
  { name: 'MASAAR platform', desc: 'Shipments handed over by MAHs, with their documents', status: 'Connected' },
];

export default function ClearanceSettings({ token, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'profile');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Settings</h1>
          <p className="mah-muted">Company profile, team and connected systems</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'profile', label: 'Company Profile' },
        { key: 'users', label: 'Users' },
        { key: 'accounts', label: 'Connected Accounts' },
      ]} />

      {tab !== 'accounts' && <DemoBanner>company profile and users are illustrative</DemoBanner>}

      {tab === 'profile' && (
        <section className="mah-card">
          <div className="mah-card-head"><h2>{PROFILE.name}</h2><span className="mah-muted" dir="rtl">{PROFILE.name_ar}</span></div>
          <div className="mah-facts clr-facts-grid">
            <div><span>CR number</span><strong className="mah-mono">{PROFILE.cr_number}</strong></div>
            <div><span>Faseh broker license</span><strong className="mah-mono">{PROFILE.faseh_license}</strong></div>
            <div><span>ZATCA broker ID</span><strong className="mah-mono">{PROFILE.zatca_broker_id}</strong></div>
            <div><span>City</span><strong>{PROFILE.city}</strong></div>
            <div><span>Phone</span><strong>{PROFILE.phone}</strong></div>
            <div><span>Email</span><strong>{PROFILE.email}</strong></div>
            <div className="clr-span-all"><span>Address</span><strong>{PROFILE.address}</strong></div>
            <div className="clr-span-all"><span>Ports served</span><strong>{PROFILE.ports.join(' · ')}</strong></div>
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="mah-card mah-card-flush">
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th></tr></thead>
              <tbody>
                {USERS.map(u => (
                  <tr key={u.email}>
                    <td className="mah-row-title">{u.name}</td>
                    <td>{u.role}</td>
                    <td className="mah-muted">{u.email}</td>
                    <td><span className={`mah-badge mah-tone-${u.status === 'Active' ? 'green' : 'amber'}`}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'accounts' && (
        <div className="mah-stack">
          <FasehConnectionCard token={token} />
          {ACCOUNTS.map(a => (
            <section key={a.name} className="mah-card clr-account">
              <div className="mah-action-main">
                <div className="mah-row-title">{a.name}</div>
                <div className="mah-row-sub">{a.desc}</div>
              </div>
              <span className="mah-badge mah-tone-green">● {a.status}</span>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
