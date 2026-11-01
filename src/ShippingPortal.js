import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';

const INSPECTOR_STATES = [
  'SAMPLING_REQUESTED',
  'PICKUP_SCHEDULED',
  'SAMPLE_PICKED_UP',
  'IN_TRANSIT',
  'LAB_RECEIVED'
];

// ── Dark theme ───────────────────────────────────────────────────
// Each tone: [text colour, rgb triplet for tinted backgrounds and borders]
const TONES = {
  cyan:   ['#38C6FF', '0,170,255'],
  green:  ['#00C896', '0,200,150'],
  amber:  ['#F5A623', '245,166,35'],
  red:    ['#FF5470', '255,84,112'],
  purple: ['#a78bfa', '124,92,252'],
  grey:   ['rgba(255,255,255,.6)', '255,255,255'],
};
const tint = (tone, alpha) => `rgba(${TONES[tone][1]},${alpha})`;

const STATE_INFO = {
  SAMPLING_REQUESTED: { label: 'Pickup Requested', tone: 'amber', action: 'Confirm Pickup Scheduled with MAH', next: 'PICKUP_SCHEDULED' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', tone: 'cyan', action: 'Confirm Sample Picked Up from MAH', next: 'SAMPLE_PICKED_UP' },
  SAMPLE_PICKED_UP: { label: 'Sample Picked Up', tone: 'amber', action: 'Confirm In Transit to Lab', next: 'IN_TRANSIT' },
  IN_TRANSIT: { label: 'In Transit to Lab', tone: 'purple', action: 'Confirm Lab Receipt', next: 'LAB_RECEIVED' },
  LAB_RECEIVED: { label: 'Delivered to Lab', tone: 'green', action: null, next: null },
};

// Tones for the downstream states listed on the Completed tab
const COMPLETED_TONE = {
  IN_ANALYSIS: 'purple', ANALYSIS_COMPLETE: 'amber', RESULT_SUBMITTED: 'cyan',
  CONFORMING: 'green', NON_CONFORMING: 'red', FINAL_CLEARANCE: 'green',
};

function badge(label, tone) {
  const color = TONES[tone][0];
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap',background:tint(tone,.1),color,border:`1px solid ${tint(tone,.3)}`}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}></span>
      {label}
    </span>
  );
}

