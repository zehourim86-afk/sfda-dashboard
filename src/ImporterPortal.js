import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const API_URL = 'http://localhost:3000/api/v1';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_INFO = {
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', step: 1, message: 'Your clearance request has been received by SFDA.' },
  ROUTING: { label: 'Routing', color: 'bg-blue-100 text-blue-800', step: 1, message: 'Your shipment is being assessed for inspection requirements.' },
  GOODS_HELD: { label: 'Goods Held', color: 'bg-orange-100 text-orange-800', step: 2, message: 'Your goods are held at the duty area pending sampling.' },
  LAB_ASSIGNED: { label: 'Lab Assigned', color: 'bg-orange-100 text-orange-800', step: 2, message: 'An authorized lab has been assigned for testing.' },
  SAMPLING: { label: 'Sampling', color: 'bg-orange-100 text-orange-800', step: 2, message: 'Samples are being drawn by the duty area inspector.' },
  SAMPLE_B_STORED: { label: 'Sampling', color: 'bg-orange-100 text-orange-800', step: 2, message: 'Samples drawn and retained sample stored securely.' },
  SAMPLING_HANDOVER: { label: 'Handover', color: 'bg-yellow-100 text-yellow-800', step: 3, message: 'Samples have been handed over to the courier.' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-800', step: 3, message: 'Samples are in transit to the testing laboratory.' },
  LAB_RECEIVED: { label: 'At Lab', color: 'bg-purple-100 text-purple-800', step: 3, message: 'Samples have been received and verified by the lab.' },
  IN_ANALYSIS: { label: 'Testing', color: 'bg-purple-100 text-purple-800', step: 3, message: 'Your samples are currently being tested.' },
  RESULT_READY: { label: 'Results Ready', color: 'bg-green-100 text-green-800', step: 4, message: 'Lab results are ready and submitted to SFDA for review.' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-red-100 text-red-800', step: 4, message: 'SFDA reviewer is reviewing your lab results.' },
  DECISION_PASS: { label: 'Approved', color: 'bg-green-100 text-green-800', step: 5, message: 'Your shipment has been approved. Invoice is being prepared.' },
  DECISION_FAIL: { label: 'Rejected', color: 'bg-red-100 text-red-800', step: 5, message: 'Your shipment has been rejected. Please contact SFDA.' },
  INVOICE_ISSUED: { label: 'Invoice Issued', color: 'bg-indigo-100 text-indigo-800', step: 5, message: 'Your invoice has been issued. Please complete payment via SADAD.' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', step: 5, message: 'Awaiting your payment confirmation via SADAD.' },
  PAYMENT_CONFIRMED: { label: 'Payment Confirmed', color: 'bg-green-100 text-green-800', step: 6, message: 'Payment received. Release is being processed.' },
  RELEASE_TRIGGERED: { label: 'Release Triggered', color: 'bg-green-100 text-green-800', step: 6, message: 'Release signal sent to customs.' },
  RELEASED: { label: 'Released', color: 'bg-gray-100 text-gray-800', step: 6, message: 'Your goods have been released. Clearance complete.' },
  RE_EXPORT_INITIATED: { label: 'Re-export', color: 'bg-red-100 text-red-800', step: 6, message: 'Re-export process initiated.' },
};

const STEPS = [
  { number: 1, label: 'Submitted' },
  { number: 2, label: 'Inspection' },
  { number: 3, label: 'Lab Testing' },
  { number: 4, label: 'SFDA Review' },
  { number: 5, label: 'Payment' },
  { number: 6, label: 'Released' },
];

// Progress tracker
function ProgressTracker({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep > step.number
                ? 'bg-green-500 text-white'
                : currentStep === step.number
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center w-16">{step.label}</p>
          </div>
          {index < STEPS.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mb-5 ${
              currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Shipment detail modal
function ShipmentModal({ trace, onClose }) {
  if (!trace) return null;
  const stateInfo = STATE_INFO[trace.current_state] || { label: trace.current_state, color: 'bg-gray-100 text-gray-800', step: 1, message: '' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trace.trace_number}</h2>
            <p className="text-sm text-gray-500 mt-1">{trace.faseh_request_no}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress */}
          <ProgressTracker currentStep={stateInfo.step} />

          {/* Status message */}
          <div className={`rounded-lg p-4 ${
            trace.current_state === 'RELEASED' ? 'bg-green-50 border border-green-200' :
            trace.current_state === 'DECISION_FAIL' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stateInfo.color}`}>
                {stateInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-2">{stateInfo.message}</p>
          </div>

          {/* Shipment info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium text-gray-900">{trace.port_of_entry}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium text-gray-900">{trace.shipment_country}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Submitted</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(trace.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(trace.updated_at)}</p>
            </div>
          </div>

          {/* Products */}
          {trace.line_items && trace.line_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Products</h3>
              <div className="space-y-2">
                {trace.line_items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900 text-sm">{item.product_name_en}</p>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">Batch: {item.batch_number}</span>
                      <span className="text-xs text-gray-500">Qty: {item.quantity} {item.quantity_unit}</span>
                      <span className="text-xs text-gray-500">Expires: {formatDate(item.expiry_date)}</span>
                    </div>
                    {item.decision && (
                      <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        item.decision === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.decision}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {trace.audit_log && trace.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipment Timeline</h3>
              <div className="space-y-2">
                {trace.audit_log.map((log) => (
                  log.was_valid && (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{log.to_state}</p>
                        <p className="text-xs text-gray-500">{formatDate(log.occurred_at)}</p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Importer Portal
export default function ImporterPortal({ user, token, onLogout }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/traces`);
      const data = await response.json();
      setTraces(data.traces || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const openTrace = async (trace) => {
    try {
      const response = await fetch(`${API_URL}/traces/${trace.id}`);
      const data = await response.json();
      setSelectedTrace(data.trace);
    } catch (err) {
      console.error('Failed to fetch trace');
    }
  };

  const filteredTraces = traces.filter(trace => {
    const matchesSearch = !searchTerm ||
      trace.trace_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.importer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.faseh_request_no.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = !['RELEASED', 'RE_EXPORT_INITIATED'].includes(trace.current_state);
    const matchesTab = activeTab === 'active' ? isActive : !isActive;

    return matchesSearch && matchesTab;
  });

  const activeCount = traces.filter(t => !['RELEASED', 'RE_EXPORT_INITIATED'].includes(t.current_state)).length;
  const completedCount = traces.filter(t => ['RELEASED', 'RE_EXPORT_INITIATED'].includes(t.current_state)).length;

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">Drug Import Traceability Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Importer Portal</p>
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
            <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
            <p className="text-xs text-gray-500">Active shipments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-gray-500">Released</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {traces.filter(t => ['PAYMENT_PENDING', 'INVOICE_ISSUED'].includes(t.current_state)).length}
            </p>
            <p className="text-xs text-gray-500">Awaiting payment</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {traces.filter(t => t.current_state === 'DECISION_FAIL').length}
            </p>
            <p className="text-xs text-gray-500">Rejected</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">My Shipments Overview</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Active', value: activeCount },
                  { name: 'Released', value: completedCount },
                  { name: 'Awaiting Payment', value: traces.filter(t => ['PAYMENT_PENDING', 'INVOICE_ISSUED'].includes(t.current_state)).length },
                  { name: 'Rejected', value: traces.filter(t => t.current_state === 'DECISION_FAIL').length },
                ].filter(d => d.value > 0)}
                cx="50%" cy="50%" outerRadius={60}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {CHART_COLORS.map((color, index) => (
                  <Cell key={index} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Country</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={Object.entries(traces.reduce((acc, t) => {
              acc[t.shipment_country] = (acc[t.shipment_country] || 0) + 1;
              return acc;
            }, {})).map(([name, count]) => ({ name, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search and tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-4 mb-3">
          <input
            type="text"
            placeholder="Search by trace number, importer, or FASEH request..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed ({completedCount})
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
        ) : filteredTraces.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No shipments found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">FASEH Request</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Update</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTraces.map((trace) => {
                  const stateInfo = STATE_INFO[trace.current_state] || { label: trace.current_state, color: 'bg-gray-100 text-gray-800' };
                  return (
                    <tr key={trace.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-teal-600">
                          {trace.trace_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{trace.importer_name}</p>
                        <p className="text-xs text-gray-500">{trace.shipment_country}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {trace.faseh_request_no}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stateInfo.color}`}>
                          {stateInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(trace.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openTrace(trace)}
                          className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg hover:bg-teal-100"
                        >
                          Track
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

      {/* Detail Modal */}
      {selectedTrace && (
        <ShipmentModal
          trace={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}