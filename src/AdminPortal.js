// DEMARA Admin Panel shell (role DEMARA_ADMIN): sidebar, topbar, the active page and the shared action modals.
// Sees every organisation, shipment and user; can transition, withdraw or force any shipment's state.
// Same layout as the MAH and Clearance portals; extra styles in admin-portal.css.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import './clearance-portal.css';
import './sfda-portal.css';
import './admin-portal.css';
import { apiFetch, Icon } from './mahShared';
import NotificationBell from './PortalNotificationBell';
import NotificationCentre from './NotificationCentre';
import { productsFromShipments } from './clearanceShared';
import { ShipmentModal } from './sfdaShared';
import { buildAlerts, pendingCancellations, isClosedState, TransitionModal, WithdrawModal } from './adminShared';
import AdminDashboard from './AdminDashboard';
import AdminShipments from './AdminShipments';
import AdminOrganisations from './AdminOrganisations';
import AdminUsers from './AdminUsers';
import AdminPlatformHealth from './AdminPlatformHealth';
import AdminOverrideTools from './AdminOverrideTools';
import AdminSettings from './AdminSettings';
import { PortalContent, SkeletonLoader, loadErrorFrom, useToast, ToastStack } from './PortalComponents';

// Content-area skeleton while the portal's data loads
const SKELETON = (
  <div className="mah-page">
    <div className="pc-skel-pipeline">{Array.from({ length: 6 }, (_, i) => <div key={i}><SkeletonLoader type="stat" /></div>)}</div>
    <SkeletonLoader type="card" />
    <SkeletonLoader type="table-row" count={5} />
  </div>
);

const NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: 'home' },
  { page: 'shipments', label: 'All Shipments', icon: 'box' },
  { page: 'organisations', label: 'Organisations', icon: 'building' },
  { page: 'users', label: 'Users', icon: 'users' },
  { page: 'health', label: 'Platform Health', icon: 'activity' },
  { page: 'override', label: 'Override Tools', icon: 'tool' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];
const PAGE_TITLES = { ...Object.fromEntries(NAV.map(n => [n.page, n.label])), notifications: 'Notification Centre' };

