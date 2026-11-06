// SFDA Observer — Settings: read-only department and account details (demo values).
import { DemoBanner } from './mahShared';

const DEPARTMENT = [
  ['Authority', 'Saudi Food & Drug Authority (SFDA)'],
  ['Department', 'Food Sector — Import Control'],
  ['Unit', 'Port Release Monitoring'],
  ['Region', 'Eastern Province — King Abdulaziz Port, Dammam'],
  ['Working hours', 'Sun–Thu, 08:00–16:00 (Riyadh time)'],
  ['Contact', 'import.control@sfda.gov.sa'],
];

export default function SfdaSettings({ user }) {
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Settings</h1>
          <p className="mah-muted">Your SFDA observer account. Nothing here can be edited from MASAAR.</p>
        </div>
      </div>

      <section className="mah-card">
        <div className="mah-card-head"><h2>Your account</h2></div>
        <div className="clr-facts-grid mah-facts">
          <div><span>Name</span><strong>{user?.full_name || '—'}</strong></div>
          <div><span>Email</span><strong>{user?.email || '—'}</strong></div>
          <div><span>Access</span><strong>SFDA Observer — read-only</strong></div>
        </div>
      </section>

      <section className="mah-card">
        <div className="mah-card-head"><h2>Department</h2></div>
        <DemoBanner>illustrative department details</DemoBanner>
        <div className="clr-facts-grid mah-facts">
          {DEPARTMENT.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="mah-card">
        <div className="mah-card-head"><h2>What this portal can do</h2></div>
        <ul className="mah-plain-list">
          <li>See every shipment submitted to SFDA, sampling progress and decisions.</li>
          <li>Open a shipment to view its documents list and audit timeline.</li>
          <li>Keep internal notes on a shipment — stored on this device and visible only to SFDA.</li>
          <li>It cannot change a shipment's state or any shipment data.</li>
        </ul>
      </section>
    </div>
  );
}
