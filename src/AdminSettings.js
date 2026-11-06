// Admin Panel — Settings: read-only platform configuration (demo values).
import { useState } from 'react';
import { Tabs, DemoBanner } from './mahShared';

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'email', label: 'Email' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
];

const SETTINGS = {
  general: [
    ['Platform version', 'MASAAR v1.0.0-beta'],
    ['Environment', 'Production Demo'],
    ['Support email', 'support@demara.sa'],
    ['Default timezone', 'Asia/Riyadh (UTC+3)'],
    ['Default language', 'English (Arabic available)'],
    ['Data region', 'Saudi Arabia'],
  ],
  email: [
    ['Outgoing sender', 'notifications@demara.sa'],
    ['Reply-to', 'support@demara.sa'],
    ['SFDA email parser inbox', 'sfda-inbox@demara.sa'],
    ['Parser polling interval', 'Every 5 minutes'],
    ['Daily digest', 'Enabled — 07:00 Riyadh time'],
  ],
  notifications: [
    ['In-app notifications', 'Enabled for all roles'],
    ['SFDA decision alerts', 'Email + in-app'],
    ['Objection deadline reminders', '14, 7 and 2 days before'],
    ['Disposition deadline alert', 'After 14 days pending'],
    ['Escalation emails', 'Manual trigger only'],
  ],
  security: [
    ['Session timeout', '60 minutes of inactivity'],
    ['Password minimum length', '8 characters'],
    ['Password hashing', 'bcrypt, cost 12'],
    ['Two-factor authentication', 'Planned'],
    ['Audit log retention', 'Indefinite'],
  ],
};

export default function AdminSettings() {
  const [tab, setTab] = useState('general');
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Platform settings</h1>
          <p className="mah-muted">Read-only for now — changes are made in the server configuration.</p>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <section className="mah-card">
        {tab !== 'general' && <DemoBanner>illustrative configuration values</DemoBanner>}
        <div className="clr-facts-grid mah-facts">
          {SETTINGS[tab].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>
    </div>
  );
}