const S = {
  backdrop: {position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'},
  closeBtn: {width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'},
  ipt: {width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none'},
  lbl: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,display:'block'},
  hint: {fontSize:10,color:'rgba(255,255,255,.3)',marginTop:4},
  listRow: {display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,padding:'9px 12px'},
  error: {background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470'},
  mono: 'JetBrains Mono,monospace',
};
const smallBtn = (tone) => ({background:tint(tone,.12),border:`1px solid ${tint(tone,.25)}`,color:TONES[tone][0],fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0});
// Tinted alert card used for the pickup / re-export / destruction queues
const alertCard = (tone) => ({background:tint(tone,.05),border:`1px solid ${tint(tone,.22)}`,borderRadius:14,padding:'16px 18px'});
const alertTitle = (tone) => ({fontSize:13,fontWeight:700,color:TONES[tone][0],marginBottom:12});

// ─── MASAAR Sampling Recommendation ────────────────────────────

const MANDATORY_CATEGORIES = ['Cosmetic', 'Cosmetic Device', 'Food Supplement'];

const RECOMMENDATION_STYLE = {
  MANDATORY: { label: 'MANDATORY', color: '#FF5470', bg: 'rgba(255,84,112,.1)', border: 'rgba(255,84,112,.3)' },
  EXEMPT: { label: 'EXEMPT', color: '#00C896', bg: 'rgba(0,200,150,.1)', border: 'rgba(0,200,150,.3)' },
  SFDA_DISCRETION: { label: 'SFDA DISCRETION', color: '#F5A623', bg: 'rgba(245,166,35,.1)', border: 'rgba(245,166,35,.3)' },
};

// Fields come from GET /shipments. null means "not known yet", which never triggers a rule.
function getSamplingRecommendation(s) {
  const mandatoryReasons = [];
  if (s.sampling_history === 0) mandatoryReasons.push('First shipment of this product by this MAH — no clean sampling history');
  if (s.supplier_first_time === true) mandatoryReasons.push('First shipment from this supplier');
  if (s.country_risk === 'HIGH') mandatoryReasons.push(`Country of origin (${s.shipment_country || 'unknown'}) is rated high risk`);
  if (s.previous_non_conformity === true) mandatoryReasons.push('This MAH has a previous non-conformity for this product');
  if (MANDATORY_CATEGORIES.includes(s.product_category)) mandatoryReasons.push(`${s.product_category} is a mandatory-sampling category`);

  const unknown = [];
  if (s.sampling_history == null) unknown.push('sampling history');
  if (s.certificate_of_conformity == null) unknown.push('certificate of conformity');
  if (s.supplier_first_time == null) unknown.push('supplier history');
  if (s.product_category == null) unknown.push('product category');

  if (mandatoryReasons.length > 0) {
    return { recommendation: 'MANDATORY', reasons: mandatoryReasons, unknown };
  }

  const hasCoc = s.certificate_of_conformity === true;
  const history = s.sampling_history;
  const cleanRecord = s.previous_non_conformity === false;

  if (hasCoc && history >= 3 && cleanRecord) {
    return {
      recommendation: 'EXEMPT',
      reasons: [
        'Valid Certificate of Conformity on file',
        `${history} prior clean shipments of this product by this MAH`,
        'No previous non-conformity recorded',
      ],
      unknown,
    };
  }

  const reasons = ['No mandatory sampling triggers found'];
  if (!hasCoc) reasons.push(s.certificate_of_conformity === false ? 'No valid Certificate of Conformity on file' : 'Certificate of Conformity could not be checked');
  if (history == null) reasons.push('Sampling history could not be checked — no products listed on this shipment');
  else if (history < 3) reasons.push(`Only ${history} prior clean shipment${history === 1 ? '' : 's'} (3 needed for exemption)`);
  if (s.previous_non_conformity == null) reasons.push('Non-conformity history could not be checked');
  return { recommendation: 'SFDA_DISCRETION', reasons, unknown };
}

const panel = {
  wrap: { background: '#252266', border: '1px solid rgba(56,198,255,0.2)', borderRadius: 14, padding: 20, fontFamily: 'Inter, sans-serif', color: '#fff' },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#38C6FF', marginBottom: 12 },
  reason: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 6 },
  primary: { flex: 1, background: '#38C6FF', color: '#2D2B7A', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghost: { flex: 1, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.75)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  input: { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
  error: { background: 'rgba(255,84,112,.08)', border: '1px solid rgba(255,84,112,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#FF5470', marginTop: 12 },
};

function SamplingRecommendation({ shipment, token, onExempted }) {
  const { recommendation, reasons, unknown } = getSamplingRecommendation(shipment);
  const style = RECOMMENDATION_STYLE[recommendation];
  const [recorded, setRecorded] = useState(shipment.sampling_decision || null);
  const [overriding, setOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const opposite = recommendation === 'MANDATORY' ? 'EXEMPT' : 'MANDATORY';

  const submit = async (decision, override) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/sampling-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          decision,
          override,
          override_reason: override ? overrideReason.trim() : '',
          recommendation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to record sampling decision');
        return;
      }
      if (decision === 'EXEMPT') {
        onExempted();
      } else {
        setRecorded('MANDATORY');
        setOverriding(false);
      }
    } catch {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  if (recorded === 'MANDATORY') {
    return (
      <div style={panel.wrap}>
        <div style={panel.eyebrow}>MASAAR Sampling Recommendation</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5470', flexShrink: 0 }}></span>
          Decision recorded: sampling is mandatory. Proceed with sample collection below.
        </div>
      </div>
    );
  }

  const busy = submitting ? { opacity: 0.5, cursor: 'not-allowed' } : {};

  return (
    <div style={panel.wrap}>
      <div style={panel.eyebrow}>MASAAR Sampling Recommendation</div>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, fontSize: 16, fontWeight: 800, letterSpacing: '.05em', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color }}></span>
        {style.label}
      </span>

      <div style={{ marginTop: 14 }}>
        {reasons.map((r, i) => (
          <div key={i} style={panel.reason}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: style.color, marginTop: 6, flexShrink: 0 }}></span>
            <span>{r}</span>
          </div>
        ))}
        {unknown.length > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 8 }}>
            Not yet available: {unknown.join(', ')}
          </div>
        )}
      </div>

      {overriding ? (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Override to {RECOMMENDATION_STYLE[opposite].label} — reason
          </label>
          <textarea
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            rows={2}
            placeholder="Why are you overriding the recommendation?"
            style={panel.input}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => submit(opposite, true)}
              disabled={submitting || !overrideReason.trim()}
              style={{ ...panel.primary, ...(submitting || !overrideReason.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
            >
              {submitting ? 'Saving…' : 'Confirm Override'}
            </button>
            <button onClick={() => { setOverriding(false); setOverrideReason(''); }} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
              Cancel
            </button>
          </div>
        </div>
      ) : recommendation === 'SFDA_DISCRETION' ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => submit('MANDATORY', false)} disabled={submitting} style={{ ...panel.primary, ...busy }}>
            Require Sampling
          </button>
          <button onClick={() => submit('EXEMPT', false)} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
            Exempt
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => submit(recommendation, false)} disabled={submitting} style={{ ...panel.primary, ...busy }}>
            {submitting ? 'Saving…' : 'Accept Recommendation'}
          </button>
          <button onClick={() => setOverriding(true)} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
            Override
          </button>
        </div>
      )}

      {error && <div style={panel.error}>{error}</div>}
    </div>
  );
}

