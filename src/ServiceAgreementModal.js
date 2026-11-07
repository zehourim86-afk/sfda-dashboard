// Service agreement between the MAH and its clearance company for one shipment (migration 020).
// Shared by the MAH and Clearance portals. Each side acknowledges with
// POST /shipments/:id/acknowledge-agreement; the agreement is in effect once both have.
//
// The two editable sections (service terms, liability) are working drafts: edits show in the
// printed copy but are not saved to the server yet.
import { useEffect, useState } from 'react';
import { apiFetch, fmtDate, fmtDateTime, Icon } from './mahShared';

const DEFAULT_SERVICE_TERMS = `The clearance company agrees to:
- File the Faseh customs declaration within [X] business days of receiving complete documents
- Notify the MAH of any SFDA queries within 24 hours of receipt
- Maintain confidentiality of all shipment information

Additional terms: [parties may add terms here]`;

const DEFAULT_LIABILITY = `The clearance company accepts responsibility for:
- Accuracy of customs filing
- Timely submission of Faseh declarations
- Communication of SFDA decisions

The MAH accepts responsibility for:
- Accuracy and completeness of provided documents
- Timely response to SFDA information requests

Additional liability terms: [add here]`;

const PRINT_CLASS = 'sa-printing';

function AckStatus({ label, done, at }) {
  return (
    <div className={`sa-ack ${done ? 'is-done' : ''}`}>
      <span className="sa-ack-label">{label}</span>
      {done
        ? <strong className="mah-text-green">✓ Acknowledged {fmtDateTime(at)}</strong>
        : <strong className="mah-muted">⏳ Pending acknowledgement</strong>}
    </div>
  );
}

