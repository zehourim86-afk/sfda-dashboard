// Email notification preferences (MAH + Clearance settings → Notifications tab).
// Stored in this browser only: localStorage 'email_prefs' = { email_sfda_decisions: true, ... }.
// Every preference is on unless it was switched off. The server does not read these yet.
import { useState } from 'react';

const STORAGE_KEY = 'email_prefs';
export const EMAIL_PREFS = [
  { key: 'email_sfda_decisions', label: 'SFDA Decisions', detail: 'Release, rejection and sampling orders' },
  { key: 'email_objection_deadlines', label: 'Objection deadline reminders', detail: '30, 14, 7 and 3 days before the 60-day window closes' },
  { key: 'email_registration_expiry', label: 'Registration expiry alerts', detail: 'Product registrations expiring within 90 days' },
  { key: 'email_broker_responses', label: 'Broker acceptance/decline', detail: 'When a clearance company answers an engagement request' },
  { key: 'email_lab_results', label: 'Lab results submitted', detail: 'When the QC lab submits sampling results' },
  { key: 'email_shipment_closed', label: 'Shipment closed/released', detail: 'Cleared, re-exported or destroyed' },
];

function readPrefs() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

export default function EmailPreferences({ email }) {
  const [prefs, setPrefs] = useState(readPrefs);
  const isOn = (key) => prefs[key] !== false;

  const toggle = (key) => {
    const next = { ...prefs, [key]: !isOn(key) };
    setPrefs(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage blocked: keep in memory */ }
  };

  return (
    <section className="mah-card">
      <div className="mah-card-head"><h2>Email Notifications</h2></div>
      <p className="mah-muted mah-small">Choose which events trigger email notifications to your registered address.</p>
      <div className="mah-email-prefs">
        {EMAIL_PREFS.map(p => (
          <label key={p.key} className="mah-email-pref">
            <span className="mah-email-pref-text">
              <span className="mah-row-title">{p.label}</span>
              <span className="mah-row-sub">{p.detail}</span>
            </span>
            <span className="mah-switch">
              <input type="checkbox" checked={isOn(p.key)} onChange={() => toggle(p.key)} />
              <span className="mah-switch-track"><span className="mah-switch-thumb" /></span>
            </span>
          </label>
        ))}
      </div>
      <p className="mah-email-pref-note">Notifications are sent to: <strong>{email || 'your account email'}</strong></p>
      <p className="mah-muted mah-small">To update your email address, contact your DEMARA administrator.</p>
    </section>
  );
}
