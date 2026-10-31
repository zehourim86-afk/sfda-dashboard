import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import SFDAObserverAssistant from './SFDAObserverAssistant';
import ShipmentTimeline from './ShipmentTimeline';
import NotificationBell from './NotificationBell';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const STATE_COLORS = {
  RECORD_OPENED: 'bg-gray-100 text-gray-700',
  SAMPLING_REQUESTED: 'bg-orange-100 text-orange-700',
  INSPECTOR_DISPATCHED: 'bg-orange-100 text-orange-700',
  SAMPLE_COLLECTED: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT_TO_LAB: 'bg-yellow-100 text-yellow-700',
  LAB_RECEIVED: 'bg-purple-100 text-purple-700',
  IN_ANALYSIS: 'bg-purple-100 text-purple-700',
  RESULT_SUBMITTED: 'bg-blue-100 text-blue-700',
  CONFORMING: 'bg-green-100 text-green-700',
  NON_CONFORMING: 'bg-red-100 text-red-700',
  PARTIALLY_CONFORMING: 'bg-orange-100 text-orange-700',
  FINAL_CLEARANCE: 'bg-green-100 text-green-700',
  RE_EXPORT_COMPLETED: 'bg-gray-100 text-gray-700',
  DESTRUCTION_CONFIRMED: 'bg-gray-100 text-gray-700',
  DECISION_PENDING: 'bg-amber-100 text-amber-800 border border-amber-300',
  DECISION_OVERDUE: 'bg-red-100 text-red-700 border border-red-300',
  SFDA_ORDERED_DESTRUCTION: 'bg-red-600 text-white',
};

// Badge text overrides; other states show their name with spaces.
const STATE_BADGE_LABELS = {
  DECISION_PENDING: '⏳ Awaiting SFDA Decision',
};

function stateBadgeLabel(state) {
  return STATE_BADGE_LABELS[state] || state.replace(/_/g, ' ');
}

const CHART_COLORS = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444'];