// party: 'MAH' | 'CLEARANCE' — which side the viewer acknowledges for.
// mahOrg / clearanceOrg are organisation rows ({ name_en, cr_number }); fetched when not given.
export default function ServiceAgreementModal({
  shipment, mahOrg: mahOrgProp, clearanceOrg: clearanceOrgProp, party, token, onClose, onAcknowledged,
}) {
  const [orgs, setOrgs] = useState({ mah: mahOrgProp || null, clearance: clearanceOrgProp || null });
  const [serviceTerms, setServiceTerms] = useState(DEFAULT_SERVICE_TERMS);
  const [liability, setLiability] = useState(DEFAULT_LIABILITY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const clearanceId = shipment.preferred_clearance_company_id || shipment.clearance_company_id;
  const needsFetch = !orgs.mah || !orgs.clearance;
  useEffect(() => {
    if (!needsFetch) return undefined;
    let cancelled = false;
    apiFetch(token, '/admin/organisations')
      .then(d => {
        if (cancelled) return;
        const list = d.organisations || [];
        setOrgs(prev => ({
          mah: prev.mah || list.find(o => o.id === shipment.org_id) || null,
          clearance: prev.clearance || list.find(o => o.id === clearanceId) || null,
        }));
      })
      .catch(() => { /* fall back to the names on the shipment */ });
    return () => { cancelled = true; };
  }, [needsFetch, token, shipment.org_id, clearanceId]);

  // Close on Escape; always drop the print class when the modal goes away
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove(PRINT_CLASS); };
  }, [onClose]);

  const mahName = orgs.mah?.name_en || shipment.mah_org_name || shipment.importer_name || '—';
  const clearanceName = orgs.clearance?.name_en || shipment.preferred_clearance_company_name || shipment.clearance_company_name || '—';
  const products = (shipment.products || []).map(p => p.product_name_en).filter(Boolean);
  const productText = products.length ? products.join(', ') : (shipment.product_name || '—');
  const mine = party === 'MAH' ? 'agreement_acknowledged_mah' : 'agreement_acknowledged_clearance';
  const alreadyMine = !!shipment[mine];
  const canAcknowledge = shipment.broker_acceptance_status === 'ACCEPTED' && !alreadyMine;

  const print = () => {
    const done = () => { document.body.classList.remove(PRINT_CLASS); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    document.body.classList.add(PRINT_CLASS);
    window.print();
  };

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch(token, `/shipments/${shipment.id}/acknowledge-agreement`, { method: 'POST' });
      const other = party === 'MAH' ? 'Clearance company' : 'MAH';
      const message = data.fully_acknowledged
        ? 'Agreement fully acknowledged by both parties.'
        : `Agreement acknowledged. ${other} acknowledgement pending.`;
      await onAcknowledged?.(data.shipment, message);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mah-modal-backdrop" role="dialog" aria-modal="true" aria-label="Service agreement"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mah-modal sa-modal">
        <div className="mah-modal-head">
          <div>
            <h2>Service Agreement — {shipment.shipment_name || productText}</h2>
            <div className="mah-small mah-muted">{shipment.masaar_id || shipment.id} · Generated by MASAAR</div>
          </div>
          <button className="mah-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        <div className="mah-modal-body">
          <div className="sa-doc sa-print-area">
            <div className="sa-print-only sa-print-title">
              Service Agreement — {shipment.masaar_id} · Generated by MASAAR
            </div>

            <section className="sa-section sa-locked">
              <h3>1. Parties</h3>
              <p>This service agreement is entered into between:</p>
              <dl className="sa-parties">
                <div>
                  <dt>Marketing Authorisation Holder (MAH)</dt>
                  <dd>{mahName}</dd>
                  <dd className="mah-small">Commercial Registration: {orgs.mah?.cr_number || '—'}</dd>
                </div>
                <div>
                  <dt>Clearance Company</dt>
                  <dd>{clearanceName}</dd>
                  <dd className="mah-small">Commercial Registration: {orgs.clearance?.cr_number || '—'}</dd>
                </div>
              </dl>
              <p className="mah-small">
                Facilitated by: DEMARA Regulatory Consulting — as neutral record keeper only, not a party to this agreement.
              </p>
            </section>

            <section className="sa-section sa-locked">
              <h3>2. Scope</h3>
              <p>This agreement covers customs clearance services for the following shipment:</p>
              <dl className="sa-facts">
                <div><dt>Shipment ID</dt><dd className="mah-mono">{shipment.masaar_id || '—'}</dd></div>
                <div><dt>Product(s)</dt><dd>{productText}</dd></div>
                <div><dt>Estimated arrival</dt><dd>{fmtDate(shipment.eta)}</dd></div>
                <div><dt>Port of entry</dt><dd>{shipment.port_of_entry || '—'}</dd></div>
              </dl>
            </section>

            <section className="sa-section">
              <h3>3. Service terms</h3>
              <textarea className="mah-input sa-terms" rows={8} value={serviceTerms}
                onChange={e => setServiceTerms(e.target.value)} aria-label="Service terms" />
              <pre className="sa-print-only sa-terms-print">{serviceTerms}</pre>
            </section>

            <section className="sa-section">
              <h3>4. Liability</h3>
              <textarea className="mah-input sa-terms" rows={10} value={liability}
                onChange={e => setLiability(e.target.value)} aria-label="Liability terms" />
              <pre className="sa-print-only sa-terms-print">{liability}</pre>
            </section>
            <p className="mah-small mah-muted sa-no-print">Edits to sections 3 and 4 appear in the printed draft but are not saved yet.</p>

            <section className="sa-section sa-locked">
              <h3>5. Governing law</h3>
              <p>
                This agreement is governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be referred
                first to DEMARA for mediation, and thereafter to the competent Saudi commercial courts.
              </p>
            </section>

            <section className="sa-section sa-locked">
              <h3>6. Signatures</h3>
              <AckStatus label={`MAH — ${mahName}`} done={shipment.agreement_acknowledged_mah} at={shipment.agreement_acknowledged_mah_at} />
              <AckStatus label={`Clearance — ${clearanceName}`} done={shipment.agreement_acknowledged_clearance}
                at={shipment.agreement_acknowledged_clearance_at} />
            </section>
          </div>
          {error && <div className="mah-alert mah-alert-red">{error}</div>}
        </div>

        <div className="mah-modal-foot">
          <button className="mah-btn mah-btn-ghost" onClick={print}>Download draft PDF</button>
          <span className="mah-grow" />
          {alreadyMine
            ? <span className="mah-text-green mah-small"><strong>✓ You acknowledged this agreement</strong></span>
            : (
              <button className="mah-btn mah-btn-navy" onClick={acknowledge} disabled={!canAcknowledge || busy}>
                {busy ? 'Acknowledging…' : 'I acknowledge and agree to these terms →'}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
