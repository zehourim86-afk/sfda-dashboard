import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
// Dark theme helpers: hover / disabled / divider states can't be inline styles
const DARK_CSS = `
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  *{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(0,170,255,.2);border-radius:2px}
  input:focus,textarea:focus,select:focus{border-color:rgba(0,170,255,.5)!important;outline:none}
  input::placeholder,textarea::placeholder{color:rgba(255,255,255,.25)}
  select option{background:#252266;color:#fff}
  .dv>*+*{border-top:1px solid rgba(255,255,255,.05)}
  .hv-bg{transition:background .15s}
  .hv-bg:hover{background:rgba(0,170,255,.06)!important}
  .hv-op:hover{opacity:.9}
  .hv-dk:hover{filter:brightness(.9)}
  .hv-tx:hover{color:#fff!important}
  .hv-ul:hover{text-decoration:underline}
  .ds:disabled{opacity:.5;cursor:not-allowed}
`;

const API_URL = 'http://localhost:3000/api/v1';

const STATE_COLORS = {
  SUBMITTED: {background:'rgba(0,170,255,.14)',color:'#38C6FF'},
  ROUTING: {background:'rgba(0,170,255,.14)',color:'#38C6FF'},
  GOODS_HELD: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  LAB_ASSIGNED: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  SAMPLING: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  SAMPLE_B_STORED: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  SAMPLING_HANDOVER: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  IN_TRANSIT: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  LAB_RECEIVED: {background:'rgba(124,92,252,.14)',color:'#a78bfa'},
  IN_ANALYSIS: {background:'rgba(124,92,252,.14)',color:'#a78bfa'},
  RESULT_READY: {background:'rgba(0,200,150,.14)',color:'#00C896'},
  UNDER_REVIEW: {background:'rgba(255,84,112,.14)',color:'#FF5470'},
  DECISION_PASS: {background:'rgba(0,200,150,.14)',color:'#00C896'},
  DECISION_FAIL: {background:'rgba(255,84,112,.14)',color:'#FF5470'},
  INVOICE_ISSUED: {background:'rgba(124,92,252,.14)',color:'#a78bfa'},
  PAYMENT_PENDING: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
  PAYMENT_CONFIRMED: {background:'rgba(0,200,150,.14)',color:'#00C896'},
  RELEASE_TRIGGERED: {background:'rgba(0,200,150,.14)',color:'#00C896'},
  RELEASED: {background:'rgba(255,255,255,.07)',color:'#fff'},
  RE_EXPORT_INITIATED: {background:'rgba(255,84,112,.14)',color:'#FF5470'},
};

