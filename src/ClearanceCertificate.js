// MASAAR Clearance Intelligence Certificate for a CLOSED_RELEASED shipment
// (GET / POST /shipments/:id/certificate). "Download PDF" prints just the certificate.
// Props: { shipment, token, apiUrl? }
import { useCallback, useEffect, useRef, useState } from 'react';
import { SectorBadge } from './mahShared';
import { integrityFetch, integrityVerdict, ScoreDonut } from './IntegrityDashboard';

const PRINT_CLASS = 'cert-printing';
const fmtDay = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

// [text, className] for a status shown on the certificate
const mark = {
  layer: (s) => ({
    PASSED: ['PASSED ✓', 'cert-ok'], WARNINGS: ['PASSED — WARNINGS ⚠', 'cert-warn'],
    ISSUES: ['ISSUES ✗', 'cert-bad'], NOT_APPLICABLE: ['NOT APPLICABLE', 'cert-na'],
  }[s] || ['—', 'cert-na']),
  sector: (s) => ({ VERIFIED: ['VERIFIED ✓', 'cert-ok'], MISMATCH: ['MISMATCH ✗', 'cert-bad'] }[s] || ['NOT VERIFIED', 'cert-na']),
  sampling: (s) => (s === 'NOT_SAMPLED' ? ['NOT SAMPLED', 'cert-na']
    : /^PASS/i.test(s) ? ['PASS ✓', 'cert-ok'] : [String(s).replace(/_/g, ' '), 'cert-warn']),
  lab: (s) => ({ VERIFIED: ['VERIFIED ✓', 'cert-ok'], WARNING: ['WARNING ⚠', 'cert-warn'] }[s] || ['NOT APPLICABLE', 'cert-na']),
  supplier: (firstTime) => (firstTime == null ? ['NOT IN MASTER', 'cert-na'] : firstTime ? ['FIRST-TIME', 'cert-warn'] : ['VERIFIED ✓', 'cert-ok']),
};
const Line = ({ label, value: [text, cls] }) => (
  <div className="cert-line"><span>{label}</span><strong className={cls}>{text}</strong></div>
);

