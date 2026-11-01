import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
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
  select option{background:#332E8A;color:#fff}
  .dv>*+*{border-top:1px solid rgba(255,255,255,.05)}
  .hv-bg{transition:background .15s}
  .hv-bg:hover{background:rgba(0,170,255,.06)!important}
  .hv-op:hover{opacity:.9}
  .hv-dk:hover{filter:brightness(.9)}
  .hv-tx:hover{color:#fff!important}
  .hv-ul:hover{text-decoration:underline}
  .ds:disabled{opacity:.5;cursor:not-allowed}
`;

const COLORS = ['#38C6FF', '#a78bfa', '#00C896', '#F5A623', '#FF5470', '#22D3EE', '#F472B6'];

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
      <p style={{fontSize:12,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',fontWeight:600}}>{label}</p>
      <p style={{fontSize:30,fontWeight:700,marginTop:4,color: color || '#FFFFFF'}} >{value}</p>
      {sub && <p style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:4}}>{sub}</p>}
    </div>
  );
}

// ── Escalation Alerts ──
function EscalationAlerts({ token }) {
  const [escalations, setEscalations] = useState(null);

  useEffect(() => {
    const fetchEscalations = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/escalations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setEscalations(data);
      } catch (err) {
        console.error('Failed to fetch escalations');
      }
    };
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!escalations) return null;
  if (escalations.total === 0) return null;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
            {escalations.mah_inactivity_escalations?.length > 0 && (
        <div style={{background:'rgba(245,166,35,.06)',borderColor:'rgba(245,166,35,.4)',borderRadius:12,borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'#F5A623',marginBottom:8}}>
            👤 MAH Inactive — Active Shipment Unmonitored ({escalations.mah_inactivity_escalations.length})
          </h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {escalations.mah_inactivity_escalations.map(s => (
              <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(245,166,35,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
                <div>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.5)',marginLeft:8}}>{s.importer_name}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.importer_email}</p>
                  <p style={{fontSize:12,color:'#F5A623',fontWeight:700}}>{Math.floor(s.hours_since_login)}h since last login</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'#F5A623',marginTop:8}}>These MAHs have active shipments but have not logged in recently. Consider reaching out to ensure they are aware of their shipment status.</p>
        </div>
      )}
            {escalations.lab_analysis_escalations?.length > 0 && (
        <div style={{background:'rgba(124,92,252,.06)',borderColor:'rgba(124,92,252,.4)',borderRadius:12,borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'#a78bfa',marginBottom:8}}>
            🔬 Lab Not Started Analysis — Over 48 Hours ({escalations.lab_analysis_escalations.length})
          </h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {escalations.lab_analysis_escalations.map(s => (
              <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(124,92,252,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
                <div>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.5)',marginLeft:8}}>{s.importer_name}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.lab_name}</p>
                  <p style={{fontSize:12,color:'#a78bfa',fontWeight:700}}>{Math.floor(s.hours_in_state)}h since sample received</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'#a78bfa',marginTop:8}}>MAH and DEMARA admin have been notified. Contact the lab to start analysis immediately.</p>
        </div>
      )}
      {escalations.lab_escalations?.length > 0 && (
        <div style={{background:'rgba(245,166,35,.06)',borderColor:'rgba(245,166,35,.4)',borderRadius:12,borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'#F5A623',marginBottom:8}}>
            ⚠️ Lab Not Responded — Over 24 Hours — MAH Notified ({escalations.lab_escalations.length})
          </h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {escalations.lab_escalations.map(s => (
              <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(245,166,35,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
                <div>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.5)',marginLeft:8}}>{s.importer_name}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.lab_name}</p>
                  <p style={{fontSize:12,color:'#F5A623',fontWeight:700}}>{Math.floor(s.hours_in_state)}h without response</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'#F5A623',marginTop:8}}>MAH and DEMARA admin have been notified. Contact the lab directly or reassign the shipment.</p>
        </div>
      )}

      {escalations.clearance_escalations?.length > 0 && (
        <div style={{background:'rgba(255,84,112,.06)',borderColor:'rgba(255,84,112,.4)',borderRadius:12,borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'#FF5470',marginBottom:8}}>
            🚨 Clearance Not Started — Over 48 Hours — MAH Notified ({escalations.clearance_escalations.length})
          </h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {escalations.clearance_escalations.map(s => (
              <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(255,84,112,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
                <div>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,.5)',marginLeft:8}}>{s.importer_name}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.clearance_company_name || '—'}</p>
                  <p style={{fontSize:12,color:'#FF5470',fontWeight:700}}>{Math.floor(s.hours_in_state)}h since approval</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'#FF5470',marginTop:8}}>MAH and DEMARA admin have been notified. Demurrage risk — contact clearance company immediately.</p>
        </div>
      )}
    </div>
  );
}

// ── Expiring Labs Alert ──
function ExpiringLabsAlert({ token }) {
  const [expiringLabs, setExpiringLabs] = useState([]);

  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/labs/expiring`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setExpiringLabs(data.expiring_labs || []);
      } catch (err) {
        console.error('Failed to fetch expiring labs');
      }
    };
    fetchExpiring();
  }, []);

  if (expiringLabs.length === 0) return null;

  return (
    <div style={{background:'rgba(245,166,35,.06)',borderColor:'rgba(245,166,35,.4)',borderRadius:12,borderWidth:1,padding:16,marginBottom:16}}>
      <h3 style={{fontSize:14,fontWeight:600,color:'#F5A623',marginBottom:8}}>
        ⚠️ Lab Certification Renewal Required ({expiringLabs.length} lab{expiringLabs.length > 1 ? 's' : ''})
      </h3>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {expiringLabs.map(lab => (
          <div key={lab.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(245,166,35,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
            <div>
              <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{lab.name_en}</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>SFDA: {lab.sfda_appointment_number}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:12,fontWeight:700,...(parseInt(lab.days_remaining) <= 30 ? {color:'#FF5470'} : {color:'#F5A623'})}}>
                {parseInt(lab.days_remaining) <= 0 ? 'EXPIRED' : `${parseInt(lab.days_remaining)} days left`}
              </p>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>
                Expires: {new Date(lab.sfda_appointment_expiry).toLocaleDateString('en-SA', {day:'2-digit', month:'short', year:'numeric'})}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p style={{fontSize:12,color:'#F5A623',marginTop:8}}>Contact these labs to renew their SFDA appointment certificates before expiry.</p>
    </div>
  );
}

// ── Overview Section ──
// Final step of the destruction sub-flow: DEMARA admin formally confirms after the SFDA certificate
function DestructionConfirmQueue({ shipments, token }) {
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);

  const pending = shipments.filter(s => !confirmedIds.includes(s.id));
  if (pending.length === 0) return null;

  const confirm = async (shipment) => {
    setActingId(shipment.id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'CONFIRM_DESTRUCTION' })
      });
      const data = await res.json();
      if (data.success) {
        setConfirmedIds(ids => [...ids, shipment.id]);
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
    <div style={{background:'rgba(245,166,35,.06)',borderColor:'rgba(245,166,35,.4)',borderRadius:12,borderWidth:1,padding:16}}>
      <h3 style={{fontSize:14,fontWeight:600,color:'#F5A623',marginBottom:8}}>📄 Destructions Awaiting Confirmation ({pending.length})</h3>
      {error && <div style={{background:'rgba(255,84,112,.06)',borderColor:'rgba(255,84,112,.25)',borderRadius:8,color:'#FF5470',fontSize:12,borderWidth:1,padding:8,marginBottom:8}}>{error}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {pending.map(s => (
          <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.05)',borderRadius:8,borderColor:'rgba(245,166,35,.15)',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8}}>
            <div>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
              <span style={{fontSize:12,color:'rgba(255,255,255,.5)',marginLeft:8}}>{s.importer_name}</span>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:2}}>
                SFDA order {s.destruction_reference || '—'} · witnessed by {s.destruction_witnessed_by || '—'} · certificate issued {formatDate(s.state_entered_at)}
              </p>
            </div>
            <button onClick={() => confirm(s)} disabled={actingId === s.id}
              className="hv-op ds" style={{fontSize:12,fontWeight:600,borderRadius:8,color:'#fff',paddingLeft:12,paddingRight:12,paddingTop:6,paddingBottom:6,background: '#00C896'}}
              >
              {actingId === s.id ? 'Confirming...' : 'Confirm Destruction'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewSection({ token }) {
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipmentsRes, dashRes] = await Promise.all([
          fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/shipments/stats/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const shipmentsData = await shipmentsRes.json();
        const dashData = await dashRes.json();
        setShipments(shipmentsData.shipments || []);
        setStats(dashData);
      } catch (err) {
        console.error('Failed to fetch overview');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>;

  const total = shipments.length;
  const conforming = shipments.filter(s => s.current_state === 'CONFORMING').length;
  const nonConforming = shipments.filter(s => s.current_state === 'NON_CONFORMING').length;
  const finalCleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const inProgress = shipments.filter(s => !['FINAL_CLEARANCE', 'ARCHIVED', 'CONFORMING', 'NON_CONFORMING'].includes(s.current_state)).length;

  const stateData = stats?.by_state?.map(s => ({
    name: s.current_state.replace(/_/g, ' '),
    value: parseInt(s.count)
  })) || [];

  const portData = stats?.by_port?.map(p => ({
    name: p.port_of_entry.split(' - ')[0].replace('King ', ''),
    value: parseInt(p.count)
  })) || [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:16}}>
        <StatCard label="Total Shipments" value={total} />
        <StatCard label="In Progress" value={inProgress} color="#38C6FF" />
        <StatCard label="Conforming" value={conforming} color="#00C896" />
        <StatCard label="Non-Conforming" value={nonConforming} color="#FF5470" />
        <StatCard label="Final Clearance" value={finalCleared} color="#a78bfa" />
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16}}>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Shipments by State</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stateData} margin={{bottom: 40}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{fontSize: 8, fill: 'rgba(255,255,255,0.45)'}} angle={-30} textAnchor="end" />
              <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
              <Bar dataKey="value" fill="#38C6FF" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Shipments by Port</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={portData} cx="50%" cy="50%" outerRadius={80}
                dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                {portData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Destructions with an SFDA certificate, awaiting formal DEMARA confirmation */}
      <DestructionConfirmQueue
        shipments={shipments.filter(s => s.current_state === 'DESTRUCTION_CERTIFICATE_ISSUED')}
        token={token}
      />

      {/* Escalation alerts */}
      <EscalationAlerts token={token} />

      {/* Expiring lab certificates alert */}
      <ExpiringLabsAlert token={token} />

      {/* Recent activity */}
      {stats?.recent_activity?.length > 0 && (
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Recent Activity</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {stats.recent_activity.map((a, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.05)',borderRadius:8,padding:8}}>
                <span style={{width:8,height:8,borderRadius:9999,background:'#38C6FF',flexShrink:0}}></span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#38C6FF',fontWeight:600}}>{a.faseh_request_number}</span>
                <span style={{fontSize:12,color:'rgba(255,255,255,.65)'}}>{a.importer_name}</span>
                <span style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>→ {a.to_state}</span>
                <span style={{fontSize:12,color:'rgba(255,255,255,.35)',marginLeft:'auto'}}>{formatDate(a.occurred_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shipments Section ──
function ShipmentsSection({ token }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [resetShipment, setResetShipment] = useState(null);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);

  const STATES = [
    'RECORD_OPENED', 'SAMPLING_REQUESTED', 'INSPECTOR_DISPATCHED',
    'SAMPLE_COLLECTED', 'IN_TRANSIT_TO_LAB', 'LAB_RECEIVED',
    'IN_ANALYSIS', 'RESULT_SUBMITTED', 'CONFORMING', 'NON_CONFORMING',
    'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID', 'FINAL_CLEARANCE'
  ];

    const handleResetDecision = (shipment) => {
    setResetShipment(shipment);
    setResetReason('');
  };

  const confirmReset = async () => {
    if (!resetReason.trim()) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/admin/shipments/${resetShipment.id}/reset-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: resetReason })
      });
      const data = await res.json();
      if (data.success) {
        setResetShipment(null);
        setResetReason('');
        // Refresh shipments
        const refreshRes = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const refreshData = await refreshRes.json();
        setShipments(refreshData.shipments || []);
      }
    } catch (err) {
      console.error('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipments(data.shipments || []);
      } catch (err) {
        console.error('Failed to fetch shipments');
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
      s.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !selectedState || s.current_state === selectedState;
    return matchSearch && matchState;
  });

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',gap:12}}>
        <input type="text" placeholder="Search Faseh number or importer..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{flex:1,borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:14,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}} />
        <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
          style={{borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:14,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}}>
          <option value="">All States</option>
          {STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>
      ) : (
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',overflow:'hidden',borderWidth:1}}>
          <table style={{width:'100%'}}>
            <thead>
              <tr style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(0,170,255,.1)',borderBottomWidth:1}}>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Faseh Reference</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Importer</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Country</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Lab</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Clearance Co.</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>State</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Dwell Time</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Updated</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Actions</th>
              </tr>
            </thead>
            <tbody className="dv" style={{}}>
              {filtered.map(s => (
                <tr key={s.id} className="hv-bg" style={{}}>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:600,color: '#38C6FF'}} >{s.faseh_request_number}</span>
                  </td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{s.importer_name}</p>
                    <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{s.ghad_cr_number}</p>
                  </td>
                  <td style={{fontSize:14,color:'rgba(255,255,255,.65)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{s.shipment_country}</td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{s.lab_name || '—'}</td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{s.clearance_company_name || '—'}</td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:4,paddingBottom:4,...(s.current_state === 'CONFORMING' || s.current_state === 'FINAL_CLEARANCE' ? {background:'rgba(0,200,150,.14)',color:'#00C896'} : s.current_state === 'NON_CONFORMING' ? {background:'rgba(255,84,112,.14)',color:'#FF5470'} : s.current_state.includes('ANALYSIS') || s.current_state === 'IN_ANALYSIS' ? {background:'rgba(124,92,252,.14)',color:'#a78bfa'} : {background:'rgba(0,170,255,.14)',color:'#38C6FF'})}}>
                      {s.current_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    {s.total_dwell_minutes ? `${Math.floor(s.total_dwell_minutes / 1440)}d ${Math.floor((s.total_dwell_minutes % 1440) / 60)}h` : '—'}
                  </td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{formatDate(s.updated_at)}</td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    {['CONFORMING', 'NON_CONFORMING', 'PARTIALLY_CONFORMING'].includes(s.current_state) && (
                      <button onClick={() => handleResetDecision(s)}
                        className="hv-op" style={{fontSize:12,fontWeight:500,borderRadius:8,color:'#fff',paddingLeft:8,paddingRight:8,paddingTop:4,paddingBottom:4,background: '#F5A623'}}
                        >
                        ↩ Reset Decision
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetShipment && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
          <div style={{background:'#332E8A',borderRadius:12,boxShadow:'0 32px 80px rgba(0,0,0,.8)',border:'1px solid rgba(0,170,255,.18)',width:'100%',maxWidth:448,padding:24}}>
            <h2 style={{fontSize:18,fontWeight:700,color:'#fff',marginBottom:8}}>↩ Reset Decision</h2>
            <p style={{fontSize:14,color:'rgba(255,255,255,.5)',marginBottom:4}}>{resetShipment.faseh_request_number}</p>
            <p style={{fontSize:12,color:'#F5A623',marginBottom:16}}>This will reset the shipment from <strong>{resetShipment.current_state}</strong> to RESULT_SUBMITTED. The corrected SFDA decision email can then be processed.</p>
            <label style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.65)',textTransform:'uppercase',letterSpacing:'.6px'}}>Reason for reset *</label>
            <textarea value={resetReason} onChange={e => setResetReason(e.target.value)}
              rows={3} placeholder="e.g. SFDA issued a corrected decision email..."
              style={{width:'100%',borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:14,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,marginTop:4,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}} />
            <div style={{display:'flex',gap:12,marginTop:16}}>
              <button onClick={confirmReset} disabled={resetting || !resetReason.trim()}
                className="hv-op ds" style={{flex:1,color:'#fff',fontWeight:600,fontSize:14,borderRadius:8,paddingTop:8,paddingBottom:8,background: '#F5A623'}}
                >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button onClick={() => { setResetShipment(null); setResetReason(''); }}
                className="hv-bg" style={{borderColor:'rgba(255,255,255,.14)',color:'rgba(255,255,255,.65)',fontSize:14,borderRadius:8,borderWidth:1,paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email Parser Log Section ──
function EmailParserSection({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const SAMPLE_QC = `FROM: qc-sampling@sfda.gov.sa\nTO: omar@alnoor-pharma.com.sa\nCC: qc@demara.sa\nSUBJECT: QC Sampling Required — FASEH-2026-CS-E2E-002\n\nFaseh Reference: FASEH-2026-CS-E2E-002\nGHAD CR Number: CR-1234567890\nPort of Entry: King Abdulaziz Port - Dammam\nShipment Country: France\n\nSaudi Food and Drug Authority`;

  const SAMPLE_CONFORMING = `FROM: decisions@sfda.gov.sa\nTO: clearance@saudiclearance.com.sa\nCC: qc@demara.sa\nSUBJECT: Clearance Decision — FASEH-2026-CS-E2E-002 — CONFORMING\n\nFaseh Reference: FASEH-2026-CS-E2E-002\nOverall Decision: CONFORMING\n\n1. Product Name: Moisturizing Face Cream 50ml\n   E-Cosma Number: COSMA-SA-2024-0099\n   Decision: APPROVED\n\n2. Product Name: Vitamin C Serum 30ml\n   E-Cosma Number: COSMA-SA-2024-0100\n   Decision: APPROVED\n\nSaudi Food and Drug Authority`;

  const SAMPLE_NON_CONFORMING = `FROM: decisions@sfda.gov.sa\nTO: clearance@saudiclearance.com.sa\nCC: qc@demara.sa\nSUBJECT: Clearance Decision — FASEH-2026-CS-DEMO1 — NON-CONFORMING\n\nFaseh Reference: FASEH-2026-CS-DEMO1\nOverall Decision: NON-CONFORMING\n\n1. Product Name: Anti-Aging Night Cream 50ml\n   E-Cosma Number: COSMA-SA-2024-0211\n   Decision: REJECTED\n   Reason: Mercury content exceeds permitted limit. Measured: 2.3 mg/kg. Maximum permitted: 1.0 mg/kg.\n\n2. Product Name: Eye Contour Serum 15ml\n   E-Cosma Number: COSMA-SA-2024-0212\n   Decision: APPROVED\n\nSaudi Food and Drug Authority`;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/parser/logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Failed to fetch parser logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/parser/incoming-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email_text: testEmail,
          from_address: 'sfda@sfda.gov.sa',
          subject: 'SFDA Test Email'
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Test email parser */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>🤖 Test Email Parser — Simulate SFDA Email</h3>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <button onClick={() => setTestEmail(SAMPLE_QC)}
            className="hv-bg" style={{fontSize:12,borderColor:'rgba(255,255,255,.14)',borderRadius:8,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:6,paddingBottom:6}}>
            Load QC Sampling Email
          </button>
          <button onClick={() => setTestEmail(SAMPLE_CONFORMING)}
            className="hv-bg" style={{fontSize:12,borderColor:'rgba(255,255,255,.14)',borderRadius:8,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:6,paddingBottom:6}}>
            Load Conforming Decision Email
          </button>
          <button onClick={() => setTestEmail(SAMPLE_NON_CONFORMING)}
            className="hv-bg" style={{fontSize:12,borderColor:'rgba(255,84,112,.25)',borderRadius:8,color:'#FF5470',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:6,paddingBottom:6}}>
            Load Non-Conforming Email
          </button>
        </div>
        <textarea value={testEmail} onChange={e => setTestEmail(e.target.value)}
          rows={6} placeholder="Paste SFDA email content here..."
          style={{width:'100%',borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:12,fontFamily:'JetBrains Mono,monospace',borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}} />
        <button onClick={handleTest} disabled={testing || !testEmail.trim()}
          className="hv-op ds" style={{color:'#fff',fontSize:14,fontWeight:500,borderRadius:8,paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8,marginTop:8,background:'#0088DD'}}
          >
          {testing ? '🤖 Parsing...' : '▶ Process Email'}
        </button>

        {testResult && (
          <div style={{borderRadius:8,fontSize:14,padding:12,marginTop:12,...(testResult.success ? {background:'rgba(0,200,150,.06)',borderColor:'rgba(0,200,150,.25)',borderWidth:1} : {background:'rgba(255,84,112,.06)',borderColor:'rgba(255,84,112,.25)',borderWidth:1})}}>
            {testResult.success ? (
              <div>
                <p style={{fontWeight:600,color:'#00C896'}}>✓ Email processed successfully</p>
                <p style={{color:'#00C896',fontSize:12,marginTop:4}}>Faseh: {testResult.faseh_request_number} | {testResult.previous_state} → {testResult.new_state} | {testResult.notifications_sent} notifications sent</p>
              </div>
            ) : (
              <p style={{color:'#FF5470'}}>✗ {testResult.reason || testResult.error || 'Processing failed'}</p>
            )}
          </div>
        )}
      </div>

      {/* Parser logs */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',overflow:'hidden',borderWidth:1}}>
        <div style={{borderColor:'rgba(0,170,255,.1)',background:'rgba(255,255,255,0.05)',borderBottomWidth:1,paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)'}}>Email Parser Log</h3>
        </div>
        {loading ? (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',fontSize:14,paddingTop:32,paddingBottom:32}}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.35)',fontSize:14,paddingTop:32,paddingBottom:32}}>No emails processed yet</div>
        ) : (
          <table style={{width:'100%'}}>
            <thead>
              <tr style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(0,170,255,.1)',borderBottomWidth:1}}>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Received</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>From</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Faseh Ref</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Decision</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Status</th>
              </tr>
            </thead>
            <tbody className="dv" style={{}}>
              {logs.map(log => (
                <tr key={log.id} className="hv-bg" style={{}}>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{formatDate(log.received_at)}</td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.65)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{log.from_address}</td>
                  <td style={{fontSize:12,fontFamily:'JetBrains Mono,monospace',fontWeight:600,paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12,color: '#38C6FF'}} >{log.extracted_faseh_number || '—'}</td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    {log.extracted_decision && (
                      <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2,...(log.extracted_decision === 'CONFORMING' ? {background:'rgba(0,200,150,.14)',color:'#00C896'} : log.extracted_decision === 'NON_CONFORMING' ? {background:'rgba(255,84,112,.14)',color:'#FF5470'} : {background:'rgba(0,170,255,.14)',color:'#38C6FF'})}}>{log.extracted_decision.replace(/_/g, ' ')}</span>
                    )}
                  </td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2,...(log.current_status === 'PROCESSED' ? {background:'rgba(0,200,150,.14)',color:'#00C896'} : log.current_status === 'UNMATCHED' ? {background:'rgba(245,166,35,.14)',color:'#F5A623'} : log.current_status === 'FAILED' ? {background:'rgba(255,84,112,.14)',color:'#FF5470'} : {background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.8)'})}}>{log.current_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Users Section ──
function UsersSection({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS = {
    DEMARA_ADMIN: {background:'rgba(124,92,252,.14)',color:'#a78bfa'},
    IMPORTER: {background:'rgba(0,170,255,.14)',color:'#38C6FF'},
    SFDA_INSPECTOR: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
    LAB_ANALYST: {background:'rgba(0,200,150,.14)',color:'#00C896'},
    CLEARANCE_COMPANY: {background:'rgba(245,166,35,.14)',color:'#F5A623'},
    NOTIFIED_BODY: {background:'rgba(244,114,182,.14)',color:'#F472B6'},
    GMP_AUDITOR: {background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.8)'},
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <input type="text" placeholder="Search users..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{width:'100%',borderColor:'rgba(255,255,255,.14)',borderRadius:8,fontSize:14,borderWidth:1,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,background:'rgba(255,255,255,.05)',color:'#fff',colorScheme:'dark'}} />

      {loading ? (
        <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>
      ) : (
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',overflow:'hidden',borderWidth:1}}>
          <table style={{width:'100%'}}>
            <thead>
              <tr style={{background:'rgba(255,255,255,0.05)',borderColor:'rgba(0,170,255,.1)',borderBottomWidth:1}}>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Name</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Email</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Role</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Status</th>
                <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>Joined</th>
              </tr>
            </thead>
            <tbody className="dv" style={{}}>
              {filtered.map(u => (
                <tr key={u.id} className="hv-bg" style={{}}>
                  <td style={{fontSize:14,fontWeight:500,color:'#fff',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{u.full_name}</td>
                  <td style={{fontSize:14,color:'rgba(255,255,255,.65)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{u.email}</td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2,...(ROLE_COLORS[u.role] || {background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.8)'})}}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
                    <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2,...(u.is_active ? {background:'rgba(0,200,150,.14)',color:'#00C896'} : {background:'rgba(255,84,112,.14)',color:'#FF5470'})}}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Organisations Section ──
function OrganisationsSection({ token }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/organisations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setOrgs(data.organisations || []);
      } catch (err) {
        console.error('Failed to fetch organisations');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const labs = orgs.filter(o => o.org_type === 'LAB');
  const clearanceCompanies = orgs.filter(o => o.org_type === 'CLEARANCE_COMPANY');
  const others = orgs.filter(o => !['LAB', 'CLEARANCE_COMPANY'].includes(o.org_type));

  const OrgTable = ({ title, data }) => (
    <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',overflow:'hidden',borderWidth:1}}>
      <div style={{borderColor:'rgba(0,170,255,.1)',background:'rgba(255,255,255,0.05)',borderBottomWidth:1,paddingLeft:16,paddingRight:16,paddingTop:12,paddingBottom:12}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)'}}>{title} ({data.length})</h3>
      </div>
      <table style={{width:'100%'}}>
        <thead>
          <tr style={{borderColor:'rgba(255,255,255,.05)',borderBottomWidth:1}}>
            <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>Name</th>
            <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>Type</th>
            <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>Country</th>
            <th style={{textAlign:'left',fontSize:12,fontWeight:600,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.6px',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>Status</th>
          </tr>
        </thead>
        <tbody className="dv" style={{}}>
          {data.map(o => (
            <tr key={o.id} className="hv-bg" style={{}}>
              <td style={{fontSize:14,fontWeight:500,color:'#fff',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>{o.name_en}</td>
              <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>{o.org_type}</td>
              <td style={{fontSize:12,color:'rgba(255,255,255,.5)',paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>{o.country || '—'}</td>
              <td style={{paddingLeft:16,paddingRight:16,paddingTop:8,paddingBottom:8}}>
                <span style={{borderRadius:9999,fontSize:12,fontWeight:600,paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2,...(o.is_active ? {background:'rgba(0,200,150,.14)',color:'#00C896'} : {background:'rgba(255,84,112,.14)',color:'#FF5470'})}}>
                  {o.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <OrgTable title="Certified QC Labs" data={labs} />
      <OrgTable title="Clearance Companies" data={clearanceCompanies} />
      {others.length > 0 && <OrgTable title="Other Organisations" data={others} />}
    </div>
  );
}

// ── Platform Metrics Section ──
function MetricsSection({ token }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipments(data.shipments || []);
      } catch (err) {
        console.error('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>;

  const total = shipments.length;
  const conformingRate = total > 0 ? Math.round((shipments.filter(s => ['CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state)).length / total) * 100) : 0;
  const nonConformingRate = total > 0 ? Math.round((shipments.filter(s => s.current_state === 'NON_CONFORMING').length / total) * 100) : 0;

  const countryData = Object.entries(
    shipments.reduce((acc, s) => {
      acc[s.shipment_country] = (acc[s.shipment_country] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const projectionData = [
    { month: 'Month 1', manual: 50, demara: 50 },
    { month: 'Month 2', manual: 52, demara: 80 },
    { month: 'Month 3', manual: 48, demara: 120 },
    { month: 'Month 4', manual: 51, demara: 180 },
    { month: 'Month 5', manual: 49, demara: 250 },
    { month: 'Month 6', manual: 50, demara: 350 },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Key metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>
        <StatCard label="Total Shipments Processed" value={total} />
        <StatCard label="Conforming Rate" value={`${conformingRate}%`} color="#00C896" sub="Products approved" />
        <StatCard label="Non-Conforming Rate" value={`${nonConformingRate}%`} color="#FF5470" sub="Products rejected" />
        <StatCard label="Active Labs" value={4} color="#38C6FF" sub="SFDA certified" />
      </div>

      {/* Throughput projection */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:4}}>Shipment Throughput Projection</h3>
        <p style={{fontSize:12,color:'rgba(255,255,255,.35)',marginBottom:12}}>Estimated monthly shipments — Manual process vs DEMARA platform</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} />
            <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} />
            <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
            <Line type="monotone" dataKey="manual" stroke="#FF5470" strokeWidth={2} name="Manual Process" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="demara" stroke="#00C896" strokeWidth={2} name="With DEMARA" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:'flex',gap:16,marginTop:8}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:16,height:2,background:'#FF5470',borderTop: '2px dashed #FF5470'}} ></div><span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Manual process (flat)</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:16,height:2,background:'#00C896'}}></div><span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>With DEMARA (growing)</span></div>
        </div>
      </div>

      {/* Shipments by country */}
      {countryData.length > 0 && (
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Shipments by Origin Country</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} />
              <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
              <Bar dataKey="value" fill="#38C6FF" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Value proposition */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Platform Value — Per Shipment</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
          <div style={{background:'rgba(255,84,112,.06)',borderRadius:8,textAlign:'center',padding:12}}>
            <p style={{fontSize:12,color:'#FF5470',fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>Without DEMARA</p>
            <p style={{fontSize:24,fontWeight:700,color:'#FF5470',marginTop:4}}>3-5 days</p>
            <p style={{fontSize:12,color:'#FF5470'}}>Average delay after approval</p>
            <p style={{fontSize:18,fontWeight:700,color:'#FF5470',marginTop:8}}>SAR 15,000-50,000</p>
            <p style={{fontSize:12,color:'#FF5470'}}>Demurrage cost per shipment</p>
          </div>
          <div style={{background:'rgba(0,200,150,.06)',borderRadius:8,textAlign:'center',padding:12}}>
            <p style={{fontSize:12,color:'#00C896',fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>With DEMARA</p>
            <p style={{fontSize:24,fontWeight:700,color:'#00C896',marginTop:4}}>{'< 1 hour'}</p>
            <p style={{fontSize:12,color:'#00C896'}}>Notification after approval</p>
            <p style={{fontSize:18,fontWeight:700,color:'#00C896',marginTop:8}}>SAR ~0</p>
            <p style={{fontSize:12,color:'#00C896'}}>Demurrage cost per shipment</p>
          </div>
          <div style={{background:'rgba(0,170,255,.06)',borderRadius:8,textAlign:'center',padding:12}}>
            <p style={{fontSize:12,color:'#38C6FF',fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px'}}>SFDA Benefit</p>
            <p style={{fontSize:24,fontWeight:700,color:'#38C6FF',marginTop:4}}>3x</p>
            <p style={{fontSize:12,color:'#38C6FF'}}>Throughput increase</p>
            <p style={{fontSize:18,fontWeight:700,color:'#38C6FF',marginTop:8}}>More tests</p>
            <p style={{fontSize:12,color:'#38C6FF'}}>= More QC fee revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Clearance Performance Section ──
function ClearancePerformanceSection({ token }) {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/clearance-performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setPerformance(data.performance || []);
      } catch (err) {
        console.error('Failed to fetch clearance performance');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>;

  const getRating = (hours) => {
    if (!hours) return { label: 'No data', color: {background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.5)'} };
    if (hours <= 6) return { label: 'Excellent', color: {background:'rgba(0,200,150,.14)',color:'#00C896'} };
    if (hours <= 24) return { label: 'Good', color: {background:'rgba(0,170,255,.14)',color:'#38C6FF'} };
    if (hours <= 48) return { label: 'Average', color: {background:'rgba(245,166,35,.14)',color:'#F5A623'} };
    return { label: 'Slow', color: {background:'rgba(255,84,112,.14)',color:'#FF5470'} };
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:4}}>Clearance Company Performance</h3>
        <p style={{fontSize:12,color:'rgba(255,255,255,.35)',marginBottom:16}}>Time from SFDA approval notification to final clearance completion</p>

        {performance.length === 0 ? (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.35)',fontSize:14,paddingTop:32,paddingBottom:32}}>No performance data yet</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {performance.map((company, index) => {
              const rating = getRating(company.avg_completion_hours);
              const completionRate = company.total_tasks > 0
                ? Math.round((company.completed_tasks / company.total_tasks) * 100)
                : 0;

              return (
                <div key={company.company_id} style={{borderColor:'rgba(0,170,255,.1)',borderRadius:12,borderWidth:1,padding:16}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,.35)'}}>#{index + 1}</span>
                      <div>
                        <p style={{fontSize:14,fontWeight:600,color:'#fff'}}>{company.company_name}</p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{company.total_tasks} total assignments</p>
                      </div>
                    </div>
                    <span style={{borderRadius:9999,fontSize:12,fontWeight:700,paddingLeft:12,paddingRight:12,paddingTop:4,paddingBottom:4,...(rating.color)}}>
                      {rating.label}
                    </span>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16,marginBottom:12}}>
                    <div style={{textAlign:'center',background:'rgba(255,255,255,0.05)',borderRadius:8,padding:8}}>
                      <p style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,.8)'}}>
                        {company.avg_completion_hours ? `${Math.round(company.avg_completion_hours)}h` : '—'}
                      </p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Avg time</p>
                    </div>
                    <div style={{textAlign:'center',background:'rgba(0,200,150,.06)',borderRadius:8,padding:8}}>
                      <p style={{fontSize:18,fontWeight:700,color:'#00C896'}}>
                        {company.fastest_hours ? `${Math.round(company.fastest_hours)}h` : '—'}
                      </p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Fastest</p>
                    </div>
                    <div style={{textAlign:'center',background:'rgba(255,84,112,.06)',borderRadius:8,padding:8}}>
                      <p style={{fontSize:18,fontWeight:700,color:'#FF5470'}}>
                        {company.slowest_hours ? `${Math.round(company.slowest_hours)}h` : '—'}
                      </p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Slowest</p>
                    </div>
                    <div style={{textAlign:'center',background:'rgba(0,170,255,.06)',borderRadius:8,padding:8}}>
                      <p style={{fontSize:18,fontWeight:700,color:'#38C6FF'}}>{completionRate}%</p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Completion</p>
                    </div>
                  </div>

                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Completion rate</span>
                      <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.65)'}}>{completionRate}%</span>
                    </div>
                    <div style={{width:'100%',background:'rgba(255,255,255,.1)',borderRadius:9999,height:8}}>
                      <div style={{height:8,borderRadius:9999,transition:'all .15s',...({
                        width: `${completionRate}%`,
                        background: completionRate >= 80 ? '#00C896' : completionRate >= 50 ? '#F5A623' : '#FF5470'
                      })}} ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{background:'rgba(0,170,255,.06)',borderColor:'rgba(0,170,255,.25)',borderRadius:12,borderWidth:1,padding:16}}>
        <p style={{fontSize:12,color:'#38C6FF',fontWeight:600}}>📋 Performance Rating Guide</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginTop:8}}>
          <div style={{textAlign:'center'}}><span style={{borderRadius:9999,fontSize:12,fontWeight:700,background:'rgba(0,200,150,.14)',color:'#00C896',paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2}}>Excellent</span><p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Under 6 hours</p></div>
          <div style={{textAlign:'center'}}><span style={{borderRadius:9999,fontSize:12,fontWeight:700,background:'rgba(0,170,255,.14)',color:'#38C6FF',paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2}}>Good</span><p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>6-24 hours</p></div>
          <div style={{textAlign:'center'}}><span style={{borderRadius:9999,fontSize:12,fontWeight:700,background:'rgba(245,166,35,.14)',color:'#F5A623',paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2}}>Average</span><p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>24-48 hours</p></div>
          <div style={{textAlign:'center'}}><span style={{borderRadius:9999,fontSize:12,fontWeight:700,background:'rgba(255,84,112,.14)',color:'#FF5470',paddingLeft:8,paddingRight:8,paddingTop:2,paddingBottom:2}}>Slow</span><p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Over 48 hours</p></div>
        </div>
      </div>
    </div>
  );
}

// ── SFDA Progress Dashboard ──
function SFDADashboard({ token }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipments(data.shipments || []);
      } catch (err) {
        console.error('Failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{textAlign:'center',color:'rgba(255,255,255,.5)',paddingTop:48,paddingBottom:48}}>Loading...</div>;

  const total = shipments.length;
  const cleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const conforming = shipments.filter(s => ['CONFORMING', 'FINAL_CLEARANCE', 'PARTIALLY_CONFORMING'].includes(s.current_state)).length;
  const nonConforming = shipments.filter(s => s.current_state === 'NON_CONFORMING').length;
  const inProgress = shipments.filter(s => !['FINAL_CLEARANCE', 'ARCHIVED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)).length;
  const conformingRate = total > 0 ? Math.round((conforming / total) * 100) : 0;

  const avgDwellHours = shipments
    .filter(s => s.total_dwell_minutes)
    .reduce((acc, s, _, arr) => acc + s.total_dwell_minutes / arr.length, 0);
  const avgDwellDays = avgDwellHours > 0 ? (avgDwellHours / 1440).toFixed(1) : '—';

  const portData = Object.entries(
    shipments.reduce((acc, s) => {
      const port = s.port_of_entry.split(' - ')[0].replace('King ', '');
      acc[port] = (acc[port] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const countryData = Object.entries(
    shipments.reduce((acc, s) => {
      acc[s.shipment_country] = (acc[s.shipment_country] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 6);

  const stateData = [
    { name: 'Cleared', value: cleared, color: '#00C896' },
    { name: 'In Progress', value: inProgress, color: '#38C6FF' },
    { name: 'Non-Conforming', value: nonConforming, color: '#FF5470' },
  ].filter(d => d.value > 0);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#252266,#1E1A5E)',borderColor:'rgba(0,170,255,.15)',borderRadius:12,color:'#fff',borderWidth:1,padding:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <span style={{fontSize:30}}>🏛️</span>
          <div>
            <h2 style={{fontSize:20,fontWeight:700}}>SFDA Import Clearance Dashboard</h2>
            <p style={{color:'rgba(255,255,255,.6)',fontSize:14}}>Real-time operational metrics — DEMARA Platform</p>
          </div>
        </div>
        <p style={{color:'rgba(255,255,255,.6)',fontSize:12,marginTop:8}}>
          This dashboard provides SFDA with full visibility into import clearance operations across all ports and labs registered on the DEMARA platform.
        </p>
      </div>

      {/* Key metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',textAlign:'center',borderWidth:1,padding:16}}>
          <p style={{fontSize:30,fontWeight:700,color: '#38C6FF'}} >{total}</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Total shipments tracked</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',textAlign:'center',borderWidth:1,padding:16}}>
          <p style={{fontSize:30,fontWeight:700,color:'#00C896'}}>{cleared}</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Successfully cleared</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',textAlign:'center',borderWidth:1,padding:16}}>
          <p style={{fontSize:30,fontWeight:700,color:'#38C6FF'}}>{conformingRate}%</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Conformity rate</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',textAlign:'center',borderWidth:1,padding:16}}>
          <p style={{fontSize:30,fontWeight:700,color:'#a78bfa'}}>{avgDwellDays}</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4}}>Avg clearance time (days)</p>
        </div>
      </div>

      {/* Charts row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
        {/* Shipment status */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Clearance Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={stateData} cx="50%" cy="50%" outerRadius={60}
                dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                {stateData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Port activity */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Port Activity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={portData} margin={{bottom: 20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{fontSize: 9, fill: 'rgba(255,255,255,0.45)'}} angle={-20} textAnchor="end" />
              <YAxis tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
              <Bar dataKey="value" fill="#38C6FF" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Country of origin */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Top Import Countries</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={countryData} layout="vertical" margin={{left: 20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{fontSize: 10, fill: 'rgba(255,255,255,0.45)'}} width={60} />
              <Tooltip contentStyle={{background:'#332E8A',border:'1px solid rgba(0,170,255,.2)',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} labelStyle={{color:'rgba(255,255,255,.6)'}} cursor={{fill:'rgba(0,170,255,.06)'}} />
              <Bar dataKey="value" fill="#38C6FF" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lab network */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Certified QC Lab Network</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
          {[
            { name: 'Saudi National Lab — Dammam', turnaround: '48h', tests: 127, status: 'Active' },
            { name: 'SFDA Central Lab — Riyadh', turnaround: '36h', tests: 284, status: 'Active' },
            { name: 'KKIA Pharmaceutical Lab', turnaround: '24h', tests: 412, status: 'Active' },
            { name: 'Saudi Drug Analysis Lab', turnaround: '72h', tests: 56, status: 'Active' },
          ].map((lab, i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.05)',borderRadius:8,padding:12}}>
              <p style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:4}}>{lab.name}</p>
              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                <span style={{width:8,height:8,background:'#00C896',borderRadius:9999}}></span>
                <span style={{fontSize:12,color:'#00C896'}}>{lab.status}</span>
              </div>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Avg: {lab.turnaround}</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>Tests: {lab.tests}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Value proposition */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:12,borderColor:'rgba(0,170,255,.1)',borderWidth:1,padding:16}}>
        <h3 style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.8)',marginBottom:12}}>Platform Impact — Before vs After DEMARA</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
          <div style={{background:'rgba(255,84,112,.06)',borderRadius:8,textAlign:'center',padding:16}}>
            <p style={{fontSize:12,color:'#FF5470',fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Without DEMARA</p>
            <p style={{fontSize:24,fontWeight:700,color:'#FF5470'}}>3-5 days</p>
            <p style={{fontSize:12,color:'#FF5470'}}>Delay after approval</p>
            <p style={{fontSize:24,fontWeight:700,color:'#FF5470',marginTop:8}}>Manual</p>
            <p style={{fontSize:12,color:'#FF5470'}}>Broker monitors Faseh manually</p>
            <p style={{fontSize:24,fontWeight:700,color:'#FF5470',marginTop:8}}>1 lab</p>
            <p style={{fontSize:12,color:'#FF5470'}}>Single point of failure</p>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontSize:36}}>→</div>
          </div>
          <div style={{background:'rgba(0,200,150,.06)',borderRadius:8,textAlign:'center',padding:16}}>
            <p style={{fontSize:12,color:'#00C896',fontWeight:600,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>With DEMARA</p>
            <p style={{fontSize:24,fontWeight:700,color:'#00C896'}}>{'< 1 hour'}</p>
            <p style={{fontSize:12,color:'#00C896'}}>Instant notification on approval</p>
            <p style={{fontSize:24,fontWeight:700,color:'#00C896',marginTop:8}}>Automatic</p>
            <p style={{fontSize:12,color:'#00C896'}}>AI reads SFDA emails instantly</p>
            <p style={{fontSize:24,fontWeight:700,color:'#00C896',marginTop:8}}>{4} labs</p>
            <p style={{fontSize:12,color:'#00C896'}}>Multiple certified labs available</p>
          </div>
        </div>
      </div>

      <div style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,.35)',paddingTop:8,paddingBottom:8}}>
        Data updated in real-time from the DEMARA platform · {new Date().toLocaleString('en-SA')}
      </div>
    </div>
  );
}

// ── Main Admin Panel ──
export default function AdminPanel({ user, token, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'shipments', label: 'Shipments', icon: '📦' },
    { id: 'email-parser', label: 'Email Parser', icon: '🤖' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'organisations', label: 'Organisations', icon: '🏢' },
    { id: 'clearance-performance', label: 'Performance', icon: '⚡' },
    { id: 'sfda-dashboard', label: 'SFDA Dashboard', icon: '🏛️' },
    { id: 'metrics', label: 'Platform Metrics', icon: '📈' },
  ];

  const navBtn = (on) => ({width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',marginBottom:3,fontFamily:'inherit',fontSize:12,textAlign:'left',transition:'all .15s',
    fontWeight:on ? 700 : 500,background:on ? 'rgba(0,170,255,.12)' : 'transparent',color:on ? '#38C6FF' : 'rgba(255,255,255,.5)',border:on ? '1px solid rgba(56,198,255,.3)' : '1px solid transparent'});

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#2D2B7A',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{DARK_CSS}</style>

      {/* ── Topbar ── */}
      <div style={{height:58,background:'#1E1A5E',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <img src="/logo_1.png" alt="DEMARA" style={{height:'52px', width:'auto', display:'block', objectFit:'contain'}} />
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>DEMARA Platform</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>DEMARA Masaar · Admin</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0) || 'D'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>DEMARA Admin</div></div>
            </div>
          )}
          <button onClick={onLogout}
            style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#2D2B7A',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          <div style={{padding:'16px 10px',flex:1}}>
            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:10,paddingLeft:4}}>Administration</div>
            {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              style={navBtn(activeSection === item.id)}>
              <span style={{fontSize:15}}>{item.icon}</span>
              <span style={{flex:1}}>{item.label}</span>
            </button>
          ))}
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)',textAlign:'center'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>🇸🇦 Data hosted in KSA</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:2}}>STC Cloud · demara.sa</div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={activeSection} style={{flex:1,overflowY:'auto',background:'#2D2B7A',padding:'20px 24px'}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>
            {NAV_ITEMS.find(n => n.id === activeSection)?.icon} {NAV_ITEMS.find(n => n.id === activeSection)?.label}
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>DEMARA Drug Import Traceability Platform</div>
          </div>

        {activeSection === 'overview' && <OverviewSection token={token} />}
        {activeSection === 'shipments' && <ShipmentsSection token={token} />}
        {activeSection === 'email-parser' && <EmailParserSection token={token} />}
        {activeSection === 'users' && <UsersSection token={token} />}
        {activeSection === 'organisations' && <OrganisationsSection token={token} />}
        {activeSection === 'clearance-performance' && <ClearancePerformanceSection token={token} />}
        {activeSection === 'sfda-dashboard' && <SFDADashboard token={token} />}
        {activeSection === 'metrics' && <MetricsSection token={token} />}
        </div>
      </div>
    </div>
  );
}