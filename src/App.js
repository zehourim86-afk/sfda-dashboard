import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import LabPortal from './LabPortal';
import ShippingPortal from './ShippingPortal';
import BillingModule from './BillingModule';
import ImporterPortal from './ImporterPortal';
import AdminPanel from './AdminPanel';
import NotifiedBodyPortal from './NotifiedBodyPortal';
import GMPPortal from './GMPPortal';
import ClearancePortal from './ClearancePortal';
import SFDAObserverPortal from './SFDAObserverPortal';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('demara_token');
    const savedUser = localStorage.getItem('demara_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

    // Idle timeout — 1 hour of inactivity
  useEffect(() => {
    if (!token) return;
    let idleTimer;
    let warningTimer;

    const resetTimers = () => {
      setShowExpiryWarning(false);
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);

      // Show warning after 55 minutes of inactivity
      warningTimer = setTimeout(() => {
        setShowExpiryWarning(true);
      }, 55 * 60 * 1000);

      // Auto logout after 60 minutes of inactivity
      idleTimer = setTimeout(() => {
        handleLogout();
      }, 60 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimers));
    resetTimers();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warningTimer);
      events.forEach(e => window.removeEventListener(e, resetTimers));
    };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('demara_token');
    localStorage.removeItem('demara_user');
    setUser(null);
    setToken(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}}>
        <div className="text-white text-lg">Loading DEMARA Platform...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPortal = () => {
    console.log('Current user role:', user.role);
    switch (user.role) {
      case 'DEMARA_ADMIN':
        return <AdminPanel user={user} token={token} onLogout={handleLogout} />;
      case 'SFDA_REVIEWER':
        return <SFDAObserverPortal user={user} token={token} onLogout={handleLogout} />;
      case 'LAB_ANALYST':
        return <LabPortal user={user} token={token} onLogout={handleLogout} />;
      case 'SFDA_INSPECTOR':
        return <ShippingPortal user={user} token={token} onLogout={handleLogout} />;
      case 'SHIPPING_COMPANY':
        return <ShippingPortal user={user} token={token} onLogout={handleLogout} />;
      case 'IMPORTER':
        return <ImporterPortal user={user} token={token} onLogout={handleLogout} />;
      case 'NOTIFIED_BODY':
        return <NotifiedBodyPortal user={user} token={token} onLogout={handleLogout} />;
      case 'GMP_AUDITOR':
        return <GMPPortal user={user} token={token} onLogout={handleLogout} />;
      case 'CLEARANCE_COMPANY':
        return <ClearancePortal user={user} token={token} onLogout={handleLogout} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-gray-600">Unknown role. Please contact DEMARA admin.</p>
              <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                Sign Out
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {showExpiryWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#F59E0B', color: 'white', padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '13px', fontWeight: 600
        }}>
          <span>⚠️ Your session will expire soon due to inactivity. Click anywhere to stay signed in.</span>
          <button onClick={handleLogout} style={{
            background: 'white', color: '#F59E0B', border: 'none',
            padding: '4px 12px', borderRadius: '6px', cursor: 'pointer',
            fontWeight: 700, fontSize: '12px'
          }}>
            Sign Out Now
          </button>
        </div>
      )}
      {renderPortal()}
    </>
  );
}

export default App;