// Sample Collection Modal
function SampleActionModal({ shipment, token, isInspector, onClose, onRefresh }) {
  const [acting, setActing] = useState(false);
  const [sealId, setSealId] = useState('');
  const [samplePhoto, setSamplePhoto] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const stateInfo = STATE_INFO[shipment.current_state];

    const handleBulkJourney = async () => {
    if (!sealId.trim()) {
      setError('Please enter a seal ID before completing the full journey');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const steps = [
        { state: 'PICKUP_SCHEDULED', notes: 'Shipping company confirmed pickup scheduling with MAH' },
        { state: 'SAMPLE_PICKED_UP', notes: `Seal ID: ${sealId}${notes ? ' — ' + notes : ''}` },
        { state: 'IN_TRANSIT', notes: 'Sample in transit to assigned lab' },
        { state: 'LAB_RECEIVED', notes: 'Lab confirmed sample receipt' }
      ];

      for (const step of steps) {
        await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ new_state: step.state, notes: step.notes, trigger_source: 'MANUAL' })
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Failed to complete journey — check connection');
    } finally {
      setActing(false);
    }
  };

  const performTransition = async () => {
    if (shipment.current_state === 'PICKUP_SCHEDULED' && !sealId.trim()) {
      setError('Seal ID is required when collecting samples');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const actionNotes = sealId ? `Seal ID: ${sealId}${notes ? ' — ' + notes : ''}${samplePhoto ? ' — Photo uploaded' : ''}` : notes;

      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: stateInfo.next,
          notes: actionNotes,
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {

        // Create lab sample record when sample collected
        if (shipment.current_state === 'PICKUP_SCHEDULED' && shipment.lab_id) {
          await fetch(`${API_URL}/inspector/samples`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              shipment_id: shipment.id,
              lab_organisation_id: shipment.lab_id,
              seal_id: sealId,
              notes: notes
            })
          });
        }

        onRefresh();
        onClose();
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setActing(false);
    }
  };

  return (
    <div style={S.backdrop}>
      <div style={{background:'#252266',border:'1px solid rgba(0,170,255,.15)',borderRadius:18,width:'100%',maxWidth:560,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'linear-gradient(180deg,rgba(0,170,255,.05),transparent)'}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:S.mono}}>{shipment.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{shipment.importer_name} · {shipment.port_of_entry}</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>×</button>
        </div>

        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Current status */}
          <div style={{display:'flex',alignItems:'center',gap:10,background:tint(stateInfo?.tone || 'amber',.06),border:`1px solid ${tint(stateInfo?.tone || 'amber',.2)}`,borderRadius:10,padding:'12px 14px'}}>
            {stateInfo && badge(stateInfo.label, stateInfo.tone)}
            <span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Since {formatDate(shipment.state_entered_at)}</span>
          </div>

          {/* Shipment details */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              ['Faseh Reference', shipment.faseh_request_number, '#38C6FF', true],
              ['Port of Entry', shipment.port_of_entry, '#fff', false],
              ['Shipment Country', shipment.shipment_country, '#fff', false],
              ['QC Lab', shipment.lab_name || '—', '#fff', false],
            ].map(([label, value, color, mono]) => (
              <div key={label} style={{background:'rgba(0,170,255,.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:9,padding:'8px 12px'}}>
                <div style={S.lbl}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color,fontFamily:mono?S.mono:'inherit'}}>{value}</div>
              </div>
            ))}
          </div>

          {error && <div style={S.error}>{error}</div>}

          {/* Seal ID and photo — when collecting sample or doing bulk journey */}
          {(shipment.current_state === 'PICKUP_SCHEDULED' || shipment.current_state === 'SAMPLING_REQUESTED') && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={S.lbl}>Seal ID *</label>
                <input type="text" value={sealId} onChange={e => setSealId(e.target.value)}
                  placeholder="e.g. SEAL-SA-2026-00441"
                  style={{...S.ipt,fontFamily:S.mono}} />
                <div style={S.hint}>Record the seal ID placed on the sample container</div>
              </div>
              <div>
                <label style={S.lbl}>Sample Photo</label>
                <div style={{border:'2px dashed rgba(0,170,255,.2)',borderRadius:12,padding:16,textAlign:'center',background:'rgba(0,170,255,.02)'}}>
                  <input type="file" accept="image/*" id="sample-photo" style={{display:'none'}}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setSamplePhoto(ev.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {samplePhoto ? (
                    <div>
                      <img src={samplePhoto} alt="Sample" style={{maxHeight:128,margin:'0 auto',display:'block',borderRadius:8}} />
                      <button type="button" onClick={() => setSamplePhoto(null)}
                        style={{marginTop:8,background:'none',border:'none',color:'#FF5470',fontSize:11,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>Remove photo</button>
                    </div>
                  ) : (
                    <label htmlFor="sample-photo" style={{cursor:'pointer',display:'block'}}>
                      <div style={{fontSize:24,marginBottom:4}}>📷</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Click to take or upload a photo of the sealed sample</div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={S.lbl}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Any observations or notes..."
              style={{...S.ipt,resize:'vertical'}} />
          </div>

          {isInspector && shipment.current_state === 'SAMPLING_REQUESTED' && (
            <SamplingRecommendation shipment={shipment} token={token} onExempted={onRefresh} />
          )}

          {stateInfo?.action && (
            <button onClick={performTransition} disabled={acting}
              style={{width:'100%',padding:13,background:'linear-gradient(135deg,#38C6FF,#0088DD)',color:'#252266',fontSize:13,fontWeight:800,borderRadius:10,border:'none',
                cursor:acting?'default':'pointer',opacity:acting?.6:1,fontFamily:'inherit',boxShadow:'0 4px 20px rgba(0,170,255,.3)'}}>
              {acting ? 'Processing...' : stateInfo.action}
            </button>
          )}

          {shipment.current_state === 'SAMPLING_REQUESTED' && (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></div>
                <span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>or</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></div>
              </div>
              <button onClick={handleBulkJourney} disabled={acting}
                style={{width:'100%',padding:12,background:'rgba(124,92,252,.1)',border:'1px solid rgba(124,92,252,.35)',color:'#a78bfa',fontSize:13,fontWeight:700,borderRadius:10,
                  cursor:acting?'default':'pointer',opacity:acting?.6:1,fontFamily:'inherit'}}>
                {acting ? '⏳ Completing journey...' : '⚡ Complete Full Sample Journey'}
              </button>
              <div style={{...S.hint,textAlign:'center',marginTop:6}}>
                Records all steps from collection to lab receipt in one action
              </div>
            </div>
          )}

          {shipment.current_state === 'LAB_RECEIVED' && (
            <div style={{background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:12,padding:16,textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#00C896'}}>✓ Sample successfully delivered to lab</div>
              <div style={{fontSize:11,color:'rgba(0,200,150,.6)',marginTop:4}}>The lab will now proceed with analysis</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Inspector App
// ─── Re-export loading (SFDA_INSPECTOR) ──────────────────────
// Shipments with an SFDA re-export permit, waiting for the inspector to confirm loading at port.
function ReExportLoadingSection({ shipments, token, onRefresh }) {
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);

  if (shipments.length === 0) return null;

  const confirmLoaded = async (shipment) => {
    setActingId(shipment.id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'RE_EXPORT_LOADED' })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        setError(`${shipment.faseh_request_number}: ${data.message || 'Action failed'}`);
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={alertCard('amber')}>
      <div style={alertTitle('amber')}>🚢 Re-export — Awaiting Loading Confirmation ({shipments.length})</div>
      {error && <div style={{...S.error,marginBottom:10}}>{error}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {shipments.map(s => (
          <div key={s.id} style={S.listRow}>
            <div>
              <span style={{fontFamily:S.mono,fontSize:11,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,.45)',marginLeft:8}}>{s.importer_name}</span>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:3}}>
                {s.port_of_entry} · Booking ref: <span style={{fontFamily:S.mono,fontWeight:600,color:'rgba(255,255,255,.75)'}}>{s.re_export_reference || '—'}</span>
              </div>
            </div>
            <button onClick={() => confirmLoaded(s)} disabled={actingId === s.id}
              style={{...smallBtn('amber'),opacity:actingId === s.id ? .5 : 1}}>
              {actingId === s.id ? 'Confirming...' : '✓ Confirm Goods Loaded'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Destruction witness (SFDA_INSPECTOR) ────────────────────
// Scheduled supervised destructions. The inspector confirms with their name/ID before witnessing.
function DestructionWitnessSection({ shipments, token, defaultWitness, onRefresh }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [witness, setWitness] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (shipments.length === 0) return null;

  const startConfirm = (shipment) => {
    setConfirmingId(shipment.id);
    setWitness(defaultWitness || '');
    setError(null);
  };

  const submitWitness = async (shipment) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'WITNESS_DESTRUCTION', witnessed_by: witness })
      });
      const data = await res.json();
      if (data.success) {
        setConfirmingId(null);
        onRefresh();
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={alertCard('red')}>
      <div style={alertTitle('red')}>🔥 Scheduled Destructions — Witness Required ({shipments.length})</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {shipments.map(s => (
          <div key={s.id} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,padding:'9px 12px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <span style={{fontFamily:S.mono,fontSize:11,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,.45)',marginLeft:8}}>{s.importer_name}</span>
                <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:3}}>
                  Scheduled: <span style={{fontWeight:600,color:'rgba(255,255,255,.75)'}}>{s.destruction_scheduled_at ? formatDate(s.destruction_scheduled_at) : '—'}</span>
                  {' · '}SFDA order: <span style={{fontFamily:S.mono,fontWeight:600,color:'rgba(255,255,255,.75)'}}>{s.destruction_reference || '—'}</span>
                </div>
              </div>
              {confirmingId !== s.id && (
                <button onClick={() => startConfirm(s)}
                  style={smallBtn('red')}>
                  Witness Destruction
                </button>
              )}
            </div>
            {confirmingId === s.id && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,84,112,.15)'}}>
                <label style={S.lbl}>Witnessing inspector — name / ID *</label>
                <div style={{display:'flex',gap:8}}>
                  <input type="text" value={witness} onChange={e => setWitness(e.target.value)}
                    placeholder="e.g. Ahmed Al-Harbi / INS-2041"
                    style={{...S.ipt,flex:1}} />
                  <button onClick={() => submitWitness(s)} disabled={submitting || !witness.trim()}
                    style={{...smallBtn('red'),padding:'8px 14px',opacity:submitting || !witness.trim() ? .5 : 1}}>
                    {submitting ? 'Confirming...' : 'Confirm Witness'}
                  </button>
                  <button onClick={() => setConfirmingId(null)} disabled={submitting}
                    style={{...smallBtn('grey'),padding:'8px 14px',color:'rgba(255,255,255,.6)'}}>
                    Cancel
                  </button>
                </div>
                {error && <div style={{fontSize:11,color:'#FF5470',marginTop:6}}>{error}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InspectorApp({ user: initialUser, token, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

    const fetchShipments = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, meRes] = await Promise.all([
        fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const shipmentsData = await shipmentsRes.json();
      const meData = await meRes.json();
      const me = meData.user || user;
      // Shipping companies see their own shipments plus unassigned ones (shipping_company_id
      // NULL, as all older shipments are). The backend applies the same rule.
      const visible = (shipmentsData.shipments || []).filter(s =>
        me?.role !== 'SHIPPING_COMPANY' || s.shipping_company_id == null ||
        String(s.shipping_company_id) === String(me.organisation_id));
      setShipments(visible);
      if (meData.user) setUser(meData.user);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(() => {
      if (!selectedShipment) {
        fetchShipments();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedShipment]);

  const activeShipments = shipments.filter(s => INSPECTOR_STATES.includes(s.current_state));
  const completedShipments = shipments.filter(s => !INSPECTOR_STATES.includes(s.current_state) &&
    ['IN_ANALYSIS', 'ANALYSIS_COMPLETE', 'RESULT_SUBMITTED', 'CONFORMING', 'NON_CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state));

  const filtered = activeTab === 'active' ? activeShipments : activeTab === 'org-admin' ? [] : completedShipments;

  const samplingRequested = shipments.filter(s => s.current_state === 'SAMPLING_REQUESTED').length;
  const inProgress = shipments.filter(s => ['PICKUP_SCHEDULED', 'SAMPLE_PICKED_UP', 'IN_TRANSIT'].includes(s.current_state)).length;

  const navItems = [
    { id: 'active', icon: '🚚', label: 'Active Pickups', count: activeShipments.length, tone: 'cyan' },
    { id: 'completed', icon: '✅', label: 'Completed', count: completedShipments.length, tone: 'green' },
  ];
  if (user?.is_org_admin) navItems.push({ id: 'org-admin', icon: '👥', label: 'Organisation', count: null, tone: 'green' });

  const kpis = [
    { label: 'Awaiting Pickup', value: samplingRequested, color: '#F5A623', icon: '📥' },
    { label: 'In Progress', value: inProgress, color: '#38C6FF', icon: '🚚' },
    { label: 'Completed', value: completedShipments.length, color: '#00C896', icon: '✅' },
    { label: 'Total Assigned', value: shipments.length, color: '#fff', icon: '📦' },
  ];

  const th = {padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'};
  const td = {padding:'13px 16px'};
  const isInspectorUser = user?.role === 'SFDA_INSPECTOR';

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#2D2B7A',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.6}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,170,255,.2);border-radius:2px}
        input:focus,textarea:focus,select:focus{border-color:rgba(0,170,255,.5)!important;outline:none}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2)}
        tr.row:hover td{background:rgba(0,170,255,.04)!important}
      `}</style>

      {/* ── Topbar ── */}
      <div style={{height:58,background:'#1E1A5E',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <img src="/logo_1.png" alt="DEMARA" style={{height:'38px', width:'auto'}} />
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>DEMARA Platform</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>DEMARA Masaar · Shipping Portal</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          <NotificationBell token={token} />
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0) || 'S'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>{isInspectorUser ? 'SFDA Inspector' : 'Shipping Agent'}</div></div>
            </div>
          )}
          <button onClick={onLogout} style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>Sign Out</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#252266',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          {/* KPI section */}
          <div style={{padding:'16px 14px',borderBottom:'1px solid rgba(0,170,255,.06)'}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Overview</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {kpis.map(k => (
                <div key={k.label} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.05)'}}>
                  <span style={{fontSize:14,flexShrink:0}}>{k.icon}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.5)',flex:1}}>{k.label}</span>
                  <span style={{fontSize:16,fontWeight:900,color:k.color,letterSpacing:'-0.5px'}}>{k.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div style={{padding:'12px 10px',flex:1}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:10,paddingLeft:4}}>Navigation</div>
            {navItems.map(n => {
              const on = activeTab === n.id;
              const color = TONES[n.tone][0];
              return (
                <button key={n.id} onClick={() => setActiveTab(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',marginBottom:3,fontFamily:'inherit',fontSize:12,fontWeight:on?700:500,
                  background:on?tint(n.tone,.12):'transparent',color:on?color:'rgba(255,255,255,.45)',border:on?`1px solid ${color}33`:'1px solid transparent',transition:'all .15s',textAlign:'left'}}>
                  <span style={{fontSize:15}}>{n.icon}</span>
                  <span style={{flex:1}}>{n.label}</span>
                  {n.count != null && n.count > 0 && (
                    <span style={{fontSize:10,fontWeight:700,background:on?color:'rgba(255,255,255,.1)',color:on?'#252266':'rgba(255,255,255,.5)',padding:'1px 7px',borderRadius:10}}>{n.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Refresh */}
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)'}}>
            <button onClick={fetchShipments} style={{width:'100%',padding:'9px',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.2)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={activeTab} style={{flex:1,overflowY:'auto',background:'#2D2B7A'}}>

          {/* Work queues: pending pickups, plus re-export loading and destruction witness for inspectors */}
          <div style={{display:'flex',flexDirection:'column',gap:12,padding:'16px 20px 0'}}>
            {samplingRequested > 0 && (
              <div style={alertCard('amber')}>
                <div style={alertTitle('amber')}>⚠️ Pending Sample Pickups</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {shipments.filter(s => s.current_state === 'SAMPLING_REQUESTED').map(s => (
                    <div key={s.id} style={S.listRow}>
                      <div>
                        <span style={{fontFamily:S.mono,fontSize:11,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                        <span style={{fontSize:11,color:'rgba(255,255,255,.45)',marginLeft:8}}>{s.importer_name}</span>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{s.port_of_entry}</div>
                        <div style={{fontSize:11,fontWeight:700,color:'#F5A623',marginTop:1}}>Waiting {Math.floor((new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60))}h</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user?.role === 'SFDA_INSPECTOR' && (
              <ReExportLoadingSection
                shipments={shipments.filter(s => s.current_state === 'RE_EXPORT_PERMIT_ISSUED')}
                token={token}
                onRefresh={fetchShipments}
              />
            )}

            {user?.role === 'SFDA_INSPECTOR' && (
              <DestructionWitnessSection
                shipments={shipments.filter(s => s.current_state === 'DESTRUCTION_SCHEDULED')}
                token={token}
                defaultWitness={user?.full_name}
                onRefresh={fetchShipments}
              />
            )}
          </div>

          {/* Org admin tab shows OrgAdminPanel instead of the table */}
          {activeTab === 'org-admin' && (
            <OrgAdminPanel token={token} />
          )}

          {/* Table */}
          {activeTab !== 'org-admin' && (
            <div style={{margin:'16px 20px 24px'}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{activeTab === 'active' ? 'Active Pickups' : 'Completed Pickups'}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2}}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
              </div>

              {error && <div style={{...S.error,marginBottom:12}}>{error}</div>}

              {loading ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.25)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                  <div style={{fontSize:14}}>Loading...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.2)'}}>
                  <div style={{fontSize:36,marginBottom:12}}>🚚</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6,color:'rgba(255,255,255,.4)'}}>No shipments in this queue</div>
                  <div style={{fontSize:12}}>
                    {activeTab === 'active' ? 'Pickup requests will appear here when a shipment is ready for sample collection' : 'Completed pickup assignments will appear here'}
                  </div>
                </div>
              ) : (
                <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'rgba(0,170,255,.04)'}}>
                        {['Faseh Reference', 'Importer', 'Port', 'Lab', 'Status', 'Since', 'Action'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => {
                        const info = STATE_INFO[s.current_state] || { label: s.current_state.replace(/_/g, ' '), tone: COMPLETED_TONE[s.current_state] || 'grey' };
                        return (
                          <tr key={s.id} className="row" style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                            <td style={td}>
                              <span style={{fontFamily:S.mono,fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                            </td>
                            <td style={td}>
                              <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.importer_name}</div>
                              <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>{s.shipment_country}</div>
                            </td>
                            <td style={td}><span style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{s.port_of_entry}</span></td>
                            <td style={td}><span style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{s.lab_name || '—'}</span></td>
                            <td style={td}>{badge(info.label, info.tone)}</td>
                            <td style={td}><span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{formatDate(s.state_entered_at)}</span></td>
                            <td style={td}>
                              {INSPECTOR_STATES.includes(s.current_state) && s.current_state !== 'LAB_RECEIVED' && (
                                <button onClick={() => setSelectedShipment(s)}
                                  style={{...smallBtn(s.current_state === 'SAMPLING_REQUESTED' ? 'amber' : 'cyan'),
                                    animation: s.current_state === 'SAMPLING_REQUESTED' ? 'glow 1.6s infinite' : 'none'}}>
                                  {s.current_state === 'SAMPLING_REQUESTED' ? '⚡ Act' : 'Update'}
                                </button>
                              )}
                              {s.current_state === 'LAB_RECEIVED' && (
                                <span style={{fontSize:11,color:'#00C896',fontWeight:600}}>✓ Done</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedShipment && (
        <SampleActionModal
          shipment={selectedShipment}
          token={token}
          isInspector={user?.role === 'SFDA_INSPECTOR'}
          onClose={() => setSelectedShipment(null)}
          onRefresh={() => {
            fetchShipments();
            setSelectedShipment(null);
          }}
        />
      )}
    </div>
  );
}