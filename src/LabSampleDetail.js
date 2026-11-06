// Lab Portal — Sample detail modal. Shows the sampling sub-track and the action form for the
// current stage: confirm collection, confirm receipt (with optional rejection), upload results,
// or a read-only results / rejection view.
import { useState } from 'react';
import {
  apiFetch, SectorBadge, shipmentName, shipmentRef, shipmentSector, fmtDateTime, Empty, Icon,
  readFileForUpload,
} from './mahShared';
import { todayISO, daysSince } from './clearanceShared';
import { SamplingTrack, SamplingBadge, mahCompany } from './sfdaShared';
import {
  RESULT_OPTIONS, ResultBadge, REJECTION_REASONS, ARRIVAL_CONDITIONS, ColdChainTag,
  isRejected, hasResults, composeResultsSummary,
} from './labShared';

export default function LabSampleDetail({ token, sample, productsById, user, onClose, afterChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const state = sample.sampling_state;

  const sampling = (body) => apiFetch(token, `/shipments/${sample.id}/sampling`, { method: 'PUT', body });

  // Runs an action, reloads the list, then closes (unless keepOpen)
  const run = async (fn, message, keepOpen) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await afterChange(message);
      if (!keepOpen) onClose(); else setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mah-modal-backdrop" onClick={onClose}>
      <div className="mah-modal sfda-modal lab-modal" role="dialog" aria-modal="true" aria-label={shipmentName(sample, productsById)} onClick={e => e.stopPropagation()}>
        <div className="mah-modal-head">
          <div>
            <strong>{shipmentName(sample, productsById)}</strong>
            <div className="mah-row-sub"><span className="mah-mono">{shipmentRef(sample)}</span> · {mahCompany(sample)}</div>
          </div>
          <div className="mah-detail-badges">
            <SectorBadge sector={shipmentSector(sample)} />
            <ColdChainTag sample={sample} />
            <SamplingBadge value={state} />
            <button className="mah-ai-close sfda-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div className="mah-modal-body">
          <div className="mah-facts">
            <div><span>Sector</span><strong>{shipmentSector(sample) ? <SectorBadge sector={shipmentSector(sample)} /> : '—'}</strong></div>
            <div><span>Port</span><strong>{sample.port_of_entry || '—'}</strong></div>
            <div><span>Lab</span><strong>{sample.sampling_lab_name || user?.organisation_name || '—'}</strong></div>
            <div><span>Days at lab</span><strong>{state === 'SAMPLE_AT_LAB' ? `${daysSince(sample.state_entered_at)}d` : '—'}</strong></div>
          </div>

          <section className="mah-stack">
            <h2>Sampling sub-track</h2>
            <SamplingTrack shipment={sample} />
          </section>

          {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}

          {isRejected(sample) ? <RejectedView sample={sample} />
            : state === 'SAMPLING_ORDERED' ? <CollectForm busy={busy} run={run} sampling={sampling} />
            : state === 'SAMPLE_COLLECTED' ? <ReceiveForm busy={busy} run={run} sampling={sampling} token={token} sample={sample} user={user} afterChange={afterChange} onClose={onClose} setError={setError} />
            : state === 'SAMPLE_AT_LAB' ? <AtLabActions busy={busy} run={run} sampling={sampling} token={token} sample={sample} afterChange={afterChange} onClose={onClose} setError={setError} />
            : (hasResults(sample) && state === 'RESULTS_SUBMITTED') ? (
              editing
                ? <ResultsForm busy={busy} run={run} sampling={sampling} token={token} sample={sample} initial={sample} onCancel={() => setEditing(false)} />
                : <ResultsView sample={sample} onEdit={() => setEditing(true)} />
            )
            : <ResultsView sample={sample} />}
        </div>
      </div>
    </div>
  );
}

// ── SAMPLING_ORDERED → SAMPLE_COLLECTED ──────────────
function CollectForm({ busy, run, sampling }) {
  const [date, setDate] = useState(todayISO());
  const [officer, setOfficer] = useState('');
  return (
    <section className="mah-card lab-action-card">
      <div className="mah-card-head"><h2>Confirm sample collection</h2></div>
      <div className="mah-form-grid">
        <label className="mah-field"><span>Collection date</span>
          <input type="date" className="mah-input" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="mah-field"><span>Collection officer</span>
          <input className="mah-input" value={officer} onChange={e => setOfficer(e.target.value)} placeholder="Officer name" /></label>
      </div>
      <p className="mah-small mah-muted">Advances the sample to <strong>Sample collected</strong>.</p>
      <button className="mah-btn mah-btn-primary mah-self-start" disabled={busy}
        onClick={() => run(() => sampling({ sampling_state: 'SAMPLE_COLLECTED' }), 'Sample collection confirmed')}>
        {busy ? 'Saving…' : 'Confirm collection'}
      </button>
    </section>
  );
}

