// MAH (importer) portal shell: sidebar, topbar and the active page.
import { useCallback, useEffect, useMemo, useState } from 'react';
import './mah-portal.css';
import { apiFetch, Icon, needsAction, isClosed } from './mahShared';
import MahOverview from './MahOverview';
import MahShipments from './MahShipments';
import MahShipmentDetail from './MahShipmentDetail';
import MahNewShipment from './MahNewShipment';
import MahProducts from './MahProducts';
import MahSuppliers from './MahSuppliers';
import MahNetwork from './MahNetwork';
import MahIntelligence from './MahIntelligence';
import MahSettings from './MahSettings';

const NAV = [
  { page: 'overview', label: 'Overview', icon: 'home' },
  { page: 'shipments', label: 'Shipments & Tracking', icon: 'box' },
  { page: 'products', label: 'Products & Registrations', icon: 'flask' },
  { page: 'suppliers', label: 'Suppliers', icon: 'factory' },
  { page: 'network', label: 'Network & Accounts', icon: 'link' },
  { page: 'intelligence', label: 'My Insights', icon: 'star' },
  { page: 'settings', label: 'Settings', icon: 'gear' },
];

const PAGE_TITLES = {
  overview: 'Overview',
  shipments: 'Shipments & Tracking',
  'shipment-detail': 'Shipment',
  products: 'Products & Registrations',
  suppliers: 'Suppliers',
  network: 'Network & Accounts',
  intelligence: 'My Insights',
  settings: 'Settings',
};

export default function MahPortal({ user, token: tokenProp, onLogout }) {
  const token = tokenProp || localStorage.getItem('demara_token');
  const [currentPage, setCurrentPage] = useState('overview');
  const [currentShipment, setCurrentShipment] = useState(null);
  const [detailTab, setDetailTab] = useState('timeline');
  const [showNewShipment, setShowNewShipment] = useState(false);

  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  const shared = {
    token, user, shipments, products, suppliers, organisations, productsById, suppliersById,
    navigate, openShipment, onNewShipment: () => setShowNewShipment(true),
    reloadShipments: loadShipments, reloadProducts: loadProducts, reloadSuppliers: loadSuppliers,
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'shipments': return <MahShipments {...shared} />;
      case 'shipment-detail':
        return currentShipment
          ? <MahShipmentDetail {...shared} key={currentShipment.id} shipment={currentShipment} initialTab={detailTab} />
          : <MahShipments {...shared} />;
      case 'products': return <MahProducts {...shared} />;
      case 'suppliers': return <MahSuppliers {...shared} />;
      case 'network': return <MahNetwork {...shared} />;
      case 'intelligence': return <MahIntelligence {...shared} />;
      case 'settings': return <MahSettings {...shared} org={myOrg} />;
      default: return <MahOverview {...shared} />;
    }
  };

  const activeNav = currentPage === 'shipment-detail' ? 'shipments' : currentPage;
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mah-app">
      <aside className="mah-sidebar">
        <div className="mah-sidebar-brand">
          <span className="mah-brand-mark">M</span>
          <span>MASAAR</span>
        </div>
        <nav className="mah-nav">
          {NAV.map(item => (
            <button key={item.page} className={`mah-nav-item${activeNav === item.page ? ' is-active' : ''}`}
              onClick={() => navigate(item.page)} aria-current={activeNav === item.page ? 'page' : undefined}>
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

      <div className="mah-main">
        <header className="mah-topbar">
          <img src="/demara-logo-transparent.png" alt="DEMARA" className="mah-logo" />
          <div className="mah-topbar-title">
            <strong>{PAGE_TITLES[currentPage]}</strong>
            <span>MAH Portal</span>
          </div>
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

        <main className="mah-content">
          {loadError && <div className="mah-alert mah-alert-amber">{loadError}</div>}
          {loading ? <div className="mah-loading">Loading your shipments…</div> : renderPage()}
        </main>
      </div>

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
    </div>
  );
}
