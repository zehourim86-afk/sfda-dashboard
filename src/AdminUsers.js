// Admin Panel — Users: every user on the platform, with suspend / reactivate and password reset.
import { useState } from 'react';
import { apiFetch, timeAgo, Empty } from './mahShared';
import { ChipRow } from './clearanceShared';
import { ConfirmModal } from './adminShared';

const ROLE_LABELS = {
  IMPORTER: 'Importer (MAH)', CLEARANCE_COMPANY: 'Clearance', SFDA_REVIEWER: 'SFDA Reviewer', SFDA_INSPECTOR: 'SFDA Inspector',
  SFDA_OFFICER: 'SFDA Observer', LAB_ANALYST: 'Lab', SHIPPING_COMPANY: 'Shipping', DEMARA_ADMIN: 'Admin',
  NOTIFIED_BODY: 'Notified Body', GMP_AUDITOR: 'GMP Auditor',
};
const FILTERS = [
  { key: 'all', label: 'All', roles: null },
  { key: 'importers', label: 'Importers', roles: ['IMPORTER'] },
  { key: 'clearance', label: 'Clearance', roles: ['CLEARANCE_COMPANY'] },
  { key: 'sfda', label: 'SFDA', roles: ['SFDA_REVIEWER', 'SFDA_INSPECTOR', 'SFDA_OFFICER'] },
  { key: 'lab', label: 'Lab', roles: ['LAB_ANALYST'] },
  { key: 'shipping', label: 'Shipping', roles: ['SHIPPING_COMPANY'] },
  { key: 'admin', label: 'Admin', roles: ['DEMARA_ADMIN'] },
];
const ROLE_TONES = { DEMARA_ADMIN: 'red', SFDA_REVIEWER: 'blue', SFDA_INSPECTOR: 'blue', SFDA_OFFICER: 'blue', IMPORTER: 'purple', CLEARANCE_COMPANY: 'amber' };

export default function AdminUsers({ token, user: me, users, reloadUsers, showToast }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // user being suspended / reactivated
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const q = search.trim().toLowerCase();

  const inFilter = (u, f) => !f.roles || f.roles.includes(u.role);
  const rows = users.filter(u => inFilter(u, FILTERS.find(f => f.key === filter))
    && (!q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)));

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/admin/users/${confirm.id}/toggle`, { method: 'PUT' });
      await reloadUsers();
      showToast(`${confirm.full_name} ${confirm.is_active ? 'suspended' : 'reactivated'}`);
      setConfirm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Users</h1>
          <p className="mah-muted">{users.length} users · {users.filter(u => !u.is_active).length} suspended</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by role" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: users.filter(u => inFilter(u, f)).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name or email..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search users" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No users match" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organisation</th><th>Last login</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map(u => {
                  const isMe = String(u.id) === String(me?.id || me?.user_id);
                  return (
                    <tr key={u.id}>
                      <td className="mah-row-title">{u.full_name || '—'}</td>
                      <td>{u.email}</td>
                      <td><span className={`mah-badge mah-tone-${ROLE_TONES[u.role] || 'grey'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td>{u.organisation_name || <span className="mah-muted">—</span>}</td>
                      <td className="mah-muted mah-nowrap">{u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}</td>
                      <td>{u.is_active ? <span className="mah-badge mah-tone-green">Active</span> : <span className="mah-badge mah-tone-red">Suspended</span>}</td>
                      <td>
                        <div className="adm-row-actions">
                          <button className={`mah-btn mah-btn-sm ${u.is_active ? 'mah-btn-ghost' : 'mah-btn-green'}`} disabled={isMe}
                            title={isMe ? 'You cannot suspend your own account' : undefined}
                            onClick={() => { setError(null); setConfirm(u); }}>
                            {u.is_active ? 'Suspend' : 'Reactivate'}
                          </button>
                          <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={() => showToast(`Password reset email sent to ${u.email}`)}>
                            Reset password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mah-small mah-muted">Password reset is a demo action — no email is sent yet.</p>

      {confirm && (
        <ConfirmModal title={confirm.is_active ? 'Suspend user' : 'Reactivate user'}
          message={confirm.is_active ? `Suspend ${confirm.full_name} (${confirm.email})? They will not be able to sign in.` : `Reactivate ${confirm.full_name} (${confirm.email})?`}
          confirmLabel={confirm.is_active ? 'Suspend' : 'Reactivate'} tone={confirm.is_active ? 'red' : 'green'}
          busy={busy} error={error} onConfirm={toggle} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
