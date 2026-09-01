import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

export default function OrgAdminPanel({ token }) {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(null);

  const fetchOrgUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/org-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrgData(data);
      else setError(data.message || 'Failed to load');
    } catch (err) {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgUsers(); }, []);

  const handleToggle = async (userId) => {
    setToggling(userId);
    try {
      const res = await fetch(`${API_URL}/admin/org-users/${userId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchOrgUsers();
    } catch (err) {
      console.error('Toggle failed');
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div className="px-6 py-12 text-center text-gray-500">Loading organisation users...</div>;
  if (error) return <div className="px-6 py-4 text-red-600 text-sm">{error}</div>;
  if (!orgData) return null;

  return (
    <div className="px-6 py-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Organisation Users — {orgData.organisation_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage user access for your organisation</p>
          </div>
          <button onClick={fetchOrgUsers} className="px-3 py-1.5 text-xs text-white rounded-lg" style={{background: '#00B4D8'}}>Refresh</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgData.users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {u.full_name}
                  {u.is_org_admin && <span className="ml-2 text-xs text-green-600">✓ Admin</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {u.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!u.is_org_admin && (
                    <button onClick={() => handleToggle(u.id)} disabled={toggling === u.id}
                      className={`px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90 disabled:opacity-50 ${u.is_active ? 'bg-red-500' : 'bg-green-500'}`}>
                      {toggling === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">As organisation admin you can activate or deactivate user accounts. To add new users contact DEMARA admin.</p>
      </div>
    </div>
  );
}