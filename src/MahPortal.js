// MAH (importer) portal shell: sidebar, topbar and the active page.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './mah-portal.css';
import { apiFetch, Icon, needsAction, isClosed } from './mahShared';
import { Toast } from './clearanceShared';
import NotificationBell from './PortalNotificationBell';
import NotificationCentre from './NotificationCentre';
import MahOverview from './MahOverview';
import MahShipments from './MahShipments';
import MahShipmentDetail from './MahShipmentDetail';
import MahNewShipment from './MahNewShipment';
import MahProducts from './MahProducts';
import MahSuppliers from './MahSuppliers';
import MahNetwork from './MahNetwork';
import MahIntelligence from './MahIntelligence';
import MahMarketIntelligence from './MahMarketIntelligence';
import MahSettings from './MahSettings';

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'shipments', label: 'Shipments & Tracking', icon: 'box' },
  { page: 'products', label: 'Products & Registrations', icon: 'flask' },
  { page: 'suppliers', label: 'Suppliers', icon: 'factory' },
  { page: 'network', label: 'Network & Accounts', icon: 'link' },
  { page: 'intelligence', label: 'My Performance', icon: 'star' },
  { page: 'market-intelligence', label: 'Market Intelligence', icon: 'globe' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];

const PAGE_TITLES = {
  overview: 'Overview',
  shipments: 'Shipments & Tracking',
  'shipment-detail': 'Shipment',
  products: 'Products & Registrations',
  suppliers: 'Suppliers',
  network: 'Network & Accounts',
  intelligence: 'My Performance',
  'market-intelligence': 'Market Intelligence',
  settings: 'Settings',
  notifications: 'Notification Centre',
};

