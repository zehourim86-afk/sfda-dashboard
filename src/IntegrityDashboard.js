// MASAAR integrity check results for one shipment (GET/POST /shipments/:id/integrity-check).
// Four layers: document completeness, cross-document consistency, AI advisory, market intelligence.
// Props: { shipmentId, token, apiUrl?, sector?, refreshKey?, onScore? } — bump refreshKey to reload after an outside
// re-run; onScore(score | null) is called whenever a result is loaded or run.
// Also exports the score verdicts and the donut, used by ClearanceCertificate.js.
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from './constants';
import { getUserFriendlyError } from './mahShared';
import { SkeletonLoader, ErrorBanner, Spinner } from './PortalComponents';

export const INTEGRITY_VERDICTS = [
  { min: 90, label: 'EXCELLENT', color: '#046C4E' },
  { min: 75, label: 'GOOD', color: '#00B87A' },
  { min: 60, label: 'REVIEW NEEDED', color: '#E8900A' },
  { min: 40, label: 'ISSUES FOUND', color: '#E8700A' },
  { min: 0, label: 'CRITICAL ISSUES', color: '#E0334C' },
];
const NOT_RUN = { label: 'NOT RUN YET', color: '#94A3B8' };
export const integrityVerdict = (score) => (score == null ? NOT_RUN : INTEGRITY_VERDICTS.find(v => score >= v.min));

const LAYERS = [
  { n: 1, name: 'Document Completeness' },
  { n: 2, name: 'Cross-document Consistency' },
  { n: 3, name: 'AI Advisory' },
  { n: 4, name: 'Market Intelligence' },
];
const STATUS_ICONS = { PASSED: '✓', WARNING: '⚠', FAILED: '✗', NOT_APPLICABLE: '—', PENDING: '⏳' };
const STATUS_LABELS = { PASSED: 'Passed', WARNING: 'Warning', FAILED: 'Failed', NOT_APPLICABLE: 'Not applicable', PENDING: 'Pending' };

