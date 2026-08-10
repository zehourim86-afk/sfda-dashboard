import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
const API_URL = 'http://localhost:3000/api/v1';
const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'];
const INSPECTOR_ID = '00000000-0000-0000-0000-000000000002';
const COURIER_ID = '00000000-0000-0000-0000-000000000003';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_COLORS = {
  GOODS_HELD: 'bg-orange-100 text-orange-800',
  LAB_ASSIGNED: 'bg-blue-100 text-blue-800',
  SAMPLING: 'bg-yellow-100 text-yellow-800',
  SAMPLE_B_STORED: 'bg-purple-100 text-purple-800',
  SAMPLING_HANDOVER: 'bg-indigo-100 text-indigo-800',
  IN_TRANSIT: 'bg-gray-100 text-gray-800',
};

const ACTION_LABELS = {
  GOODS_HELD: { label: 'Assign Lab', next: 'LAB_ASSIGNED', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
  LAB_ASSIGNED: { label: 'Start Sampling', next: 'SAMPLING', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  SAMPLING: { label: 'Store Sample B', next: 'SAMPLE_B_STORED', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  SAMPLE_B_STORED: { label: 'Handover to Courier', next: 'SAMPLING_HANDOVER', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  SAMPLING_HANDOVER: { label: 'Confirm In Transit', next: 'IN_TRANSIT', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
};

const TRIGGER_EVENTS = {
  LAB_ASSIGNED: 'Inspector selected authorized lab from dropdown',
  SAMPLING: 'Inspector opened digital sampling checklist',
  SAMPLE_B_STORED: 'Inspector confirmed Sample B sealed and stored',
  SAMPLING_HANDOVER: 'Inspector and courier both e-signed handover',
  IN_TRANSIT: 'Courier accepted handover — sample in transit',
};

// Lab Assignment Modal
function LabAssignModal({ trace, onConfirm, onCancel }) {
  const [selectedLab, setSelectedLab] = useState('');

  const labs = [
    { id: 'LAB-SA-0012', name: 'Saudi National Lab — Dammam', port: 'King Abdulaziz Port' },
    { id: 'LAB-SA-0018', name: 'SFDA Central Lab — Riyadh', port: 'All ports' },
    { id: 'LAB-SA-0024', name: 'Saudi Drug Analysis Lab — Jeddah', port: 'King Abdulaziz Port - Jeddah' },
    { id: 'LAB-SA-0031', name: 'KKIA Pharmaceutical Lab — Riyadh', port: 'King Khalid International Airport' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Authorized Lab</h2>
            <p className="text-sm text-gray-500">{trace.trace_number}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600 mb-4">Select from SFDA-authorized labs filtered by port of entry:</p>
          {labs.map(lab => (
            <div
              key={lab.id}
              onClick={() => setSelectedLab(lab.id)}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedLab === lab.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900 text-sm">{lab.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lab.id} · {lab.port}</p>
            </div>
          ))}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => selectedLab && onConfirm(selectedLab)}
              disabled={!selectedLab}
              className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              Confirm Assignment
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sampling Modal
function SamplingModal({ trace, onConfirm, onCancel }) {
  const [sealId, setSealId] = useState('');
  const [sampleBLocation, setSampleBLocation] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sampling Checklist</h2>
            <p className="text-sm text-gray-500">{trace.trace_number}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">QR Seal ID — Sample A</label>
            <input
              type="text"
              placeholder="Scan or enter seal ID"
              value={sealId}
              onChange={e => setSealId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Sample B Storage Location</label>
            <input
              type="text"
              placeholder="e.g. Duty Area Safe — Cabinet 3"
              value={sampleBLocation}
              onChange={e => setSampleBLocation(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Inspector Notes</label>
            <textarea
              placeholder="Any observations during sampling..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-700 font-medium">⚠ Both samples must be drawn from the same batch. Sample B will be retained for potential re-testing.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => sealId && sampleBLocation && onConfirm(sealId, sampleBLocation, notes)}
              disabled={!sealId || !sampleBLocation}
              className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              Confirm Sampling
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Inspector App
export default function InspectorApp({ user, token, onLogout }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showSamplingModal, setShowSamplingModal] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const inspectorStates = ['GOODS_HELD', 'LAB_ASSIGNED', 'SAMPLING', 'SAMPLE_B_STORED', 'SAMPLING_HANDOVER'];
  const completedStates = ['IN_TRANSIT'];

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const states = activeTab === 'active' ? inspectorStates : completedStates;
      const results = await Promise.all(
        states.map(state =>
          fetch(`${API_URL}/traces?state=${state}`).then(r => r.json())
        )
      );
      const allTraces = results.flatMap(r => r.traces || []);
      setTraces(allTraces);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const transition = async (traceId, newState, triggerEvent, actorRole = 'INSPECTOR') => {
    try {
      const actorId = actorRole === 'COURIER' ? COURIER_ID : INSPECTOR_ID;
      await fetch(`${API_URL}/traces/${traceId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_state: newState,
          actor_id: actorId,
          actor_role: actorRole,
          trigger_event: triggerEvent
        })
      });
      fetchTraces();
    } catch (err) {
      console.error('Transition failed');
    }
  };

  const handleAction = async (trace) => {
    const action = ACTION_LABELS[trace.current_state];
    if (!action) return;

    if (trace.current_state === 'GOODS_HELD') {
      setSelectedTrace(trace);
      setShowLabModal(true);
      return;
    }

    if (trace.current_state === 'LAB_ASSIGNED') {
      setSelectedTrace(trace);
      setShowSamplingModal(true);
      return;
    }

    const actorRole = trace.current_state === 'SAMPLING_HANDOVER' ? 'COURIER' : 'INSPECTOR';
    await transition(trace.id, action.next, TRIGGER_EVENTS[action.next], actorRole);
  };

  useEffect(() => {
    fetchTraces();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">Drug Import Traceability Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Inspector App · Duty Area</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </span>
            <button onClick={fetchTraces} style={{background: '#00B4D8'}} className="px-3 py-1.5 text-white text-sm rounded-lg hover:opacity-90">
              Refresh
            </button>
            {user && (
              <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">{user.full_name}</p>
                  <p className="text-xs" style={{color: '#00B4D8'}}>{user.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )}
            {onLogout && (
              <button onClick={onLogout} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {traces.filter(t => t.current_state === 'GOODS_HELD').length}
            </p>
            <p className="text-xs text-gray-500">Goods held</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {traces.filter(t => t.current_state === 'LAB_ASSIGNED').length}
            </p>
            <p className="text-xs text-gray-500">Lab assigned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {traces.filter(t => ['SAMPLING', 'SAMPLE_B_STORED', 'SAMPLING_HANDOVER'].includes(t.current_state)).length}
            </p>
            <p className="text-xs text-gray-500">Sampling</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {traces.filter(t => t.current_state === 'IN_TRANSIT').length}
            </p>
            <p className="text-xs text-gray-500">In transit</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Inspection Queue</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[
              { name: 'Goods Held', count: traces.filter(t => t.current_state === 'GOODS_HELD').length },
              { name: 'Lab Assigned', count: traces.filter(t => t.current_state === 'LAB_ASSIGNED').length },
              { name: 'Sampling', count: traces.filter(t => ['SAMPLING', 'SAMPLE_B_STORED', 'SAMPLING_HANDOVER'].includes(t.current_state)).length },
              { name: 'In Transit', count: traces.filter(t => t.current_state === 'IN_TRANSIT').length },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Port</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={Object.entries(traces.reduce((acc, t) => {
              const port = t.port_of_entry.split(' - ')[0].replace('King ', '');
              acc[port] = (acc[port] || 0) + 1;
              return acc;
            }, {})).map(([name, count]) => ({ name, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Shipments
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'transit'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            In Transit
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading shipments...</div>
        ) : traces.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No shipments in this queue</p>
            <p className="text-sm mt-1">Shipments requiring inspection will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Since</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traces.map((trace) => {
                  const action = ACTION_LABELS[trace.current_state];
                  return (
                    <tr key={trace.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-orange-600">
                          {trace.trace_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{trace.importer_name}</p>
                        <p className="text-xs text-gray-500">{trace.shipment_country}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{trace.port_of_entry}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLORS[trace.current_state] || 'bg-gray-100 text-gray-800'}`}>
                          {trace.current_state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(trace.state_entered_at)}
                      </td>
                      <td className="px-4 py-3">
                        {action && (
                          <button
                            onClick={() => handleAction(trace)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg ${action.color}`}
                          >
                            {action.label}
                          </button>
                        )}
                        {trace.current_state === 'IN_TRANSIT' && (
                          <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-lg">
                            In transit ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lab Assignment Modal */}
      {showLabModal && selectedTrace && (
        <LabAssignModal
          trace={selectedTrace}
          onConfirm={(labId) => {
            transition(selectedTrace.id, 'LAB_ASSIGNED', TRIGGER_EVENTS['LAB_ASSIGNED']);
            setShowLabModal(false);
            setSelectedTrace(null);
          }}
          onCancel={() => {
            setShowLabModal(false);
            setSelectedTrace(null);
          }}
        />
      )}

      {/* Sampling Modal */}
      {showSamplingModal && selectedTrace && (
        <SamplingModal
          trace={selectedTrace}
          onConfirm={(sealId, sampleBLocation, notes) => {
            transition(selectedTrace.id, 'SAMPLING', TRIGGER_EVENTS['SAMPLING']);
            setShowSamplingModal(false);
            setSelectedTrace(null);
          }}
          onCancel={() => {
            setShowSamplingModal(false);
            setSelectedTrace(null);
          }}
        />
      )}
    </div>
  );
}