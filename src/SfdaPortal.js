// SFDA Observer Portal shell (role SFDA_OFFICER): sidebar, topbar and the active page.
// Read-only: no state transitions or edits. The only write is SFDA internal notes, kept in this browser.
// Same layout as the MAH and Clearance portals; extra styles in sfda-portal.css.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import './clearance-portal.css';
import './sfda-portal.css';
import { apiFetch, Icon, stateOf } from './mahShared';
import NotificationBell from './PortalNotificationBell';
import { productsFromShipments } from './clearanceShared';
import { ShipmentModal } from './sfdaShared';
import SfdaOverview from './SfdaOverview';
import SfdaSubmissions from './SfdaSubmissions';
import SfdaSampling from './SfdaSampling';
import SfdaDecisions from './SfdaDecisions';
import SfdaSettings from './SfdaSettings';

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'submissions', label: 'Submissions', icon: 'inbox' },
  { page: 'sampling', label: 'Sampling', icon: 'flask' },
  { page: 'decisions', label: 'Decisions', icon: 'check-circle' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];
const PAGE_TITLES = Object.fromEntries(NAV.map(n => [n.page, n.label]));

export default function SfdaPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [modal, setModal] = useState(null); // { shipment, focus }
  // sidebarCollapsed = locked closed (logo click); hovering a collapsed sidebar expands it temporarily
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showCollapsed = sidebarCollapsed && !sidebarHovered;
  // App passes a new onLogout each render; a ref keeps the data-loading effect from re-running
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const [shipments, setShipments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadShipments = useCallback(async () => {
    const data = await apiFetch(token, '/shipments?limit=500');
    setShipments(data.shipments || []);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        loadShipments(),
        apiFetch(token, '/admin/organisations').then(d => !cancelled && setOrganisations(d.organisations || [])),
      ]);
      if (cancelled) return;
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.some(r => r.reason?.status === 401)) {
        logoutRef.current();
        return;
      }
      setLoadError(failed.length ? `Some data could not be loaded: ${failed[0].reason.message}` : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, loadShipments]);

  const productsById = useMemo(() => productsFromShipments(shipments), [shipments]);
  const orgsById = useMemo(() => Object.fromEntries(organisations.map(o => [o.id, o])), [organisations]);
  const submittedCount = shipments.filter(s => stateOf(s) === 'SUBMITTED').length;
  const samplingCount = shipments.filter(s => stateOf(s) === 'SAMPLING').length;
  const closeModal = useCallback(() => setModal(null), []);

  const shared = {
    token, user, shipments, organisations, productsById, orgsById,
    navigate: setCurrentPage,
    openShipment: (shipment, focus) => setModal({ shipment, focus }),
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'submissions': return <SfdaSubmissions {...shared} />;
      case 'sampling': return <SfdaSampling {...shared} />;
      case 'decisions': return <SfdaDecisions {...shared} />;
      case 'settings': return <SfdaSettings {...shared} />;
      default: return <SfdaOverview {...shared} />;
    }
  };

  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`mah-app clr-app sfda-app${showCollapsed ? ' is-collapsed' : ''}`}>
      <header className="mah-topbar">
        {/* The logo doubles as the sidebar collapse/expand toggle */}
        <button className="mah-logo-area" onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed}>
          {showCollapsed ? (
            <span className="mah-logo-mark"><img src="/demara-logo-transparent.png" alt="DEMARA" /></span>
          ) : (
            <img src="/demara-logo-transparent.png" alt="DEMARA" style={{ height: '40px', width: 'auto' }} />
          )}
        </button>
        {!showCollapsed && <span className="mah-portal-label">SFDA Observer</span>}
        <div className="mah-topbar-title"><strong>{PAGE_TITLES[currentPage]}</strong></div>
        <div className="mah-topbar-right">
          <NotificationBell token={token} />
          <span className="mah-badge mah-tone-blue sfda-readonly-pill">Read-only</span>
          <div className="mah-user-chip">
            <span className="mah-avatar">{initials}</span>
            <span className="mah-user-name">{user?.full_name || user?.email}</span>
          </div>
          <button className="mah-icon-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="mah-body">
        <aside className="mah-sidebar" onMouseEnter={() => setSidebarHovered(true)} onMouseLeave={() => setSidebarHovered(false)}>
          <nav className="mah-nav">
            {NAV.map(item => (
              <button key={item.page} className={`mah-nav-item${currentPage === item.page ? ' is-active' : ''}`}
                onClick={() => setCurrentPage(item.page)} aria-current={currentPage === item.page ? 'page' : undefined}
                title={showCollapsed ? item.label : undefined}>
                <Icon name={item.icon} />
                <span className="mah-nav-label">{item.label}</span>
                {item.page === 'submissions' && submittedCount > 0 && <span className="mah-nav-badge mah-badge-blue">{submittedCount}</span>}
                {item.page === 'sampling' && samplingCount > 0 && <span className="mah-nav-badge sfda-badge-purple">{samplingCount}</span>}
              </button>
            ))}
          </nav>
          <div className="mah-sidebar-foot">
            <div className="mah-sidebar-org">Saudi Food &amp; Drug Authority</div>
            <div className="mah-sidebar-role">SFDA Observer · read-only</div>
          </div>
        </aside>

        <main className="mah-content">
          {loadError && <div className="mah-alert mah-alert-amber">{loadError}</div>}
          {loading ? <div className="mah-loading">Loading shipments…</div> : renderPage()}
        </main>
      </div>

      {modal && (
        <ShipmentModal token={token} shipment={modal.shipment} focus={modal.focus} productsById={productsById} orgsById={orgsById}
          notesAuthor={user?.full_name || user?.email || 'SFDA'} onClose={closeModal} />
      )}
    </div>
  );
}