// Fetch against the API; throws with a user-friendly message (same wording as apiFetch)
export async function integrityFetch(apiUrl, token, path, method = 'GET') {
  let res;
  try {
    res = await fetch(`${apiUrl || API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('Cannot connect to MASAAR server. Please check your connection.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(getUserFriendlyError(res.status, data || {}));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Ring filled to score% — size in px
export function ScoreDonut({ score, size = 180, stroke }) {
  const v = integrityVerdict(score);
  const w = stroke || Math.round(size / 11);
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <svg className="int-donut" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={score == null ? 'Integrity score not available' : `Integrity score ${score} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={w} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={v.color} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="int-donut-num"
        fill={v.color} fontSize={Math.round(size * 0.27)}>{score == null ? '—' : score}</text>
      <text x="50%" y={size / 2 + size * 0.2} textAnchor="middle" className="int-donut-max"
        fontSize={Math.max(10, Math.round(size * 0.075))}>/100</text>
    </svg>
  );
}

const fmtWhen = (v) => (v ? new Date(v).toLocaleString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');

export default function IntegrityDashboard({ shipmentId, token, apiUrl, sector, refreshKey, onScore }) {
  const [data, setData] = useState(null);
  useEffect(() => { if (data) onScore?.(data.score ?? null); }, [data, onScore]);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState({}); // layer → expanded, overrides the default

  const load = useCallback(async () => {
    try {
      setData(await integrityFetch(apiUrl, token, `/shipments/${shipmentId}/integrity-check`));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [apiUrl, token, shipmentId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setData(await integrityFetch(apiUrl, token, `/shipments/${shipmentId}/integrity-check`, 'POST'));
      setOpen({});
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const runButton = (label) => (
    <button className="int-btn" onClick={run} disabled={running}>{running ? <Spinner label="Running checks…" /> : label}</button>
  );

  if (!data) {
    return (
      <div className="int-card" aria-busy={!error}>
        {error ? <ErrorBanner compact error={error} message="Could not load integrity checks" onRetry={load} />
          : <><SkeletonLoader type="donut" height={96} /><SkeletonLoader type="list" count={3} /></>}
      </div>
    );
  }

  const checks = data.checks || [];
  const verdict = integrityVerdict(data.score);

  if (data.score == null || checks.length === 0) {
    return (
      <div className="int-card">
        <div className="int-head">
          <h2>MASAAR Integrity Check</h2>
          <span className="int-score-badge" style={{ background: NOT_RUN.color }}>{NOT_RUN.label}</span>
        </div>
        <div className="int-empty">
          <p>
            Runs {sector ? 'the sector document checklist and ' : ''}cross-document, supplier, lab and concentration checks
            on this shipment, and gives it an integrity score out of 100.
          </p>
          {runButton('Run integrity check')}
          {error && <div className="int-error">{error}</div>}
        </div>
      </div>
    );
  }

  const serious = checks.filter(c => c.status === 'FAILED' && ['CRITICAL', 'HIGH'].includes(c.severity));

  return (
    <div className="int-card">
      <div className="int-head">
        <h2>MASAAR Integrity Check</h2>
        <span className="int-score-badge" style={{ background: verdict.color }}>{verdict.label} {data.score}/100</span>
      </div>

      {serious.length > 0 && (
        <div className="int-alert" role="alert">
          <strong>⚠ Critical issues detected — review before proceeding to submission</strong>
          <ul>{serious.map(c => <li key={c.check_type}>{c.label} — {c.severity}</li>)}</ul>
        </div>
      )}

      <div className="int-overview">
        <ScoreDonut score={data.score} />
        <div className="int-stats">
          <div className="int-stat int-stat-green"><strong>{data.passed}</strong><span>PASSED</span></div>
          <div className="int-stat int-stat-amber"><strong>{data.warnings}</strong><span>WARNINGS</span></div>
          <div className="int-stat int-stat-red"><strong>{data.failed}</strong><span>FAILED</span></div>
        </div>
      </div>

      {LAYERS.map(layer => {
        const list = checks.filter(c => c.check_layer === layer.n);
        if (list.length === 0) return null;
        const failed = list.filter(c => c.status === 'FAILED').length;
        const warnings = list.filter(c => c.status === 'WARNING').length;
        const passed = list.filter(c => c.status === 'PASSED').length;
        const expanded = open[layer.n] ?? (failed + warnings > 0);
        const badge = failed ? { tone: 'red', text: `${failed} failed` }
          : warnings ? { tone: 'amber', text: `${warnings} warning${warnings === 1 ? '' : 's'}` }
            : passed ? { tone: 'green', text: 'All passed' } : { tone: 'grey', text: 'Not applicable' };
        return (
          <div key={layer.n} className="int-layer">
            <button className="int-layer-head" aria-expanded={expanded}
              onClick={() => setOpen(o => ({ ...o, [layer.n]: !expanded }))}>
              <span>Layer {layer.n} — {layer.name}</span>
              <span className="int-layer-head-right">
                <span className={`mah-badge mah-tone-${badge.tone}`}>{badge.text}</span>
                <span className="int-chevron">{expanded ? '▾' : '▸'}</span>
              </span>
            </button>
            {expanded && list.map(c => {
              const flagged = ['WARNING', 'FAILED'].includes(c.status);
              return (
                <div key={c.check_type} className={`int-check${['NOT_APPLICABLE', 'PENDING'].includes(c.status) ? ' is-muted' : ''}`}>
                  <span className={`int-check-icon int-icon-${c.status}`} title={STATUS_LABELS[c.status]}
                    aria-label={STATUS_LABELS[c.status]}>{STATUS_ICONS[c.status]}</span>
                  <div className="int-check-body">
                    <div className="int-check-name">{c.label}</div>
                    {c.details && <div className="int-check-details">{c.details}</div>}
                    {flagged && (c.flagged_value || c.expected_value) && (
                      <div className="int-check-values">
                        {c.flagged_value && <>Found: {c.flagged_value}</>}
                        {c.flagged_value && c.expected_value && ' · '}
                        {c.expected_value && <>Expected: {c.expected_value}</>}
                      </div>
                    )}
                  </div>
                  {flagged && <span className={`int-sev int-sev-${c.severity}`}>{c.severity}</span>}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="int-foot">
        <span>Last checked: {fmtWhen(data.checked_at)}</span>
        {runButton('Re-run check')}
      </div>
      {error && <div className="int-error">{error}</div>}
    </div>
  );
}
