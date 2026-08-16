import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_COLORS = {
  RECORD_OPENED: 'bg-gray-100 text-gray-700',
  SAMPLING_REQUESTED: 'bg-orange-100 text-orange-700',
  IN_ANALYSIS: 'bg-purple-100 text-purple-700',
  CONFORMING: 'bg-green-100 text-green-700',
  NON_CONFORMING: 'bg-red-100 text-red-700',
  PARTIALLY_CONFORMING: 'bg-orange-100 text-orange-700',
  CLEARANCE_IN_PROGRESS: 'bg-blue-100 text-blue-700',
  BOND_RELEASED: 'bg-blue-100 text-blue-700',
  DUTIES_PAID: 'bg-blue-100 text-blue-700',
  FINAL_CLEARANCE: 'bg-green-100 text-green-700',
  RE_EXPORT_INITIATED: 'bg-red-100 text-red-700',
};

// Shipment detail and action modal
function ShipmentActionModal({ shipment, token, onClose, onRefresh }) {
  const [acting, setActing] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const transition = async (newState, actionNotes) => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: newState,
          notes: actionNotes || notes,
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        onClose();
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setActing(false);
    }
  };

  const getNextActions = () => {
    switch (shipment.current_state) {
      case 'CONFORMING':
        return [{ label: 'Start Clearance Procedures', state: 'CLEARANCE_IN_PROGRESS', color: '#2D2B7A' }];
      case 'CLEARANCE_IN_PROGRESS':
        return [{ label: 'Confirm Bond Released', state: 'BOND_RELEASED', color: '#00B4D8' }];
      case 'BOND_RELEASED':
        return [{ label: 'Confirm Duties Paid', state: 'DUTIES_PAID', color: '#00B4D8' }];
      case 'DUTIES_PAID':
        return [{ label: 'Confirm Final Clearance', state: 'FINAL_CLEARANCE', color: '#10B981' }];
      case 'NON_CONFORMING':
        return [
          { label: 'Initiate Re-Export', state: 'RE_EXPORT_INITIATED', color: '#EF4444' },
        ];
      default:
        return [];
    }
  };

  const actions = getNextActions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{shipment.faseh_request_number}</h2>
            <p className="text-sm text-gray-500">{shipment.importer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className={`rounded-lg p-4 ${
            shipment.current_state === 'CONFORMING' || shipment.current_state === 'FINAL_CLEARANCE'
              ? 'bg-green-50 border border-green-200'
              : shipment.current_state === 'NON_CONFORMING'
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_COLORS[shipment.current_state] || 'bg-gray-100 text-gray-700'}`}>
              {shipment.current_state.replace(/_/g, ' ')}
            </span>
            <p className="text-sm text-gray-600 mt-2">Since {formatDate(shipment.state_entered_at)}</p>
          </div>

          {/* Shipment details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Faseh Reference</p>
              <p className="text-sm font-medium">{shipment.faseh_request_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">GHAD CR Number</p>
              <p className="text-sm font-medium">{shipment.ghad_cr_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium">{shipment.port_of_entry}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium">{shipment.shipment_country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Importer</p>
              <p className="text-sm font-medium">{shipment.importer_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Last Updated</p>
              <p className="text-sm font-medium">{formatDate(shipment.updated_at)}</p>
            </div>
          </div>

          {/* Clearance checklist */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Clearance Checklist</h3>
            <div className="space-y-2">
              {[
                { label: 'Received SFDA approval notification', done: ['CONFORMING', 'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state) },
                { label: 'Clearance procedures initiated', done: ['CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state) },
                { label: 'Customs bond released', done: ['BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state) },
                { label: 'Customs duties paid', done: ['DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state) },
                { label: 'Final clearance confirmed', done: shipment.current_state === 'FINAL_CLEARANCE' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {item.done ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm ${item.done ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action area */}
          {actions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Next Action Required</h3>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Any notes about this action..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-3">
                {actions.map((action, i) => (
                  <button key={i} onClick={() => transition(action.state)}
                    disabled={acting}
                    className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                    style={{background: action.color}}>
                    {acting ? 'Processing...' : action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shipment.current_state === 'FINAL_CLEARANCE' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold text-lg">✓ Clearance Complete</p>
              <p className="text-green-600 text-sm mt-1">All clearance steps have been completed successfully.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Clearance Portal
export default function ClearancePortal({ user, token, onLogout }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/shipments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setShipments(data.shipments || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingStates = ['CONFORMING', 'PARTIALLY_CONFORMING', 'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID'];
  const alertStates = ['NON_CONFORMING'];
  const completedStates = ['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'];

  const pendingShipments = shipments.filter(s => pendingStates.includes(s.current_state));
  const alertShipments = shipments.filter(s => alertStates.includes(s.current_state));
  const completedShipments = shipments.filter(s => completedStates.includes(s.current_state));

  const filtered = (
    activeTab === 'pending' ? pendingShipments :
    activeTab === 'alerts' ? alertShipments :
    completedShipments
  ).filter(s =>
    !search ||
    s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
    s.importer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">DEMARA Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Clearance Company Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </span>
            {user && (
              <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">{user.full_name}</p>
                  <p className="text-xs" style={{color: '#00B4D8'}}>Clearance Company</p>
                </div>
              </div>
            )}
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{shipments.length}</p>
            <p className="text-xs text-gray-500">Total assigned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{pendingShipments.length}</p>
            <p className="text-xs text-gray-500">Pending clearance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{alertShipments.length}</p>
            <p className="text-xs text-gray-500">Non-conforming</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{completedShipments.length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'pending' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Pending Clearance ({pendingShipments.length})
            </button>
            <button onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'alerts' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'alerts' ? {borderColor: '#EF4444', color: '#EF4444'} : {}}>
              Non-Conforming ({alertShipments.length})
            </button>
            <button onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'completed' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'completed' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Completed ({completedShipments.length})
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
            <button onClick={fetchShipments}
              className="px-4 py-1.5 text-white text-sm font-medium rounded-lg hover:opacity-90"
              style={{background: '#00B4D8'}}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading shipments...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No shipments in this queue</p>
            <p className="text-sm mt-1">
              {activeTab === 'pending' ? 'Shipments will appear here when SFDA issues a conforming decision' :
               activeTab === 'alerts' ? 'Non-conforming shipments requiring action will appear here' :
               'Completed clearances will appear here'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Update</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${s.current_state === 'CONFORMING' ? 'border-l-4 border-green-500' : s.current_state === 'NON_CONFORMING' ? 'border-l-4 border-red-500' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{s.faseh_request_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.importer_name}</p>
                      <p className="text-xs text-gray-500">{s.shipment_country}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.port_of_entry}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLORS[s.current_state] || 'bg-gray-100 text-gray-700'}`}>
                        {s.current_state.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.updated_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedShipment(s)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90 ${s.current_state === 'CONFORMING' ? 'animate-pulse' : ''}`}
                        style={{background: s.current_state === 'NON_CONFORMING' ? '#EF4444' : '#2D2B7A'}}>
                        {s.current_state === 'CONFORMING' ? '⚡ Act Now' :
                         s.current_state === 'NON_CONFORMING' ? '⚠ Handle' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedShipment && (
        <ShipmentActionModal
          shipment={selectedShipment}
          token={token}
          onClose={() => setSelectedShipment(null)}
          onRefresh={() => {
            fetchShipments();
            setSelectedShipment(null);
          }}
        />
      )}
    </div>
  );
}