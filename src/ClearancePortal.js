import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import ClearanceDocuments from './ClearanceDocuments';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';

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

const STATE_TONE = {
  RECORD_OPENED: 'grey',
  LAB_ACCEPTED: 'grey',
  CLEARANCE_DECLINED: 'red',
  CLEARANCE_ACCEPTED: 'cyan',
  SAMPLING_REQUESTED: 'amber',
  IN_ANALYSIS: 'purple',
  CONFORMING: 'green',
  NON_CONFORMING: 'red',
  PARTIALLY_CONFORMING: 'amber',
  CLEARANCE_IN_PROGRESS: 'cyan',
  PARTIAL_CLEARANCE_IN_PROGRESS: 'cyan',
  BOND_RELEASED: 'cyan',
  DUTIES_PAID: 'cyan',
  FINAL_CLEARANCE: 'green',
  PARTIAL_FINAL_CLEARANCE: 'green',
  DECISION_OVERDUE: 'red',
  RE_EXPORT_INITIATED: 'red',
  RE_EXPORT_BOOKING_CONFIRMED: 'amber',
  RE_EXPORT_PERMIT_ISSUED: 'amber',
  RE_EXPORT_LOADED: 'amber',
  RE_EXPORT_COMPLETED: 'grey',
  DESTRUCTION_REQUESTED: 'red',
  SFDA_ORDERED_DESTRUCTION: 'red',
  DESTRUCTION_SCHEDULED: 'red',
  DESTRUCTION_IN_PROGRESS: 'red',
  DESTRUCTION_CERTIFICATE_ISSUED: 'amber',
  DESTRUCTION_CONFIRMED: 'grey',
};

function badge(state) {
  const tone = STATE_TONE[state] || 'grey';
  const color = TONES[tone][0];
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap',background:tint(tone,.1),color,border:`1px solid ${tint(tone,.3)}`}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}></span>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// Tinted notice panel for the waiting / completed states in the action modal
function Notice({ tone, title, large, children }) {
  return (
    <div style={{background:tint(tone,.06),border:`1px solid ${tint(tone,.22)}`,borderRadius:12,padding:'16px 18px',textAlign:'center'}}>
      <div style={{fontSize:large?15:13,fontWeight:700,color:TONES[tone][0]}}>{title}</div>
      {children}
    </div>
  );
}

// getNextAction() keeps its original colours; they are mapped to the dark palette at render time
const ACTION_TONE = { '#2D2B7A': 'cyan', '#00B4D8': 'cyan', '#10B981': 'green', '#EF4444': 'red' };

const S = {
  backdrop: {position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'},
  modalHead: {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'linear-gradient(180deg,rgba(0,170,255,.05),transparent)'},
  closeBtn: {width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'},
  ipt: {width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none'},
  lbl: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,display:'block'},
  section: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10},
  noticeText: {fontSize:12,color:'rgba(255,255,255,.55)',marginTop:5,lineHeight:1.5},
  noticeSub: {fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4},
  error: {background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470'},
  mono: 'JetBrains Mono,monospace',
};

// Destruction sub-flow, in order. The flow starts from either the MAH's choice or an SFDA order.
const DESTRUCTION_START_STATES = ['DESTRUCTION_REQUESTED', 'SFDA_ORDERED_DESTRUCTION'];
const DESTRUCTION_STEPS = ['DESTRUCTION_SCHEDULED', 'DESTRUCTION_IN_PROGRESS', 'DESTRUCTION_CERTIFICATE_ISSUED', 'DESTRUCTION_CONFIRMED'];
const destructionReached = (state, step) => DESTRUCTION_STEPS.indexOf(state) >= DESTRUCTION_STEPS.indexOf(step);

// A shipment whose history reaches one of these had a partially conforming SFDA decision
const PARTIAL_DECISION_STATES = ['PARTIALLY_CONFORMING', 'PARTIAL_CLEARANCE_IN_PROGRESS'];

// Re-export sub-flow, in order
const RE_EXPORT_STATES = ['RE_EXPORT_INITIATED', 'RE_EXPORT_BOOKING_CONFIRMED', 'RE_EXPORT_PERMIT_ISSUED', 'RE_EXPORT_LOADED', 'RE_EXPORT_COMPLETED'];
const reExportReached = (state, step) => RE_EXPORT_STATES.indexOf(state) >= RE_EXPORT_STATES.indexOf(step);

const CONFIDENCE_LEVELS = [
  { min: 80, label: 'HIGH', color: '#00C896' },
  { min: 50, label: 'MEDIUM', color: '#F5A623' },
  { min: 0, label: 'LOW', color: '#FF5470' },
];

// Read-only view of the MAH's document confirmation and AI score
function SubmissionConfidencePanel({ confirmedAt, score }) {
  const panel = { background: '#0D1940', border: '1px solid rgba(56,198,255,0.15)', borderRadius: '8px', padding: '12px 14px' };

  if (!confirmedAt) {
    return (
      <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}></span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Awaiting MAH document confirmation</span>
      </div>
    );
  }

  const level = CONFIDENCE_LEVELS.find(l => (score ?? 0) >= l.min);
  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Submission Confidence
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: level.color, background: `${level.color}1F`,
          border: `1px solid ${level.color}66`, borderRadius: '20px', padding: '2px 10px' }}>
          {level.label} · {score}/100
        </span>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
        Documents reviewed and confirmed by MAH on {formatDate(confirmedAt)}. AI validation score: {score}/100
      </div>
    </div>
  );
}

