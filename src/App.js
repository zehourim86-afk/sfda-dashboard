import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import LabPortal from './LabPortal';
import InspectorApp from './InspectorApp';
import BillingModule from './BillingModule';
import ImporterPortal from './ImporterPortal';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on startup
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

  // Role-based portal routing
  const renderPortal = () => {
    switch (user.role) {
      case 'DEMARA_ADMIN':
      case 'SFDA_REVIEWER':
        return <Dashboard user={user} token={token} onLogout={handleLogout} />;
      case 'LAB_ANALYST':
        return <LabPortal user={user} token={token} onLogout={handleLogout} />;
      case 'SFDA_INSPECTOR':
        return <InspectorApp user={user} token={token} onLogout={handleLogout} />;
      case 'IMPORTER':
        return <ImporterPortal user={user} token={token} onLogout={handleLogout} />;
      case 'NOTIFIED_BODY':
        return <Dashboard user={user} token={token} onLogout={handleLogout} />;
      case 'GMP_AUDITOR':
        return <Dashboard user={user} token={token} onLogout={handleLogout} />;
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

  return renderPortal();
}

export default App;