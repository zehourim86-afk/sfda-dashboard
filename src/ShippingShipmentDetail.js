// Shipping Portal — read-only shipment detail modal with a map placeholder.
import { useEffect, useState } from 'react';
import {
  apiFetch, StateBadge, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDate, Empty,
} from './mahShared';
import { CUSTOMS_LABELS } from './clearanceShared';
import { mahCompany, SamplingBadge } from './sfdaShared';
import { TimelineTab } from './MahShipmentDetail';
import { TransportTag } from './shippingShared';
import ShippingMapPlaceholder from './ShippingMapPlaceholder';

export default function ShippingShipmentDetail({ token, shipment: initial, productsById, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(token, `/shipments/${initial.id}`)
      .then(d => { if (!cancelled) setDetail(d.shipment); })
      .catch(e => { if (!cancelled) setError(e.status === 403 || e.status === 404 ? 'Timeline and documents are not available for your role.' : e.message); });
    return () => { cancelled = true; };
  }, [token, initial.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = detail ? { ...initial, ...detail } : initial;
  const docs = detail?.documents || [];
  const audit = detail?.audit_log || [];

  return (
    <div className="mah-modal-backdrop" onClick={onClose}>
      <div className="mah-modal sfda-modal ship-modal" role="dialog" aria-modal="true" aria-label={shipmentName(s, productsById)} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <div>
            <strong>{shipmentName(s, productsById)}</strong>
            <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(s)}</span></div>
          </div>
          <div className="mah-detail-badges">
            <SectorBadge sector={shipmentSector(s)} />
            <StateBadge state={s.current_state} />
            <button className="mah-ai-close sfda-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div className="mah-modal-body">
          <div className="mah-facts">
            <div><span>MAH company</span><strong>{mahCompany(s)}</strong></div>
            <div><span>Supplier</span><strong>{s.supplier_name || '—'}</strong></div>
            <div><span>Transport</span><strong><TransportTag mode={s.transport_mode} /></strong></div>
            <div><span>Port of entry</span><strong>{s.port_of_entry || '—'}</strong></div>
            <div><span>B/L · AWB</span><strong>{s.bl_awb_number || '—'}</strong></div>
            <div><span>ETA</span><strong>{fmtDate(s.eta)}</strong></div>
            <div><span>Customs</span><strong>{CUSTOMS_LABELS[s.customs_state] || '—'}</strong></div>
            {s.sampling_state && s.sampling_state !== 'NOT_APPLICABLE' && <div><span>Sampling</span><strong><SamplingBadge value={s.sampling_state} /></strong></div>}
          </div>

          <section className="mah-stack">
            <h2>Location</h2>
            <ShippingMapPlaceholder variant="inline" shipment={s} />
          </section>

          {error && <div className="mah-alert mah-alert-amber">{error}</div>}

          <section className="mah-stack">
            <h2>Documents</h2>
            {!detail && !error ? <div className="mah-loading">Loading…</div>
              : docs.length === 0 ? <p className="mah-muted mah-small">No documents on record.</p> : (
                <ul className="sfda-doc-list">
                  {docs.map(d => (
                    <li key={d.id}><span className="mah-row-title">{(d.document_type || 'Document').replace(/_/g, ' ')}</span>
                      <span className="mah-muted mah-small">{d.file_name}</span></li>
                  ))}
                </ul>
              )}
          </section>

          <section className="mah-stack">
            <h2>Timeline</h2>
            {!detail && !error ? <div className="mah-loading">Loading…</div>
              : audit.length === 0 ? <Empty title="No timeline events available" /> : <TimelineTab shipment={{ audit_log: audit }} />}
          </section>
        </div>
      </div>
    </div>
  );
}
