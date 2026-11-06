// Shared helpers for the Lab Portal (Lab*.js files). Builds on mahShared / clearanceShared / sfdaShared.
import { Icon } from './mahShared';

// A lab sample is a shipment in SAMPLING. Its stage is driven by sampling_state.
export const isRejected = (s) => !!s.lab_rejected_at;
export const hasResults = (s) => s.sampling_state === 'RESULTS_SUBMITTED'
  || (s.sampling_state === 'SAMPLING_COMPLETE' && !isRejected(s));
// Lab stage buckets for the summary strip and filters
export function labStage(s) {
  if (isRejected(s)) return 'rejected';
  switch (s.sampling_state) {
    case 'SAMPLING_ORDERED':
    case 'SAMPLE_COLLECTED': return 'pending';   // not yet at the lab bench
    case 'SAMPLE_AT_LAB': return 'analysis';
    case 'RESULTS_SUBMITTED': return 'results';
    case 'SAMPLING_COMPLETE': return 'complete';
    default: return 'pending';
  }
}
export const isColdChain = (s) => !!s.cold_chain;

// What the lab should do next on a sample, or null
export function labAction(s) {
  if (isRejected(s)) return null;
  if (s.sampling_state === 'SAMPLE_AT_LAB') return { tone: 'blue', why: 'Sample received — begin analysis', button: 'Analyze →' };
  if (s.sampling_state === 'RESULTS_SUBMITTED' && !s.sampling_results_summary) {
    return { tone: 'amber', why: 'Results pending upload', button: 'Upload →' };
  }
  return null;
}

// Overall result options and badge tones
export const RESULT_OPTIONS = ['Pass', 'Fail', 'Conditional Pass'];
export const RESULT_TONES = { Pass: 'green', Fail: 'red', 'Conditional Pass': 'amber' };
export function ResultBadge({ value }) {
  if (!value) return <span className="mah-muted">—</span>;
  return <span className={`mah-badge mah-tone-${RESULT_TONES[value] || 'grey'}`}>{value}</span>;
}

export const REJECTION_REASONS = [
  'Insufficient sample quantity',
  'Cold chain breach on arrival',
  'Sample damaged/contaminated',
  'Wrong product received',
  'Sample arrived after stability window',
  'Other',
];

export const ARRIVAL_CONDITIONS = ['Good condition', 'Damaged', 'Cold chain breach'];

export function ColdChainTag({ sample }) {
  if (!isColdChain(sample)) return null;
  return <span className="mah-badge lab-cold" title="Cold chain — 2–8°C"><Icon name="snow" size={12} /> Cold chain</span>;
}

// Serialises the structured test-result rows into the results summary text, so they persist as
// readable text alongside the analyst's summary (there is no structured results table yet).
export function composeResultsSummary(summary, rows) {
  const clean = (rows || []).filter(r => r.name && r.name.trim());
  if (clean.length === 0) return summary.trim();
  const block = clean.map(r =>
    `• ${r.name.trim()}: ${r.result || '—'}${r.range ? ` (ref ${r.range})` : ''} — ${r.verdict || '—'}`).join('\n');
  return `${summary.trim()}\n\nTest results:\n${block}`;
}
