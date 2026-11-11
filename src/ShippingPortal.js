// Shipping Portal shell (role SHIPPING_COMPANY): sidebar, topbar and the active page.
// Tracks the physical movement of shipments. Read-only; map views are placeholders for now.
// Same layout as the other portals; extra styles in shipping-portal.css.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import './clearance-portal.css';
import './shipping-portal.css';
import { apiFetch, Icon } from './mahShared';
import NotificationBell from './PortalNotificationBell';
import NotificationCentre from './NotificationCentre';
import { productsFromShipments } from './clearanceShared';
import { isActiveShipment } from './shippingShared';
import ShippingOverview from './ShippingOverview';
import ShippingActiveShipments from './ShippingActiveShipments';
import ShippingTracking from './ShippingTracking';
import ShippingDocuments from './ShippingDocuments';
import ShippingSettings from './ShippingSettings';
import ShippingShipmentDetail from './ShippingShipmentDetail';
import { PortalContent, SkeletonLoader } from './PortalComponents';

// Content-area skeleton while the portal's data loads
const SKELETON = (
  <div className="mah-page">
    <SkeletonLoader type="card" lines={2} />
    <SkeletonLoader type="table-row" count={6} />
  </div>
);

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'active', label: 'Active Shipments', icon: 'truck' },
  { page: 'tracking', label: 'Tracking', icon: 'map-pin' },
  { page: 'documents', label: 'Documents', icon: 'file-text' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];
const PAGE_TITLES = { ...Object.fromEntries(NAV.map(n => [n.page, n.label])), notifications: 'Notification Centre' };

export default function ShippingPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [detailId, setDetailId] = useState(null);
  // sidebarCollapsed = locked closed (logo click); hovering a collapsed sidebar expands it temporarily
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showCollapsed = sidebarCollapsed && !sidebarHovered;
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to re-run the initial load ("Try again")

  const loadShipments = useCallback(async () => {
    const data = await apiFetch(token, '/shipping/shipments');
    setShipments(data.shipments || []);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadShipments();
        if (!cancelled) setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 401) { logoutRef.current(); return; }
        setLoadError({ message: e.message, fatal: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, loadShipments, reloadKey]);
  const retryLoad = useCallback(() => setReloadKey(k => k + 1), []);

  const productsById = useMemo(() => productsFromShipments(shipments), [shipments]);
  const activeCount = shipments.filter(isActiveShipment).length;
  const openShipment = useCallback((s) => setDetailId(s.id), []);

  const shared = { token, user, shipments, productsById, navigate: setCurrentPage, openShipment };

  const handleOpenNotificationCentre = () => {
    setCurrentPage('notifications');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'notifications':
        return <NotificationCentre token={token} onNavigateToShipment={() => setCurrentPage('active')} />;
      case 'active': return <ShippingActiveShipments {...shared} />;
      case 'tracking': return <ShippingTracking {...shared} />;
      case 'documents': return <ShippingDocuments {...shared} />;
      case 'settings': return <ShippingSettings {...shared} />;
      default: return <ShippingOverview {...shared} />;
    }
  };

  const detailShipment = detailId ? shipments.find(s => s.id === detailId) : null;
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`mah-app clr-app ship-app${showCollapsed ? ' is-collapsed' : ''}`}>
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
        {!showCollapsed && <span className="mah-portal-label">Shipping Portal</span>}
        <div className="mah-topbar-title"><strong>{PAGE_TITLES[currentPage]}</strong></div>
        <div className="mah-topbar-right">
          <NotificationBell token={token} onNavigateToShipment={() => setCurrentPage('active')} onOpenNotificationCentre={handleOpenNotificationCentre} />
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
                {item.page === 'active' && activeCount > 0 && <span className="mah-nav-badge mah-badge-blue">{activeCount}</span>}
              </button>
            ))}
          </nav>
          <div className="mah-sidebar-foot">
            <div className="mah-sidebar-org">{user?.organisation_name || 'Saudi Logistics Co.'}</div>
            <div className="mah-sidebar-role">Shipping company</div>
          </div>
        </aside>

        <main className="mah-content">
          <PortalContent loading={loading} error={loadError} onRetry={retryLoad} skeleton={SKELETON}>{renderPage()}</PortalContent>
        </main>
      </div>

      {detailShipment && (
        <ShippingShipmentDetail token={token} shipment={detailShipment} productsById={productsById} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}
