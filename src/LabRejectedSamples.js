// Lab Portal — Rejected samples. Read-only list of samples the lab refused.
import { StateBadge, shipmentName, shipmentRef, fmtDate, Empty } from './mahShared';
import { mahCompany } from './sfdaShared';
import { isRejected } from './labShared';

export default function LabRejectedSamples({ samples, productsById, openSample }) {
  const rows = samples.filter(isRejected).sort((a, b) => new Date(b.lab_rejected_at) - new Date(a.lab_rejected_at));

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Rejected samples</h1>
          <p className="mah-muted">{rows.length} rejected sample{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="mah-alert mah-alert-amber">Rejected samples are returned to the clearance company for SFDA notification.</div>

      <section className="mah-card mah-card-flush">
        {rows.length === 0 ? <Empty title="No rejected samples" /> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>MAH company</th><th>Rejection reason</th><th>Rejection date</th><th>Shipment state</th></tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="mah-row-click" tabIndex={0} onClick={() => openSample(s)}
                    onKeyDown={e => { if (e.key === 'Enter') openSample(s); }}>
                    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                    <td>{mahCompany(s)}</td>
                    <td>{s.lab_rejection_reason || '—'}</td>
                    <td>{fmtDate(s.lab_rejected_at)}</td>
                    <td><StateBadge state={s.current_state} /></td>
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
