// Shared constants for the MASAAR dashboard.

export const API_URL = 'http://localhost:3000/api/v1';

// SFDA product categories (same list the backend validates against).
export const PRODUCT_CATEGORIES = [
  'Food Supplement',
  'Cosmetic',
  'Food Product',
  'Beverage',
  'Health Food',
  'Functional Food',
  'Cosmetic Device',
];

// Display labels for the 18 shipment states (SFDA track).
// Matches SHIPMENT_STATES in sfda-platform/src/constants.js and the
// CHECK constraint from migration 006.
export const STATE_LABELS = {
  DRAFT: 'Draft',
  PREPARING: 'Preparing',
  READY_TO_SUBMIT: 'Ready to Submit',
  WITH_BROKER: 'With Broker',
  SUBMITTED: 'Submitted to SFDA',
  SFDA_INFO_REQUESTED: 'SFDA Info Requested',
  SAMPLING: 'Sampling',
  CONDITIONALLY_RELEASED: 'Conditionally Released',
  SFDA_RELEASED: 'SFDA Released',
  PARTIALLY_RELEASED: 'Partially Released',
  SFDA_REJECTED: 'SFDA Rejected',
  OBJECTION_FILED: 'Objection Filed',
  DISPOSITION_PENDING: 'Disposition Pending',
  CUSTOMS_RELEASED: 'Customs Released',
  CLOSED_RELEASED: 'Closed — Released',
  CLOSED_REEXPORTED: 'Closed — Re-exported',
  CLOSED_DESTROYED: 'Closed — Destroyed',
  WITHDRAWN: 'Withdrawn',
};

export const SHIPMENT_STATES = Object.keys(STATE_LABELS);

export const SECTORS = {
  FOOD_SUPPLEMENT: 'food_supplement',
  COSMETIC: 'cosmetic',
  FOOD: 'food',
};

// Customs (ZATCA) track — shipments.customs_state
export const CUSTOMS_STATES = {
  PENDING: 'PENDING',
  DECLARATION_FILED: 'DECLARATION_FILED',
  DUTIES_PAID: 'DUTIES_PAID',
  CUSTOMS_RELEASED: 'CUSTOMS_RELEASED',
};

// Labels for the old state set. Shipments no longer use these, but the audit log
// (timeline history) still contains them, so they must keep displaying.
export const LEGACY_STATE_LABELS = {
  // Step 1 — Registration
  RECORD_OPENED: 'Record Opened',
  DECLARATION_FILED: 'Declaration Filed',

  // Step 2 — CB Review
  CB_ASSIGNED: 'CB Assigned',
  CB_REVIEWING: 'CB Reviewing',
  CHANGES_REQUESTED: 'Changes Requested',
  CHANGES_SUBMITTED: 'Changes Submitted',
  CB_APPROVED: 'CB Approved',
  CB_REJECTED: 'CB Rejected',
  CLEARANCE_ACCEPTED: 'Clearance Confirmed',
  CLEARANCE_DECLINED: 'Clearance Declined',

  // Step 3 — Sampling
  SAMPLING_REQUESTED: 'Sampling Requested',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  SAMPLE_PICKED_UP: 'Sample Picked Up',
  IN_TRANSIT: 'In Transit to Lab',
  INSPECTOR_DISPATCHED: 'Inspector Dispatched', // older state
  SAMPLE_COLLECTED: 'Sample Collected', // older state
  IN_TRANSIT_TO_LAB: 'In Transit to Lab', // older state

  // Step 4 — Lab Analysis
  LAB_ACCEPTED: 'Lab Confirmed',
  LAB_DECLINED: 'Lab Declined',
  LAB_RECEIVED: 'Lab Received',
  IN_ANALYSIS: 'In Analysis',
  ANALYSIS_COMPLETE: 'Analysis Complete',
  RESULT_SUBMITTED: 'Result Submitted',
  SFDA_NOTIFIED: 'SFDA Notified',

  // Step 5 — Decision
  DECISION_PENDING: 'Awaiting SFDA Decision',
  CONFORMING: 'Conforming',
  NON_CONFORMING: 'Non-Conforming',
  PARTIALLY_CONFORMING: 'Partially Conforming',

  // Step 6 — Clearance / disposal
  CLEARANCE_IN_PROGRESS: 'Clearance In Progress',
  PARTIAL_CLEARANCE_IN_PROGRESS: 'Partial Clearance',
  BOND_RELEASED: 'Bond Released',
  DUTIES_PAID: 'Duties Paid',
  FINAL_CLEARANCE: 'Final Clearance',
  PARTIAL_FINAL_CLEARANCE: 'Partial Cleared',
  RE_EXPORT_INITIATED: 'Re-Export Initiated',
  RE_EXPORT_BOOKING_CONFIRMED: 'Re-Export Booking Confirmed',
  RE_EXPORT_PERMIT_ISSUED: 'Re-Export Permit Issued',
  RE_EXPORT_LOADED: 'Re-Export Goods Loaded',
  RE_EXPORT_COMPLETED: 'Re-Export Completed',
  DESTRUCTION_PENDING: 'Destruction Pending (24h grace)',
  DESTRUCTION_REQUESTED: 'Destruction Requested',
  DESTRUCTION_SCHEDULED: 'Destruction Scheduled',
  DESTRUCTION_IN_PROGRESS: 'Destruction In Progress',
  DESTRUCTION_CERTIFICATE_ISSUED: 'Certificate Issued',
  DESTRUCTION_CONFIRMED: 'Destruction Confirmed',
  ARCHIVED: 'Archived',
};

