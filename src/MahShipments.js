// MAH portal — Shipments & Tracking list.
import { useEffect, useState } from 'react';
import {
  apiFetch, stateOf, shipmentSector, StateBadge, SectorBadge,
  shipmentName, shipmentRef, fmtDate, timeAgo, Empty, Icon, ConfirmDialog,
} from './mahShared';

// Row 1 — status groups. CONDITIONALLY_RELEASED and CUSTOMS_RELEASED are in no group, so they show under "All" only.
const inStates = (states) => (s) => states.includes(stateOf(s));
const STATUS_FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'action', label: 'Action Required',
    test: inStates(['DRAFT', 'PREPARING', 'READY_TO_SUBMIT', 'SFDA_REJECTED', 'SFDA_INFO_REQUESTED', 'OBJECTION_FILED']) },
  { key: 'active', label: 'Active',
    test: inStates(['WITH_BROKER', 'SUBMITTED', 'SAMPLING', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'DISPOSITION_PENDING']) },
  { key: 'completed', label: 'Completed',
    test: inStates(['CLOSED_RELEASED', 'CLOSED_REEXPORTED', 'CLOSED_DESTROYED', 'WITHDRAWN']) },
];

// Row 2 — sector, independent of the status filter
const SECTOR_FILTERS = [
  { key: 'all', label: 'All Sectors', test: () => true },
  { key: 'food_supplement', label: 'Food Supplement', test: s => shipmentSector(s) === 'food_supplement' },
  { key: 'cosmetic', label: 'Cosmetics', test: s => shipmentSector(s) === 'cosmetic' },
  { key: 'food', label: 'Food', test: s => shipmentSector(s) === 'food' },
];
const byKey = (list, key) => list.find(f => f.key === key);

export default function MahShipments({ token, shipments, productsById, suppliersById, openShipment, onNewShipment, reloadShipments, showToast }) {
  const [status, setStatus] = useState('all');
  const [sector, setSector] = useState('all');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirm, setConfirm] = useState(null); // shipment pending delete
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Close the row menu on any outside click
  useEffect(() => {
    if (!openMenuId) return undefined;
    const onDown = (e) => { if (!e.target.closest('.mah-kebab-wrap')) setOpenMenuId(null); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenuId]);

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, `/shipments/${confirm.id}`, { method: 'DELETE' });
      const name = shipmentName(confirm, productsById);
      setConfirm(null);
      await reloadShipments?.().catch(() => {});
      showToast?.(`Shipment deleted — ${name}`);
    } catch (e) {
      if (e.status === 403) {
        setConfirm(null);
        showToast?.('Only draft shipments can be deleted. Contact your DEMARA advisor to cancel a submitted shipment.');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  // Status counts follow the sector filter
  const inSector = shipments.filter(byKey(SECTOR_FILTERS, sector).test);
  const q = search.trim().toLowerCase();
  const rows = inSector
    .filter(byKey(STATUS_FILTERS, status).test)
    .filter(s => !q || [shipmentName(s, productsById), s.masaar_id, s.faseh_request_number, s.bl_awb_number, s.supplier_name]
      .some(v => v && String(v).toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Shipments & Tracking</h1>
          <p className="mah-muted">{shipments.length} shipments in total</p>
        </div>
        <button className="mah-btn mah-btn-primary" onClick={onNewShipment}><Icon name="plus" size={16} /> New Shipment</button>
      </div>

      <div className="mah-filter-rows">
        <div className="mah-filter-row" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} className={`mah-action-chip${status === f.key ? ' is-active' : ''}`}
              aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label}
              <span className="mah-chip-count">{inSector.filter(f.test).length}</span>
            </button>
          ))}
          <input className="mah-input mah-search mah-filter-search" placeholder="Search name, MSR ID, B/L..." value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Search shipments" />
        </div>
        <div className="mah-filter-row" role="group" aria-label="Filter by sector">
          {SECTOR_FILTERS.map(f => (
            <button key={f.key} className={`mah-action-chip${sector === f.key ? ' is-active' : ''}`}
              aria-pressed={sector === f.key} onClick={() => setSector(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? (
          <Empty title="No shipments match">Try another filter, or create a new shipment.</Empty>
        ) : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead>
                <tr><th>Shipment</th><th>Sector</th><th>Supplier</th><th>State</th><th>ETA</th><th>Updated</th><th aria-label="Actions"></th></tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" onClick={() => openShipment(s)} tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                    <td>
                      <div className="mah-row-title">{shipmentName(s, productsById)}</div>
                      <div className="mah-row-sub mah-mono">{shipmentRef(s)}</div>
                    </td>
                    <td><SectorBadge sector={shipmentSector(s)} /></td>
                    <td>{suppliersById[s.supplier_id]?.name || s.supplier_name || <span className="mah-muted">—</span>}</td>
                    <td><StateBadge state={s.current_state} /></td>
                    <td>{fmtDate(s.eta)}</td>
                    <td className="mah-muted">{timeAgo(s.updated_at)}</td>
                    <td className="mah-kebab-cell" onClick={e => e.stopPropagation()}>
                      <div className="mah-kebab-wrap">
                        <button className="mah-kebab" aria-label="Row actions" aria-haspopup="menu"
                          onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}>⋯</button>
                        {openMenuId === s.id && (
                          <div className="mah-menu" role="menu">
                            <button className="mah-menu-item" role="menuitem" onClick={() => { setOpenMenuId(null); openShipment(s); }}>Open</button>
                            {stateOf(s) === 'DRAFT' && (
                              <button className="mah-menu-item is-danger" role="menuitem"
                                onClick={() => { setOpenMenuId(null); setError(null); setConfirm(s); }}>Delete</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <ConfirmDialog title="Delete shipment" confirmLabel="Delete shipment" tone="red"
          message={`Delete ${shipmentName(confirm, productsById)}? This cannot be undone. The shipment and all its documents will be permanently deleted.`}
          busy={busy} error={error} onConfirm={doDelete} onClose={() => { if (!busy) setConfirm(null); }} />
      )}
    </div>
  );
}
