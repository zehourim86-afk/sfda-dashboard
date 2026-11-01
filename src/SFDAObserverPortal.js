import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import SFDAObserverAssistant from './SFDAObserverAssistant';
import ShipmentTimeline from './ShipmentTimeline';
import NotificationBell from './NotificationBell';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

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
  SAMPLING_REQUESTED: 'amber',
  INSPECTOR_DISPATCHED: 'amber',
  SAMPLE_COLLECTED: 'amber',
  IN_TRANSIT_TO_LAB: 'amber',
  LAB_RECEIVED: 'purple',
  IN_ANALYSIS: 'purple',
  RESULT_SUBMITTED: 'cyan',
  CONFORMING: 'green',
  NON_CONFORMING: 'red',
  PARTIALLY_CONFORMING: 'amber',
  FINAL_CLEARANCE: 'green',
  RE_EXPORT_COMPLETED: 'grey',
  DESTRUCTION_CONFIRMED: 'grey',
  DECISION_PENDING: 'amber',
  DECISION_OVERDUE: 'red',
  SFDA_ORDERED_DESTRUCTION: 'red',
  RE_EXPORT_INITIATED: 'red',
  RE_EXPORT_BOOKING_CONFIRMED: 'amber',
  RE_EXPORT_PERMIT_ISSUED: 'amber',
  RE_EXPORT_LOADED: 'amber',
  DESTRUCTION_REQUESTED: 'red',
  DESTRUCTION_SCHEDULED: 'red',
  DESTRUCTION_IN_PROGRESS: 'red',
  DESTRUCTION_CERTIFICATE_ISSUED: 'amber',
};
// States that were solid / outlined badges in the old design stay more prominent
const STRONG_STATES = ['SFDA_ORDERED_DESTRUCTION', 'DECISION_OVERDUE', 'DECISION_PENDING'];

function badge(state) {
  const tone = STATE_TONE[state] || 'grey';
  const color = TONES[tone][0];
  const strong = STRONG_STATES.includes(state);
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:strong?700:600,whiteSpace:'nowrap',
      background:tint(tone,strong?.2:.1),color,border:`1px solid ${tint(tone,strong?.5:.3)}`}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}></span>
      {stateBadgeLabel(state)}
    </span>
  );
}