export default function MahPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [currentShipment, setCurrentShipment] = useState(null);
  const [detailTab, setDetailTab] = useState('timeline');
  const [showNewShipment, setShowNewShipment] = useState(false);
  // sidebarCollapsed = locked closed (logo click); hovering a collapsed sidebar expands it temporarily
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showCollapsed = sidebarCollapsed && !sidebarHovered;
  // App passes a new onLogout each render; a ref keeps the data-loading effect from re-running
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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

  const loadShipments = useCallback(async () => {
    const data = await apiFetch(token, '/shipments?limit=500');
    setShipments(data.shipments || []);
  }, [token]);
  const loadProducts = useCallback(async () => {
    const data = await apiFetch(token, '/products?include_inactive=true');
    setProducts(data.products || []);
  }, [token]);
  const loadSuppliers = useCallback(async () => {
    const data = await apiFetch(token, '/suppliers?include_inactive=true');
    setSuppliers(data.suppliers || []);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        loadShipments(), loadProducts(), loadSuppliers(),
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
  }, [token, loadShipments, loadProducts, loadSuppliers]);

  const productsById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const suppliersById = useMemo(() => Object.fromEntries(suppliers.map(s => [s.id, s])), [suppliers]);
  const actionCount = shipments.filter(needsAction).length;
  const activeCount = shipments.filter(s => !isClosed(s)).length;
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

  // Bell → shipment detail; the detail page loads the full record itself
  const handleNotificationNavigate = (shipmentId) => {
    setCurrentShipment(shipments.find(s => s.id === shipmentId) || { id: shipmentId });
    setDetailTab('timeline');
    setCurrentPage('shipment-detail');
    loadShipments().catch(() => {});
  };

  const shared = {
    token, user, shipments, products, suppliers, organisations, productsById, suppliersById,
    navigate, openShipment, onNewShipment: () => setShowNewShipment(true), showToast,
    reloadShipments: loadShipments, reloadProducts: loadProducts, reloadSuppliers: loadSuppliers,
  };

  const handleOpenNotificationCentre = () => {
    setCurrentPage('notifications');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'notifications':
        return <NotificationCentre token={token} onNavigateToShipment={handleNotificationNavigate} />;
      case 'shipments': return <MahShipments {...shared} />;
      case 'shipment-detail':
        return currentShipment
          ? <MahShipmentDetail {...shared} key={currentShipment.id} shipment={currentShipment} initialTab={detailTab} />
          : <MahShipments {...shared} />;
      case 'products': return <MahProducts {...shared} />;
      case 'suppliers': return <MahSuppliers {...shared} />;
      case 'network': return <MahNetwork {...shared} />;
      case 'intelligence': return <MahIntelligence {...shared} />;
      case 'market-intelligence': return <MahMarketIntelligence {...shared} />;
      case 'settings': return <MahSettings {...shared} org={myOrg} />;
      default: return <MahOverview {...shared} />;
    }
  };

  const activeNav = currentPage === 'shipment-detail' ? 'shipments' : currentPage;
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`mah-app${showCollapsed ? ' is-collapsed' : ''}`}>
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
        {!showCollapsed && <span className="mah-portal-label">MAH Portal</span>}
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
            <div className="mah-sidebar-org">{myOrg?.name_en || 'MAH account'}</div>
            <div className="mah-sidebar-role">Marketing Authorisation Holder</div>
          </div>
        </aside>

        <main className="mah-content">
          {loadError && <div className="mah-alert mah-alert-amber">{loadError}</div>}
          {loading ? <div className="mah-loading">Loading your shipments…</div> : renderPage()}
        </main>
      </div>

      <MahAssistant token={token} actionCount={actionCount} activeCount={activeCount} />

      {showNewShipment && (
        <MahNewShipment
          {...shared}
          onClose={() => setShowNewShipment(false)}
          onCreated={async (shipment) => {
            setShowNewShipment(false);
            await loadShipments().catch(() => {});
            openShipment(shipment, 'documents');
          }}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

// ── Floating AI assistant ─────────────────────────────
const QUICK_PROMPTS = [
  { label: "What's missing?", text: 'What documents are missing for my active shipments?' },
  { label: 'Explain rejection', text: 'Explain the rejection reasons for my latest rejected shipment' },
  { label: 'Deadline check', text: 'What is my closest objection deadline?' },
  { label: 'SFDA timing', text: 'How long does SFDA typically take to decide?' },
];
const GREETING = "Hello! I'm your MASAAR AI assistant. I can help you understand validation findings, explain SFDA regulations, track deadlines, and guide you through the objection process.";
const ASSISTANT_UNAVAILABLE = 'AI assistant is being configured. Please try again shortly.';

// Also used by the Clearance Portal, which passes its own prompts, greeting and placeholder
export function MahAssistant({ token, actionCount, activeCount, prompts = QUICK_PROMPTS, greeting = GREETING, placeholder = 'Ask about your shipments…' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    // Earlier turns (without the greeting) give the assistant context
    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const data = await apiFetch(token, '/assistant/chat', {
        method: 'POST', body: { message: text, history, context: { shipments: activeCount } },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.answer || ASSISTANT_UNAVAILABLE }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: ASSISTANT_UNAVAILABLE }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="mah-ai-panel" role="dialog" aria-label="MASAAR AI Assistant">
          <div className="mah-ai-head">
            <span className="mah-ai-spark">✦</span>
            <strong>MASAAR AI Assistant</strong>
            <button className="mah-ai-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button>
          </div>
          <div className="mah-ai-chips">
            {prompts.map(q => (
              <button key={q.label} className="mah-ai-chip" onClick={() => { setInput(q.text); inputRef.current?.focus(); }}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="mah-ai-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`mah-ai-msg mah-ai-${m.role === 'user' ? 'user' : 'bot'}`}>{m.content}</div>
            ))}
            {sending && <div className="mah-ai-msg mah-ai-bot mah-ai-typing">Thinking…</div>}
          </div>
          <form className="mah-ai-input" onSubmit={send}>
            <input ref={inputRef} className="mah-input" value={input} onChange={e => setInput(e.target.value)}
              placeholder={placeholder} aria-label="Message" maxLength={2000} />
            <button type="submit" className="mah-btn mah-btn-primary" disabled={!input.trim() || sending}>Send</button>
          </form>
        </div>
      )}
      <button className="mah-ai-fab" onClick={() => setOpen(o => !o)} aria-label="Open MASAAR AI Assistant" aria-expanded={open}>
        ✦
        {actionCount > 0 && <span className="mah-ai-badge">{actionCount > 9 ? '9+' : actionCount}</span>}
      </button>
    </>
  );
}