// ── SAMPLE_COLLECTED → SAMPLE_AT_LAB (or reject) ─────
function ReceiveForm({ busy, run, sampling, token, sample, user, afterChange, onClose, setError }) {
  const [date, setDate] = useState(todayISO());
  const [storage, setStorage] = useState('');
  const [condition, setCondition] = useState(ARRIVAL_CONDITIONS[0]);
  const [showReject, setShowReject] = useState(false);
  const problem = condition === 'Damaged' || condition === 'Cold chain breach';

  return (
    <section className="mah-card lab-action-card">
      <div className="mah-card-head"><h2>Confirm sample received at lab</h2></div>
      <div className="mah-form-grid">
        <label className="mah-field"><span>Received date</span>
          <input type="date" className="mah-input" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="mah-field"><span>Storage condition on arrival</span>
          <input className="mah-input" value={storage} onChange={e => setStorage(e.target.value)} placeholder="e.g. 2–8°C, intact seal" /></label>
        <label className="mah-field"><span>Condition on arrival</span>
          <select className="mah-input" value={condition} onChange={e => { setCondition(e.target.value); setShowReject(false); }}>
            {ARRIVAL_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
      </div>

      {problem && (
        <div className="mah-alert mah-alert-amber">
          Condition flagged “{condition}”. You can still receive it, or reject the sample.
          {!showReject && <button className="mah-link-btn" onClick={() => setShowReject(true)}>Reject sample →</button>}
        </div>
      )}

      {showReject
        ? <RejectForm token={token} sample={sample} busy={busy} setError={setError} onClose={onClose} afterChange={afterChange}
            defaultReason={condition === 'Cold chain breach' ? 'Cold chain breach on arrival' : 'Sample damaged/contaminated'} onCancel={() => setShowReject(false)} />
        : (
          <button className="mah-btn mah-btn-primary mah-self-start" disabled={busy}
            onClick={() => run(() => sampling({ sampling_state: 'SAMPLE_AT_LAB', lab_name: user?.organisation_name || sample.sampling_lab_name || 'Lab' }), 'Sample received at lab')}>
            {busy ? 'Saving…' : 'Confirm received at lab'}
          </button>
        )}
    </section>
  );
}

// ── SAMPLE_AT_LAB: upload results OR reject ──────────
function AtLabActions({ busy, run, sampling, token, sample, afterChange, onClose, setError }) {
  const [mode, setMode] = useState('results'); // 'results' | 'reject'
  return (
    <section className="mah-card lab-action-card">
      <div className="mah-card-head">
        <h2>{mode === 'results' ? 'Upload results' : 'Reject sample'}</h2>
        <div className="mah-segmented">
          <button className={mode === 'results' ? 'is-active' : ''} onClick={() => setMode('results')}>Upload results</button>
          <button className={mode === 'reject' ? 'is-active' : ''} onClick={() => setMode('reject')}>Reject sample</button>
        </div>
      </div>
      {mode === 'results'
        ? <ResultsForm busy={busy} run={run} sampling={sampling} token={token} sample={sample} inline />
        : <RejectForm token={token} sample={sample} busy={busy} setError={setError} onClose={onClose} afterChange={afterChange} />}
    </section>
  );
}

// Results upload form (also used for editing). On submit: optional document upload, then PUT sampling.
function ResultsForm({ busy, run, sampling, token, sample, initial, inline, onCancel }) {
  const [testDate, setTestDate] = useState(todayISO());
  const [overall, setOverall] = useState(initial?.sampling_overall_result || RESULT_OPTIONS[0]);
  const [summary, setSummary] = useState(initial?.sampling_results_summary || '');
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([{ name: '', result: '', range: '', verdict: 'Pass' }]);

  const addRow = () => setRows(r => (r.length >= 10 ? r : [...r, { name: '', result: '', range: '', verdict: 'Pass' }]));
  const setRow = (i, k, v) => setRows(r => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  const submit = () => run(async () => {
    if (file) {
      const content = await readFileForUpload(file);
      await apiFetch(token, `/documents/${sample.id}/upload`, {
        method: 'POST', body: { document_type: 'LAB_RESULTS', file_name: file.name, file_content: content },
      });
    }
    await sampling({ sampling_state: 'RESULTS_SUBMITTED', overall_result: overall, results_summary: composeResultsSummary(summary, rows) });
  }, 'Results submitted', true);

  return (
    <div className="mah-stack">
      <div className="mah-form-grid">
        <label className="mah-field"><span>Test date</span>
          <input type="date" className="mah-input" value={testDate} onChange={e => setTestDate(e.target.value)} /></label>
        <label className="mah-field"><span>Overall result</span>
          <select className="mah-input" value={overall} onChange={e => setOverall(e.target.value)}>
            {RESULT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select></label>
      </div>
      <label className="mah-field"><span>Results summary (required)</span>
        <textarea className="mah-input" rows={3} maxLength={3500} value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="Summary of findings" /></label>
      <label className="mah-field"><span>Results document</span>
        <input type="file" className="mah-input" onChange={e => setFile(e.target.files?.[0] || null)} /></label>

      <div className="lab-tests">
        <div className="mah-card-head"><h3 className="mah-h3">Individual test results</h3>
          <button className="mah-link-btn" onClick={addRow} disabled={rows.length >= 10}>+ Add test result</button></div>
        {rows.map((row, i) => (
          <div key={i} className="lab-test-row">
            <input className="mah-input" placeholder="Test name" value={row.name} onChange={e => setRow(i, 'name', e.target.value)} />
            <input className="mah-input" placeholder="Result" value={row.result} onChange={e => setRow(i, 'result', e.target.value)} />
            <input className="mah-input" placeholder="Reference range" value={row.range} onChange={e => setRow(i, 'range', e.target.value)} />
            <select className="mah-input" value={row.verdict} onChange={e => setRow(i, 'verdict', e.target.value)}>
              <option>Pass</option><option>Fail</option>
            </select>
            <button className="mah-icon-btn" onClick={() => removeRow(i)} aria-label="Remove row"><Icon name="x" size={16} /></button>
          </div>
        ))}
        <p className="mah-small mah-muted">Test rows are saved as part of the results summary text.</p>
      </div>

      <div className="mah-row-actions">
        {onCancel && <button className="mah-btn mah-btn-ghost mah-btn-sm" onClick={onCancel}>Cancel</button>}
        <button className="mah-btn mah-btn-primary" disabled={busy || !summary.trim()} onClick={submit}>
          {busy ? 'Submitting…' : 'Submit results →'}
        </button>
      </div>
    </div>
  );
}

function RejectForm({ token, sample, busy, setError, onClose, afterChange, defaultReason, onCancel }) {
  const [reason, setReason] = useState(defaultReason || REJECTION_REASONS[0]);
  const [details, setDetails] = useState('');
  const [working, setWorking] = useState(false);
  const needDetails = reason === 'Other';

  const confirm = async () => {
    setWorking(true);
    setError(null);
    try {
      await apiFetch(token, `/lab/samples/${sample.id}/reject`, { method: 'POST', body: { rejection_reason: reason, rejection_details: details.trim() } });
      await afterChange('Sample rejected — clearance company notified');
      onClose();
    } catch (e) {
      setError(e.message);
      setWorking(false);
    }
  };

  return (
    <div className="clr-inline-panel">
      <div className="mah-alert mah-alert-red">Rejecting returns the sample to the clearance company for SFDA notification. The shipment stays in Sampling.</div>
      <label className="mah-field"><span>Rejection reason</span>
        <select className="mah-input" value={reason} onChange={e => setReason(e.target.value)}>
          {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select></label>
      <label className="mah-field"><span>Details{needDetails ? ' (required)' : ''}</span>
        <textarea className="mah-input" rows={3} maxLength={2000} value={details} onChange={e => setDetails(e.target.value)}
          placeholder={needDetails ? 'Describe the issue' : 'Optional detail'} /></label>
      <div className="mah-row-actions">
        {onCancel && <button className="mah-btn mah-btn-ghost mah-btn-sm" onClick={onCancel}>Cancel</button>}
        <button className="mah-btn mah-btn-red" disabled={busy || working || (needDetails && !details.trim())} onClick={confirm}>
          {working ? 'Rejecting…' : 'Confirm rejection →'}
        </button>
      </div>
    </div>
  );
}

// ── Read-only views ──────────────────────────────────
function ResultsView({ sample, onEdit }) {
  return (
    <section className="mah-card lab-action-card">
      <div className="mah-card-head">
        <h2>Submitted results</h2>
        <div className="mah-detail-badges">
          <ResultBadge value={sample.sampling_overall_result} />
          {onEdit && <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={onEdit}>Edit results</button>}
        </div>
      </div>
      {sample.sampling_results_summary
        ? <pre className="clr-doc-content">{sample.sampling_results_summary}</pre>
        : <Empty title="No results summary recorded" />}
    </section>
  );
}

function RejectedView({ sample }) {
  return (
    <section className="mah-card lab-action-card lab-rejected-card">
      <div className="mah-card-head"><h2>Sample rejected</h2><span className="mah-badge mah-tone-red">Rejected</span></div>
      <div className="mah-facts">
        <div><span>Reason</span><strong>{sample.lab_rejection_reason || '—'}</strong></div>
        <div><span>Rejected</span><strong>{fmtDateTime(sample.lab_rejected_at)}</strong></div>
      </div>
      {sample.lab_rejection_details && <div className="mah-tl-note">{sample.lab_rejection_details}</div>}
      <p className="mah-small mah-muted">Returned to the clearance company for SFDA notification. The clearance company records the SFDA decision.</p>
    </section>
  );
}
