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

// Display labels for every shipment state.
// Matches VALID_STATES in sfda-platform/src/routes/shipments.js,
// plus a few older states the frontend still shows.
export const STATE_LABELS = {
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
  return STATE_LABELS[state] || state.replace(/_/g, ' ');
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
