import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const API_URL = 'http://localhost:3000/api/v1';
const CHART_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
const LAB_ID = 'LAB-SA-0012';
const ANALYST_ID = '00000000-0000-0000-0000-000000000004';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_COLORS = {
  LAB_RECEIVED: 'bg-blue-100 text-blue-800',
  IN_ANALYSIS: 'bg-yellow-100 text-yellow-800',
  RESULT_READY: 'bg-green-100 text-green-800',
};

// Result submission form
function ResultForm({ trace, onSubmit, onCancel }) {
  const [results, setResults] = useState(
    trace.line_items.map(item => ({
      line_item_id: item.id,
      product_name: item.product_name_en,
      test_name: '',
      test_method: '',
      spec_limit: '',
      result_value: '',
      result_unit: '',
      pass_fail: 'PASS'
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateResult = (index, field, value) => {
    const updated = [...results];
    updated[index][field] = value;
    setResults(updated);
  };

  const handleSubmit = async () => {
    // Validate
    for (const r of results) {
      if (!r.test_name || !r.test_method || !r.spec_limit || !r.result_value) {
        setError('Please fill in all fields for every product.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // First transition to RESULT_READY
      const transitionRes = await fetch(`${API_URL}/traces/${trace.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_state: 'RESULT_READY',
          actor_id: ANALYST_ID,
          actor_role: 'LAB_ANALYST',
          trigger_event: 'Lab submitted structured result via Lab Portal'
        })
      });

      const transitionData = await transitionRes.json();

      if (!transitionData.success) {
        setError(transitionData.message);
        setSubmitting(false);
        return;
      }

      onSubmit();
    } catch (err) {
      setError('Failed to submit results. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit Test Results</h2>
            <p className="text-sm text-gray-500">{trace.trace_number}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">
                {result.product_name}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Test name</label>
                  <input
                    type="text"
                    placeholder="e.g. Microbial Count"
                    value={result.test_name}
                    onChange={e => updateResult(index, 'test_name', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Test method</label>
                  <input
                    type="text"
                    placeholder="e.g. USP 61, BP 2023"
                    value={result.test_method}
                    onChange={e => updateResult(index, 'test_method', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Spec limit</label>
                  <input
                    type="text"
                    placeholder="e.g. NMT 100 CFU/g"
                    value={result.spec_limit}
                    onChange={e => updateResult(index, 'spec_limit', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Result value</label>
                  <input
                    type="text"
                    placeholder="e.g. 45"
                    value={result.result_value}
                    onChange={e => updateResult(index, 'result_value', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Result unit</label>
                  <input
                    type="text"
                    placeholder="e.g. CFU/g, %, mg/kg"
                    value={result.result_unit}
                    onChange={e => updateResult(index, 'result_unit', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Pass / Fail</label>
                  <select
                    value={result.pass_fail}
                    onChange={e => updateResult(index, 'pass_fail', e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Results'}
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

// Main Lab Portal
export default function LabPortal({ user, token, onLogout }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [allTraces, setAllTraces] = useState([]);

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const states = activeTab === 'pending'
        ? ['LAB_RECEIVED', 'IN_ANALYSIS']
        : ['RESULT_READY'];

      const results = await Promise.all(
        states.map(state =>
          fetch(`${API_URL}/traces?state=${state}`).then(r => r.json())
        )
      );

      const allStates = ['LAB_RECEIVED', 'IN_ANALYSIS', 'RESULT_READY'];
      const allResults = await Promise.all(
        allStates.map(state =>
          fetch(`${API_URL}/traces?state=${state}`).then(r => r.json())
        )
      );

      setAllTraces(allResults.flatMap(r => r.traces || []));
      setTraces(results.flatMap(r => r.traces || []));
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const openResultForm = async (trace) => {
    try {
      const response = await fetch(`${API_URL}/traces/${trace.id}`);
      const data = await response.json();
      setSelectedTrace(data.trace);
      setShowResultForm(true);
    } catch (err) {
      console.error('Failed to fetch trace details');
    }
  };

  const handleTransition = async (traceId, newState, triggerEvent) => {
    try {
      await fetch(`${API_URL}/traces/${traceId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_state: newState,
          actor_id: ANALYST_ID,
          actor_role: 'LAB_ANALYST',
          trigger_event: triggerEvent
        })
      });
      fetchTraces();
    } catch (err) {
      console.error('Transition failed');
    }
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
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Lab Portal · {LAB_ID}</p>
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
            <p className="text-2xl font-bold text-blue-600">
              {allTraces.filter(t => t.current_state === 'LAB_RECEIVED').length}
            </p>
            <p className="text-xs text-gray-500">Awaiting registration</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {allTraces.filter(t => t.current_state === 'IN_ANALYSIS').length}
            </p>
            <p className="text-xs text-gray-500">In analysis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {allTraces.filter(t => t.current_state === 'RESULT_READY').length}
            </p>
            <p className="text-xs text-gray-500">Results submitted</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lab Queue Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[
              { name: 'Received', count: allTraces.filter(t => t.current_state === 'LAB_RECEIVED').length },
              { name: 'In Analysis', count: allTraces.filter(t => t.current_state === 'IN_ANALYSIS').length },
              { name: 'Results Ready', count: allTraces.filter(t => t.current_state === 'RESULT_READY').length },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Samples by Country</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={Object.entries(allTraces.reduce((acc, t) => {
                  acc[t.shipment_country] = (acc[t.shipment_country] || 0) + 1;
                  return acc;
                }, {})).map(([name, value]) => ({ name, value }))}
                cx="50%" cy="50%" outerRadius={60}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {allTraces.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Analysis
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Results Submitted
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
          <div className="text-center py-12 text-gray-500">Loading samples...</div>
        ) : traces.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No samples in this queue</p>
            <p className="text-sm mt-1">Samples will appear here when assigned to this lab</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traces.map((trace) => (
                  <tr key={trace.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-green-600">
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
                      <div className="flex gap-2">
                        {trace.current_state === 'LAB_RECEIVED' && (
                          <button
                            onClick={() => handleTransition(trace.id, 'IN_ANALYSIS', 'Lab analyst registered sample and began testing')}
                            className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-lg hover:bg-yellow-100"
                          >
                            Start Analysis
                          </button>
                        )}
                        {trace.current_state === 'IN_ANALYSIS' && (
                          <button
                            onClick={() => openResultForm(trace)}
                            className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100"
                          >
                            Submit Results
                          </button>
                        )}
                        {trace.current_state === 'RESULT_READY' && (
                          <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-lg">
                            Submitted ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result Form Modal */}
      {showResultForm && selectedTrace && (
        <ResultForm
          trace={selectedTrace}
          onSubmit={() => {
            setShowResultForm(false);
            setSelectedTrace(null);
            fetchTraces();
          }}
          onCancel={() => {
            setShowResultForm(false);
            setSelectedTrace(null);
          }}
        />
      )}
    </div>
  );
}