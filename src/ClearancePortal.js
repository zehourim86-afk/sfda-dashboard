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
  const [reference, setReference] = useState('');
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipment.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.shipment && data.shipment.clearance_tasks && data.shipment.clearance_tasks.length > 0) {
          setTask(data.shipment.clearance_tasks[0]);
        }
      } catch (err) {
        console.error('Failed to fetch task');
      }
    };
    fetchTask();
  }, [shipment.id]);

  const performAction = async (action, requiresRef = false) => {
    if (requiresRef && !reference.trim()) {
      setError('Please enter a reference number or document number');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reference, notes })
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

  const getChecklist = () => {
    if (['NON_CONFORMING', 'PARTIALLY_CONFORMING', 'RE_EXPORT_INITIATED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_REQUESTED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state)) {
      return [
        { label: 'Received SFDA non-conforming decision', done: true, timestamp: task?.notified_at, reference: null },
        { label: 'MAH selected action (re-export or destruction)', done: ['RE_EXPORT_INITIATED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_REQUESTED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state), timestamp: null, reference: null },
        { label: 'Re-export or destruction completed', done: ['RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state), timestamp: task?.completed_at, reference: null },
      ];
    }
    return [
      { label: 'Received SFDA approval notification', done: true, timestamp: task?.notified_at, reference: null },
      { label: 'Clearance procedures initiated', done: ['CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.acknowledged_at, reference: null },
      { label: 'Customs bond released', done: ['BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.bond_released_at, reference: task?.bond_release_reference },
      { label: 'Customs duties paid', done: ['DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.duties_paid_at, reference: task?.duties_payment_reference },
      { label: 'Final clearance confirmed', done: shipment.current_state === 'FINAL_CLEARANCE', timestamp: task?.release_permit_at, reference: task?.release_permit_number },
    ];
  };

  const checklist = getChecklist();

  const getNextAction = () => {
    switch (shipment.current_state) {
      case 'CONFORMING':
        return { label: 'Start Clearance Procedures', action: 'ACKNOWLEDGE', requiresRef: false, color: '#2D2B7A' };
      case 'CLEARANCE_IN_PROGRESS':
        return { label: 'Confirm Bond Released', action: 'BOND_RELEASED', requiresRef: true, placeholder: 'Bond release reference number', color: '#00B4D8' };
      case 'BOND_RELEASED':
        return { label: 'Confirm Duties Paid', action: 'DUTIES_PAID', requiresRef: true, placeholder: 'SADAD payment reference or receipt number', color: '#00B4D8' };
      case 'DUTIES_PAID':
        return { label: 'Confirm Final Clearance', action: 'FINAL_CLEARANCE', requiresRef: true, placeholder: 'Release permit number', color: '#10B981' };
      case 'NON_CONFORMING':
      case 'PARTIALLY_CONFORMING':
        return null; // MAH selects action — not clearance company
      case 'RE_EXPORT_INITIATED':
        return { label: 'Confirm Re-Export Completed', action: 'RE_EXPORT_COMPLETED', requiresRef: true, placeholder: 'Re-export bill of lading or reference number', color: '#EF4444' };
      case 'DESTRUCTION_REQUESTED':
        return { label: 'Confirm Destruction Completed', action: 'DESTRUCTION_CONFIRMED', requiresRef: true, placeholder: 'Destruction certificate reference number', color: '#EF4444' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

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
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Faseh Reference</p>
              <p className="text-sm font-medium">{shipment.faseh_request_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">GHAD CR Number</p>
              <p className="text-sm font-medium">{shipment.ghad_cr_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium">{shipment.port_of_entry}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium">{shipment.shipment_country}</p></div>
          </div>

          {/* Clearance checklist with timestamps and references */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Clearance Checklist</h3>
            <div className="space-y-3">
              {checklist.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.done ? 'bg-green-50' : 'bg-white border border-gray-200'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {item.done ? '✓' : i + 1}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.done ? 'text-green-700' : 'text-gray-500'}`}>
                      {item.label}
                    </p>
                    {item.done && item.timestamp && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Completed: {formatDate(item.timestamp)}
                      </p>
                    )}
                    {item.done && item.reference && (
                      <p className="text-xs text-blue-600 mt-0.5 font-medium">
                        Ref: {item.reference}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next action */}
          {nextAction && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Next Action Required</h3>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

              {nextAction.requiresRef && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Reference Number / Document Number *</label>
                  <input type="text" value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder={nextAction.placeholder}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Any notes about this action..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              <button
                onClick={() => performAction(nextAction.action, nextAction.requiresRef)}
                disabled={acting}
                className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{background: nextAction.color}}>
                {acting ? 'Processing...' : nextAction.label}
              </button>
            </div>
          )}

          {shipment.current_state === 'FINAL_CLEARANCE' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold text-lg">✓ Clearance Complete</p>
              <p className="text-green-600 text-sm mt-1">All clearance steps completed successfully.</p>
              {task?.completed_at && (
                <p className="text-green-500 text-xs mt-1">Completed: {formatDate(task.completed_at)}</p>
              )}
            </div>
          )}

          {shipment.current_state === 'RE_EXPORT_COMPLETED' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-orange-700 font-semibold text-lg">🚢 Re-Export Completed</p>
              <p className="text-orange-600 text-sm mt-1">Goods have been successfully re-exported out of Saudi Arabia.</p>
            </div>
          )}

          {shipment.current_state === 'DESTRUCTION_CONFIRMED' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-700 font-semibold text-lg">🗑️ Destruction Confirmed</p>
              <p className="text-gray-600 text-sm mt-1">Goods have been destroyed in accordance with SFDA requirements.</p>
            </div>
          )}

          {shipment.current_state === 'NON_CONFORMING' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-700 font-semibold">⚠️ Awaiting MAH Decision</p>
              <p className="text-red-600 text-sm mt-1">The MAH has been notified and must select re-export or destruction.</p>
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
  const alertStates = ['NON_CONFORMING', 'RE_EXPORT_INITIATED', 'DESTRUCTION_REQUESTED'];
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