// Label for a state, falling back to "SOME STATE" for unknown ones.
export function getStateLabel(state) {
  if (!state) return '—';
  return STATE_LABELS[state] || LEGACY_STATE_LABELS[state] || state.replace(/_/g, ' ');
}

// Formats a date string like "30 Oct 2026, 02:15 pm". Returns "—" when empty.
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date)) return '—';
  return date.toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Old state → new state. Same mapping as migration 006 in sfda-platform; used to show
// shipments that haven't been migrated yet in the new 18-state views.
export const LEGACY_STATE_MAP = {
  RECORD_OPENED: 'DRAFT',
  CHANGES_REQUESTED: 'PREPARING', CB_REJECTED: 'PREPARING', CLEARANCE_DECLINED: 'PREPARING',
  CB_APPROVED: 'READY_TO_SUBMIT',
  CB_ASSIGNED: 'WITH_BROKER', CB_REVIEWING: 'WITH_BROKER', CHANGES_SUBMITTED: 'WITH_BROKER', CLEARANCE_ACCEPTED: 'WITH_BROKER',
  DECLARATION_FILED: 'SUBMITTED', DECISION_PENDING: 'SUBMITTED',
  SAMPLING_REQUESTED: 'SAMPLING', PICKUP_SCHEDULED: 'SAMPLING', SAMPLE_PICKED_UP: 'SAMPLING', IN_TRANSIT: 'SAMPLING',
  LAB_ACCEPTED: 'SAMPLING', LAB_DECLINED: 'SAMPLING', LAB_RECEIVED: 'SAMPLING', IN_ANALYSIS: 'SAMPLING',
  ANALYSIS_COMPLETE: 'SAMPLING', RESULT_SUBMITTED: 'SAMPLING', SFDA_NOTIFIED: 'SAMPLING',
  CONFORMING: 'SFDA_RELEASED', CLEARANCE_IN_PROGRESS: 'SFDA_RELEASED', BOND_RELEASED: 'SFDA_RELEASED', DUTIES_PAID: 'SFDA_RELEASED',
  PARTIALLY_CONFORMING: 'PARTIALLY_RELEASED', PARTIAL_CLEARANCE_IN_PROGRESS: 'PARTIALLY_RELEASED',
  NON_CONFORMING: 'SFDA_REJECTED', DECISION_OVERDUE: 'SFDA_REJECTED',
  RE_EXPORT_INITIATED: 'DISPOSITION_PENDING', RE_EXPORT_BOOKING_CONFIRMED: 'DISPOSITION_PENDING',
  RE_EXPORT_PERMIT_ISSUED: 'DISPOSITION_PENDING', RE_EXPORT_LOADED: 'DISPOSITION_PENDING',
  DESTRUCTION_PENDING: 'DISPOSITION_PENDING', DESTRUCTION_REQUESTED: 'DISPOSITION_PENDING',
  SFDA_ORDERED_DESTRUCTION: 'DISPOSITION_PENDING', DESTRUCTION_SCHEDULED: 'DISPOSITION_PENDING',
  DESTRUCTION_IN_PROGRESS: 'DISPOSITION_PENDING', DESTRUCTION_CERTIFICATE_ISSUED: 'DISPOSITION_PENDING',
  FINAL_CLEARANCE: 'CLOSED_RELEASED', PARTIAL_FINAL_CLEARANCE: 'CLOSED_RELEASED', ARCHIVED: 'CLOSED_RELEASED',
  RE_EXPORT_COMPLETED: 'CLOSED_REEXPORTED',
  DESTRUCTION_CONFIRMED: 'CLOSED_DESTROYED',
};

// A shipment's state in the new 18-state set (old states are mapped).
export function normalizeState(state) {
  if (!state) return 'DRAFT';
  return STATE_LABELS[state] ? state : (LEGACY_STATE_MAP[state] || state);
}