// Shipment detail and action modal
function ShipmentActionModal({ shipment, token, onClose, onRefresh }) {
  const [acting, setActing] = useState(false);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [confirmation, setConfirmation] = useState({
    at: shipment.document_confirmed_at,
    score: shipment.document_ai_score
  });
  // Whether SFDA's decision was partially conforming. After the bond step the state no longer
  // says so, so it is read from the audit log once the full shipment has loaded (null = not yet).
  const [isPartial, setIsPartial] = useState(
    PARTIAL_DECISION_STATES.includes(shipment.current_state) || shipment.current_state === 'PARTIAL_FINAL_CLEARANCE' ? true : null
  );

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipment.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.shipment) {
          setConfirmation({ at: data.shipment.document_confirmed_at, score: data.shipment.document_ai_score });
          setIsPartial(PARTIAL_DECISION_STATES.includes(data.shipment.current_state) ||
            (data.shipment.audit_log || []).some(log => PARTIAL_DECISION_STATES.includes(log.to_state)));
        }
        if (data.shipment && data.shipment.clearance_tasks && data.shipment.clearance_tasks.length > 0) {
          setTask(data.shipment.clearance_tasks[0]);
        }
      } catch (err) {
        console.error('Failed to fetch task');
      }
    };
    fetchTask();
  }, [shipment.id, token]);

  const performAction = async (action, requiresRef = false) => {
    if (requiresRef && !reference.trim()) {
      setError('Please enter a reference number or document number');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reference, notes })
      });
      const data = await res.json();
      if (data.success) {
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

  const getChecklist = () => {
    if (DESTRUCTION_START_STATES.includes(shipment.current_state) || DESTRUCTION_STEPS.includes(shipment.current_state)) {
      const st = shipment.current_state;
      return [
        { label: st === 'SFDA_ORDERED_DESTRUCTION' ? 'SFDA ordered destruction (no MAH response)' : 'Destruction requested',
          done: true, timestamp: null, reference: null },
        { label: shipment.destruction_scheduled_at
            ? `SFDA scheduled supervised destruction for ${formatDate(shipment.destruction_scheduled_at)}`
            : 'SFDA scheduled supervised destruction',
          done: destructionReached(st, 'DESTRUCTION_SCHEDULED'), timestamp: null, reference: shipment.destruction_reference },
        { label: shipment.destruction_witnessed_by
            ? `Inspector witnessed destruction (${shipment.destruction_witnessed_by})`
            : 'Inspector witnessed destruction',
          done: destructionReached(st, 'DESTRUCTION_IN_PROGRESS'), timestamp: null, reference: null },
        { label: 'SFDA destruction certificate issued', done: destructionReached(st, 'DESTRUCTION_CERTIFICATE_ISSUED'), timestamp: null, reference: null },
        { label: 'Destruction formally confirmed by DEMARA', done: st === 'DESTRUCTION_CONFIRMED', timestamp: task?.completed_at, reference: null },
      ];
    }
    if (RE_EXPORT_STATES.includes(shipment.current_state)) {
      const st = shipment.current_state;
      return [
        { label: 'Received SFDA non-conforming decision', done: true, timestamp: task?.notified_at, reference: null },
        { label: 'MAH selected re-export', done: true, timestamp: null, reference: null },
        { label: 'Re-export booking confirmed', done: reExportReached(st, 'RE_EXPORT_BOOKING_CONFIRMED'), timestamp: null, reference: shipment.re_export_reference },
        { label: 'SFDA re-export permit issued', done: reExportReached(st, 'RE_EXPORT_PERMIT_ISSUED'), timestamp: null, reference: null },
        { label: 'Inspector confirmed goods loaded at port', done: reExportReached(st, 'RE_EXPORT_LOADED'), timestamp: task?.completed_at, reference: null },
      ];
    }
    if (['NON_CONFORMING', 'PARTIALLY_CONFORMING', 'RE_EXPORT_INITIATED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_REQUESTED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state)) {
      return [
        { label: 'Received SFDA non-conforming decision', done: true, timestamp: task?.notified_at, reference: null },
        { label: 'MAH selected action (re-export or destruction)', done: ['RE_EXPORT_INITIATED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_REQUESTED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state), timestamp: null, reference: null },
        { label: 'Re-export or destruction completed', done: ['RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(shipment.current_state), timestamp: task?.completed_at, reference: null },
      ];
    }
    if (shipment.current_state === 'PARTIAL_CLEARANCE_IN_PROGRESS' || shipment.current_state === 'PARTIAL_FINAL_CLEARANCE' ||
        (isPartial && ['BOND_RELEASED', 'DUTIES_PAID'].includes(shipment.current_state))) {
      return [
        { label: 'Received SFDA partially conforming decision', done: true, timestamp: task?.notified_at, reference: null },
        { label: 'MAH selected actions for non-conforming products', done: true, timestamp: null, reference: null },
        { label: 'Conforming products — bond released', done: ['BOND_RELEASED', 'DUTIES_PAID', 'PARTIAL_FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.bond_released_at, reference: task?.bond_release_reference },
        { label: 'Conforming products — duties paid', done: ['DUTIES_PAID', 'PARTIAL_FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.duties_paid_at, reference: task?.duties_payment_reference },
        { label: 'Conforming products — final clearance', done: shipment.current_state === 'PARTIAL_FINAL_CLEARANCE', timestamp: task?.release_permit_at, reference: task?.release_permit_number },
      ];
    }
    if (shipment.current_state === 'CLEARANCE_ACCEPTED') {
      return [
        { label: 'Assignment accepted', done: true, timestamp: shipment.state_entered_at, reference: null },
        { label: 'Awaiting SFDA conforming decision', done: false, timestamp: null, reference: null },
        { label: 'Bond release', done: false, timestamp: null, reference: null },
        { label: 'Duties payment', done: false, timestamp: null, reference: null },
        { label: 'Final clearance', done: false, timestamp: null, reference: null },
      ];
    }
    return [
      { label: 'Received SFDA approval notification', done: true, timestamp: task?.notified_at, reference: null },
      { label: 'Clearance procedures initiated', done: ['CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.acknowledged_at, reference: null },
      { label: 'Customs bond released', done: ['BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.bond_released_at, reference: task?.bond_release_reference },
      { label: 'Customs duties paid', done: ['DUTIES_PAID', 'FINAL_CLEARANCE'].includes(shipment.current_state), timestamp: task?.duties_paid_at, reference: task?.duties_payment_reference },
      { label: 'Final clearance confirmed', done: shipment.current_state === 'FINAL_CLEARANCE', timestamp: task?.release_permit_at, reference: task?.release_permit_number },
    ];
  };

  const checklist = getChecklist();

  const getNextAction = () => {
    switch (shipment.current_state) {
      case 'CONFORMING':
        return { label: 'Start Clearance Procedures', action: 'ACKNOWLEDGE', requiresRef: false, color: '#2D2B7A' };
      case 'CLEARANCE_IN_PROGRESS':
        return { label: 'Confirm Bond Released', action: 'BOND_RELEASED', requiresRef: true, placeholder: 'Bond release reference number', color: '#00B4D8' };
      case 'BOND_RELEASED':
        return { label: 'Confirm Duties Paid', action: 'DUTIES_PAID', requiresRef: true, placeholder: 'SADAD payment reference or receipt number', color: '#00B4D8' };
      case 'DUTIES_PAID':
        if (isPartial === null) return null; // wait for the audit log before offering the final step
        return isPartial
          ? { label: 'Confirm Final Clearance for Conforming Products', action: 'PARTIAL_FINAL_CLEARANCE', requiresRef: true, placeholder: 'Release permit number', color: '#10B981' }
          : { label: 'Confirm Final Clearance', action: 'FINAL_CLEARANCE', requiresRef: true, placeholder: 'Release permit number', color: '#10B981' };
           case 'NON_CONFORMING':
      case 'PARTIALLY_CONFORMING':
        return null;
      case 'PARTIAL_CLEARANCE_IN_PROGRESS':
        return { label: 'Confirm Bond Released for Conforming Products', action: 'BOND_RELEASED', requiresRef: true, placeholder: 'Bond release reference number', color: '#00B4D8' };
      case 'RE_EXPORT_INITIATED':
        return { label: 'Confirm Re-export Booking', action: 'RE_EXPORT_BOOKING', requiresRef: true, placeholder: 'Shipping booking reference', color: '#EF4444' };
      // RE_EXPORT_BOOKING_CONFIRMED and RE_EXPORT_PERMIT_ISSUED wait on SFDA, not the clearance company
      // Destruction states wait on SFDA, the inspector and DEMARA — the clearance company only tracks them
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const actionTone = nextAction ? (ACTION_TONE[nextAction.color] || 'cyan') : 'cyan';
  const statusTone = shipment.current_state === 'CONFORMING' || shipment.current_state === 'FINAL_CLEARANCE' ? 'green'
    : shipment.current_state === 'NON_CONFORMING' ? 'red' : 'cyan';

  return (
    <div style={S.backdrop}>
      <div style={{background:'#0D1940',border:'1px solid rgba(0,170,255,.15)',borderRadius:18,width:'100%',maxWidth:680,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
        {/* Header */}
        <div style={S.modalHead}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:S.mono}}>{shipment.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{shipment.importer_name}</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>×</button>
        </div>

        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:16}}>
          {/* Status */}
          <div style={{display:'flex',alignItems:'center',gap:10,background:tint(statusTone,.06),border:`1px solid ${tint(statusTone,.2)}`,borderRadius:10,padding:'12px 14px'}}>
            {badge(shipment.current_state)}
            <span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Since {formatDate(shipment.state_entered_at)}</span>
          </div>

          {/* Shipment details */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              ['Faseh Reference', shipment.faseh_request_number, '#38C6FF', true],
              ['GHAD CR Number', shipment.ghad_cr_number, '#fff', false],
              ['Port of Entry', shipment.port_of_entry, '#fff', false],
              ['Country', shipment.shipment_country, '#fff', false],
            ].map(([label, value, color, mono]) => (
              <div key={label} style={{background:'rgba(0,170,255,.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:9,padding:'8px 12px'}}>
                <div style={S.lbl}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color,fontFamily:mono?S.mono:'inherit'}}>{value || '—'}</div>
              </div>
            ))}
          </div>

          <SubmissionConfidencePanel confirmedAt={confirmation.at} score={confirmation.score} />

          {/* Clearance checklist with timestamps and references */}
          <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:14}}>
            <div style={S.section}>Clearance Checklist</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {checklist.map((item, i) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 12px',borderRadius:9,
                  background:item.done?'rgba(0,200,150,.06)':'rgba(255,255,255,.02)',
                  border:`1px solid ${item.done?'rgba(0,200,150,.18)':'rgba(255,255,255,.06)'}`}}>
                  <span style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0,
                    background:item.done?'#00C896':'rgba(255,255,255,.08)',color:item.done?'#0D1940':'rgba(255,255,255,.35)'}}>
                    {item.done ? '✓' : i + 1}
                  </span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:item.done?'#00C896':'rgba(255,255,255,.45)'}}>{item.label}</div>
                    {item.done && item.timestamp && (
                      <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:3}}>Completed: {formatDate(item.timestamp)}</div>
                    )}
                    {item.done && item.reference && (
                      <div style={{fontSize:10,color:'#38C6FF',marginTop:3,fontWeight:600,fontFamily:S.mono}}>Ref: {item.reference}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next action */}
          {nextAction && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{...S.section,marginBottom:0}}>Next Action Required</div>
              {error && <div style={S.error}>{error}</div>}

              {nextAction.requiresRef && (
                <div>
                  <label style={S.lbl}>Reference Number / Document Number *</label>
                  <input type="text" value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder={nextAction.placeholder}
                    style={S.ipt} />
                </div>
              )}

              <div>
                <label style={S.lbl}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Any notes about this action..."
                  style={{...S.ipt,resize:'vertical'}} />
              </div>

              <button
                onClick={() => performAction(nextAction.action, nextAction.requiresRef)}
                disabled={acting}
                style={{width:'100%',padding:13,background:TONES[actionTone][0],color:'#0D1940',fontSize:13,fontWeight:800,borderRadius:10,border:'none',
                  cursor:acting?'default':'pointer',opacity:acting?.6:1,fontFamily:'inherit',boxShadow:`0 4px 20px ${tint(actionTone,.3)}`}}>
                {acting ? 'Processing...' : nextAction.label}
              </button>
            </div>
          )}

          {shipment.current_state === 'FINAL_CLEARANCE' && (
            <Notice tone="green" title="✓ Clearance Complete" large>
              <div style={S.noticeText}>All clearance steps completed successfully.</div>
              {task?.completed_at && (
                <div style={S.noticeSub}>Completed: {formatDate(task.completed_at)}</div>
              )}
            </Notice>
          )}

          {shipment.current_state === 'RE_EXPORT_BOOKING_CONFIRMED' && (
            <Notice tone="amber" title="⏳ Awaiting SFDA permit">
              <div style={S.noticeText}>Booking {shipment.re_export_reference} confirmed. SFDA will issue the re-export permit.</div>
            </Notice>
          )}

          {shipment.current_state === 'RE_EXPORT_PERMIT_ISSUED' && (
            <Notice tone="amber" title="⏳ Awaiting inspector confirmation">
              <div style={S.noticeText}>SFDA has issued the re-export permit. The inspector will confirm when goods are loaded at port.</div>
            </Notice>
          )}

          {(shipment.current_state === 'RE_EXPORT_LOADED' || shipment.current_state === 'RE_EXPORT_COMPLETED') && (
            <Notice tone="amber" title="🚢 Re-export complete" large>
              <div style={S.noticeText}>Goods have been loaded and re-exported out of Saudi Arabia.</div>
              {shipment.re_export_reference && (
                <div style={S.noticeSub}>Booking ref: {shipment.re_export_reference}</div>
              )}
            </Notice>
          )}

          {DESTRUCTION_START_STATES.includes(shipment.current_state) && (
            <Notice tone="red" title="⏳ Awaiting SFDA scheduling">
              <div style={S.noticeText}>SFDA will schedule a supervised destruction date.</div>
            </Notice>
          )}

          {shipment.current_state === 'DESTRUCTION_SCHEDULED' && (
            <Notice tone="red" title={`📅 Scheduled for ${formatDate(shipment.destruction_scheduled_at)}`}>
              <div style={S.noticeText}>Awaiting inspector witness · SFDA order {shipment.destruction_reference}</div>
            </Notice>
          )}

          {shipment.current_state === 'DESTRUCTION_IN_PROGRESS' && (
            <Notice tone="red" title="🔥 Destruction in progress — awaiting certificate">
              <div style={S.noticeText}>Witnessed by {shipment.destruction_witnessed_by}. SFDA will issue the destruction certificate.</div>
            </Notice>
          )}

          {shipment.current_state === 'DESTRUCTION_CERTIFICATE_ISSUED' && (
            <Notice tone="amber" title="📄 Certificate issued — awaiting admin confirmation">
              <div style={S.noticeText}>Update your records. DEMARA will formally confirm the destruction.</div>
            </Notice>
          )}

          {shipment.current_state === 'DESTRUCTION_CONFIRMED' && (
            <Notice tone="green" title="✓ Destruction formally confirmed" large>
              <div style={S.noticeText}>Goods have been destroyed under SFDA supervision and the record is closed.</div>
              {shipment.destruction_reference && (
                <div style={S.noticeSub}>SFDA order: {shipment.destruction_reference}</div>
              )}
            </Notice>
          )}

          {shipment.current_state === 'PARTIAL_FINAL_CLEARANCE' && (
            <Notice tone="green" title="✅ Partial Clearance Complete" large>
              <div style={S.noticeText}>Conforming products have been cleared. Non-conforming products are being handled separately.</div>
            </Notice>
          )}

          {shipment.current_state === 'NON_CONFORMING' && (
            <Notice tone="red" title="⚠️ Awaiting MAH Decision">
              <div style={S.noticeText}>The MAH has been notified and must select re-export or destruction.</div>
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Clearance Portal
export default function ClearancePortal({ user: initialUser, token, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [decliningShipment, setDecliningShipment] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [activeTab, setActiveTab] = useState('new');
const [documentsShipmentId, setDocumentsShipmentId] = useState(null);
  const [search, setSearch] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, meRes] = await Promise.all([
        fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const shipmentsData = await shipmentsRes.json();
      const meData = await meRes.json();
      setShipments(shipmentsData.shipments || []);
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
      if (!selectedShipment && !decliningShipment) {
        fetchShipments();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedShipment, decliningShipment]);

    const handleClearanceResponse = async (shipmentId, response, reason) => {
    try {
      const res = await fetch(`${API_URL}/shipments/${shipmentId}/clearance-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response, decline_reason: reason })
      });
      const data = await res.json();
      if (data.success) {
        fetchShipments();
        setDecliningShipment(null);
        setDeclineReason('');
        if (response === 'ACCEPTED') setActiveTab('pending');
        alert(data.message);
      }
    } catch (err) {
      console.error('Clearance response failed');
    }
  };

  const newAssignmentStates = ['RECORD_OPENED', 'LAB_ACCEPTED', 'CLEARANCE_DECLINED'];
  const pendingStates = ['CLEARANCE_ACCEPTED', 'CONFORMING', 'PARTIALLY_CONFORMING', 'PARTIAL_CLEARANCE_IN_PROGRESS', 'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID'];
  const alertStates = ['NON_CONFORMING', 'RE_EXPORT_INITIATED', 'RE_EXPORT_BOOKING_CONFIRMED', 'RE_EXPORT_PERMIT_ISSUED',
    'DESTRUCTION_REQUESTED', 'SFDA_ORDERED_DESTRUCTION', 'DESTRUCTION_SCHEDULED', 'DESTRUCTION_IN_PROGRESS', 'DESTRUCTION_CERTIFICATE_ISSUED'];
  const completedStates = ['FINAL_CLEARANCE', 'PARTIAL_FINAL_CLEARANCE', 'RE_EXPORT_LOADED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'];

  const newAssignmentShipments = shipments.filter(s => newAssignmentStates.includes(s.current_state));
  const pendingShipments = shipments.filter(s => pendingStates.includes(s.current_state));
  const alertShipments = shipments.filter(s => alertStates.includes(s.current_state));
  const completedShipments = shipments.filter(s => completedStates.includes(s.current_state));

  const filtered = (
    activeTab === 'new' ? newAssignmentShipments :
    activeTab === 'pending' ? pendingShipments :
    activeTab === 'alerts' ? alertShipments :
    activeTab === 'org-admin' ? [] :
    completedShipments
  ).filter(s =>
    !search ||
    s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
    s.importer_name.toLowerCase().includes(search.toLowerCase())
  );

  const navItems = [
    { id: 'new', icon: '📥', label: 'New Assignments', count: newAssignmentShipments.length, tone: 'amber' },
    { id: 'pending', icon: '⏳', label: 'Pending Clearance', count: pendingShipments.length, tone: 'cyan' },
    { id: 'alerts', icon: '⚠️', label: 'Non-Conforming', count: alertShipments.length, tone: 'red' },
    { id: 'completed', icon: '✅', label: 'Completed', count: completedShipments.length, tone: 'green' },
  ];
  if (user?.is_org_admin) navItems.push({ id: 'org-admin', icon: '👥', label: 'Organisation', count: null, tone: 'green' });

  const kpis = [
    { label: 'Total Assigned', value: shipments.length, color: '#fff', icon: '📦' },
    { label: 'New Assignments', value: newAssignmentShipments.length, color: '#F5A623', icon: '📥' },
    { label: 'Pending Clearance', value: pendingShipments.length, color: '#38C6FF', icon: '⏳' },
    { label: 'Non-Conforming', value: alertShipments.length, color: '#FF5470', icon: '⚠️' },
    { label: 'Completed', value: completedShipments.length, color: '#00C896', icon: '✅' },
  ];

  const tabTitle = { new: 'New Assignments', pending: 'Pending Clearance', alerts: 'Non-Conforming', completed: 'Completed Clearances' }[activeTab];
  const smallBtn = (tone) => ({background:tint(tone,.12),border:`1px solid ${tint(tone,.25)}`,color:TONES[tone][0],fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'});
  const th = {padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'};
  const td = {padding:'13px 16px'};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#0B1535',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
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
      <div style={{height:58,background:'#091230',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <div style={{width:78,height:44,borderRadius:8,overflow:'hidden',position:'relative',flexShrink:0,background:'#2E2C70',boxShadow:'0 0 0 1px rgba(56,198,255,.15)'}}><img src="/demara-logo.png" alt="DEMARA" style={{position:'absolute',width:'300%',height:'300%',left:'-100%',top:'-100%'}}/></div>
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>DEMARA Platform</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>DEMARA Masaar · Clearance Portal</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          <NotificationBell token={token} />
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0) || 'C'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>Clearance Company</div></div>
            </div>
          )}
          <button onClick={onLogout} style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>Sign Out</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#0D1940',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          {/* KPI section */}
          <div style={{padding:'16px 14px',borderBottom:'1px solid rgba(0,170,255,.06)'}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Overview</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {kpis.map(k => (
                <div key={k.label} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)'}}>
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
                    <span style={{fontSize:10,fontWeight:700,background:on?color:'rgba(255,255,255,.1)',color:on?'#0D1940':'rgba(255,255,255,.5)',padding:'1px 7px',borderRadius:10}}>{n.count}</span>
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
        <div key={activeTab} style={{flex:1,overflowY:'auto',background:'#0B1535'}}>

          {/* Org admin tab shows OrgAdminPanel instead of the table */}
          {activeTab === 'org-admin' && (
            <OrgAdminPanel token={token} />
          )}

          {activeTab !== 'org-admin' && (
            <div style={{margin:'16px 20px 24px'}}>
              {/* Section header + search */}
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{tabTitle}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2}}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
                </div>
                <input type="text" placeholder="🔍 Search reference or importer..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{...S.ipt,marginLeft:'auto',width:260}} />
              </div>

              {error && <div style={{...S.error,marginBottom:12}}>{error}</div>}

              {loading ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.25)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                  <div style={{fontSize:14}}>Loading shipments...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.2)'}}>
                  <div style={{fontSize:36,marginBottom:12}}>📦</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6,color:'rgba(255,255,255,.4)'}}>No shipments in this queue</div>
                  <div style={{fontSize:12}}>
                    {activeTab === 'new' ? 'New clearance assignments will appear here' :
                     activeTab === 'pending' ? 'Shipments will appear here when SFDA issues a conforming decision' :
                     activeTab === 'alerts' ? 'Non-conforming shipments requiring action will appear here' :
                     'Completed clearances will appear here'}
                  </div>
                </div>
              ) : (
                <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'rgba(0,170,255,.04)'}}>
                        {['Faseh Reference', 'Importer', 'Port', 'Status', 'Last Update', 'Action'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr key={s.id} className="row" style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                          <td style={{...td,borderLeft:`3px solid ${s.current_state === 'CONFORMING' ? '#00C896' : s.current_state === 'NON_CONFORMING' ? '#FF5470' : 'transparent'}`}}>
                            <span style={{fontFamily:S.mono,fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                          </td>
                          <td style={td}>
                            <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.importer_name}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>{s.shipment_country}</div>
                          </td>
                          <td style={td}><span style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{s.port_of_entry}</span></td>
                          <td style={td}>{badge(s.current_state)}</td>
                          <td style={td}><span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{formatDate(s.updated_at)}</span></td>
                          <td style={td}>
                            {newAssignmentStates.includes(s.current_state) && s.current_state !== 'CLEARANCE_DECLINED' ? (
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={() => handleClearanceResponse(s.id, 'ACCEPTED')} style={smallBtn('green')}>
                                  ✓ Accept
                                </button>
                                <button onClick={() => setDecliningShipment(s)} style={smallBtn('red')}>
                                  ✕ Decline
                                </button>
                              </div>
                            ) : s.current_state === 'CLEARANCE_DECLINED' ? (
                              <span style={{fontSize:11,color:'#FF5470',fontWeight:600}}>✕ Declined</span>
                            ) : (
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={() => setDocumentsShipmentId(s.id)} style={{...smallBtn('grey'),color:'rgba(255,255,255,.65)'}}>
                                  📁 Docs
                                </button>
                                <button onClick={() => setSelectedShipment(s)}
                                  style={{...smallBtn(s.current_state === 'CONFORMING' ? 'green' : s.current_state === 'NON_CONFORMING' ? 'red' : 'cyan'),
                                    animation: s.current_state === 'CONFORMING' ? 'glow 1.6s infinite' : 'none'}}>
                                  {s.current_state === 'CONFORMING' ? '⚡ Act Now' :
                                   s.current_state === 'NON_CONFORMING' ? '⚠ Handle' : 'Manage'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {documentsShipmentId && (
        <ClearanceDocuments
          shipmentId={documentsShipmentId}
          token={token}
          onClose={() => setDocumentsShipmentId(null)}
        />
      )}

      {/* ── Decline modal ── */}
      {decliningShipment && (
        <div style={S.backdrop}>
          <div style={{background:'#0D1940',border:'1px solid rgba(0,170,255,.15)',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 24px 80px rgba(0,0,0,.8)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)'}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>Decline Assignment</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{decliningShipment.faseh_request_number}</div>
              </div>
              <button onClick={() => { setDecliningShipment(null); setDeclineReason(''); }} style={S.closeBtn}>×</button>
            </div>
            <div style={{padding:'18px 22px'}}>
              <label style={S.lbl}>Reason for declining *</label>
              <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                rows={3} placeholder="Please provide a reason..."
                style={{...S.ipt,resize:'vertical'}} />
              <div style={{display:'flex',gap:10,marginTop:14}}>
                <button onClick={() => handleClearanceResponse(decliningShipment.id, 'DECLINED', declineReason)}
                  disabled={!declineReason.trim()}
                  style={{flex:1,padding:11,background:'rgba(255,84,112,.8)',border:'none',color:'#fff',fontSize:12,fontWeight:700,borderRadius:9,fontFamily:'inherit',
                    cursor:declineReason.trim()?'pointer':'default',opacity:declineReason.trim()?1:.5}}>
                  Confirm Decline
                </button>
                <button onClick={() => { setDecliningShipment(null); setDeclineReason(''); }}
                  style={{padding:'10px 16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:12,fontWeight:600,borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedShipment && (
        <ShipmentActionModal
          shipment={selectedShipment}
          token={token}
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
