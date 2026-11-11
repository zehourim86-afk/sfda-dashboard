// Shipping Portal — Tracking: full-page map placeholder with a table of active shipments.
import { isActiveShipment } from './shippingShared';
import ShippingMapPlaceholder from './ShippingMapPlaceholder';
import { EmptyState } from './PortalComponents';

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
        ? <section className="mah-card"><EmptyState icon="🚢" title="No shipments tracked" description="Active shipments and their last known location will appear here" /></section>
        : <ShippingMapPlaceholder variant="full" shipments={active} productsById={productsById} />}
    </div>
  );
}
