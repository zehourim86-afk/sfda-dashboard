// Shared helpers for the Shipping Portal (Shipping*.js files). Builds on mahShared / clearanceShared.
import { stateOf } from './mahShared';

// Physical-movement buckets (map shipment states to what the shipping company cares about)
export const SHIP_STAGES = [
  { key: 'transit', label: 'In Transit', tone: 'blue', states: ['SUBMITTED', 'SAMPLING', 'SFDA_INFO_REQUESTED'] },
  { key: 'port', label: 'At Port', tone: 'amber', states: ['WITH_BROKER'] },
  { key: 'released', label: 'Released', tone: 'green', states: ['SFDA_RELEASED', 'PARTIALLY_RELEASED', 'CUSTOMS_RELEASED'] },
  { key: 'delivered', label: 'Delivered', tone: 'grey', states: ['CLOSED_RELEASED'] },
];
const STAGE_BY_STATE = {};
for (const st of SHIP_STAGES) for (const s of st.states) STAGE_BY_STATE[s] = st.key;

export const shipStage = (s) => STAGE_BY_STATE[stateOf(s)] || null;
// Active = visible in a movement bucket but not yet delivered
export const isActiveShipment = (s) => { const k = shipStage(s); return !!k && k !== 'delivered'; };

export const TRANSPORT = {
  air: { icon: '✈', label: 'Air' },
  sea: { icon: '🚢', label: 'Sea' },
  land: { icon: '🚛', label: 'Land' },
};
export function TransportTag({ mode }) {
  const t = TRANSPORT[mode];
  if (!t) return <span className="mah-muted">—</span>;
  return <span className="ship-transport"><span aria-hidden="true">{t.icon}</span> {t.label}</span>;
}
