import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import Reports from './Reports';

const API_URL = 'http://localhost:3000/api/v1';
const CHART_COLORS = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Sidebar navigation items
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'User Management', icon: '👥' },
  { id: 'registrations', label: 'Registration Requests', icon: '📋' },
  { id: 'shipments', label: 'Import Clearance', icon: '🚢' },
  { id: 'certificates', label: 'Certificates', icon: '📜' },
  { id: 'qms', label: 'Digital QMS', icon: '🏭' },
  { id: 'settings', label: 'Platform Settings', icon: '⚙️' },
  { id: 'reports', label: 'Reports', icon: '📑' },
];

// Overview section
function Overview({ traces, users, token }) {
  const released = traces.filter(t => t.current_state === 'RELEASED').length;
  const active = traces.filter(t => t.current_state !== 'RELEASED').length;

  const stateData = Object.entries(
    traces.reduce((acc, t) => {
      acc[t.current_state] = (acc[t.current_state] || 0) + 1;
      return acc;
    }, {})
  ).map(([state, count]) => ({ state: state.replace(/_/g, ' '), count }));

  const roleData = Object.entries(
    users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {})
  ).map(([role, count]) => ({ name: role.replace(/_/g, ' '), value: count }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Shipments</p>
          <p className="text-3xl font-bold mt-1" style={{color: '#2D2B7A'}}>{traces.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Active Shipments</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Released</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{released}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Users</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{users.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Shipments by State</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stateData} margin={{bottom: 40}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="state" tick={{fontSize: 9}} angle={-45} textAnchor="end" />
              <YAxis tick={{fontSize: 10}} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2D2B7A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Users by Role</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={80}
                dataKey="value" label={({name, value}) => `${name}: ${value}`} labelLine={false}>
                {roleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🚢</span>
            <h3 className="font-semibold text-gray-800">Import Clearance</h3>
          </div>
          <p className="text-sm text-gray-600">{traces.length} total shipments tracked</p>
          <p className="text-sm text-green-600 mt-1">{released} released successfully</p>
          <span className="mt-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Live</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📜</span>
            <h3 className="font-semibold text-gray-800">Certificate Management</h3>
          </div>
          <p className="text-sm text-gray-600">Digital certificate issuance</p>
          <p className="text-sm text-blue-600 mt-1">Module 2 — In development</p>
          <span className="mt-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Building</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏭</span>
            <h3 className="font-semibold text-gray-800">Digital QMS</h3>
          </div>
          <p className="text-sm text-gray-600">GMP audit management</p>
          <p className="text-sm text-blue-600 mt-1">Module 3 — In development</p>
          <span className="mt-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Building</span>
        </div>
      </div>
    </div>
  );
}

// User Management section
// User Management section
function UserManagement({ users, token, onRefresh }) {
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '', email: '', password: '', role: 'IMPORTER',
    organisation_name: '', organisation_type: 'IMPORTER'
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const ROLES = ['DEMARA_ADMIN', 'SFDA_REVIEWER', 'SFDA_INSPECTOR', 'LAB_ANALYST', 'IMPORTER', 'NOTIFIED_BODY', 'GMP_AUDITOR'];
  const ORG_TYPES = ['SFDA', 'IMPORTER', 'LAB', 'NOTIFIED_BODY', 'MANUFACTURER', 'DEMARA'];

  const toggleUser = async (userId) => {
    setUpdating(userId + '_toggle');
    try {
      await fetch(`${API_URL}/admin/users/${userId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (err) {
      console.error('Toggle failed');
    } finally {
      setUpdating(null);
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      onRefresh();
    } catch (err) {
      console.error('Role change failed');
    }
  };

  const resetPassword = async (userId, userEmail) => {
    const newPassword = prompt(`Reset password for ${userEmail}.\nEnter new password (min 8 chars):`);
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    setUpdating(userId + '_reset');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Password reset successfully for ${userEmail}`);
      } else {
        alert('Password reset failed: ' + data.message);
      }
    } catch (err) {
      alert('Failed to reset password');
    } finally {
      setUpdating(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_URL}/admin/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateForm(false);
        setCreateForm({ full_name: '', email: '', password: '', role: 'IMPORTER', organisation_name: '', organisation_type: 'IMPORTER' });
        onRefresh();
        alert(`User created successfully: ${data.user.email}`);
      } else {
        setCreateError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setCreateError('Failed to connect to platform');
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none flex-1 min-w-48"
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
          style={{background: '#2D2B7A'}}
        >
          + Create User
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Create New User</h3>
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">{createError}</div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Full Name</label>
              <input type="text" required value={createForm.full_name}
                onChange={e => setCreateForm({...createForm, full_name: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Work Email</label>
              <input type="email" required value={createForm.email}
                onChange={e => setCreateForm({...createForm, email: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
              <input type="password" required value={createForm.password}
                onChange={e => setCreateForm({...createForm, password: e.target.value})}
                placeholder="Min 8 characters"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Role</label>
              <select value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Organisation Name</label>
              <input type="text" required value={createForm.organisation_name}
                onChange={e => setCreateForm({...createForm, organisation_name: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Organisation Type</label>
              <select value={createForm.organisation_type} onChange={e => setCreateForm({...createForm, organisation_type: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={creating}
                className="px-6 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{background: '#2D2B7A'}}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Users ({filtered.length} of {users.length})</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organisation</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.organisation_name || '—'}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.last_login_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => toggleUser(u.id)}
                      disabled={updating === u.id + '_toggle'}
                      className={`px-2 py-1 text-xs font-medium rounded-lg ${u.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => resetPassword(u.id, u.email)}
                      disabled={updating === u.id + '_reset'}
                      className="px-2 py-1 text-xs font-medium rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Registration Requests section
function RegistrationRequests({ token, onRefresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      const res = await fetch(`${API_URL}/admin/registrations/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: 'Approved by DEMARA admin' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Account created. Temporary password: ${data.temporary_password}`);
        fetchRequests();
        onRefresh();
      }
    } catch (err) {
      console.error('Approval failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await fetch(`${API_URL}/admin/registrations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: 'Rejected by DEMARA admin' })
      });
      fetchRequests();
    } catch (err) {
      console.error('Rejection failed');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const pending = requests.filter(r => r.status === 'PENDING');
  const reviewed = requests.filter(r => r.status !== 'PENDING');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Pending Requests ({pending.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No pending requests</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organisation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requested Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.organisation_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {r.requested_role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.submitted_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={processing === r.id}
                        className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={processing === r.id}
                        className="px-3 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Reviewed Requests ({reviewed.length})</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviewed.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.reviewed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Shipments section — reuses existing traces data
// Shipment detail modal with admin override
function ShipmentDetailModal({ trace, token, onClose, onRefresh }) {
  const [transitioning, setTransitioning] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState(null);

  const ALL_STATES = [
    'SUBMITTED', 'ROUTING', 'GOODS_HELD', 'LAB_ASSIGNED', 'SAMPLING',
    'SAMPLE_B_STORED', 'SAMPLING_HANDOVER', 'IN_TRANSIT', 'LAB_RECEIVED',
    'IN_ANALYSIS', 'RESULT_READY', 'UNDER_REVIEW', 'DECISION_PASS',
    'DECISION_FAIL', 'INVOICE_ISSUED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED',
    'RELEASE_TRIGGERED', 'RELEASED', 'RE_EXPORT_INITIATED'
  ];

  const handleOverride = async () => {
    if (!selectedState || !overrideReason) {
      setError('Please select a state and provide a reason.');
      return;
    }
    setTransitioning(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/traces/${trace.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requested_state: selectedState,
          actor_id: '00000000-0000-0000-0000-000000000001',
          actor_role: 'PLATFORM',
          trigger_event: `ADMIN OVERRIDE: ${overrideReason}`
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        onClose();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to override state');
    } finally {
      setTransitioning(false);
    }
  };

  const STATE_COLORS = {
    RELEASED: 'bg-gray-100 text-gray-800',
    DECISION_PASS: 'bg-green-100 text-green-800',
    DECISION_FAIL: 'bg-red-100 text-red-800',
    UNDER_REVIEW: 'bg-red-100 text-red-800',
    IN_ANALYSIS: 'bg-purple-100 text-purple-800',
    RESULT_READY: 'bg-green-100 text-green-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trace.trace_number}</h2>
            <p className="text-sm text-gray-500">{trace.importer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-6">
          {/* Current status */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATE_COLORS[trace.current_state] || 'bg-blue-100 text-blue-800'}`}>
              {trace.current_state}
            </span>
            <span className="text-sm text-gray-500">Since {formatDate(trace.state_entered_at)}</span>
          </div>

          {/* Shipment details */}
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">FASEH Request</p><p className="text-sm font-medium">{trace.faseh_request_no}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p><p className="text-sm font-medium">{trace.port_of_entry}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Country</p><p className="text-sm font-medium">{trace.shipment_country}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Created</p><p className="text-sm font-medium">{formatDate(trace.created_at)}</p></div>
          </div>

          {/* Admin override */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-3">⚠ Admin State Override</h3>
            <p className="text-xs text-yellow-700 mb-3">Use only in exceptional cases. All overrides are permanently logged in the audit trail.</p>
            {error && <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-red-700 text-xs">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Force transition to</label>
                <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select target state</option>
                  {ALL_STATES.filter(s => s !== trace.current_state).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Reason (required)</label>
                <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Correcting data entry error"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <button onClick={handleOverride} disabled={transitioning}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50">
              {transitioning ? 'Applying override...' : 'Apply Override'}
            </button>
          </div>

          {/* Audit trail */}
          {trace.audit_log && trace.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Trail</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trace.audit_log.map(log => (
                  <div key={log.id} className={`flex items-start gap-3 p-2 rounded-lg ${log.was_valid ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.was_valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{log.from_state} → {log.to_state}</p>
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

// Shipments section
function ShipmentsSection({ traces, token, onRefresh }) {
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');

  const STATE_COLORS = {
    SUBMITTED: 'bg-blue-100 text-blue-800',
    ROUTING: 'bg-blue-100 text-blue-800',
    GOODS_HELD: 'bg-orange-100 text-orange-800',
    IN_ANALYSIS: 'bg-purple-100 text-purple-800',
    RESULT_READY: 'bg-green-100 text-green-800',
    UNDER_REVIEW: 'bg-red-100 text-red-800',
    DECISION_PASS: 'bg-green-100 text-green-800',
    DECISION_FAIL: 'bg-red-100 text-red-800',
    RELEASED: 'bg-gray-100 text-gray-800',
    IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  };

  const ALL_STATES = [
    'SUBMITTED', 'ROUTING', 'GOODS_HELD', 'LAB_ASSIGNED', 'SAMPLING',
    'SAMPLE_B_STORED', 'SAMPLING_HANDOVER', 'IN_TRANSIT', 'LAB_RECEIVED',
    'IN_ANALYSIS', 'RESULT_READY', 'UNDER_REVIEW', 'DECISION_PASS',
    'DECISION_FAIL', 'INVOICE_ISSUED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED',
    'RELEASE_TRIGGERED', 'RELEASED', 'RE_EXPORT_INITIATED'
  ];

  const openTrace = async (trace) => {
    try {
      const res = await fetch(`${API_URL}/traces/${trace.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedTrace(data.trace);
    } catch (err) {
      console.error('Failed to fetch trace');
    }
  };

  const filtered = traces.filter(t => {
    const matchSearch = !search ||
      t.trace_number.toLowerCase().includes(search.toLowerCase()) ||
      t.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !filterState || t.current_state === filterState;
    return matchSearch && matchState;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input type="text" placeholder="Search by trace number or importer..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none flex-1" />
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All states</option>
          {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">All Shipments ({filtered.length} of {traces.length})</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">State</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{t.trace_number}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{t.importer_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.shipment_country}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.port_of_entry}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATE_COLORS[t.current_state] || 'bg-gray-100 text-gray-800'}`}>
                    {t.current_state}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.created_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openTrace(t)}
                    className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                    style={{background: '#2D2B7A'}}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTrace && (
        <ShipmentDetailModal
          trace={selectedTrace}
          token={token}
          onClose={() => setSelectedTrace(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
// Platform Settings section
function PlatformSettings({ token }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sla');

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading settings...</div>;
  if (!settings) return <div className="text-center py-12 text-gray-500">Failed to load settings</div>;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 bg-white rounded-t-xl px-4">
        {['sla', 'fees', 'labs'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-b-2' : 'border-transparent text-gray-500'
            }`}
            style={activeTab === tab ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
            {tab === 'sla' ? 'SLA Values' : tab === 'fees' ? 'Fee Schedule' : 'Authorized Labs'}
          </button>
        ))}
      </div>

      {/* SLA Values */}
      {activeTab === 'sla' && (
        <div className="bg-white rounded-b-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">SLA Values per State</h3>
            <p className="text-xs text-gray-500 mt-0.5">Time allowed in each state before escalation is triggered</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">State</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SLA (minutes)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equivalent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(settings.sla_minutes).map(([state, minutes]) => (
                <tr key={state} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-medium" style={{color: '#2D2B7A'}}>{state}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{minutes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {minutes < 60 ? `${minutes} min` :
                     minutes < 1440 ? `${Math.round(minutes/60)} hours` :
                     `${Math.round(minutes/1440)} days`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fee Schedule */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-b-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Fee Schedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fees applied per shipment clearance</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fee Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount (SAR)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applied when</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Lab testing fee</td>
                <td className="px-4 py-3 text-sm font-bold" style={{color: '#2D2B7A'}}>SAR {settings.fees.lab_fee_per_product.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">Per product line — all outcomes</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Admin clearance fee</td>
                <td className="px-4 py-3 text-sm font-bold" style={{color: '#2D2B7A'}}>SAR {settings.fees.admin_clearance_fee.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">Per shipment — all outcomes</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Re-export fee</td>
                <td className="px-4 py-3 text-sm font-bold" style={{color: '#2D2B7A'}}>SAR {settings.fees.re_export_fee.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">On RE_EXPORT_INITIATED only</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">VAT</td>
                <td className="px-4 py-3 text-sm font-bold" style={{color: '#2D2B7A'}}>{settings.fees.vat_percentage}%</td>
                <td className="px-4 py-3 text-xs text-gray-500">Applied to all fees</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Authorized Labs */}
      {activeTab === 'labs' && (
        <div className="bg-white rounded-b-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Authorized Testing Laboratories</h3>
            <p className="text-xs text-gray-500 mt-0.5">SFDA-approved labs available for drug import testing</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lab ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port Coverage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settings.authorized_labs.map(lab => (
                <tr key={lab.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-medium" style={{color: '#2D2B7A'}}>{lab.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{lab.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lab.port}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lab.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {lab.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// Main Admin Panel
export default function AdminPanel({ user, token, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [traces, setTraces] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tracesRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/traces`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const tracesData = await tracesRes.json();
      const usersData = await usersRes.json();
      setTraces(tracesData.traces || []);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview traces={traces} users={users} token={token} />;
      case 'users':
        return <UserManagement users={users} token={token} onRefresh={fetchData} />;
      case 'registrations':
        return <RegistrationRequests token={token} onRefresh={fetchData} />;
      case 'shipments':
        return <ShipmentsSection traces={traces} token={token} onRefresh={fetchData} />;
      case 'settings':
        return <PlatformSettings token={token} />;
        case 'reports':
        return <Reports token={token} />;
        
      case 'certificates':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <span className="text-4xl">📜</span>
            <p className="text-gray-600 mt-3 font-medium">Certificate Management</p>
            <p className="text-gray-400 text-sm mt-1">Module 2 — Coming next</p>
          </div>
        );
      case 'qms':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <span className="text-4xl">🏭</span>
            <p className="text-gray-600 mt-3 font-medium">Digital QMS</p>
            <p className="text-gray-400 text-sm mt-1">Module 3 — Coming next</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">Drug Import Traceability Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>DEMARA Admin Panel</p>
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
                  <p className="text-xs" style={{color: '#00B4D8'}}>{user.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )}
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0">
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeSection === item.id
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={activeSection === item.id ? {background: '#2D2B7A'} : {}}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading platform data...</div>
          ) : (
            renderSection()
          )}
        </div>
      </div>
    </div>
  );
}