export default function AdminPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [shipmentFilter, setShipmentFilter] = useState(null); // preset when opening All Shipments from elsewhere
  const [modal, setModal] = useState(null); // { type: 'detail' | 'transition' | 'withdraw', shipment }
  // sidebarCollapsed = locked closed (logo click); hovering a collapsed sidebar expands it temporarily
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showCollapsed = sidebarCollapsed && !sidebarHovered;
  // App passes a new onLogout each render; a ref keeps the data-loading effect from re-running
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const [shipments, setShipments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [users, setUsers] = useState([]);
  const [cancelAudit, setCancelAudit] = useState(null);   // null = not available
  const [withdrawAudit, setWithdrawAudit] = useState(null);
  const [suspendedOrgs, setSuspendedOrgs] = useState(() => new Set()); // demo only, not saved
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to re-run the initial load ("Try again")

  const loadShipments = useCallback(async () => {
    const data = await apiFetch(token, '/shipments?limit=500');
    setShipments(data.shipments || []);
  }, [token]);
  const loadUsers = useCallback(async () => {
    const data = await apiFetch(token, '/admin/users');
    setUsers(data.users || []);
  }, [token]);
  // Audit rows for alerts and the cancellation processor. Missing endpoint → alerts that need it are skipped.
  const loadAlertAudit = useCallback(async () => {
    const [c, w] = await Promise.allSettled([
      apiFetch(token, '/admin/audit-log?action=CANCELLATION_REQUESTED,CANCELLATION_REJECTED&limit=500'),
      apiFetch(token, '/admin/audit-log?to_state=WITHDRAWN&limit=500'),
    ]);
    setCancelAudit(c.status === 'fulfilled' ? c.value.entries || [] : null);
    setWithdrawAudit(w.status === 'fulfilled' ? w.value.entries || [] : null);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        loadShipments(), loadUsers(), loadAlertAudit(),
        apiFetch(token, '/admin/organisations').then(d => !cancelled && setOrganisations(d.organisations || [])),
      ]);
      if (cancelled) return;
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.some(r => r.reason?.status === 401)) {
        logoutRef.current();
        return;
      }
      // The first request (shipments) failing is fatal: full-page error; the others show a banner
      setLoadError(loadErrorFrom(results));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, loadShipments, loadUsers, loadAlertAudit, reloadKey]);
  const retryLoad = useCallback(() => setReloadKey(k => k + 1), []);

  // showToast(message, type = 'success' | 'error' | 'warning' | 'info')
  const { toasts, addToast: showToast, removeToast } = useToast();

  const productsById = useMemo(() => productsFromShipments(shipments), [shipments]);
  const orgsById = useMemo(() => Object.fromEntries(organisations.map(o => [o.id, o])), [organisations]);
  const shipmentsById = useMemo(() => Object.fromEntries(shipments.map(s => [s.id, s])), [shipments]);
  const cancellations = useMemo(() => pendingCancellations(cancelAudit, shipmentsById), [cancelAudit, shipmentsById]);
  const alerts = useMemo(() => buildAlerts(shipments, { cancellations, withdrawals: withdrawAudit }),
    [shipments, cancellations, withdrawAudit]);
  const attentionIds = useMemo(() => new Set(alerts.map(a => a.shipment.id)), [alerts]);
  const activeCount = shipments.filter(s => !isClosedState(s)).length;

  const closeModal = useCallback(() => setModal(null), []);
  // After any admin change: reload everything a change can affect, close the modal, confirm
  const afterChange = useCallback(async (message) => {
    setModal(null);
    await Promise.allSettled([loadShipments(), loadAlertAudit()]);
    if (message) showToast(message);
  }, [loadShipments, loadAlertAudit, showToast]);

  const navigate = (page, filter = null) => {
    setShipmentFilter(filter);
    setCurrentPage(page);
  };

  const shared = {
    token, user, shipments, organisations, users, productsById, orgsById, shipmentsById,
    alerts, attentionIds, cancellations, cancelAuditAvailable: cancelAudit !== null,
    suspendedOrgs, setSuspendedOrgs, navigate, showToast, afterChange,
    reloadShipments: loadShipments, reloadUsers: loadUsers,
    openShipment: (shipment) => setModal({ type: 'detail', shipment }),
    openTransition: (shipment) => setModal({ type: 'transition', shipment }),
    openWithdraw: (shipment) => setModal({ type: 'withdraw', shipment }),
  };

  const handleOpenNotificationCentre = () => {
    navigate('notifications');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'notifications':
        return <NotificationCentre token={token} onNavigateToShipment={() => navigate('shipments')} />;
      case 'shipments': return <AdminShipments {...shared} key={shipmentFilter || 'all'} initialFilter={shipmentFilter} />;
      case 'organisations': return <AdminOrganisations {...shared} />;
      case 'users': return <AdminUsers {...shared} />;
      case 'health': return <AdminPlatformHealth {...shared} />;
      case 'override': return <AdminOverrideTools {...shared} />;
      case 'settings': return <AdminSettings {...shared} />;
      default: return <AdminDashboard {...shared} />;
    }
  };

  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const modalShipment = modal && (shipmentsById[modal.shipment.id] || modal.shipment);

  return (
    <div className={`mah-app clr-app adm-app${showCollapsed ? ' is-collapsed' : ''}`}>
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
        {!showCollapsed && <span className="mah-portal-label">DEMARA Admin</span>}
        <div className="mah-topbar-title"><strong>{PAGE_TITLES[currentPage]}</strong></div>
        <div className="mah-topbar-right">
          <NotificationBell token={token} onNavigateToShipment={() => navigate('shipments')} onOpenNotificationCentre={handleOpenNotificationCentre} />
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
                onClick={() => navigate(item.page)} aria-current={currentPage === item.page ? 'page' : undefined}
                title={showCollapsed ? item.label : undefined}>
                <Icon name={item.icon} />
                <span className="mah-nav-label">{item.label}</span>
                {item.page === 'dashboard' && activeCount > 0 && <span className="mah-nav-badge mah-badge-blue">{activeCount}</span>}
                {item.page === 'shipments' && attentionIds.size > 0 && <span className="mah-nav-badge mah-badge-red">{attentionIds.size}</span>}
              </button>
            ))}
          </nav>
          <div className="mah-sidebar-foot">
            <div className="mah-sidebar-org adm-foot-title">DEMARA Admin <span className="adm-admin-pill">ADMIN</span></div>
            <div className="mah-sidebar-role">Platform control · all organisations</div>
          </div>
        </aside>

        <main className="mah-content">
          <PortalContent loading={loading} error={loadError} onRetry={retryLoad} skeleton={SKELETON}>{renderPage()}</PortalContent>
        </main>
      </div>

      {modal?.type === 'detail' && (
        <ShipmentModal token={token} shipment={modalShipment} productsById={productsById} orgsById={orgsById} onClose={closeModal}
          footer={!isClosedState(modalShipment) && <>
            <button className="mah-btn mah-btn-red mah-btn-sm" onClick={() => setModal({ type: 'withdraw', shipment: modalShipment })}>Withdraw</button>
            <span className="mah-grow" />
            <button className="mah-btn mah-btn-primary mah-btn-sm" onClick={() => setModal({ type: 'transition', shipment: modalShipment })}>Transition →</button>
          </>} />
      )}
      {modal?.type === 'transition' && (
        <TransitionModal token={token} shipment={modalShipment} productsById={productsById} onClose={closeModal} onDone={afterChange} />
      )}
      {modal?.type === 'withdraw' && (
        <WithdrawModal token={token} shipment={modalShipment} productsById={productsById} onClose={closeModal} onDone={afterChange} />
      )}
      <ToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
}
