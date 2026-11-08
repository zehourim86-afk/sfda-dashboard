// Clearance Portal (customs broker) shell: sidebar, topbar and the active page.
// Same layout and behaviour as the MAH portal; reuses mah-portal.css, with clearance-only styles
// in clearance-portal.css.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import './clearance-portal.css';
import { apiFetch, Icon, stateOf } from './mahShared';
import NotificationBell from './PortalNotificationBell';
import NotificationCentre from './NotificationCentre';
import { MahAssistant } from './MahPortal';
import { brokerAction, COMPLETED_STATES, productsFromShipments, Toast } from './clearanceShared';
import ClearanceOverview from './ClearanceOverview';
import ClearanceShipments from './ClearanceShipments';
import ClearanceShipmentDetail from './ClearanceShipmentDetail';
import ClearanceFaseh from './ClearanceFaseh';
import ClearanceSFDATrack from './ClearanceSFDATrack';
import ClearanceCustoms from './ClearanceCustoms';
import ClearanceSettings from './ClearanceSettings';

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'shipments', label: 'Shipments', icon: 'box' },
  { page: 'faseh', label: 'Faseh & Filing', icon: 'file-text' },
  { page: 'sfda', label: 'SFDA Track', icon: 'shield' },
  { page: 'customs', label: 'Customs Track', icon: 'truck' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];

const PAGE_TITLES = {
  overview: 'Overview',
  shipments: 'Shipments',
  'shipment-detail': 'Shipment',
  faseh: 'Faseh & Filing',
  sfda: 'SFDA Track',
  customs: 'Customs Track',
  settings: 'Settings',
  notifications: 'Notification Centre',
};

const BROKER_PROMPTS = [
  { label: 'Filing queue', text: 'Which shipments are waiting for me to file the Faseh declaration?' },
  { label: 'Info requests', text: 'Which SFDA information requests are still open?' },
  { label: 'Customs status', text: 'Which shipments have paid duties but not gated out yet?' },
  { label: 'SFDA timing', text: 'How long does SFDA typically take to decide?' },
];
const BROKER_GREETING = "Hello! I'm your MASAAR AI assistant. I can help you track Faseh filings, SFDA requests, sampling and customs steps across your assigned shipments.";

export default function ClearancePortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [currentShipment, setCurrentShipment] = useState(null);
  const [detailTab, setDetailTab] = useState('timeline');
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
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // The API returns only shipments assigned to this clearance company
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
  const actionCount = shipments.filter(brokerAction).length;
  const activeCount = shipments.filter(s => !COMPLETED_STATES.includes(stateOf(s))).length;
  const myOrg = organisations.find(o => o.id === user?.organisation_id) || null;

  const navigate = (page) => {
    setCurrentPage(page);
    if (page !== 'shipment-detail') setCurrentShipment(null);
  };
  const openShipment = (shipment, tab = 'timeline') => {
    setCurrentShipment(shipment);
    setDetailTab(tab);
    setCurrentPage('shipment-detail');
  };

  // Bell → shipment detail. Uses the listed row when there is one (it may be the limited
  // pending-request view); the detail page loads the full record itself.
  const handleNotificationNavigate = (shipmentId) => {
    openShipment(shipments.find(s => s.id === shipmentId) || { id: shipmentId });
    loadShipments().catch(() => {});
  };

  const shared = {
    token, user, shipments, organisations, productsById, showToast,
    navigate, openShipment, setCurrentShipment: openShipment, reloadShipments: loadShipments,
  };

  const handleOpenNotificationCentre = () => {
    setCurrentPage('notifications');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'notifications':
        return <NotificationCentre token={token} onNavigateToShipment={handleNotificationNavigate} />;
      case 'shipments': return <ClearanceShipments {...shared} />;
      case 'shipment-detail':
        return currentShipment
          ? <ClearanceShipmentDetail {...shared} key={currentShipment.id} shipment={currentShipment} initialTab={detailTab} />
          : <ClearanceShipments {...shared} />;
      case 'faseh': return <ClearanceFaseh {...shared} />;
      case 'sfda': return <ClearanceSFDATrack {...shared} />;
      case 'customs': return <ClearanceCustoms {...shared} />;
      case 'settings': return <ClearanceSettings {...shared} />;
      default: return <ClearanceOverview {...shared} />;
    }
  };

  const activeNav = currentPage === 'shipment-detail' ? 'shipments' : currentPage;
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`mah-app clr-app${showCollapsed ? ' is-collapsed' : ''}`}>
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
        {!showCollapsed && <span className="mah-portal-label">Clearance Portal</span>}
        <div className="mah-topbar-title"><strong>{PAGE_TITLES[currentPage]}</strong></div>
        <div className="mah-topbar-right">
          <NotificationBell token={token} onNavigateToShipment={handleNotificationNavigate} onOpenNotificationCentre={handleOpenNotificationCentre} />
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
              <button key={item.page} className={`mah-nav-item${activeNav === item.page ? ' is-active' : ''}`}
                onClick={() => navigate(item.page)} aria-current={activeNav === item.page ? 'page' : undefined}
                title={showCollapsed ? item.label : undefined}>
                <Icon name={item.icon} />
                <span className="mah-nav-label">{item.label}</span>
                {item.page === 'overview' && actionCount > 0 && <span className="mah-nav-badge mah-badge-red">{actionCount}</span>}
                {item.page === 'shipments' && activeCount > 0 && <span className="mah-nav-badge mah-badge-blue">{activeCount}</span>}
              </button>
            ))}
          </nav>
          <div className="mah-sidebar-foot">
            <div className="mah-sidebar-org">{myOrg?.name_en || 'Clearance company'}</div>
            <div className="mah-sidebar-role">Customs Broker</div>
          </div>
        </aside>

        <main className="mah-content">
          {loadError && <div className="mah-alert mah-alert-amber">{loadError}</div>}
          {loading ? <div className="mah-loading">Loading assigned shipments…</div> : renderPage()}
        </main>
      </div>

      <MahAssistant token={token} actionCount={actionCount} activeCount={activeCount}
        prompts={BROKER_PROMPTS} greeting={BROKER_GREETING} placeholder="Ask about your assigned shipments…" />

      <Toast message={toast} />
    </div>
  );
}
