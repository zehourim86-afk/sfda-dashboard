// Lab Portal shell (role LAB_ANALYST): sidebar, topbar and the active page.
// The lab receives sampling orders, advances the sampling sub-track, uploads results and can
// reject unacceptable samples. Same layout as the other portals; extra styles in lab-portal.css.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import './clearance-portal.css';
import './lab-portal.css';
import { apiFetch, Icon } from './mahShared';
import { productsFromShipments, Toast } from './clearanceShared';
import { labStage } from './labShared';
import LabOverview from './LabOverview';
import LabSamples from './LabSamples';
import LabResults from './LabResults';
import LabRejectedSamples from './LabRejectedSamples';
import LabSettings from './LabSettings';
import LabSampleDetail from './LabSampleDetail';

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'samples', label: 'Samples', icon: 'flask' },
  { page: 'results', label: 'Results', icon: 'check-circle' },
  { page: 'rejected', label: 'Rejected Samples', icon: 'x-circle' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];
const PAGE_TITLES = Object.fromEntries(NAV.map(n => [n.page, n.label]));
const TOAST_MS = 3500;

export default function LabPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  // sidebarCollapsed = locked closed (logo click); hovering a collapsed sidebar expands it temporarily
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showCollapsed = sidebarCollapsed && !sidebarHovered;
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadSamples = useCallback(async () => {
    const data = await apiFetch(token, '/lab/samples');
    setSamples(data.samples || []);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadSamples();
        if (!cancelled) setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        if (e.status === 401) { logoutRef.current(); return; }
        setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, loadSamples]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const productsById = useMemo(() => productsFromShipments(samples), [samples]);
  const pendingCount = samples.filter(s => labStage(s) === 'pending').length;
  const analysisCount = samples.filter(s => labStage(s) === 'analysis').length;
  const rejectedCount = samples.filter(s => labStage(s) === 'rejected').length;

  const openSample = useCallback((s) => setDetailId(s.id), []);
  const afterChange = useCallback(async (message) => {
    await loadSamples().catch(() => {});
    if (message) showToast(message);
  }, [loadSamples, showToast]);

  const shared = {
    token, user, samples, productsById,
    navigate: setCurrentPage, openSample, showToast, afterChange, reloadSamples: loadSamples,
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'samples': return <LabSamples {...shared} />;
      case 'results': return <LabResults {...shared} />;
      case 'rejected': return <LabRejectedSamples {...shared} />;
      case 'settings': return <LabSettings {...shared} />;
      default: return <LabOverview {...shared} />;
    }
  };

  const detailSample = detailId ? samples.find(s => s.id === detailId) : null;
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`mah-app clr-app lab-app${showCollapsed ? ' is-collapsed' : ''}`}>
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
        {!showCollapsed && <span className="mah-portal-label">Lab Portal</span>}
        <div className="mah-topbar-title"><strong>{PAGE_TITLES[currentPage]}</strong></div>
        <div className="mah-topbar-right">
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
                {item.page === 'overview' && pendingCount > 0 && <span className="mah-nav-badge mah-badge-blue">{pendingCount}</span>}
                {item.page === 'samples' && analysisCount > 0 && <span className="mah-nav-badge lab-badge-purple">{analysisCount}</span>}
                {item.page === 'rejected' && rejectedCount > 0 && <span className="mah-nav-badge mah-badge-red">{rejectedCount}</span>}
              </button>
            ))}
          </nav>
          <div className="mah-sidebar-foot">
            <div className="mah-sidebar-org">{user?.organisation_name || 'KKIA Pharmaceutical Lab'}</div>
            <div className="mah-sidebar-role">SFDA-appointed laboratory</div>
          </div>
        </aside>

        <main className="mah-content">
          {loadError && <div className="mah-alert mah-alert-amber">{loadError}</div>}
          {loading ? <div className="mah-loading">Loading samples…</div> : renderPage()}
        </main>
      </div>

      {detailSample && (
        <LabSampleDetail token={token} sample={detailSample} productsById={productsById} user={user}
          onClose={() => setDetailId(null)} afterChange={afterChange} />
      )}
      <Toast message={toast} />
    </div>
  );
}
