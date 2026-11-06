// Shipping Portal — map placeholder. Isolated so a real Google Maps component can replace it
// later without touching the pages that use it.
//   variant="inline"  compact box inside a shipment detail
//   variant="full"    full-page fleet map placeholder
import { shipmentName, shipmentRef } from './mahShared';

const TRANSPORT_LABELS = { air: 'air freight', sea: 'sea freight', land: 'land transport' };

export default function ShippingMapPlaceholder({ variant = 'inline', shipment, shipments = [], productsById }) {
  if (variant === 'full') {
    return (
      <div className="ship-map ship-map-full" role="img" aria-label="Fleet map placeholder">
        <div className="ship-map-emoji">🗺</div>
        <strong>Fleet Map View</strong>
        <p>Interactive map tracking all active shipments will be available in a future update.</p>
        <p className="mah-small mah-muted">
          To enable: add a Google Maps API key to environment variables as <code className="mah-mono">REACT_APP_GOOGLE_MAPS_KEY</code>.
        </p>
        {shipments.length > 0 && (
          <div className="mah-table-wrap ship-map-table">
            <table className="mah-table">
              <thead><tr><th>Shipment</th><th>Transport</th><th>Last known location</th></tr></thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id}>
                    <td><div className="mah-row-title">{shipmentName(s, productsById)}</div><div className="mah-row-sub mah-mono">{shipmentRef(s)}</div></td>
                    <td>{TRANSPORT_LABELS[s.transport_mode] || '—'}</td>
                    <td>{s.port_of_entry || 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ship-map" role="img" aria-label="Live tracking map placeholder">
      <div className="ship-map-emoji">📍</div>
      <strong>Live tracking map</strong>
      <p>Real-time vessel/flight tracking will be available in a future update.</p>
      <p className="mah-small mah-muted">
        Current location: {shipment?.port_of_entry || 'Unknown'} — {TRANSPORT_LABELS[shipment?.transport_mode] || 'transport mode not set'}
      </p>
    </div>
  );
}