export default function SFDAObserverPortal({ user, token, onLogout }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterPort, setFilterPort] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [timelineShipmentId, setTimelineShipmentId] = useState(null);
  const [labPerformance, setLabPerformance] = useState([]);
  const [labPerformanceLoading, setLabPerformanceLoading] = useState(true);

  // Live per-lab metrics. On failure, fall back to the empty-state message.
  useEffect(() => {
    let cancelled = false;
    const fetchLabPerformance = async () => {
      try {
        const res = await fetch(`${API_URL}/analytics/lab-performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!cancelled) setLabPerformance(Array.isArray(data.labs) ? data.labs : []);
      } catch (err) {
        if (!cancelled) setLabPerformance([]);
      } finally {
        if (!cancelled) setLabPerformanceLoading(false);
      }
    };
    fetchLabPerformance();
    return () => { cancelled = true; };
  }, [token]);

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

  const total = shipments.length;
  const cleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const conforming = shipments.filter(s => ['CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state)).length;
  const nonConforming = shipments.filter(s => ['NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)).length;
  const inProgress = shipments.filter(s => !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state)).length;
  const conformityRate = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const avgDwellMinutes = shipments.filter(s => s.total_dwell_minutes)
    .reduce((acc, s, _, arr) => acc + s.total_dwell_minutes / arr.length, 0);
  const avgDwellDays = avgDwellMinutes > 0 ? (avgDwellMinutes / 1440).toFixed(1) : '—';

  const stuckShipments = shipments.filter(s => {
    const hoursInState = (new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60);
    return hoursInState > 48 && !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state);
  });

  const countryNonConformityData = Object.entries(
    shipments.reduce((acc, s) => {
      if (!acc[s.shipment_country]) acc[s.shipment_country] = { total: 0, nonConforming: 0 };
      acc[s.shipment_country].total++;
      if (['NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)) {
        acc[s.shipment_country].nonConforming++;
      }
      return acc;
    }, {})
  ).map(([name, data]) => ({
    name,
    rate: data.total > 0 ? Math.round((data.nonConforming / data.total) * 100) : 0
  })).filter(d => d.rate > 0);

  const portData = Object.entries(
    shipments.reduce((acc, s) => {
      const port = s.port_of_entry?.split(' - ')[0]?.replace('King ', '') || 'Unknown';
      acc[port] = (acc[port] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const stateData = [
    { name: 'Cleared', value: cleared, color: '#10B981' },
    { name: 'In Progress', value: inProgress, color: '#00B4D8' },
    { name: 'Non-Conforming', value: nonConforming, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
      s.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !filterState || s.current_state === filterState;
    const matchCountry = !filterCountry || s.shipment_country === filterCountry;
    const matchPort = !filterPort || s.port_of_entry === filterPort;
    const matchDateFrom = !filterDateFrom || new Date(s.created_at) >= new Date(filterDateFrom);
    const matchDateTo = !filterDateTo || new Date(s.created_at) <= new Date(filterDateTo + 'T23:59:59');
    return matchSearch && matchState && matchCountry && matchPort && matchDateFrom && matchDateTo;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">DEMARA Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>DEMARA Masaar · SFDA Observer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live
            </span>
            <NotificationBell token={token} />
            {user && (
              <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">{user.full_name}</p>
                  <p className="text-xs" style={{color: '#00B4D8'}}>SFDA</p>
                </div>
              </div>
            )}
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Observer notice */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
        <p className="text-xs text-blue-700 text-center">
          🔒 Read-only access — This portal provides SFDA with full visibility into import clearance operations. No actions can be performed.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
            📊 Overview
          </button>
          <button onClick={() => setActiveTab('shipments')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'shipments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
            📦 All Shipments ({total})
          </button>
          <button onClick={() => setActiveTab('assistant')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assistant' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
            🔍 Intelligence
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="px-6 py-4 space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold" style={{color: '#1a3a5c'}}>{total}</p>
              <p className="text-xs text-gray-500 mt-1">Total shipments</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{inProgress}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{conformityRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Clearance rate</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{nonConforming}</p>
              <p className="text-xs text-gray-500 mt-1">Non-conforming</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{avgDwellDays}</p>
              <p className="text-xs text-gray-500 mt-1">Avg dwell (days)</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Clearance Status Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stateData} cx="50%" cy="50%" outerRadius={70}
                    dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                    {stateData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Port</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={portData} margin={{bottom: 20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize: 10}} angle={-20} textAnchor="end" />
                  <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1a3a5c" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stuck shipments alert */}
          {stuckShipments.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                ⚠️ Shipments Delayed — Same State Over 48 Hours ({stuckShipments.length})
              </h3>
              <div className="space-y-2">
                {stuckShipments.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                    <div>
                      <span className="font-mono text-xs font-semibold" style={{color: '#1a3a5c'}}>{s.faseh_request_number}</span>
                      <span className="text-xs text-gray-500 ml-2">{s.importer_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATE_COLORS[s.current_state] || 'bg-gray-100 text-gray-700'}`}>
                        {stateBadgeLabel(s.current_state)}
                      </span>
                      <span className="text-xs text-red-600 font-bold">
                        {Math.floor((new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60))}h stuck
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-conformity by country */}
          {countryNonConformityData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Non-Conformity Rate by Country of Origin</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={countryNonConformityData} layout="vertical" margin={{left: 40}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{fontSize: 10}} unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{fontSize: 10}} width={60} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="rate" fill="#EF4444" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Lab performance comparison */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Lab Network Performance</h3>
              <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.8px',color:'#00C896',
                background:'rgba(0,200,150,0.1)',border:'1px solid rgba(0,200,150,0.3)',
                borderRadius:'10px',padding:'2px 8px'}}>
                LIVE DATA
              </span>
            </div>
            {labPerformanceLoading ? (
              <p className="text-xs text-gray-400 py-6 text-center">Loading lab performance...</p>
            ) : labPerformance.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No lab performance data yet — data will appear as shipments are processed
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {labPerformance.map(lab => (
                  <div key={lab.lab_id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-900 mb-2">{lab.lab_name}</p>
                    {[
                      ['Assigned', lab.total_assigned, '#1a3a5c'],
                      ['Completed', lab.completed, '#059669'],
                      ['Pending', lab.pending, '#D97706'],
                      ['Avg turnaround', lab.avg_turnaround_hours != null ? `${lab.avg_turnaround_hours}h` : '—', '#1a3a5c'],
                      ['Conformity', lab.conformity_rate != null ? `${lab.conformity_rate}%` : '—', '#1a3a5c'],
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span className="text-xs font-bold" style={{color}}>{value}</span>
                      </div>
                    ))}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2" title="Completed of assigned">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${lab.total_assigned > 0 ? Math.round((lab.completed / lab.total_assigned) * 100) : 0}%`,
                        background: '#1a3a5c'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In progress shipments */}
          {inProgress > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ Shipments Currently In Progress</h3>
              <div className="space-y-2">
                {shipments.filter(s => !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state)).map(s => (
                  <div key={s.id}
                    onClick={() => { setSelectedShipment(s); setActiveTab('shipments'); }}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors">
                    <div>
                      <span className="font-mono text-sm font-semibold" style={{color: '#1a3a5c'}}>{s.faseh_request_number}</span>
                      <span className="text-xs text-gray-500 ml-3">{s.importer_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{s.port_of_entry}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATE_COLORS[s.current_state] || 'bg-gray-100 text-gray-700'}`}>
                        {stateBadgeLabel(s.current_state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Intelligence Tab */}
      {activeTab === 'assistant' && (
        <div style={{padding:'24px',height:'calc(100vh - 200px)'}}>
          <SFDAObserverAssistant token={token} />
        </div>
      )}

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder="Search by Faseh number or importer..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none" />
            <select value={filterState} onChange={e => setFilterState(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All States</option>
              <option value="RECORD_OPENED">Record Opened</option>
              <option value="SAMPLING_REQUESTED">Sampling Requested</option>
              <option value="IN_ANALYSIS">In Analysis</option>
              <option value="RESULT_SUBMITTED">Result Submitted</option>
              <option value="DECISION_PENDING">Awaiting SFDA Decision</option>
              <option value="CONFORMING">Conforming</option>
              <option value="NON_CONFORMING">Non-Conforming</option>
              <option value="PARTIALLY_CONFORMING">Partially Conforming</option>
              <option value="FINAL_CLEARANCE">Final Clearance</option>
              <option value="RE_EXPORT_COMPLETED">Re-Export Completed</option>
            </select>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All Countries</option>
              {[...new Set(shipments.map(s => s.shipment_country))].sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filterPort} onChange={e => setFilterPort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All Ports</option>
              {[...new Set(shipments.map(s => s.port_of_entry))].sort().map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 mb-4">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <span className="flex items-center text-gray-400 text-sm">to</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <button onClick={() => { setFilterState(''); setFilterCountry(''); setFilterPort(''); setFilterDateFrom(''); setFilterDateTo(''); setSearch(''); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Clear Filters
            </button>
            <button onClick={fetchShipments}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
              style={{background: '#00B4D8'}}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lab</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Update</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50" style={{cursor:'pointer'}} onClick={() => setTimelineShipmentId(s.id)}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#1a3a5c'}}>{s.faseh_request_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.importer_name}</p>
                        <p className="text-xs text-gray-500">{s.ghad_cr_number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.shipment_country}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.port_of_entry}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.lab_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLORS[s.current_state] || 'bg-gray-100 text-gray-700'}`}>
                          {stateBadgeLabel(s.current_state)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.updated_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedShipment(s)}
                          className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                          style={{background: '#1a3a5c'}}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shipment detail modal — read only */}
      {selectedShipment && (
        <ShipmentDetailReadOnly
          shipment={selectedShipment}
          token={token}
          onClose={() => setSelectedShipment(null)}
        />
      )}
      {timelineShipmentId && (
        <ShipmentTimeline
          shipmentId={timelineShipmentId}
          token={token}
          onClose={() => setTimelineShipmentId(null)}
        />
      )}
    </div>
  );
}

function ShipmentDetailReadOnly({ shipment, token, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipment.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setDetail(data.shipment);
      } catch (err) {
        console.error('Failed to fetch shipment detail');
      }
    };
    fetchDetail();
  }, [shipment.id]);

  if (!detail) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-gray-500">Loading...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{detail.faseh_request_number}</h2>
            <p className="text-sm text-gray-500">{detail.importer_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Read Only</span>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_URL}/shipments/${detail.id}/dwell-report`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-trail-${detail.faseh_request_number}.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Export failed');
                }
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-white hover:opacity-90"
              style={{background: '#1a3a5c'}}>
              📄 Export Audit Trail
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className={`rounded-lg p-4 ${
            detail.current_state === 'FINAL_CLEARANCE' ? 'bg-green-50 border border-green-200' :
            detail.current_state === 'NON_CONFORMING' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_COLORS[detail.current_state] || 'bg-gray-100 text-gray-700'}`}>
              {stateBadgeLabel(detail.current_state)}
            </span>
            <p className="text-sm text-gray-600 mt-2">Since {formatDate(detail.state_entered_at)}</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Faseh Reference</p>
              <p className="text-sm font-medium">{detail.faseh_request_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">GHAD CR Number</p>
              <p className="text-sm font-medium">{detail.ghad_cr_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Importer</p>
              <p className="text-sm font-medium">{detail.importer_name}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium">{detail.shipment_country}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium">{detail.port_of_entry}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">QC Lab</p>
              <p className="text-sm font-medium">{detail.lab_name || '—'}</p></div>
            {detail.total_dwell_minutes && (
              <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Dwell Time</p>
                <p className="text-lg font-bold text-green-700">
                  {Math.floor(detail.total_dwell_minutes / 1440)} days {Math.floor((detail.total_dwell_minutes % 1440) / 60)} hours
                </p>
              </div>
            )}
          </div>

          {/* Products */}
          {detail.products && detail.products.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Products ({detail.products.length})</h3>
              <div className="space-y-2">
                {detail.products.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">{p.product_name_en}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.current_decision === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        p.current_decision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.current_decision}</span>
                    </div>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {p.ecos_ma_number && <span className="text-xs text-gray-500">E-Cosma: {p.ecos_ma_number}</span>}
                      {p.batch_number && <span className="text-xs text-gray-500">Batch: {p.batch_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {detail.audit_log && detail.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Complete Audit Trail</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detail.audit_log.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      log.trigger_source === 'EMAIL_PARSER' ? 'bg-blue-500' :
                      log.trigger_source === 'SYSTEM' ? 'bg-purple-500' : 'bg-green-500'
                    }`}></span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{log.from_state} → {log.to_state}</p>
                      <p className="text-xs text-gray-500">{log.trigger_event}</p>
                      <p className="text-xs text-gray-400">{log.trigger_source} · {formatDate(log.occurred_at)}</p>
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