const CHART_COLORS = ['#38C6FF', '#00C896', '#F5A623', '#FF5470', '#a78bfa', '#22D3EE'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getSLAStatus(slaDeadline, slaBreached) {
  if (!slaDeadline) return null;
  if (slaBreached) return { label: 'BREACHED', color: {color:'#FF5470',fontWeight:700} };
  const remaining = new Date(slaDeadline) - new Date();
  if (remaining < 0) return { label: 'BREACHED', color: {color:'#FF5470',fontWeight:700} };
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 60) return { label: `${minutes}m left`, color: {color:'#FF5470'} };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours}h left`, color: {color:'#F5A623'} };
  return { label: `${Math.floor(hours / 24)}d left`, color: {color:'#00C896'} };
}

function TraceModal({ trace, onClose }) {
  if (!trace) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
      <div style={{background:'#252266',borderRadius:12,boxShadow:'0 32px 80px rgba(0,0,0,.8)',border:'1px solid rgba(0,170,255,.18)',width:'100%',maxWidth:768,maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderColor:'rgba(255,255,255,.08)',borderBottomWidth:1,padding:24}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:700,color:'#fff'}}>{trace.trace_number}</h2>
            <p style={{fontSize:14,color:'rgba(255,255,255,.5)',marginTop:4}}>{trace.importer_name}</p>
          </div>
          <button onClick={onClose} className="hv-tx" style={{color:'rgba(255,255,255,.35)',fontSize:24,fontWeight:700}}>×</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:24,padding:24}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{borderRadius:9999,fontSize:14,fontWeight:600,paddingLeft:12,paddingRight:12,paddingTop:4,paddingBottom:4,...(STATE_COLORS[trace.current_state])}}>
              {trace.current_state}
            </span>
            <span style={{fontSize:14,color:'rgba(255,255,255,.5)'}}>Since {formatDate(trace.state_entered_at)}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}>
            <div>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>FASEH Request</p>
              <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{trace.faseh_request_no}</p>
            </div>
            <div>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Port of Entry</p>
              <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{trace.port_of_entry}</p>
            </div>
            <div>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Shipment Country</p>
              <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{trace.shipment_country}</p>
            </div>
            <div>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Ghad Account</p>
              <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{trace.ghad_account_no}</p>
            </div>
          </div>
          {trace.line_items && trace.line_items.length > 0 && (
            <div>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Products</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {trace.line_items.map((item) => (
                  <div key={item.id} style={{background:'rgba(255,255,255,0.05)',borderRadius:8,padding:12}}>
                    <p style={{fontWeight:500,color:'#fff',fontSize:14}}>{item.product_name_en}</p>
                    <div style={{display:'flex',gap:16,marginTop:4}}>
                      <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Batch: {item.batch_number}</span>
                      <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Qty: {item.quantity} {item.quantity_unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {trace.audit_log && trace.audit_log.length > 0 && (
            <div>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Audit Trail</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {trace.audit_log.map((log) => (
                  <div key={log.id} style={{display:'flex',alignItems:'flex-start',gap:12,borderRadius:8,padding:8,...(log.was_valid ? {background:'rgba(0,200,150,.06)'} : {background:'rgba(255,84,112,.06)'})}}>
                    <span style={{width:8,height:8,borderRadius:9999,flexShrink:0,marginTop:2,...(log.was_valid ? {background:'#00C896'} : {background:'#FF5470'})}}></span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:500,color:'#fff'}}>{log.from_state} → {log.to_state}</p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{log.trigger_event}</p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>{log.actor_role} · {formatDate(log.occurred_at)}</p>
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

export default function Dashboard({ user, token, onLogout }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [modalTrace, setModalTrace] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const url = selectedState
        ? `${API_URL}/traces?state=${selectedState}`
        : `${API_URL}/traces`;
      const response = await fetch(url);
      const data = await response.json();
      setTraces(data.traces || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const openTrace = async (traceId) => {
    try {
      const response = await fetch(`${API_URL}/traces/${traceId}`);
      const data = await response.json();
      setModalTrace(data.trace);
    } catch (err) {
      console.error('Failed to fetch trace details');
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 30000);
    return () => clearInterval(interval);
  }, [selectedState]);

  // Chart data
  const stateData = Object.entries(
    traces.reduce((acc, t) => {
      acc[t.current_state] = (acc[t.current_state] || 0) + 1;
      return acc;
    }, {})
  ).map(([state, count]) => ({ state: state.replace(/_/g, ' '), count }));

  const portData = Object.entries(
    traces.reduce((acc, t) => {
      const port = t.port_of_entry.split(' - ')[0].replace('King ', '');
      acc[port] = (acc[port] || 0) + 1;
      return acc;
    }, {})
  ).map(([port, count]) => ({ name: port, value: count }));

  const countryData = Object.entries(
    traces.reduce((acc, t) => {
      acc[t.shipment_country] = (acc[t.shipment_country] || 0) + 1;
      return acc;
    }, {})
  ).map(([country, count]) => ({ country, count }));

  const slaBreachedCount = traces.filter(t => t.sla_breached).length;
  const slaCompliance = traces.length > 0
    ? Math.round(((traces.length - slaBreachedCount) / traces.length) * 100)
    : 100;
  const releasedCount = traces.filter(t => t.current_state === 'RELEASED').length;
  const activeCount = traces.filter(t => t.current_state !== 'RELEASED').length;

  const states = [
    'SUBMITTED','ROUTING','GOODS_HELD','LAB_ASSIGNED','SAMPLING',
    'SAMPLE_B_STORED','SAMPLING_HANDOVER','IN_TRANSIT','LAB_RECEIVED',
    'IN_ANALYSIS','RESULT_READY','UNDER_REVIEW','DECISION_PASS',
    'DECISION_FAIL','INVOICE_ISSUED','PAYMENT_PENDING','PAYMENT_CONFIRMED',
    'RELEASE_TRIGGERED','RELEASED','RE_EXPORT_INITIATED'
  ];

  const navBtn = (on) => ({width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',marginBottom:3,fontFamily:'inherit',fontSize:12,textAlign:'left',transition:'all .15s',
    fontWeight:on ? 700 : 500,background:on ? 'rgba(0,170,255,.12)' : 'transparent',color:on ? '#38C6FF' : 'rgba(255,255,255,.5)',border:on ? '1px solid rgba(56,198,255,.3)' : '1px solid transparent'});
  const kpis = [
    { label: 'Total Shipments', value: traces.length, color: '#fff', icon: '📦' },
    { label: 'Active', value: activeCount, color: '#38C6FF', icon: '⚡' },
    { label: 'Released', value: releasedCount, color: '#00C896', icon: '✅' },
    { label: 'SLA Breached', value: slaBreachedCount, color: '#FF5470', icon: '⏱' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#2D2B7A',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{DARK_CSS}</style>

      {/* ── Topbar ── */}
      <div style={{height:58,background:'#1E1A5E',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <img src="/logo_1.png" alt="DEMARA" style={{height:'38px', width:'auto'}} />
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>Drug Import Traceability Platform</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>SFDA Reviewer Dashboard · Live</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Connected
          </div>
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0) || 'S'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>{user.role.replace(/_/g, ' ')}</div></div>
            </div>
          )}
          {onLogout && (
            <button onClick={onLogout} style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#252266',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
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
          <div style={{padding:'12px 10px',flex:1}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:10,paddingLeft:4}}>Navigation</div>
            <button
            onClick={() => setActiveTab('dashboard')}
              style={navBtn(activeTab === 'dashboard')}
            >
              <span style={{fontSize:15}}>📊</span><span style={{flex:1}}>Dashboard</span>
            </button>
            <button
            onClick={() => setActiveTab('shipments')}
              style={navBtn(activeTab === 'shipments')}
            >
              <span style={{fontSize:15}}>📦</span><span style={{flex:1}}>Shipments</span>
            </button>
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)'}}>
            <button onClick={fetchTraces} style={{width:'100%',padding:'9px',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.2)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={activeTab} style={{flex:1,overflowY:'auto',background:'#2D2B7A'}}>
      {activeTab === 'dashboard' && (
        <div style={{display:'flex',flexDirection:'column',gap:24,padding:24}}>
          {/* KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Total Shipments</p>
              <p style={{fontSize:30,fontWeight:700,color:'#fff',marginTop:4}}>{traces.length}</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Active</p>
              <p style={{fontSize:30,fontWeight:700,color:'#38C6FF',marginTop:4}}>{activeCount}</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>Released</p>
              <p style={{fontSize:30,fontWeight:700,color:'#00C896',marginTop:4}}>{releasedCount}</p>
            </div>
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>SLA Compliance</p>
              <p style={{fontSize:30,fontWeight:700,color:'#a78bfa',marginTop:4}}>{slaCompliance}%</p>
            </div>
          </div>

          {/* Charts row 1 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}>
            {/* Shipments by state */}
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:16}}>Shipments by State</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stateData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="state" tick={{fontSize: 9, fill: 'rgba(255,255,255,0.45)'}} angle={-45} textAnchor="end" />
                  <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
                  <Tooltip contentStyle={{background:'#252266',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
                  <Bar dataKey="count" fill="#38C6FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Shipments by port */}
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:16}}>Shipments by Port</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={portData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {portData.map((entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{background:'#252266',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts row 2 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}>
            {/* Shipments by country */}
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:16}}>Shipments by Country</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={countryData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="country" tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} />
                  <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
                  <Tooltip contentStyle={{background:'#252266',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
                  <Bar dataKey="count" fill="#00C896" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pass/Fail ratio */}
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:16}}>Decision Summary</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Released', value: releasedCount },
                      { name: 'Active', value: activeCount },
                      { name: 'SLA Breached', value: slaBreachedCount },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    <Cell fill="#00C896" />
                    <Cell fill="#38C6FF" />
                    <Cell fill="#FF5470" />
                  </Pie>
                  <Tooltip contentStyle={{background:'#252266',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shipments' && (
        <div style={{padding:24}}>
          {/* Stats bar */}
          <div style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(0,170,255,.1)',borderRadius:12,borderWidth:1,padding:16,marginBottom:16}}>
            <div style={{display:'flex',gap:24}}>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:700,color:'#fff'}}>{traces.length}</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Total shown</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:700,color:'#FF5470'}}>
                  {traces.filter(t => t.current_state === 'UNDER_REVIEW').length}
                </p>
                <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Under review</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:700,color:'#a78bfa'}}>
                  {traces.filter(t => ['IN_ANALYSIS', 'LAB_RECEIVED'].includes(t.current_state)).length}
                </p>
                <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>In lab</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:700,color:'#00C896'}}>
                  {traces.filter(t => t.current_state === 'RELEASED').length}
                </p>
                <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Released</p>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:24,fontWeight:700,color:'#F5A623'}}>{slaBreachedCount}</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>SLA breached</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <label style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.8)'}}>Filter by state:</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:14,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:6,paddingBottom:6,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}}
            >
              <option value="">All states</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {selectedState && (
              <button onClick={() => setSelectedState('')} className="hv-ul" style={{fontSize:14,color:'#38C6FF'}}>
                Clear filter
              </button>
            )}
          </div>

          {error && (
            <div style={{background:'rgba(255,84,112,.06)',borderColor:'rgba(255,84,112,.25)',borderRadius:8,color:'#FF5470',fontSize:14,borderWidth:1,padding:16,marginBottom:16}}>{error}</div>
          )}

          {loading ? (
            <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading shipments...</div>
          ) : traces.length === 0 ? (
            <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>No shipments found.</div>
          ) : (
            <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',overflow:'hidden',borderWidth:1}}>
              <table style={{width:'100%'}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(0,170,255,.1)',borderBottomWidth:1}}>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Trace No.</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Importer</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Port</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>State</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>SLA</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Created</th>
                    <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Action</th>
                  </tr>
                </thead>
                <tbody className="dv" style={{}}>
                  {traces.map((trace) => {
                    const sla = getSLAStatus(trace.sla_deadline, trace.sla_breached);
                    return (
                      <tr key={trace.id} className="hv-bg" style={{transition:'all .15s'}}>
                        <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:600,color:'#38C6FF'}}>{trace.trace_number}</span>
                        </td>
                        <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                          <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{trace.importer_name}</p>
                          <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{trace.shipment_country}</p>
                        </td>
                        <td style={{fontSize:14,color:'rgba(255,255,255,.65)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{trace.port_of_entry}</td>
                        <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                          <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:4,paddingBottom:4,...(STATE_COLORS[trace.current_state] || {background:'rgba(255,255,255,.07)',color:'#fff'})}}>
                            {trace.current_state}
                          </span>
                        </td>
                        <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                          {sla ? (
                            <span style={{fontSize:12,fontWeight:500,...(sla.color)}}>{sla.label}</span>
                          ) : (
                            <span style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>—</span>
                          )}
                        </td>
                        <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{formatDate(trace.created_at)}</td>
                        <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                          <button
                            onClick={() => openTrace(trace.id)}
                            className="hv-bg" style={{background:'rgba(0,170,255,.06)',color:'#38C6FF',fontSize:12,fontWeight:500,borderRadius:8,paddingLeft:12,paddingRight:12,paddingTop:4,paddingBottom:4}}
                          >
                            View
                          </button>
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

      {modalTrace && <TraceModal trace={modalTrace} onClose={() => setModalTrace(null)} />}
    </div>
  );
}