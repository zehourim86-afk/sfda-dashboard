// MAH portal — Settings. Read-only for now; values not yet stored come from demo data.
import { useState } from 'react';
import { Tabs, fmtDate } from './mahShared';

const DEMO_COMPANY = {
  name_en: 'Al Noor Health Trading Co.',
  name_ar: 'شركة النور للتجارة الصحية',
  cr_number: '1010456789',
  sfda_licence: 'SFDA-IMP-2024-08817',
  sfda_licence_expiry: '2027-03-31',
  address: 'King Fahd Road, Al Olaya, Riyadh 12214',
  vat: '310245678900003',
};
const DEMO_USERS = [
  { name: 'Regulatory Affairs Lead', role: 'RA Lead · Org admin', email: 'ra.lead@example.sa' },
  { name: 'Import Coordinator', role: 'Shipment editor', email: 'imports@example.sa' },
  { name: 'Finance Officer', role: 'Read-only · Duties', email: 'finance@example.sa' },
];
const NOTIFICATIONS = [
  { event: 'SFDA rejection', channels: ['Email', 'SMS', 'In-app'] },
  { event: 'Ready to submit', channels: ['Email', 'In-app'] },
  { event: 'Customs released', channels: ['Email', 'In-app'] },
  { event: 'Registration expiring (90 days)', channels: ['Email'] },
  { event: 'Weekly summary', channels: ['Email'] },
];
const CHANNELS = [
  { name: 'Email', detail: 'Account email address', on: true },
  { name: 'SMS', detail: '+966 5• ••• ••12', on: true },
  { name: 'WhatsApp Business', detail: 'Not connected', on: false },
  { name: 'Microsoft Teams', detail: 'Not connected', on: false },
];

export default function MahSettings({ user, org }) {
  const [tab, setTab] = useState('company');
  const company = {
    ...DEMO_COMPANY,
    ...(org ? { name_en: org.name_en, name_ar: org.name_ar || DEMO_COMPANY.name_ar, cr_number: org.cr_number || DEMO_COMPANY.cr_number } : {}),
  };
  const users = user ? [{ name: user.full_name, role: user.is_org_admin ? 'Org admin (you)' : 'You', email: user.email }, ...DEMO_USERS.slice(1)] : DEMO_USERS;

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Settings</h1>
          <p className="mah-muted">Read-only for now — contact DEMARA support to change these details</p>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'company', label: 'Company Profile' }, { key: 'users', label: 'Users' },
        { key: 'notifications', label: 'Notifications' }, { key: 'channels', label: 'Channels' },
      ]} />

      {tab === 'company' && (
        <section className="mah-card">
          <div className="mah-card-head"><h2>{company.name_en}</h2></div>
          <div className="mah-facts">
            <div><span>Name (Arabic)</span><strong dir="rtl">{company.name_ar}</strong></div>
            <div><span>Commercial registration (CR)</span><strong className="mah-mono">{company.cr_number}</strong></div>
            <div><span>SFDA import licence</span><strong className="mah-mono">{company.sfda_licence}</strong></div>
            <div><span>Licence valid until</span><strong>{fmtDate(company.sfda_licence_expiry)}</strong></div>
            <div><span>VAT number</span><strong className="mah-mono">{company.vat}</strong></div>
            <div><span>Address</span><strong>{company.address}</strong></div>
          </div>
          {!org && <p className="mah-small mah-muted">Showing demo values — organisation details could not be loaded.</p>}
        </section>
      )}

      {tab === 'users' && (
        <section className="mah-card mah-card-flush">
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead>
              <tbody>{users.map(u => <tr key={u.email}><td className="mah-row-title">{u.name}</td><td>{u.role}</td><td className="mah-muted">{u.email}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="mah-card mah-card-flush">
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Event</th><th>Channels</th></tr></thead>
              <tbody>
                {NOTIFICATIONS.map(n => (
                  <tr key={n.event}>
                    <td className="mah-row-title">{n.event}</td>
                    <td>{n.channels.map(c => <span key={c} className="mah-badge mah-tone-blue mah-mr">{c}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'channels' && (
        <div className="mah-card-grid">
          {CHANNELS.map(c => (
            <section key={c.name} className={`mah-card${c.on ? '' : ' is-dimmed'}`}>
              <div className="mah-card-head"><h2>{c.name}</h2><span className={`mah-badge mah-tone-${c.on ? 'green' : 'grey'}`}>{c.on ? 'On' : 'Off'}</span></div>
              <p className="mah-small mah-muted">{c.detail}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
