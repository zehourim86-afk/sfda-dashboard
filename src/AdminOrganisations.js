// Admin Panel — Organisations: every organisation with shipment volume, rejection rate and status.
import { useState } from 'react';
import { StateBadge, shipmentName, shipmentRef, fmtDate, timeAgo, Empty } from './mahShared';
import { ChipRow } from './clearanceShared';
import { orgShipments, rejectionRate, lastActivity, isClosedState, orgTypeLabel, MAH_ORG_TYPES, ConfirmModal } from './adminShared';

const crNumber = (o) => o.cr_number || o.commercial_registration_number || o.commercial_registration || o.ghad_cr_number || null;
const HISTORY_LIMIT = 10;

export default function AdminOrganisations({ organisations, shipments, users, productsById, suspendedOrgs, setSuspendedOrgs, showToast, openShipment }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const q = search.trim().toLowerCase();

  const isSuspended = (o) => suspendedOrgs.has(o.id) || o.is_active === false;
  const FILTERS = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'mah', label: 'MAH', test: o => MAH_ORG_TYPES.includes(o.org_type) },
    { key: 'clearance', label: 'Clearance', test: o => o.org_type === 'CLEARANCE_COMPANY' },
    { key: 'active', label: 'Active', test: o => !isSuspended(o) },
    { key: 'suspended', label: 'Suspended', test: isSuspended },
  ];
  const test = FILTERS.find(f => f.key === filter).test;

  const rows = organisations
    .filter(o => test(o) && (!q || (o.name_en || '').toLowerCase().includes(q) || (crNumber(o) || '').toLowerCase().includes(q)))
    .map(o => {
      const list = orgShipments(o, shipments);
      return { o, list, active: list.filter(s => !isClosedState(s)).length };
    })
    .sort((a, b) => b.active - a.active || (a.o.name_en || '').localeCompare(b.o.name_en || ''));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Organisations</h1>
          <p className="mah-muted">{organisations.length} active organisations on the platform</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter organisations" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: organisations.filter(f.test).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name or CR number..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search organisations" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No organisations match" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Organisation</th><th>Type</th><th>CR number</th><th>Active</th><th>Total</th><th>Rejection rate</th><th>Last activity</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(({ o, list, active }) => {
                  const rate = rejectionRate(list);
                  return (
                    <tr key={o.id} className="mah-row-click" tabIndex={0} onClick={() => setSelected(o)}
                      onKeyDown={e => { if (e.key === 'Enter') setSelected(o); }}>
                      <td className="mah-row-title">{o.name_en}</td>
                      <td>{orgTypeLabel(o.org_type)}</td>
                      <td className="mah-mono">{crNumber(o) || '—'}</td>
                      <td>{active}</td>
                      <td>{list.length}</td>
                      <td className={rate > 30 ? 'mah-text-red' : ''}>{rate == null ? '—' : `${rate}%`}</td>
                      <td className="mah-muted">{list.length ? timeAgo(lastActivity(list)) : '—'}</td>
                      <td>{isSuspended(o) ? <span className="mah-badge mah-tone-red">Suspended</span> : <span className="mah-badge mah-tone-green">Active</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <OrgDetail org={selected} shipments={orgShipments(selected, shipments)} productsById={productsById}
          users={users.filter(u => u.organisation_name && u.organisation_name === selected.name_en)}
          suspended={isSuspended(selected)}
          onToggleSuspend={() => {
            setSuspendedOrgs(prev => {
              const next = new Set(prev);
              if (next.has(selected.id)) next.delete(selected.id); else next.add(selected.id);
              return next;
            });
            showToast(`${selected.name_en} ${isSuspended(selected) ? 'reactivated' : 'suspended'} (demo — not saved)`);
          }}
          onOpenShipment={(s) => { setSelected(null); openShipment(s); }}
          onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function OrgDetail({ org, shipments, users, productsById, suspended, onToggleSuspend, onOpenShipment, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const recent = [...shipments].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, HISTORY_LIMIT);

  return (
    <div className="mah-modal-backdrop" onClick={onClose}>
      <div className="mah-modal sfda-modal" role="dialog" aria-modal="true" aria-label={org.name_en} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <div>
            <strong>{org.name_en}</strong>
            <div className="mah-row-sub">{orgTypeLabel(org.org_type)}</div>
          </div>
          <div className="mah-detail-badges">
            {suspended ? <span className="mah-badge mah-tone-red">Suspended</span> : <span className="mah-badge mah-tone-green">Active</span>}
            <button className="mah-ai-close sfda-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>
        <div className="mah-modal-body">
          <div className="mah-facts">
            <div><span>CR number</span><strong>{crNumber(org) || '—'}</strong></div>
            <div><span>Country</span><strong>{org.country || '—'}</strong></div>
            <div><span>Email domain</span><strong>{org.email_domain || '—'}</strong></div>
            <div><span>Contact</span><strong>{org.contact_email || org.contact_phone || users[0]?.email || '—'}</strong></div>
            <div><span>Joined</span><strong>{fmtDate(org.created_at)}</strong></div>
          </div>

          <section className="mah-stack">
            <h2>Recent shipments</h2>
            {recent.length === 0 ? <p className="mah-muted mah-small">No shipments yet.</p> : recent.map(s => (
              <button key={s.id} className="mah-list-row" onClick={() => onOpenShipment(s)}>
                <div className="mah-action-main">
                  <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                  <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span> · {timeAgo(s.updated_at)}</div>
                </div>
                <StateBadge state={s.current_state} />
              </button>
            ))}
          </section>

          <section className="mah-stack">
            <h2>Users ({users.length})</h2>
            {users.length === 0 ? <p className="mah-muted mah-small">No users in this organisation.</p> : (
              <ul className="adm-user-list">
                {users.map(u => (
                  <li key={u.id}>
                    <div className="mah-grow"><div className="mah-row-title">{u.full_name}</div><div className="mah-row-sub">{u.email}</div></div>
                    <span className="mah-badge mah-tone-grey">{u.role}</span>
                    {!u.is_active && <span className="mah-badge mah-tone-red">Suspended</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mah-stack">
            <h2>Suspension</h2>
            <div className="mah-row-actions">
              <span className="mah-small mah-muted">Demo only — suspension is not saved to the server yet.</span>
              <button className={`mah-btn mah-btn-sm ${suspended ? 'mah-btn-green' : 'mah-btn-red'}`} onClick={() => setConfirming(true)}>
                {suspended ? 'Reactivate organisation' : 'Suspend organisation'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {confirming && (
        <ConfirmModal title={suspended ? 'Reactivate organisation' : 'Suspend organisation'}
          message={suspended ? `Reactivate ${org.name_en}?` : `Suspend ${org.name_en}? Its users would lose access to MASAAR.`}
          confirmLabel={suspended ? 'Reactivate' : 'Suspend'} tone={suspended ? 'green' : 'red'}
          onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onToggleSuspend(); }} />
      )}
    </div>
  );
}
