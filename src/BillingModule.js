import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const API_URL = 'http://localhost:3000/api/v1';

const CHART_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6'];
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Fee calculation
function calculateFees(trace) {
  const lineItems = trace.line_items || [];
  const labFee = lineItems.length * 1500;
  const adminFee = 350;
  const subtotal = labFee + adminFee;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  return { labFee, adminFee, subtotal, vat, total };
}

const BILLING_STATES = {
  DECISION_PASS: { label: 'Awaiting Invoice', color: 'bg-yellow-100 text-yellow-800' },
  INVOICE_ISSUED: { label: 'Invoice Issued', color: 'bg-blue-100 text-blue-800' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800' },
  PAYMENT_CONFIRMED: { label: 'Payment Confirmed', color: 'bg-green-100 text-green-800' },
  RELEASED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
};

// Invoice Modal
function InvoiceModal({ trace, onClose, onIssue }) {
  const fees = calculateFees(trace);
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    setIssuing(true);
    await onIssue(trace);
    setIssuing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invoice Details</h2>
            <p className="text-sm text-gray-500">{trace.trace_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Importer</p>
            <p className="text-sm text-gray-900">{trace.importer_name}</p>
            <p className="text-xs text-gray-500">{trace.ghad_account_no}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lab testing fee ({trace.line_items?.length || 1} product × SAR 1,500)</span>
              <span className="font-medium">SAR {fees.labFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Administrative clearance fee</span>
              <span className="font-medium">SAR {fees.adminFee.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">SAR {fees.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (15%)</span>
              <span className="font-medium">SAR {fees.vat.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-indigo-600">SAR {fees.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">Invoice will be sent via SADAD. Goods will be released upon payment confirmation.</p>
          </div>

          <div className="flex gap-3">
            {trace.current_state === 'DECISION_PASS' && (
              <button
                onClick={handleIssue}
                disabled={issuing}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {issuing ? 'Issuing...' : 'Issue Invoice'}
              </button>
            )}
            {trace.current_state === 'PAYMENT_PENDING' && (
              <button
                onClick={() => onIssue(trace, 'confirm')}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 text-sm"
              >
                Confirm Payment
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Billing Module
export default function BillingModule() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const billingStates = {
    pending: ['DECISION_PASS', 'INVOICE_ISSUED', 'PAYMENT_PENDING'],
    completed: ['PAYMENT_CONFIRMED', 'RELEASED']
  };

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const states = billingStates[activeTab];
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

  const openTrace = async (trace) => {
    try {
      const response = await fetch(`${API_URL}/traces/${trace.id}`);
      const data = await response.json();
      setSelectedTrace(data.trace);
    } catch (err) {
      console.error('Failed to fetch trace');
    }
  };

  const handleInvoiceAction = async (trace, action = 'issue') => {
    try {
      if (action === 'issue') {
        // Issue invoice — transition to INVOICE_ISSUED then PAYMENT_PENDING
        await fetch(`${API_URL}/traces/${trace.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requested_state: 'INVOICE_ISSUED',
            actor_id: '00000000-0000-0000-0000-000000000006',
            actor_role: 'BILLING_SYSTEM',
            trigger_event: 'Auto-invoice triggered on DECISION_PASS'
          })
        });
        await fetch(`${API_URL}/traces/${trace.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requested_state: 'PAYMENT_PENDING',
            actor_id: '00000000-0000-0000-0000-000000000001',
            actor_role: 'PLATFORM',
            trigger_event: 'Invoice issued — awaiting SADAD confirmation'
          })
        });
      } else if (action === 'confirm') {
        // Confirm payment — transition to PAYMENT_CONFIRMED then RELEASE_TRIGGERED then RELEASED
        await fetch(`${API_URL}/traces/${trace.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requested_state: 'PAYMENT_CONFIRMED',
            actor_id: '00000000-0000-0000-0000-000000000006',
            actor_role: 'BILLING_SYSTEM',
            trigger_event: 'SADAD payment confirmation received'
          })
        });
        await fetch(`${API_URL}/traces/${trace.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requested_state: 'RELEASE_TRIGGERED',
            actor_id: '00000000-0000-0000-0000-000000000001',
            actor_role: 'PLATFORM',
            trigger_event: 'Payment confirmed — release signal sent to customs'
          })
        });
        await fetch(`${API_URL}/traces/${trace.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requested_state: 'RELEASED',
            actor_id: '00000000-0000-0000-0000-000000000007',
            actor_role: 'CUSTOMS',
            trigger_event: 'Customs confirmed goods released'
          })
        });
      }
      setSelectedTrace(null);
      fetchTraces();
    } catch (err) {
      console.error('Billing action failed');
    }
  };

  // Calculate totals
  const totalPending = traces
    .filter(t => ['DECISION_PASS', 'INVOICE_ISSUED', 'PAYMENT_PENDING'].includes(t.current_state))
    .reduce((sum, t) => sum + calculateFees(t).total, 0);

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
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Billing Module</p>
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
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {traces.filter(t => t.current_state === 'DECISION_PASS').length}
            </p>
            <p className="text-xs text-gray-500">Awaiting invoice</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {traces.filter(t => t.current_state === 'PAYMENT_PENDING').length}
            </p>
            <p className="text-xs text-gray-500">Payment pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {traces.filter(t => t.current_state === 'PAYMENT_CONFIRMED').length}
            </p>
            <p className="text-xs text-gray-500">Payment confirmed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">
              SAR {totalPending.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Total pending</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Billing Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[
              { name: 'Awaiting Invoice', count: traces.filter(t => t.current_state === 'DECISION_PASS').length },
              { name: 'Invoice Issued', count: traces.filter(t => t.current_state === 'INVOICE_ISSUED').length },
              { name: 'Payment Pending', count: traces.filter(t => t.current_state === 'PAYMENT_PENDING').length },
              { name: 'Confirmed', count: traces.filter(t => t.current_state === 'PAYMENT_CONFIRMED').length },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue Summary</h3>
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-yellow-700 font-medium">Pending Collection</span>
              <span className="text-sm font-bold text-yellow-700">SAR {totalPending.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700 font-medium">Total Shipments Billed</span>
              <span className="text-sm font-bold text-green-700">{traces.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm text-indigo-700 font-medium">Avg. Invoice Value</span>
              <span className="text-sm font-bold text-indigo-700">
                SAR {traces.length > 0 ? Math.round(totalPending / Math.max(traces.length, 1)).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Billing
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed
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
          <div className="text-center py-12 text-gray-500">Loading billing records...</div>
        ) : traces.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No billing records in this queue</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traces.map((trace) => {
                  const fees = calculateFees(trace);
                  const billing = BILLING_STATES[trace.current_state];
                  return (
                    <tr key={trace.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-indigo-600">
                          {trace.trace_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{trace.importer_name}</p>
                        <p className="text-xs text-gray-500">{trace.shipment_country}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${billing?.color || 'bg-gray-100 text-gray-800'}`}>
                          {billing?.label || trace.current_state}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">SAR {fees.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">incl. 15% VAT</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(trace.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openTrace(trace)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100"
                        >
                          {trace.current_state === 'DECISION_PASS' ? 'Issue Invoice' :
                           trace.current_state === 'PAYMENT_PENDING' ? 'Confirm Payment' : 'View'}
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

      {/* Invoice Modal */}
      {selectedTrace && (
        <InvoiceModal
          trace={selectedTrace}
          onClose={() => setSelectedTrace(null)}
          onIssue={handleInvoiceAction}
        />
      )}
    </div>
  );
}