const S = {
  card: {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18},
  cardTitle: {fontSize:13,fontWeight:700,color:'#fff',marginBottom:3},
  cardSub: {fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:14},
  backdrop: {position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'},
  closeBtn: {width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'},
  ipt: {width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none',colorScheme:'dark'},
  lbl: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,display:'block'},
  section: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10},
  listRow: {display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,padding:'9px 12px'},
  error: {background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470'},
  mono: 'JetBrains Mono,monospace',
};
const smallBtn = (tone) => ({background:tint(tone,.12),border:`1px solid ${tint(tone,.25)}`,color:TONES[tone][0],fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0});

// Recharts styling for the dark background
const CHART = {
  grid: 'rgba(255,255,255,.06)',
  tick: {fontSize:10, fill:'rgba(255,255,255,.4)'},
  tooltip: {
    contentStyle: {background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,fontSize:12,color:'#fff'},
    itemStyle: {color:'#fff'},
    labelStyle: {color:'rgba(255,255,255,.6)'},
    cursor: {fill:'rgba(0,170,255,.06)'},
  },
};
// stateData keeps its original colours; they are mapped to the dark palette at render time
const PIE_COLOR = { '#10B981': '#00C896', '#00B4D8': '#38C6FF', '#EF4444': '#FF5470' };

const DESTRUCTION_TO_SCHEDULE = ['DESTRUCTION_REQUESTED', 'SFDA_ORDERED_DESTRUCTION'];

// SFDA_REVIEWER's action queue: re-export permits, destruction scheduling and destruction certificates.
// Certificates awaiting DEMARA admin confirmation are listed read-only.
function SfdaActionQueue({ shipments, token, onRefresh }) {
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);
  const [schedulingId, setSchedulingId] = useState(null);
  const [orderRef, setOrderRef] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const permits = shipments.filter(s => s.current_state === 'RE_EXPORT_BOOKING_CONFIRMED');
  const toSchedule = shipments.filter(s => DESTRUCTION_TO_SCHEDULE.includes(s.current_state));
  const certificates = shipments.filter(s => s.current_state === 'DESTRUCTION_IN_PROGRESS');
  const awaitingAdmin = shipments.filter(s => s.current_state === 'DESTRUCTION_CERTIFICATE_ISSUED');
  if (permits.length + toSchedule.length + certificates.length + awaitingAdmin.length === 0) return null;

  const act = async (shipment, body) => {
    setActingId(shipment.id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSchedulingId(null);
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

  const startScheduling = (s) => { setSchedulingId(s.id); setOrderRef(''); setScheduledAt(''); setError(null); };
  // datetime-local has no zone; new Date() reads it as the reviewer's local time
  const submitSchedule = (s) => act(s, {
    action: 'SCHEDULE_DESTRUCTION', reference: orderRef, scheduled_at: new Date(scheduledAt).toISOString()
  });

  const hl = {fontWeight:600,color:'rgba(255,255,255,.75)'};
  const row = (s, detail, button) => (
    <div key={s.id} style={S.listRow}>
      <div style={{minWidth:0}}>
        <span style={{fontFamily:S.mono,fontSize:11,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
        <span style={{fontSize:11,color:'rgba(255,255,255,.45)',marginLeft:8}}>{s.importer_name}</span>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:3}}>{detail}</div>
      </div>
      {button}
    </div>
  );
  const actionButton = (s, label, busyLabel, onClick, tone = 'cyan') => (
    <button onClick={onClick} disabled={actingId === s.id}
      style={{...smallBtn(tone),opacity:actingId === s.id ? .5 : 1}}>
      {actingId === s.id ? busyLabel : label}
    </button>
  );
  const groupTitle = (text) => <div style={{...S.section,marginTop:14,marginBottom:8}}>{text}</div>;
  const scheduleReady = actingId !== schedulingId && orderRef.trim() && scheduledAt;

  return (
    <div style={{background:tint('amber',.05),border:`1px solid ${tint('amber',.25)}`,borderRadius:14,padding:'16px 18px'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#F5A623'}}>⚖️ SFDA Actions Required</div>
      {error && <div style={{...S.error,marginTop:10}}>{error}</div>}

      {permits.length > 0 && <>
        {groupTitle(`🚢 Re-export permits awaiting issue (${permits.length})`)}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {permits.map(s => row(s,
            <>Booking ref: <span style={{...hl,fontFamily:S.mono}}>{s.re_export_reference || '—'}</span>{' · '}confirmed {formatDate(s.state_entered_at)}</>,
            actionButton(s, 'Issue Re-export Permit', 'Issuing...', () => act(s, { action: 'RE_EXPORT_PERMIT' }))
          ))}
        </div>
      </>}

      {toSchedule.length > 0 && <>
        {groupTitle(`🗓 Destructions to schedule (${toSchedule.length})`)}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {toSchedule.map(s => (
            <div key={s.id}>
              {row(s,
                s.current_state === 'SFDA_ORDERED_DESTRUCTION' ? 'Ordered by SFDA after MAH non-response' : 'MAH selected destruction',
                schedulingId === s.id ? null : actionButton(s, 'Schedule Destruction', 'Scheduling...', () => startScheduling(s), 'red')
              )}
              {schedulingId === s.id && (
                <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',gap:10,marginTop:4,padding:'12px',background:tint('red',.04),border:`1px solid ${tint('red',.18)}`,borderRadius:9}}>
                  <div>
                    <label style={S.lbl}>SFDA order reference *</label>
                    <input type="text" value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder="e.g. SFDA-DO-2026-0142"
                      style={{...S.ipt,width:200}} />
                  </div>
                  <div>
                    <label style={S.lbl}>Destruction date &amp; time *</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                      style={{...S.ipt,width:210}} />
                  </div>
                  <button onClick={() => submitSchedule(s)} disabled={actingId === s.id || !orderRef.trim() || !scheduledAt}
                    style={{...smallBtn('red'),padding:'8px 14px',opacity:scheduleReady ? 1 : .5}}>
                    {actingId === s.id ? 'Scheduling...' : 'Confirm Schedule'}
                  </button>
                  <button onClick={() => setSchedulingId(null)}
                    style={{...smallBtn('grey'),padding:'8px 14px',color:'rgba(255,255,255,.6)'}}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </>}

      {certificates.length > 0 && <>
        {groupTitle(`📄 Destruction certificates to issue (${certificates.length})`)}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {certificates.map(s => row(s,
            <>Witnessed by <span style={hl}>{s.destruction_witnessed_by || '—'}</span>{' · '}SFDA order <span style={{fontFamily:S.mono}}>{s.destruction_reference || '—'}</span></>,
            actionButton(s, 'Issue Destruction Certificate', 'Issuing...', () => act(s, { action: 'ISSUE_DESTRUCTION_CERT' }))
          ))}
        </div>
      </>}

      {awaitingAdmin.length > 0 && <>
        {groupTitle(`⏳ Certificates issued — pending DEMARA admin confirmation (${awaitingAdmin.length})`)}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {awaitingAdmin.map(s => row(s,
            <>Certificate issued {formatDate(s.state_entered_at)}{' · '}SFDA order <span style={{fontFamily:S.mono}}>{s.destruction_reference || '—'}</span></>,
            <span style={{fontSize:11,color:'#F5A623',fontWeight:600,flexShrink:0}}>Pending admin</span>
          ))}
        </div>
      </>}
    </div>
  );
}

// Badge text overrides; other states show their name with spaces.
const STATE_BADGE_LABELS = {
  DECISION_PENDING: '⏳ Awaiting SFDA Decision',
};

function stateBadgeLabel(state) {
  return STATE_BADGE_LABELS[state] || state.replace(/_/g, ' ');
}

const CHART_COLORS = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444'];

export default function SFDAObserverPortal({ user, token, onLogout }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterPort, setFilterPort] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [timelineShipmentId, setTimelineShipmentId] = useState(null);
  const [labPerformance, setLabPerformance] = useState([]);
  const [labPerformanceLoading, setLabPerformanceLoading] = useState(true);

  // Live per-lab metrics. On failure, fall back to the empty-state message.
  useEffect(() => {
    let cancelled = false;
    const fetchLabPerformance = async () => {
      try {
        const res = await fetch(`${API_URL}/analytics/lab-performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!cancelled) setLabPerformance(Array.isArray(data.labs) ? data.labs : []);
      } catch (err) {
        if (!cancelled) setLabPerformance([]);
      } finally {
        if (!cancelled) setLabPerformanceLoading(false);
      }
    };
    fetchLabPerformance();
    return () => { cancelled = true; };
  }, [token]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/shipments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setShipments(data.shipments || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(fetchShipments, 30000);
    return () => clearInterval(interval);
  }, []);

  const total = shipments.length;
  const cleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const conforming = shipments.filter(s => ['CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state)).length;
  const nonConforming = shipments.filter(s => ['NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)).length;
  const inProgress = shipments.filter(s => !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state)).length;
  const conformityRate = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const avgDwellMinutes = shipments.filter(s => s.total_dwell_minutes)
    .reduce((acc, s, _, arr) => acc + s.total_dwell_minutes / arr.length, 0);
  const avgDwellDays = avgDwellMinutes > 0 ? (avgDwellMinutes / 1440).toFixed(1) : '—';

  const stuckShipments = shipments.filter(s => {
    const hoursInState = (new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60);
    return hoursInState > 48 && !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state);
  });

  const countryNonConformityData = Object.entries(
    shipments.reduce((acc, s) => {
      if (!acc[s.shipment_country]) acc[s.shipment_country] = { total: 0, nonConforming: 0 };
      acc[s.shipment_country].total++;
      if (['NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)) {
        acc[s.shipment_country].nonConforming++;
      }
      return acc;
    }, {})
  ).map(([name, data]) => ({
    name,
    rate: data.total > 0 ? Math.round((data.nonConforming / data.total) * 100) : 0
  })).filter(d => d.rate > 0);

  const portData = Object.entries(
    shipments.reduce((acc, s) => {
      const port = s.port_of_entry?.split(' - ')[0]?.replace('King ', '') || 'Unknown';
      acc[port] = (acc[port] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const stateData = [
    { name: 'Cleared', value: cleared, color: '#10B981' },
    { name: 'In Progress', value: inProgress, color: '#00B4D8' },
    { name: 'Non-Conforming', value: nonConforming, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
      s.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !filterState || s.current_state === filterState;
    const matchCountry = !filterCountry || s.shipment_country === filterCountry;
    const matchPort = !filterPort || s.port_of_entry === filterPort;
    const matchDateFrom = !filterDateFrom || new Date(s.created_at) >= new Date(filterDateFrom);
    const matchDateTo = !filterDateTo || new Date(s.created_at) <= new Date(filterDateTo + 'T23:59:59');
    return matchSearch && matchState && matchCountry && matchPort && matchDateFrom && matchDateTo;
  });

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview', count: null, tone: 'cyan' },
    { id: 'shipments', icon: '📦', label: 'All Shipments', count: total, tone: 'cyan' },
    { id: 'assistant', icon: '🔍', label: 'Intelligence', count: null, tone: 'purple' },
  ];

  const kpis = [
    { label: 'Total Shipments', value: total, color: '#fff', icon: '📦' },
    { label: 'In Progress', value: inProgress, color: '#38C6FF', icon: '⚡' },
    { label: 'Non-Conforming', value: nonConforming, color: '#FF5470', icon: '⚠️' },
    { label: 'Delayed >48h', value: stuckShipments.length, color: '#F5A623', icon: '⏱' },
  ];

  const metrics = [
    { label: 'Total Shipments', value: total, color: '#fff', sub: 'All records on platform', icon: '📦' },
    { label: 'In Progress', value: inProgress, color: '#38C6FF', sub: 'Not yet closed', icon: '⚡' },
    { label: 'Clearance Rate', value: `${conformityRate}%`, color: '#00C896', sub: `${cleared} of ${total} cleared`, icon: '✅' },
    { label: 'Non-Conforming', value: nonConforming, color: '#FF5470', sub: 'Incl. re-exported / destroyed', icon: '⚠️' },
    { label: 'Avg Dwell', value: avgDwellDays, color: '#a78bfa', sub: 'Days in clearance', icon: '⏱' },
  ];

  const th = {padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'};
  const td = {padding:'13px 16px'};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#2D2B7A',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,170,255,.2);border-radius:2px}
        input:focus,textarea:focus,select:focus{border-color:rgba(0,170,255,.5)!important;outline:none}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2)}
        select option{background:#332E8A;color:#fff}
        tr.row:hover td{background:rgba(0,170,255,.04)!important}
        .hov:hover{background:rgba(0,170,255,.07)!important;border-color:rgba(0,170,255,.2)!important}
      `}</style>

      {/* ── Topbar ── */}
      <div style={{height:58,background:'#1E1A5E',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <img src="/logo_1.png" alt="DEMARA" style={{height:'52px', width:'auto', display:'block', objectFit:'contain'}} />
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>DEMARA Platform</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>DEMARA Masaar · SFDA Observer</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          <NotificationBell token={token} />
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0) || 'S'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>SFDA</div></div>
            </div>
          )}
          <button onClick={onLogout} style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>Sign Out</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#2D2B7A',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
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

          {/* Read-only notice + refresh */}
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:10,lineHeight:1.5,color:'rgba(255,255,255,.4)',background:'rgba(0,170,255,.05)',border:'1px solid rgba(0,170,255,.12)',borderRadius:9,padding:'9px 10px'}}>
              <span style={{color:'#38C6FF',fontWeight:700}}>🔒 Read-only access</span><br/>
              Full visibility into import clearance operations. The only actions available are re-export permits and supervised destruction steps.
            </div>
            <button onClick={fetchShipments} style={{width:'100%',padding:'9px',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.2)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={activeTab} style={{flex:1,overflowY:'auto',background:'#2D2B7A'}}>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
              {user?.role === 'SFDA_REVIEWER' && (
                <SfdaActionQueue shipments={shipments} token={token} onRefresh={fetchShipments} />
              )}

              {/* Key metrics */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                {metrics.map(m => (
                  <div key={m.label} style={{...S.card,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.color},transparent)`}}></div>
                    <div style={{fontSize:20,marginBottom:8}}>{m.icon}</div>
                    <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>{m.label}</div>
                    <div style={{fontSize:30,fontWeight:900,color:m.color,lineHeight:1,letterSpacing:'-1px',marginBottom:4}}>{m.value}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.25)'}}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={S.card}>
                  <div style={S.cardTitle}>Clearance Status Distribution</div>
                  <div style={S.cardSub}>Cleared vs in progress vs non-conforming</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stateData} cx="50%" cy="50%" outerRadius={64} stroke="#2D2B7A"
                        dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                        {stateData.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLOR[entry.color] || entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...CHART.tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>Shipments by Port</div>
                  <div style={S.cardSub}>Entry points across the Kingdom</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={portData} margin={{top: 8, right: 16, left: 0, bottom: 8}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="name" tick={CHART.tick} angle={-25} textAnchor="end" height={64} interval={0} stroke={CHART.grid} />
                      <YAxis tick={CHART.tick} allowDecimals={false} stroke={CHART.grid} />
                      <Tooltip {...CHART.tooltip} />
                      <Bar dataKey="value" fill="#38C6FF" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stuck shipments alert */}
              {stuckShipments.length > 0 && (
                <div style={{background:tint('red',.05),border:`1px solid ${tint('red',.22)}`,borderRadius:14,padding:'16px 18px'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#FF5470',marginBottom:12}}>
                    ⚠️ Shipments Delayed — Same State Over 48 Hours ({stuckShipments.length})
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {stuckShipments.map(s => (
                      <div key={s.id} style={S.listRow}>
                        <div>
                          <span style={{fontFamily:S.mono,fontSize:11,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                          <span style={{fontSize:11,color:'rgba(255,255,255,.45)',marginLeft:8}}>{s.importer_name}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          {badge(s.current_state)}
                          <span style={{fontSize:11,fontWeight:800,color:'#FF5470',whiteSpace:'nowrap'}}>
                            {Math.floor((new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60))}h stuck
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-conformity by country */}
              {countryNonConformityData.length > 0 && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Non-Conformity Rate by Country of Origin</div>
                  <div style={S.cardSub}>Share of each country's shipments that failed</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={countryNonConformityData} layout="vertical" margin={{left: 40}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis type="number" tick={CHART.tick} unit="%" domain={[0, 100]} stroke={CHART.grid} />
                      <YAxis type="category" dataKey="name" tick={CHART.tick} width={60} stroke={CHART.grid} />
                      <Tooltip {...CHART.tooltip} formatter={(value) => `${value}%`} />
                      <Bar dataKey="rate" fill="#FF5470" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Lab performance comparison */}
              <div style={S.card}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Lab Network Performance</div>
                  <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.8px',color:'#00C896',
                    background:'rgba(0,200,150,0.1)',border:'1px solid rgba(0,200,150,0.3)',
                    borderRadius:'10px',padding:'2px 8px'}}>
                    LIVE DATA
                  </span>
                </div>
                {labPerformanceLoading ? (
                  <div style={{fontSize:12,color:'rgba(255,255,255,.3)',padding:'24px 0',textAlign:'center'}}>Loading lab performance...</div>
                ) : labPerformance.length === 0 ? (
                  <div style={{fontSize:12,color:'rgba(255,255,255,.3)',padding:'24px 0',textAlign:'center'}}>
                    No lab performance data yet — data will appear as shipments are processed
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    {labPerformance.map(lab => (
                      <div key={lab.lab_id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'12px 14px'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:10}}>{lab.lab_name}</div>
                        {[
                          ['Assigned', lab.total_assigned, '#fff'],
                          ['Completed', lab.completed, '#00C896'],
                          ['Pending', lab.pending, '#F5A623'],
                          ['Avg turnaround', lab.avg_turnaround_hours != null ? `${lab.avg_turnaround_hours}h` : '—', '#38C6FF'],
                          ['Conformity', lab.conformity_rate != null ? `${lab.conformity_rate}%` : '—', '#a78bfa'],
                        ].map(([label, value, color]) => (
                          <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                            <span style={{fontSize:11,color:'rgba(255,255,255,.45)'}}>{label}</span>
                            <span style={{fontSize:12,fontWeight:700,color}}>{value}</span>
                          </div>
                        ))}
                        <div style={{width:'100%',height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden',marginTop:8}} title="Completed of assigned">
                          <div style={{
                            height:'100%',borderRadius:3,
                            width: `${lab.total_assigned > 0 ? Math.round((lab.completed / lab.total_assigned) * 100) : 0}%`,
                            background: '#38C6FF'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In progress shipments */}
              {inProgress > 0 && (
                <div style={S.card}>
                  <div style={{...S.cardTitle,marginBottom:12}}>⚡ Shipments Currently In Progress</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {shipments.filter(s => !['FINAL_CLEARANCE', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED', 'ARCHIVED'].includes(s.current_state)).map(s => (
                      <div key={s.id} className="hov"
                        onClick={() => { setSelectedShipment(s); setActiveTab('shipments'); }}
                        style={{...S.listRow,padding:'11px 14px',cursor:'pointer',transition:'all .15s'}}>
                        <div>
                          <span style={{fontFamily:S.mono,fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                          <span style={{fontSize:12,color:'rgba(255,255,255,.45)',marginLeft:12}}>{s.importer_name}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{s.port_of_entry}</span>
                          {badge(s.current_state)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Intelligence Tab */}
          {activeTab === 'assistant' && (
            <div style={{padding:'24px',height:'calc(100vh - 58px)'}}>
              <SFDAObserverAssistant token={token} />
            </div>
          )}

          {/* Shipments Tab */}
          {activeTab === 'shipments' && (
            <div style={{margin:'16px 20px 24px'}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>All Shipments</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2}}>{filtered.length} of {total} record{total !== 1 ? 's' : ''} · click a row for its timeline</div>
              </div>

              {/* Filters */}
              <div style={{...S.card,padding:14,marginBottom:14}}>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
                  <input type="text" placeholder="🔍 Search by Faseh number or importer..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={S.ipt} />
                  <select value={filterState} onChange={e => setFilterState(e.target.value)}
                    style={{...S.ipt,cursor:'pointer'}}>
                    <option value="">All States</option>
                    <option value="RECORD_OPENED">Record Opened</option>
                    <option value="SAMPLING_REQUESTED">Sampling Requested</option>
                    <option value="IN_ANALYSIS">In Analysis</option>
                    <option value="RESULT_SUBMITTED">Result Submitted</option>
                    <option value="DECISION_PENDING">Awaiting SFDA Decision</option>
                    <option value="CONFORMING">Conforming</option>
                    <option value="NON_CONFORMING">Non-Conforming</option>
                    <option value="PARTIALLY_CONFORMING">Partially Conforming</option>
                    <option value="FINAL_CLEARANCE">Final Clearance</option>
                    <option value="RE_EXPORT_COMPLETED">Re-Export Completed</option>
                  </select>
                  <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                    style={{...S.ipt,cursor:'pointer'}}>
                    <option value="">All Countries</option>
                    {[...new Set(shipments.map(s => s.shipment_country))].sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select value={filterPort} onChange={e => setFilterPort(e.target.value)}
                    style={{...S.ipt,cursor:'pointer'}}>
                    <option value="">All Ports</option>
                    {[...new Set(shipments.map(s => s.port_of_entry))].sort().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{...S.lbl,marginBottom:0}}>Created</span>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    style={{...S.ipt,width:160}} />
                  <span style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>to</span>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    style={{...S.ipt,width:160}} />
                  <button onClick={() => { setFilterState(''); setFilterCountry(''); setFilterPort(''); setFilterDateFrom(''); setFilterDateTo(''); setSearch(''); }}
                    style={{...smallBtn('grey'),marginLeft:'auto',padding:'8px 14px',color:'rgba(255,255,255,.6)'}}>
                    Clear Filters
                  </button>
                  <button onClick={fetchShipments}
                    style={{...smallBtn('cyan'),padding:'8px 14px'}}>
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.25)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                  <div style={{fontSize:14}}>Loading...</div>
                </div>
              ) : (
                <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'rgba(0,170,255,.04)'}}>
                        {['Faseh Reference', 'Importer', 'Country', 'Port', 'Lab', 'Status', 'Last Update', 'View'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr key={s.id} className="row" style={{cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.04)'}} onClick={() => setTimelineShipmentId(s.id)}>
                          <td style={td}>
                            <span style={{fontFamily:S.mono,fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span>
                          </td>
                          <td style={td}>
                            <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.importer_name}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>{s.ghad_cr_number}</div>
                          </td>
                          <td style={td}><span style={{fontSize:12,color:'rgba(255,255,255,.55)'}}>{s.shipment_country}</span></td>
                          <td style={td}><span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{s.port_of_entry}</span></td>
                          <td style={td}><span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{s.lab_name || '—'}</span></td>
                          <td style={td}>{badge(s.current_state)}</td>
                          <td style={td}><span style={{fontSize:11,color:'rgba(255,255,255,.35)',whiteSpace:'nowrap'}}>{formatDate(s.updated_at)}</span></td>
                          <td style={td}>
                            <button onClick={() => setSelectedShipment(s)}
                              style={smallBtn('cyan')}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div style={{textAlign:'center',padding:'40px 0',fontSize:12,color:'rgba(255,255,255,.3)'}}>No shipments match these filters</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shipment detail modal — read only */}
      {selectedShipment && (
        <ShipmentDetailReadOnly
          shipment={selectedShipment}
          token={token}
          onClose={() => setSelectedShipment(null)}
        />
      )}
      {timelineShipmentId && (
        <ShipmentTimeline
          shipmentId={timelineShipmentId}
          token={token}
          onClose={() => setTimelineShipmentId(null)}
        />
      )}
    </div>
  );
}

function ShipmentDetailReadOnly({ shipment, token, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipment.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setDetail(data.shipment);
      } catch (err) {
        console.error('Failed to fetch shipment detail');
      }
    };
    fetchDetail();
  }, [shipment.id]);

  if (!detail) return (
    <div style={S.backdrop}>
      <div style={{background:'#332E8A',border:'1px solid rgba(0,170,255,.15)',borderRadius:14,padding:'28px 36px',fontSize:13,color:'rgba(255,255,255,.5)'}}>Loading...</div>
    </div>
  );

  const statusTone = detail.current_state === 'FINAL_CLEARANCE' ? 'green' : detail.current_state === 'NON_CONFORMING' ? 'red' : 'cyan';
  const decisionTone = (d) => d === 'APPROVED' ? 'green' : d === 'REJECTED' ? 'red' : 'grey';
  const sourceColor = (src) => src === 'EMAIL_PARSER' ? '#38C6FF' : src === 'SYSTEM' ? '#a78bfa' : '#00C896';

  return (
    <div style={S.backdrop}>
      <div style={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:18,width:'100%',maxWidth:860,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'linear-gradient(180deg,rgba(0,170,255,.05),transparent)'}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#fff',fontFamily:S.mono}}>{detail.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{detail.importer_name}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'.8px',color:'#38C6FF',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.3)',borderRadius:20,padding:'3px 10px'}}>READ ONLY</span>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_URL}/shipments/${detail.id}/dwell-report`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-trail-${detail.faseh_request_number}.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Export failed');
                }
              }}
              style={{...smallBtn('cyan'),padding:'7px 12px'}}>
              📄 Export Audit Trail
            </button>
            <button onClick={onClose} style={S.closeBtn}>×</button>
          </div>
        </div>

        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:18}}>
          {/* Status */}
          <div style={{display:'flex',alignItems:'center',gap:10,background:tint(statusTone,.06),border:`1px solid ${tint(statusTone,.2)}`,borderRadius:10,padding:'12px 14px'}}>
            {badge(detail.current_state)}
            <span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Since {formatDate(detail.state_entered_at)}</span>
          </div>

          {/* Details */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              ['Faseh Reference', detail.faseh_request_number, '#38C6FF', true],
              ['GHAD CR Number', detail.ghad_cr_number, '#fff', false],
              ['Importer', detail.importer_name, '#fff', false],
              ['Country', detail.shipment_country, '#fff', false],
              ['Port of Entry', detail.port_of_entry, '#fff', false],
              ['QC Lab', detail.lab_name || '—', '#fff', false],
            ].map(([label, value, color, mono]) => (
              <div key={label} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 14px'}}>
                <div style={{...S.lbl,fontSize:9}}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color,fontFamily:mono?S.mono:'inherit'}}>{value}</div>
              </div>
            ))}
            {detail.total_dwell_minutes && (
              <div style={{gridColumn:'1 / -1',background:tint('green',.06),border:`1px solid ${tint('green',.2)}`,borderRadius:10,padding:'10px 14px'}}>
                <div style={{...S.lbl,fontSize:9}}>Total Dwell Time</div>
                <div style={{fontSize:18,fontWeight:800,color:'#00C896'}}>
                  {Math.floor(detail.total_dwell_minutes / 1440)} days {Math.floor((detail.total_dwell_minutes % 1440) / 60)} hours
                </div>
              </div>
            )}
          </div>

          {/* Products */}
          {detail.products && detail.products.length > 0 && (
            <div>
              <div style={S.section}>Products ({detail.products.length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {detail.products.map(p => (
                  <div key={p.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{p.product_name_en}</div>
                      <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0,
                        color:TONES[decisionTone(p.current_decision)][0],background:tint(decisionTone(p.current_decision),.1),border:`1px solid ${tint(decisionTone(p.current_decision),.3)}`}}>
                        {p.current_decision}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:16,marginTop:4,flexWrap:'wrap'}}>
                      {p.ecos_ma_number && <span style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>E-Cosma: {p.ecos_ma_number}</span>}
                      {p.batch_number && <span style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>Batch: {p.batch_number}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {detail.audit_log && detail.audit_log.length > 0 && (
            <div>
              <div style={S.section}>Complete Audit Trail</div>
              <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:256,overflowY:'auto'}}>
                {detail.audit_log.map(log => (
                  <div key={log.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.04)',borderRadius:8}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:sourceColor(log.trigger_source),marginTop:5,flexShrink:0}}></span>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.8)'}}>{log.from_state} → {log.to_state}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:1}}>{log.trigger_event}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.25)',marginTop:1}}>{log.trigger_source} · {formatDate(log.occurred_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
