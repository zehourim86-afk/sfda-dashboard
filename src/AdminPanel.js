import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const API_URL = 'http://localhost:3000/api/v1';
const COLORS = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{color: color || '#2D2B7A'}}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Overview Section ──
function OverviewSection({ token }) {
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipmentsRes, dashRes] = await Promise.all([
          fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/shipments/stats/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const shipmentsData = await shipmentsRes.json();
        const dashData = await dashRes.json();
        setShipments(shipmentsData.shipments || []);
        setStats(dashData);
      } catch (err) {
        console.error('Failed to fetch overview');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const total = shipments.length;
  const conforming = shipments.filter(s => s.current_state === 'CONFORMING').length;
  const nonConforming = shipments.filter(s => s.current_state === 'NON_CONFORMING').length;
  const finalCleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const inProgress = shipments.filter(s => !['FINAL_CLEARANCE', 'ARCHIVED', 'CONFORMING', 'NON_CONFORMING'].includes(s.current_state)).length;

  const stateData = stats?.by_state?.map(s => ({
    name: s.current_state.replace(/_/g, ' '),
    value: parseInt(s.count)
  })) || [];

  const portData = stats?.by_port?.map(p => ({
    name: p.port_of_entry.split(' - ')[0].replace('King ', ''),
    value: parseInt(p.count)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Shipments" value={total} />
        <StatCard label="In Progress" value={inProgress} color="#00B4D8" />
        <StatCard label="Conforming" value={conforming} color="#10B981" />
        <StatCard label="Non-Conforming" value={nonConforming} color="#EF4444" />
        <StatCard label="Final Clearance" value={finalCleared} color="#8B5CF6" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by State</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stateData} margin={{bottom: 40}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{fontSize: 8}} angle={-30} textAnchor="end" />
              <YAxis tick={{fontSize: 10}} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2D2B7A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Port</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={portData} cx="50%" cy="50%" outerRadius={80}
                dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                {portData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      {stats?.recent_activity?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {stats.recent_activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                <span className="font-mono text-xs text-blue-700 font-semibold">{a.faseh_request_number}</span>
                <span className="text-xs text-gray-600">{a.importer_name}</span>
                <span className="text-xs text-gray-400">→ {a.to_state}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatDate(a.occurred_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shipments Section ──
function ShipmentsSection({ token }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const STATES = [
    'RECORD_OPENED', 'SAMPLING_REQUESTED', 'INSPECTOR_DISPATCHED',
    'SAMPLE_COLLECTED', 'IN_TRANSIT_TO_LAB', 'LAB_RECEIVED',
    'IN_ANALYSIS', 'RESULT_SUBMITTED', 'CONFORMING', 'NON_CONFORMING',
    'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'
  ];

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipments(data.shipments || []);
      } catch (err) {
        console.error('Failed to fetch shipments');
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
      s.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !selectedState || s.current_state === selectedState;
    return matchSearch && matchState;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" placeholder="Search Faseh number or importer..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All States</option>
          {STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lab</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clearance Co.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">State</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dwell Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{s.faseh_request_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{s.importer_name}</p>
                    <p className="text-xs text-gray-500">{s.ghad_cr_number}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.shipment_country}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.lab_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.clearance_company_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      s.current_state === 'CONFORMING' || s.current_state === 'FINAL_CLEARANCE' ? 'bg-green-100 text-green-700' :
                      s.current_state === 'NON_CONFORMING' ? 'bg-red-100 text-red-700' :
                      s.current_state.includes('ANALYSIS') || s.current_state === 'IN_ANALYSIS' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {s.current_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {s.total_dwell_minutes ? `${Math.floor(s.total_dwell_minutes / 1440)}d ${Math.floor((s.total_dwell_minutes % 1440) / 60)}h` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Email Parser Log Section ──
function EmailParserSection({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const SAMPLE_QC = `FROM: qc-sampling@sfda.gov.sa\nTO: omar@alnoor-pharma.com.sa\nCC: qc@demara.sa\nSUBJECT: QC Sampling Required — FASEH-2026-CS-DEMO1\n\nFaseh Reference: FASEH-2026-CS-DEMO1\nGHAD CR Number: CR-5555555555\nPort of Entry: King Abdulaziz Port - Dammam\nShipment Country: Italy\n\nSaudi Food and Drug Authority`;

  const SAMPLE_CONFORMING = `FROM: decisions@sfda.gov.sa\nTO: clearance@saudiclearance.com.sa\nCC: qc@demara.sa\nSUBJECT: Clearance Decision — FASEH-2026-CS-DEMO1 — CONFORMING\n\nFaseh Reference: FASEH-2026-CS-DEMO1\nOverall Decision: CONFORMING\n\n1. Product Name: Anti-Aging Night Cream 50ml\n   E-Cosma Number: COSMA-SA-2024-0211\n   Decision: APPROVED\n\nSaudi Food and Drug Authority`;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/parser/logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Failed to fetch parser logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/parser/incoming-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email_text: testEmail,
          from_address: 'sfda@sfda.gov.sa',
          subject: 'SFDA Test Email'
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Test email parser */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🤖 Test Email Parser — Simulate SFDA Email</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTestEmail(SAMPLE_QC)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            Load QC Sampling Email
          </button>
          <button onClick={() => setTestEmail(SAMPLE_CONFORMING)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            Load Conforming Decision Email
          </button>
        </div>
        <textarea value={testEmail} onChange={e => setTestEmail(e.target.value)}
          rows={6} placeholder="Paste SFDA email content here..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none" />
        <button onClick={handleTest} disabled={testing || !testEmail.trim()}
          className="mt-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
          style={{background: '#2D2B7A'}}>
          {testing ? '🤖 Parsing...' : '▶ Process Email'}
        </button>

        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {testResult.success ? (
              <div>
                <p className="font-semibold text-green-700">✓ Email processed successfully</p>
                <p className="text-green-600 text-xs mt-1">Faseh: {testResult.faseh_request_number} | {testResult.previous_state} → {testResult.new_state} | {testResult.notifications_sent} notifications sent</p>
              </div>
            ) : (
              <p className="text-red-700">✗ {testResult.reason || testResult.error || 'Processing failed'}</p>
            )}
          </div>
        )}
      </div>

      {/* Parser logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Email Parser Log</h3>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No emails processed yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Decision</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.received_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{log.from_address}</td>
                  <td className="px-4 py-3 text-xs font-mono font-semibold" style={{color: '#2D2B7A'}}>{log.extracted_faseh_number || '—'}</td>
                  <td className="px-4 py-3">
                    {log.extracted_decision && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        log.extracted_decision === 'CONFORMING' ? 'bg-green-100 text-green-700' :
                        log.extracted_decision === 'NON_CONFORMING' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{log.extracted_decision.replace(/_/g, ' ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      log.current_status === 'PROCESSED' ? 'bg-green-100 text-green-700' :
                      log.current_status === 'UNMATCHED' ? 'bg-orange-100 text-orange-700' :
                      log.current_status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{log.current_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Users Section ──
function UsersSection({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS = {
    DEMARA_ADMIN: 'bg-purple-100 text-purple-700',
    IMPORTER: 'bg-blue-100 text-blue-700',
    SFDA_INSPECTOR: 'bg-orange-100 text-orange-700',
    LAB_ANALYST: 'bg-green-100 text-green-700',
    CLEARANCE_COMPANY: 'bg-yellow-100 text-yellow-700',
    NOTIFIED_BODY: 'bg-pink-100 text-pink-700',
    GMP_AUDITOR: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <input type="text" placeholder="Search users..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Organisations Section ──
function OrganisationsSection({ token }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/organisations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setOrgs(data.organisations || []);
      } catch (err) {
        console.error('Failed to fetch organisations');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const labs = orgs.filter(o => o.org_type === 'LAB');
  const clearanceCompanies = orgs.filter(o => o.org_type === 'CLEARANCE_COMPANY');
  const others = orgs.filter(o => !['LAB', 'CLEARANCE_COMPANY'].includes(o.org_type));

  const OrgTable = ({ title, data }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title} ({data.length})</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Country</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map(o => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-medium text-gray-900">{o.name_en}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{o.org_type}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{o.country || '—'}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {o.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <OrgTable title="Certified QC Labs" data={labs} />
      <OrgTable title="Clearance Companies" data={clearanceCompanies} />
      {others.length > 0 && <OrgTable title="Other Organisations" data={others} />}
    </div>
  );
}

// ── Platform Metrics Section ──
function MetricsSection({ token }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipments(data.shipments || []);
      } catch (err) {
        console.error('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const total = shipments.length;
  const conformingRate = total > 0 ? Math.round((shipments.filter(s => ['CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state)).length / total) * 100) : 0;
  const nonConformingRate = total > 0 ? Math.round((shipments.filter(s => s.current_state === 'NON_CONFORMING').length / total) * 100) : 0;

  const countryData = Object.entries(
    shipments.reduce((acc, s) => {
      acc[s.shipment_country] = (acc[s.shipment_country] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const projectionData = [
    { month: 'Month 1', manual: 50, demara: 50 },
    { month: 'Month 2', manual: 52, demara: 80 },
    { month: 'Month 3', manual: 48, demara: 120 },
    { month: 'Month 4', manual: 51, demara: 180 },
    { month: 'Month 5', manual: 49, demara: 250 },
    { month: 'Month 6', manual: 50, demara: 350 },
  ];

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Shipments Processed" value={total} />
        <StatCard label="Conforming Rate" value={`${conformingRate}%`} color="#10B981" sub="Products approved" />
        <StatCard label="Non-Conforming Rate" value={`${nonConformingRate}%`} color="#EF4444" sub="Products rejected" />
        <StatCard label="Active Labs" value={4} color="#00B4D8" sub="SFDA certified" />
      </div>

      {/* Throughput projection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Shipment Throughput Projection</h3>
        <p className="text-xs text-gray-400 mb-3">Estimated monthly shipments — Manual process vs DEMARA platform</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{fontSize: 10}} />
            <YAxis tick={{fontSize: 10}} />
            <Tooltip />
            <Line type="monotone" dataKey="manual" stroke="#EF4444" strokeWidth={2} name="Manual Process" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="demara" stroke="#10B981" strokeWidth={2} name="With DEMARA" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-400" style={{borderTop: '2px dashed #EF4444'}}></div><span className="text-xs text-gray-500">Manual process (flat)</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500"></div><span className="text-xs text-gray-500">With DEMARA (growing)</span></div>
        </div>
      </div>

      {/* Shipments by country */}
      {countryData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Origin Country</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#00B4D8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Value proposition */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Platform Value — Per Shipment</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 font-semibold uppercase">Without DEMARA</p>
            <p className="text-2xl font-bold text-red-700 mt-1">3-5 days</p>
            <p className="text-xs text-red-500">Average delay after approval</p>
            <p className="text-lg font-bold text-red-700 mt-2">SAR 15,000-50,000</p>
            <p className="text-xs text-red-500">Demurrage cost per shipment</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 font-semibold uppercase">With DEMARA</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{'< 1 hour'}</p>
            <p className="text-xs text-green-500">Notification after approval</p>
            <p className="text-lg font-bold text-green-700 mt-2">SAR ~0</p>
            <p className="text-xs text-green-500">Demurrage cost per shipment</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-semibold uppercase">SFDA Benefit</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">3x</p>
            <p className="text-xs text-blue-500">Throughput increase</p>
            <p className="text-lg font-bold text-blue-700 mt-2">More tests</p>
            <p className="text-xs text-blue-500">= More QC fee revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──
export default function AdminPanel({ user, token, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'shipments', label: 'Shipments', icon: '📦' },
    { id: 'email-parser', label: 'Email Parser', icon: '🤖' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'organisations', label: 'Organisations', icon: '🏢' },
    { id: 'metrics', label: 'Platform Metrics', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col" style={{minHeight: '100vh'}}>
        <div className="p-4 border-b border-gray-200" style={{background: 'linear-gradient(135deg, #2D2B7A, #1a1854)'}}>
          <img src="/demara-logo.png" alt="DEMARA" style={{height: '60px', width: '160px', objectFit: 'contain'}} />
          <p className="text-xs mt-1" style={{color: '#00B4D8'}}>Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeSection === item.id ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={activeSection === item.id ? {background: '#2D2B7A'} : {}}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          {user && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-700">{user.full_name}</p>
              <p className="text-xs text-gray-500">DEMARA Admin</p>
            </div>
          )}
          <button onClick={onLogout}
            className="w-full px-3 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600">
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {NAV_ITEMS.find(n => n.id === activeSection)?.icon} {NAV_ITEMS.find(n => n.id === activeSection)?.label}
          </h1>
          <p className="text-sm text-gray-500">DEMARA Drug Import Traceability Platform</p>
        </div>

        {activeSection === 'overview' && <OverviewSection token={token} />}
        {activeSection === 'shipments' && <ShipmentsSection token={token} />}
        {activeSection === 'email-parser' && <EmailParserSection token={token} />}
        {activeSection === 'users' && <UsersSection token={token} />}
        {activeSection === 'organisations' && <OrganisationsSection token={token} />}
        {activeSection === 'metrics' && <MetricsSection token={token} />}
      </div>
    </div>
  );
}