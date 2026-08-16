import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_INFO = {
  LAB_RECEIVED: { label: 'Sample Received', color: 'bg-blue-100 text-blue-700' },
  IN_ANALYSIS: { label: 'In Analysis', color: 'bg-purple-100 text-purple-700' },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', color: 'bg-yellow-100 text-yellow-700' },
  RESULT_SUBMITTED: { label: 'Result Submitted', color: 'bg-green-100 text-green-700' },
};

// Result submission modal
function SubmitResultModal({ shipment, token, onClose, onRefresh }) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [productResults, setProductResults] = useState([]);
  const [labReference, setLabReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Initialize product results
    if (shipment.products) {
      setProductResults(shipment.products.map(p => ({
        id: p.id,
        product_name_en: p.product_name_en,
        ecos_ma_number: p.ecos_ma_number,
        result: 'APPROVED',
        test_name: 'Full Compliance Testing',
        result_value: 'Compliant',
        notes: ''
      })));
    }
  }, [shipment]);

  const updateProductResult = (index, field, value) => {
    const updated = [...productResults];
    updated[index][field] = value;
    setProductResults(updated);
  };

  const handleSubmit = async () => {
    if (!labReference.trim()) {
      setError('Lab reference number is required');
      return;
    }
    setActing(true);
    setError(null);

    try {
      // Update each product decision
      for (const product of productResults) {
        await fetch(`${API_URL}/shipments/${shipment.id}/products/${product.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            decision: product.result,
            decision_notes: product.notes
          })
        });
      }

      // Determine overall outcome
      const allApproved = productResults.every(p => p.result === 'APPROVED');
      const allRejected = productResults.every(p => p.result === 'REJECTED');
      const overallState = allApproved ? 'RESULT_SUBMITTED' :
                          allRejected ? 'RESULT_SUBMITTED' : 'RESULT_SUBMITTED';

      // Transition shipment state
      await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: overallState,
          notes: `Lab Reference: ${labReference}. ${notes}`,
          trigger_source: 'MANUAL'
        })
      });

      onRefresh();
      onClose();
    } catch (err) {
      setError('Failed to submit results');
    } finally {
      setActing(false);
    }
  };

  const startAnalysis = async () => {
    setActing(true);
    try {
      await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: 'IN_ANALYSIS',
          notes: 'Lab started analysis',
          trigger_source: 'MANUAL'
        })
      });
      onRefresh();
      onClose();
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{shipment.faseh_request_number}</h2>
            <p className="text-sm text-gray-500">{shipment.importer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_INFO[shipment.current_state]?.color || 'bg-gray-100 text-gray-700'}`}>
              {STATE_INFO[shipment.current_state]?.label || shipment.current_state}
            </span>
            <p className="text-sm text-gray-600 mt-2">Since {formatDate(shipment.state_entered_at)}</p>
          </div>

          {/* Shipment info */}
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Faseh Reference</p>
              <p className="text-sm font-medium">{shipment.faseh_request_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">GHAD CR</p>
              <p className="text-sm font-medium">{shipment.ghad_cr_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Importer</p>
              <p className="text-sm font-medium">{shipment.importer_name}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium">{shipment.shipment_country}</p></div>
          </div>

          {/* Start analysis button */}
          {shipment.current_state === 'LAB_RECEIVED' && (
            <button onClick={startAnalysis} disabled={acting}
              className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#00B4D8'}}>
              {acting ? 'Processing...' : '▶ Start Analysis'}
            </button>
          )}

          {/* Submit results */}
          {shipment.current_state === 'IN_ANALYSIS' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Lab Reference Number *</label>
                <input type="text" value={labReference}
                  onChange={e => setLabReference(e.target.value)}
                  placeholder="e.g. LAB-SA-2026-00441"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Per-Product Results</h3>
                <div className="space-y-3">
                  {productResults.map((product, index) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.product_name_en}</p>
                          {product.ecos_ma_number && (
                            <p className="text-xs text-gray-500">E-Cosma: {product.ecos_ma_number}</p>
                          )}
                        </div>
                        <select value={product.result}
                          onChange={e => updateProductResult(index, 'result', e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border focus:outline-none ${
                            product.result === 'APPROVED' ? 'bg-green-50 border-green-300 text-green-700' :
                            product.result === 'REJECTED' ? 'bg-red-50 border-red-300 text-red-700' :
                            'bg-yellow-50 border-yellow-300 text-yellow-700'
                          }`}>
                          <option value="APPROVED">APPROVED — Compliant</option>
                          <option value="CONDITIONALLY_APPROVED">CONDITIONAL — Compliant with conditions</option>
                          <option value="REJECTED">REJECTED — Non-Compliant</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Lab Notes {product.result === 'REJECTED' ? '(required)' : '(optional)'}</label>
                        <textarea value={product.notes}
                          onChange={e => updateProductResult(index, 'notes', e.target.value)}
                          rows={2}
                          placeholder={product.result === 'REJECTED' ? 'Describe the non-conformity...' : 'Any observations...'}
                          className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Overall Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="General notes about the analysis..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              <button onClick={handleSubmit} disabled={acting}
                className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{background: '#2D2B7A'}}>
                {acting ? 'Submitting...' : '✓ Submit Results to SFDA'}
              </button>
            </div>
          )}

          {shipment.current_state === 'RESULT_SUBMITTED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-semibold">✓ Results submitted successfully</p>
              <p className="text-green-600 text-sm mt-1">SFDA has been notified. Awaiting their decision.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Lab Portal
export default function LabPortal({ user, token, onLogout }) {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const fetchData = async () => {
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

  const fetchShipmentDetail = async (shipment) => {
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedShipment(data.shipment);
    } catch (err) {
      console.error('Failed to fetch shipment detail');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const LAB_STATES = ['LAB_RECEIVED', 'IN_ANALYSIS', 'ANALYSIS_COMPLETE', 'RESULT_SUBMITTED'];

  const activeShipments = shipments.filter(s => ['LAB_RECEIVED', 'IN_ANALYSIS'].includes(s.current_state));
  const completedShipments = shipments.filter(s => ['RESULT_SUBMITTED', 'CONFORMING', 'NON_CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state));

  const inAnalysisCount = shipments.filter(s => s.current_state === 'IN_ANALYSIS').length;
  const pendingReceiptCount = shipments.filter(s => s.current_state === 'LAB_RECEIVED').length;

  const filtered = activeTab === 'active' ? activeShipments : completedShipments;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">DEMARA Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>QC Lab Portal · Sample Analysis</p>
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
                  <p className="text-xs" style={{color: '#00B4D8'}}>Lab Analyst</p>
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
            <p className="text-2xl font-bold text-blue-600">{pendingReceiptCount}</p>
            <p className="text-xs text-gray-500">Awaiting analysis start</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{inAnalysisCount}</p>
            <p className="text-xs text-gray-500">In analysis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedShipments.length}</p>
            <p className="text-xs text-gray-500">Results submitted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{shipments.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'active' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Active ({activeShipments.length})
            </button>
            <button onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'completed' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'completed' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Completed ({completedShipments.length})
            </button>
          </div>
          <button onClick={fetchData}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
            style={{background: '#00B4D8'}}>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No samples in this queue</p>
            <p className="text-sm mt-1">
              {activeTab === 'active' ? 'Samples will appear here when the inspector delivers them to the lab' : 'Completed analyses will appear here'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Since</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const info = STATE_INFO[s.current_state] || { label: s.current_state, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{s.faseh_request_number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{s.importer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.shipment_country}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.product_count || '—'} products</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.state_entered_at)}</td>
                      <td className="px-4 py-3">
                        {['LAB_RECEIVED', 'IN_ANALYSIS'].includes(s.current_state) && (
                          <button onClick={() => fetchShipmentDetail(s)}
                            className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                            style={{background: '#2D2B7A'}}>
                            {s.current_state === 'LAB_RECEIVED' ? '▶ Start' : '📋 Results'}
                          </button>
                        )}
                        {s.current_state === 'RESULT_SUBMITTED' && (
                          <span className="text-xs text-green-600 font-medium">✓ Submitted</span>
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

      {selectedShipment && (
        <SubmitResultModal
          shipment={selectedShipment}
          token={token}
          onClose={() => setSelectedShipment(null)}
          onRefresh={() => {
            fetchData();
            setSelectedShipment(null);
          }}
        />
      )}
    </div>
  );
}