export default function ClearanceCertificate({ shipment, token, apiUrl }) {
  const [cert, setCert] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await integrityFetch(apiUrl, token, `/shipments/${shipment.id}/certificate`);
      setCert(d.certificate);
      setMissing(false);
      setError(null);
    } catch (e) {
      if (e.status === 404) setMissing(true);
      else setError(e.message);
    }
  }, [apiUrl, token, shipment.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    document.body.classList.remove(PRINT_CLASS);
  }, []);

  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const d = await integrityFetch(apiUrl, token, `/shipments/${shipment.id}/certificate`, 'POST');
      setCert(d.certificate);
      setMissing(false);
      showToast(cert ? 'Certificate re-generated' : 'Certificate generated');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const print = () => {
    const done = () => { document.body.classList.remove(PRINT_CLASS); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    document.body.classList.add(PRINT_CLASS);
    window.print();
  };

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}#certificate/${encodeURIComponent(cert.certificate_number)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch {
      showToast('Could not copy the link');
    }
  }

  if (!cert) {
    return (
      <section className="mah-card">
        <div className="mah-card-head"><h2>MASAAR Clearance Intelligence Certificate</h2></div>
        {missing ? (
          <>
            <p className="mah-muted">
              This shipment was released by SFDA. Generate its MASAAR certificate — a summary of the validation and
              integrity checks it went through, with a tamper-evident hash.
            </p>
            <div><button className="int-btn" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate certificate'}</button></div>
          </>
        ) : !error && <div className="mah-loading">Loading certificate…</div>}
        {error && <div className="mah-alert mah-alert-red">{error}</div>}
      </section>
    );
  }

  const s = cert.shipment || {};
  const integ = cert.integrity || {};
  const layers = integ.checks_summary?.layers || {};
  const verdict = integrityVerdict(integ.score);
  const aiScore = integ.ai_validation_score;

  return (
    <div className="cert-wrap">
      <article className="cert" aria-label={`MASAAR certificate ${cert.certificate_number}`}>
        <header className="cert-header">
          <img className="cert-logo" src="/demara-logo-transparent.png" alt="DEMARA" />
          <div className="cert-brand">
            <div className="cert-brand-name">MASAAR</div>
            <div className="cert-brand-sub">Clearance Intelligence Certificate</div>
          </div>
          <div className="cert-number">{cert.certificate_number}</div>
        </header>

        <hr className="cert-divider" />

        <section className="cert-facts">
          <div className="cert-fact cert-fact-lg"><span>Shipment</span><strong>{s.name || '—'}</strong></div>
          <div className="cert-fact"><span>MAH</span><strong>{cert.mah?.name || '—'}</strong></div>
          <div className="cert-fact"><span>MSR ID</span><strong className="mah-mono">{s.masaar_id || '—'}</strong></div>
          <div className="cert-fact"><span>Clearance Co</span><strong>{cert.clearance?.name || '—'}</strong></div>
          <div className="cert-fact"><span>Sector</span><strong>{s.sector ? <SectorBadge sector={s.sector} /> : '—'}</strong></div>
          <div className="cert-fact">
            <span>Supplier</span>
            <strong>{[cert.supplier?.name, cert.supplier?.country].filter(Boolean).join(', ') || '—'}</strong>
          </div>
          <div className="cert-fact"><span>Clearance date</span><strong>{fmtDay(s.clearance_date)}</strong></div>
          <div className="cert-fact"><span>Port</span><strong>{s.port_of_entry || '—'}</strong></div>
        </section>

        <hr className="cert-divider" />

        <section className="cert-grid">
          <div className="cert-col">
            <div className="cert-box">
              <h3>Document Validation</h3>
              <Line label="Layer 1 · Completeness" value={mark.layer(layers[1]?.status)} />
              <Line label="Layer 2 · Consistency" value={mark.layer(layers[2]?.status)} />
              <Line label="Layer 3 · AI" value={aiScore != null ? [`${aiScore}/100`, aiScore >= 70 ? 'cert-ok' : 'cert-warn'] : mark.layer(layers[3]?.status)} />
            </div>
            <div className="cert-box">
              <h3>Regulatory Compliance</h3>
              <Line label="Sector classification" value={mark.sector(integ.sector_classification)} />
              <Line label="SFDA decision" value={[`${cert.sfda_decision} ✓`, 'cert-ok']} />
              <Line label="Sampling result" value={mark.sampling(cert.sampling_result || 'NOT_SAMPLED')} />
              <Line label="Halal status" value={[String(cert.halal_status || '—').replace(/_/g, ' '),
                cert.halal_status === 'VERIFIED' ? 'cert-ok' : cert.halal_status === 'MISSING' ? 'cert-bad' : 'cert-na']} />
            </div>
          </div>
          <div className="cert-col">
            <div className="cert-box cert-score-box">
              <h3>Integrity Score</h3>
              <ScoreDonut score={integ.score} size={120} />
              <div className="cert-verdict" style={{ color: verdict.color }}>{verdict.label}</div>
            </div>
            <div className="cert-box">
              <h3>Supplier Intelligence</h3>
              <Line label="Supplier status" value={mark.supplier(cert.supplier?.is_first_time)} />
              <Line label="Historical rejection rate" value={[cert.supplier?.rejection_rate || 'No history', 'cert-na']} />
              <Line label="Lab independence" value={mark.lab(integ.lab_independence)} />
            </div>
          </div>
        </section>

        <section className="cert-banner">
          <div className="cert-banner-score">{integ.score ?? '—'}/100</div>
          <div className="cert-banner-label">MASAAR INTEGRITY SCORE</div>
        </section>

        <footer className="cert-footer">
          <div>
            <div>Issued: {fmtDay(cert.generated_at)}</div>
            <div><strong>DEMARA Regulatory Consulting</strong></div>
            <div className="mah-small">Ref {cert.demara_reference}</div>
          </div>
          <div className="cert-qr">
            <div className="cert-qr-box" aria-hidden="true" />
            <span>Scan to verify</span>
          </div>
          <div className="cert-hash">
            <div>Certificate Hash</div>
            <code title={cert.certificate_hash}>{String(cert.certificate_hash || '').slice(0, 16)}...</code>
            <div className="mah-small">Full hash available on request</div>
          </div>
        </footer>

        <p className="cert-disclaimer">
          This certificate confirms that the above shipment was processed through MASAAR's AI-powered validation and
          integrity system. It does not replace official SFDA clearance documents.
        </p>
      </article>

      <div className="cert-actions">
        <button className="int-btn" onClick={print}>Download PDF</button>
        <button className="int-btn int-btn-outline" onClick={share}>Share link</button>
        <button className="int-btn int-btn-grey" onClick={generate} disabled={busy}>{busy ? 'Re-generating…' : 'Re-generate'}</button>
      </div>
      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      {toast && <div className="cert-toast" role="status">{toast}</div>}
    </div>
  );
}
