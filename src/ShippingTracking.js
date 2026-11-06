// Shipping Portal — Tracking: full-page map placeholder with a table of active shipments.
import { Empty } from './mahShared';
import { isActiveShipment } from './shippingShared';
import ShippingMapPlaceholder from './ShippingMapPlaceholder';

export default function ShippingTracking({ shipments, productsById }) {
  const active = shipments.filter(isActiveShipment);
  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Tracking</h1>
          <p className="mah-muted">Fleet map — coming soon</p>
        </div>
      </div>

      <div className="mah-alert mah-alert-blue">Map view coming soon. Until then, the table below shows each active shipment's last known location (its port of entry).</div>

      {active.length === 0
        ? <section className="mah-card"><Empty title="No active shipments to track" /></section>
        : <ShippingMapPlaceholder variant="full" shipments={active} productsById={productsById} />}
    </div>
  );
}
