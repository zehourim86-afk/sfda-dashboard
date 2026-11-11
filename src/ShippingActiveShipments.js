// Shipping Portal — Active Shipments table across everything visible to this shipping company.
import { useState } from 'react';
import { StateBadge, shipmentName, shipmentRef, fmtDate } from './mahShared';
import { ChipRow, daysSince } from './clearanceShared';
import { mahCompany, matchesSearch } from './sfdaShared';
import { SHIP_STAGES, shipStage, TransportTag } from './shippingShared';
import { EmptyState } from './PortalComponents';

const FILTERS = [{ key: 'all', label: 'All' }, ...SHIP_STAGES.map(s => ({ key: s.key, label: s.label }))];

export default function ShippingActiveShipments({ shipments, productsById, openShipment }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const rows = shipments
    .filter(s => (filter === 'all' || shipStage(s) === filter) && matchesSearch(s, q, productsById, [s.bl_awb_number]))
    .sort((a, b) => new Date(a.eta || '2999') - new Date(b.eta || '2999'));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Active shipments</h1>
          <p className="mah-muted">{shipments.length} shipment{shipments.length === 1 ? '' : 's'} with transport information</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by movement" value={filter} onChange={setFilter}
          options={FILTERS.map(f => ({ ...f, count: f.key === 'all' ? shipments.length : shipments.filter(s => shipStage(s) === f.key).length }))}>
          <input className="mah-action-search mah-filter-search" placeholder="Search name, MSR ID or B/L / AWB..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search shipments" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {shipments.length === 0 ? <EmptyState icon="🚢" title="No shipments tracked" description="Shipments with transport details will appear here" />
          : rows.length === 0 ? <EmptyState icon="🔍" title="No shipments match" description="Try another filter or search" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH</th><th>Transport</th><th>Port of entry</th><th>B/L · AWB</th><th>ETA</th><th>State</th><th>Dwell</th></tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openShipment(s)}
                    onKeyDown={e => { if (e.key === 'Enter') openShipment(s); }}>
                    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                    <td>{mahCompany(s)}</td>
                    <td><TransportTag mode={s.transport_mode} /></td>
                    <td>{s.port_of_entry || <span className="mah-muted">—</span>}</td>
                    <td className="mah-mono">{s.bl_awb_number || '—'}</td>
                    <td className="mah-nowrap">{fmtDate(s.eta)}</td>
                    <td><StateBadge state={s.current_state} /></td>
                    <td>{daysSince(s.state_entered_at) ?? '—'}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
