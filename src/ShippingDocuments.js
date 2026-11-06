// Shipping Portal — Documents: read-only list of every document across visible shipments.
// Documents come with each shipment from GET /shipping/shipments, so no extra calls are needed.
import { useMemo, useState } from 'react';
import { shipmentName, shipmentRef, fmtDate, Empty } from './mahShared';
import { ChipRow } from './clearanceShared';

const docTypeLabel = (t) => (t || 'Document').replace(/_/g, ' ');

export default function ShippingDocuments({ shipments, productsById }) {
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  // Flatten documents, each tagged with its shipment
  const allDocs = useMemo(() => shipments.flatMap(s =>
    (s.documents || []).map(d => ({ ...d, shipment: s }))), [shipments]);

  const types = useMemo(() => {
    const counts = {};
    for (const d of allDocs) counts[d.document_type] = (counts[d.document_type] || 0) + 1;
    return Object.keys(counts).sort().map(t => ({ key: t, label: docTypeLabel(t), count: counts[t] }));
  }, [allDocs]);

  const rows = allDocs
    .filter(d => (type === 'all' || d.document_type === type)
      && (!q || shipmentName(d.shipment, productsById).toLowerCase().includes(q) || (d.shipment.masaar_id || '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Documents</h1>
          <p className="mah-muted">{allDocs.length} document{allDocs.length === 1 ? '' : 's'} across your shipments · read-only</p>
        </div>
      </div>

      <div className="mah-filter-rows">
        <ChipRow label="Filter by type" value={type} onChange={setType}
          options={[{ key: 'all', label: 'All', count: allDocs.length }, ...types]}>
          <input className="mah-action-search mah-filter-search" placeholder="Search by shipment name or MSR ID..."
            value={search} onChange={e => setSearch(e.target.value)} aria-label="Search documents" />
        </ChipRow>
      </div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No documents match" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Document type</th><th>Shipment</th><th>Uploaded by</th><th>Upload date</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id}>
                    <td className="mah-row-title">{docTypeLabel(d.document_type)}</td>
                    <td><div>{shipmentName(d.shipment, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(d.shipment)}</div></td>
                    <td>{d.uploaded_by_name || d.uploaded_by_role || <span className="mah-muted">—</span>}</td>
                    <td className="mah-nowrap">{fmtDate(d.uploaded_at)}</td>
                    <td><span className="mah-badge mah-tone-green">On file</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mah-small mah-muted">Read-only — the shipping company cannot upload or delete documents.</p>
    </div>
  );
}
