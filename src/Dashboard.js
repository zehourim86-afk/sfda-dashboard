import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

// State badge colors
const STATE_COLORS = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  ROUTING: 'bg-blue-100 text-blue-800',
  GOODS_HELD: 'bg-orange-100 text-orange-800',
  LAB_ASSIGNED: 'bg-orange-100 text-orange-800',
  SAMPLING: 'bg-orange-100 text-orange-800',
  SAMPLE_B_STORED: 'bg-orange-100 text-orange-800',
  SAMPLING_HANDOVER: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  LAB_RECEIVED: 'bg-purple-100 text-purple-800',
  IN_ANALYSIS: 'bg-purple-100 text-purple-800',
  RESULT_READY: 'bg-green-100 text-green-800',
  UNDER_REVIEW: 'bg-red-100 text-red-800',
  DECISION_PASS: 'bg-green-100 text-green-800',
  DECISION_FAIL: 'bg-red-100 text-red-800',
  INVOICE_ISSUED: 'bg-indigo-100 text-indigo-800',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  PAYMENT_CONFIRMED: 'bg-green-100 text-green-800',
  RELEASE_TRIGGERED: 'bg-green-100 text-green-800',
  RELEASED: 'bg-gray-100 text-gray-800',
  RE_EXPORT_INITIATED: 'bg-red-100 text-red-800',
};

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// SLA status
function getSLAStatus(slaDeadline, slaBreached) {
  if (!slaDeadline) return null;
  if (slaBreached) return { label: 'BREACHED', color: 'text-red-600 font-bold' };
  const remaining = new Date(slaDeadline) - new Date();
  if (remaining < 0) return { label: 'BREACHED', color: 'text-red-600 font-bold' };
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 60) return { label: `${minutes}m left`, color: 'text-red-500' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours}h left`, color: 'text-yellow-600' };
  return { label: `${Math.floor(hours / 24)}d left`, color: 'text-green-600' };
}

// Trace detail modal
function TraceModal({ trace, onClose }) {
  if (!trace) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trace.trace_number}</h2>
            <p className="text-sm text-gray-500 mt-1">{trace.importer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_COLORS[trace.current_state]}`}>
              {trace.current_state}
            </span>
            <span className="text-sm text-gray-500">
              Since {formatDate(trace.state_entered_at)}
            </span>
          </div>

          {/* Shipment details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">FASEH Request</p>
              <p className="text-sm font-medium text-gray-900">{trace.faseh_request_no}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium text-gray-900">{trace.port_of_entry}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Shipment Country</p>
              <p className="text-sm font-medium text-gray-900">{trace.shipment_country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Ghad Account</p>
              <p className="text-sm font-medium text-gray-900">{trace.ghad_account_no}</p>
            </div>
          </div>

          {/* Line items */}
          {trace.line_items && trace.line_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Products</h3>
              <div className="space-y-2">
                {trace.line_items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900 text-sm">{item.product_name_en}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-gray-500">Batch: {item.batch_number}</span>
                      <span className="text-xs text-gray-500">Qty: {item.quantity} {item.quantity_unit}</span>
                      <span className="text-xs text-gray-500">Expires: {formatDate(item.expiry_date)}</span>
                    </div>
                    {item.decision && (
                      <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-bold ${item.decision === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.decision}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          {trace.audit_log && trace.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Trail</h3>
              <div className="space-y-2">
                {trace.audit_log.map((log) => (
                  <div key={log.id} className={`flex items-start gap-3 p-2 rounded-lg ${log.was_valid ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.was_valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">
                        {log.from_state} → {log.to_state}
                      </p>
                      <p className="text-xs text-gray-500">{log.trigger_event}</p>
                      <p className="text-xs text-gray-400">{log.actor_role} · {formatDate(log.occurred_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Dashboard
export default function Dashboard() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [modalTrace, setModalTrace] = useState(null);

  // Fetch traces
  const fetchTraces = async () => {
    try {
      setLoading(true);
      const url = selectedState
        ? `${API_URL}/traces?state=${selectedState}`
        : `${API_URL}/traces`;
      const response = await fetch(url);
      const data = await response.json();
      setTraces(data.traces || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch single trace for modal
  const openTrace = async (traceId) => {
    try {
      const response = await fetch(`${API_URL}/traces/${traceId}`);
      const data = await response.json();
      setModalTrace(data.trace);
    } catch (err) {
      console.error('Failed to fetch trace details');
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 30000);
    return () => clearInterval(interval);
  }, [selectedState]);

  const states = [
    'SUBMITTED', 'ROUTING', 'GOODS_HELD', 'LAB_ASSIGNED', 'SAMPLING',
    'SAMPLE_B_STORED', 'SAMPLING_HANDOVER', 'IN_TRANSIT', 'LAB_RECEIVED',
    'IN_ANALYSIS', 'RESULT_READY', 'UNDER_REVIEW', 'DECISION_PASS',
    'DECISION_FAIL', 'INVOICE_ISSUED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED',
    'RELEASE_TRIGGERED', 'RELEASED', 'RE_EXPORT_INITIATED'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              SFDA Drug Import Traceability Platform
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              SFDA Reviewer Dashboard · Live
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Connected
            </span>
            <button
              onClick={fetchTraces}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{traces.length}</p>
            <p className="text-xs text-gray-500">Total shown</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {traces.filter(t => t.current_state === 'UNDER_REVIEW').length}
            </p>
            <p className="text-xs text-gray-500">Under review</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {traces.filter(t => ['IN_ANALYSIS', 'LAB_RECEIVED'].includes(t.current_state)).length}
            </p>
            <p className="text-xs text-gray-500">In lab</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {traces.filter(t => t.current_state === 'RELEASED').length}
            </p>
            <p className="text-xs text-gray-500">Released</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {traces.filter(t => t.sla_breached).length}
            </p>
            <p className="text-xs text-gray-500">SLA breached</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by state:</label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All states</option>
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {selectedState && (
            <button
              onClick={() => setSelectedState('')}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Main table */}
      <div className="px-6 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading shipments...</div>
        ) : traces.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No shipments found.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">State</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SLA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traces.map((trace) => {
                  const sla = getSLAStatus(trace.sla_deadline, trace.sla_breached);
                  return (
                    <tr key={trace.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-blue-600">
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
                      <td className="px-4 py-3">
                        {sla ? (
                          <span className={`text-xs font-medium ${sla.color}`}>{sla.label}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(trace.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openTrace(trace.id)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalTrace && (
        <TraceModal trace={modalTrace} onClose={() => setModalTrace(null)} />
      )}
    </div>
  );
}