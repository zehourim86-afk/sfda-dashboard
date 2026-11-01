import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';

function elapsed(d) {
  if (!d) return '—';
  const h = Math.floor((new Date()-new Date(d))/3600000);
  return h<24?`${h}h`:`${Math.floor(h/24)}d ${h%24}h`;
}

const STATE = {
  RECORD_OPENED:    {label:'Awaiting Acceptance',text:'#F5A623',bg:'rgba(245,166,35,.1)',border:'rgba(245,166,35,.3)'},
  LAB_ACCEPTED:     {label:'Accepted',           text:'#00C896',bg:'rgba(0,200,150,.1)',  border:'rgba(0,200,150,.3)'},
  LAB_DECLINED:     {label:'Declined',           text:'#FF5470',bg:'rgba(255,84,112,.1)', border:'rgba(255,84,112,.3)'},
  LAB_RECEIVED:     {label:'Sample Received',    text:'#38C6FF',bg:'rgba(0,170,255,.1)', border:'rgba(0,170,255,.3)'},
  IN_ANALYSIS:      {label:'In Analysis',        text:'#a78bfa',bg:'rgba(124,92,252,.1)', border:'rgba(124,92,252,.3)'},
  ANALYSIS_COMPLETE:{label:'Analysis Complete',  text:'#F5A623',bg:'rgba(245,166,35,.1)', border:'rgba(245,166,35,.3)'},
  RESULT_SUBMITTED: {label:'Result Submitted',   text:'#00C896',bg:'rgba(0,200,150,.1)',  border:'rgba(0,200,150,.3)'},
  CONFORMING:       {label:'Conforming',         text:'#00C896',bg:'rgba(0,200,150,.1)',  border:'rgba(0,200,150,.3)'},
  NON_CONFORMING:   {label:'Non-Conforming',     text:'#FF5470',bg:'rgba(255,84,112,.1)', border:'rgba(255,84,112,.3)'},
  FINAL_CLEARANCE:  {label:'Final Clearance',    text:'#38C6FF',bg:'rgba(0,170,255,.1)', border:'rgba(0,170,255,.3)'},
};

const SFDA_TESTS = {
  'Food Supplement':[
    {name:'Heavy Metals',unit:'mg/kg',limit:'Pb<0.1, Cd<0.05, As<0.1, Hg<0.05'},
    {name:'Microbiological — Total Plate Count',unit:'CFU/g',limit:'<10,000'},
    {name:'Microbiological — Yeast & Mould',unit:'CFU/g',limit:'<100'},
    {name:'Microbiological — E.Coli',unit:'CFU/g',limit:'Absent in 1g'},
    {name:'Pesticide Residues',unit:'mg/kg',limit:'As per SFDA circular'},
    {name:'Aflatoxins (B1+B2+G1+G2)',unit:'µg/kg',limit:'<4 total'},
    {name:'Moisture Content',unit:'%',limit:'<10%'},
  ],
  'Cosmetic':[
    {name:'Microbiological — Total Aerobic Count',unit:'CFU/g',limit:'<1,000'},
    {name:'Microbiological — Yeast & Mould',unit:'CFU/g',limit:'<100'},
    {name:'Microbiological — Staphylococcus aureus',unit:'CFU/g',limit:'Absent in 1g'},
    {name:'Microbiological — Pseudomonas aeruginosa',unit:'CFU/g',limit:'Absent in 1g'},
    {name:'Heavy Metals — Lead',unit:'mg/kg',limit:'<10'},
    {name:'Heavy Metals — Arsenic',unit:'mg/kg',limit:'<5'},
    {name:'Heavy Metals — Mercury',unit:'mg/kg',limit:'<1'},
    {name:'Preservatives',unit:'%',limit:'As per SFDA positive list'},
    {name:'pH',unit:'pH',limit:'Manufacturer spec ±0.5'},
  ],
  'Food':[
    {name:'Microbiological — Total Plate Count',unit:'CFU/g',limit:'<100,000'},
    {name:'Microbiological — Coliforms',unit:'CFU/g',limit:'<10'},
    {name:'Microbiological — Salmonella',unit:'/25g',limit:'Absent'},
    {name:'Microbiological — Listeria',unit:'/25g',limit:'Absent'},
    {name:'Aflatoxins',unit:'µg/kg',limit:'<4'},
    {name:'Pesticide Residues',unit:'mg/kg',limit:'As per Codex MRL'},
    {name:'Heavy Metals',unit:'mg/kg',limit:'As per SFDA standard'},
    {name:'Nutritional Labeling Verification',unit:'per 100g',limit:'±20% of declared'},
  ],
  'Default':[
    {name:'Microbiological — Total Plate Count',unit:'CFU/g',limit:'<100,000'},
    {name:'Heavy Metals',unit:'mg/kg',limit:'As per SFDA standard'},
    {name:'Pesticide Residues',unit:'mg/kg',limit:'As per SFDA standard'},
  ]
};

function getTests(name) {
  const n=(name||'').toLowerCase();
  if(n.includes('supplement')||n.includes('vitamin')||n.includes('capsule')||n.includes('tablet')) return SFDA_TESTS['Food Supplement'];
  if(n.includes('cream')||n.includes('lotion')||n.includes('serum')||n.includes('cosmetic')||n.includes('shampoo')) return SFDA_TESTS['Cosmetic'];
  if(n.includes('food')||n.includes('juice')||n.includes('sauce')||n.includes('oil')||n.includes('spice')) return SFDA_TESTS['Food'];
  return SFDA_TESTS['Default'];
}

// ── Shared styles ────────────────────────────────────────────────
const C = {
  // Layout
  page:     'display:flex;flex-direction:column;min-height:100vh;background:#0B1535;font-family:Inter,sans-serif;color:#fff',
  body:     'display:flex;flex:1;overflow:hidden',
  sidebar:  'width:220px;background:#0D1940;border-right:1px solid rgba(0,170,255,.08);display:flex;flex-direction:column;flex-shrink:0;height:calc(100vh - 58px)',
  content:  'flex:1;overflow-y:auto;background:#0B1535',
  // Cards
  card:     'background:rgba(255,255,255,.03);border:1px solid rgba(0,170,255,.1);border-radius:14px;padding:18px',
  cardHover:'background:rgba(255,255,255,.03);border:1px solid rgba(0,170,255,.1);border-radius:14px;padding:18px;transition:all .2s;cursor:pointer',
};

function badge(state) {
  const s = STATE[state]||{text:'rgba(255,255,255,.5)',bg:'rgba(255,255,255,.08)',border:'rgba(255,255,255,.15)',label:state};
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:s.bg,color:s.text,border:`1px solid ${s.border}`}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:s.text,flexShrink:0}}></span>
      {s.label}
    </span>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────
function Donut({data,size=130}) {
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total) return <div style={{textAlign:'center',color:'rgba(255,255,255,.2)',fontSize:12,padding:20}}>No data yet</div>;
  let off=0;
  const r=44,cx=size/2,cy=size/2,circ=2*Math.PI*r;
  return (
    <div style={{display:'flex',alignItems:'center',gap:18}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={16}/>
        {data.map((d,i)=>{
          const pct=d.value/total,dash=circ*pct,gap=circ-dash,rot=off*360-90;
          off+=pct;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={16}
            strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rot} ${cx} ${cy})`}/>;
        })}
        <text x={cx} y={cy-5} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fff">{total}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,.3)" fontFamily="Inter, sans-serif">TOTAL</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {data.filter(d=>d.value>0).map((d,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:11}}>
            <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}></div>
            <span style={{color:'rgba(255,255,255,.5)',flex:1}}>{d.label}</span>
            <span style={{fontWeight:700,color:'#fff'}}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Completed Detail Modal ───────────────────────────────────────
function DetailModal({shipment,token,onClose}) {
  const [detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch(`${API_URL}/shipments/${shipment.id}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(d=>{setDetail(d.shipment);setLoading(false);}).catch(()=>setLoading(false));
  },[shipment.id,token]);
  const dc={APPROVED:'#00C896',REJECTED:'#FF5470',CONDITIONALLY_APPROVED:'#F5A623'};
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'}}>
      <div style={{background:'#0D1940',border:'1px solid rgba(0,170,255,.2)',borderRadius:18,width:'100%',maxWidth:860,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(0,170,255,.1)'}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>📋 {shipment.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{shipment.importer_name} · {shipment.shipment_country} · Full Analysis Report</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>×</button>
        </div>
        <div style={{padding:'20px 24px'}}>
          {loading ? <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>Loading...</div> : detail ? (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>{badge(detail.current_state)}<span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>Updated {formatDate(detail.updated_at)}</span></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
                {[['Faseh Reference',detail.faseh_request_number,'#38C6FF'],['GHAD CR',detail.ghad_cr_number||'—','#fff'],['Importer',detail.importer_name,'#fff'],['Country',detail.shipment_country,'#fff'],['Port of Entry',detail.port_of_entry||'—','#fff'],['Lab',detail.lab_name||'—','#fff']].map(([l,v,c],i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 14px'}}>
                    <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:c,fontFamily:l==='Faseh Reference'?'JetBrains Mono,monospace':'inherit'}}>{v}</div>
                  </div>
                ))}
              </div>
              {detail.products?.length>0&&(
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Product Analysis Results</div>
                  {detail.products.map((p,i)=>(
                    <div key={i} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'12px 16px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{p.product_name_en}</div>
                        {p.ecos_ma_number&&<div style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:2}}>E-Cosma: {p.ecos_ma_number}</div>}
                        {p.decision_notes&&<div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:6,lineHeight:1.5}}>{p.decision_notes}</div>}
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:dc[p.current_decision]||'rgba(255,255,255,.4)',background:`${dc[p.current_decision]||'rgba(255,255,255,.05)'}18`,border:`1px solid ${dc[p.current_decision]||'rgba(255,255,255,.1)'}33`,padding:'4px 12px',borderRadius:20,flexShrink:0,marginLeft:16}}>
                        {p.current_decision==='APPROVED'?'✓ Approved':p.current_decision==='REJECTED'?'✕ Rejected':p.current_decision==='CONDITIONALLY_APPROVED'?'⚠ Conditional':'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {detail.audit_log?.length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Audit Trail</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:180,overflowY:'auto'}}>
                    {detail.audit_log.slice().reverse().map((log,i)=>(
                      <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:'#38C6FF',marginTop:4,flexShrink:0}}></div>
                        <div style={{flex:1,fontSize:11,color:'rgba(255,255,255,.65)'}}>{log.trigger_event||`${log.from_state} → ${log.to_state}`}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,.25)',flexShrink:0}}>{formatDate(log.occurred_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>Failed to load</div>}
        </div>
      </div>
    </div>
  );
}

// ── Submit Result Modal ──────────────────────────────────────────
function ResultModal({shipment,token,onClose,onRefresh}) {
  const [acting,setActing]=useState(false);
  const [error,setError]=useState(null);
  const [products,setProducts]=useState([]);
  const [labRef,setLabRef]=useState('');
  const [notes,setNotes]=useState('');
  const [internalNote,setInternalNote]=useState('');
  const [retest,setRetest]=useState(false);
  const [mode,setMode]=useState('upload');
  const [file,setFile]=useState(null);
  const [extracting,setExtracting]=useState(false);
  const [extracted,setExtracted]=useState(false);
  const [showTests,setShowTests]=useState({});

  useEffect(()=>{
    if(shipment.products){
      setProducts(shipment.products.map(p=>({...p,result:'APPROVED',test_name:'',result_value:'',reference_range:'',pnotes:'',tests:getTests(p.product_name_en)})));
    }
  },[shipment]);

  const upd=(i,f,v)=>{const r=[...products];r[i][f]=v;setProducts(r);};

  const handleFile=async(f)=>{
    setFile(f);setExtracting(true);setError(null);
    try{
      const content=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(f);});
      const resp=await fetch(`${API_URL}/assistant/extract-lab-results`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({fileContent:content,fileName:f.name,products:shipment.products||[]})});
      const data=await resp.json();
      const ex=Array.isArray(data.result)?data.result:[];
      if(ex.length>0){
        setProducts(prev=>prev.map((p,i)=>{const m=ex.find(e=>e.product_index===i);return m?{...p,result:m.result||'APPROVED',test_name:m.test_name||'',result_value:m.result_value||'',reference_range:m.reference_range||'',pnotes:m.notes||''}:p;}));
        setExtracted(true);setMode('manual');
      } else {setMode('manual');}
    }catch{setMode('manual');}finally{setExtracting(false);}
  };

  const startAnalysis=async()=>{
    setActing(true);
    try{await fetch(`${API_URL}/shipments/${shipment.id}/transition`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({new_state:'IN_ANALYSIS',notes:'Lab started analysis',trigger_source:'MANUAL'})});onRefresh();onClose();}
    catch{setError('Failed to update');}finally{setActing(false);}
  };

  const submit=async()=>{
    if(!labRef.trim()){setError('Lab reference number is required');return;}
    setActing(true);setError(null);
    try{
      for(const p of products){
        await fetch(`${API_URL}/shipments/${shipment.id}/products/${p.id}/decision`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({decision:p.result,decision_notes:[p.test_name&&`Test: ${p.test_name}`,p.result_value&&`Value: ${p.result_value}`,p.reference_range&&`Range: ${p.reference_range}`,p.pnotes].filter(Boolean).join(' | ')})});
      }
      await fetch(`${API_URL}/shipments/${shipment.id}/transition`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({new_state:'RESULT_SUBMITTED',notes:[`Lab Reference: ${labRef}`,file&&`File: ${file.name}`,notes&&`Notes: ${notes}`,internalNote&&`Internal: ${internalNote}`,retest&&'⚠ Re-test requested'].filter(Boolean).join('. '),trigger_source:'MANUAL'})});
      onRefresh();onClose();
    }catch{setError('Failed to submit');}finally{setActing(false);}
  };

  const ipt={width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none'};
  const lbl={fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,display:'block'};
  const rsel=(v)=>{const c={APPROVED:'rgba(0,200,150,.12)',REJECTED:'rgba(255,84,112,.12)',CONDITIONALLY_APPROVED:'rgba(245,166,35,.12)'};const t={APPROVED:'#00C896',REJECTED:'#FF5470',CONDITIONALLY_APPROVED:'#F5A623'};return{background:c[v]||'rgba(255,255,255,.06)',border:`1px solid ${t[v]||'rgba(255,255,255,.15)'}`,color:t[v]||'#fff',padding:'7px 12px',borderRadius:7,fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',outline:'none'};};

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'}}>
      <div style={{background:'#0D1940',border:'1px solid rgba(0,170,255,.15)',borderRadius:18,width:'100%',maxWidth:680,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'linear-gradient(180deg,rgba(0,170,255,.05),transparent)'}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>{shipment.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{shipment.importer_name} · {shipment.shipment_country}</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        </div>

        <div style={{padding:'18px 22px'}}>
          {error&&<div style={{background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470',marginBottom:14}}>{error}</div>}

          {/* Status row */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            {badge(shipment.current_state)}
            <span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>Since {formatDate(shipment.state_entered_at)}</span>
            {shipment.current_state==='IN_ANALYSIS'&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:'#a78bfa'}}>⏱ {elapsed(shipment.state_entered_at)} elapsed</span>}
          </div>

          {/* Info grid */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
            {[['Faseh Reference',shipment.faseh_request_number,'#38C6FF',true],['GHAD CR',shipment.ghad_cr_number||'—','#fff',false],['Importer',shipment.importer_name,'#fff',false],['Country',shipment.shipment_country,'#fff',false]].map(([l,v,c,mono],i)=>(
              <div key={i} style={{background:'rgba(0,170,255,.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:9,padding:'8px 12px'}}>
                <div style={lbl}>{l}</div>
                <div style={{fontSize:13,fontWeight:600,color:c,fontFamily:mono?'JetBrains Mono,monospace':'inherit'}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Start analysis */}
          {shipment.current_state==='LAB_RECEIVED'&&(
            <button onClick={startAnalysis} disabled={acting} style={{width:'100%',padding:12,background:'linear-gradient(135deg,rgba(0,170,255,.2),rgba(0,170,255,.1))',border:'1px solid rgba(0,170,255,.3)',color:'#38C6FF',fontSize:13,fontWeight:700,borderRadius:10,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>
              {acting?'Processing...':'▶ Start Analysis'}
            </button>
          )}

          {/* IN_ANALYSIS form */}
          {shipment.current_state==='IN_ANALYSIS'&&(
            <div>
              {/* Confirm box */}
              <div style={{background:'rgba(245,166,35,.05)',border:'1px solid rgba(245,166,35,.2)',borderRadius:10,padding:'10px 14px',marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#F5A623',marginBottom:6}}>⚠️ Confirm this is the correct shipment before submitting</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <div><div style={{fontSize:9,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Faseh Ref</div><div style={{fontSize:12,fontWeight:700,color:'#38C6FF',fontFamily:'JetBrains Mono,monospace'}}>{shipment.faseh_request_number}</div></div>
                  <div><div style={{fontSize:9,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px'}}>Products</div><div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{shipment.products?.length||'—'} products</div></div>
                </div>
              </div>

              {/* Lab ref */}
              <div style={{marginBottom:14}}><label style={lbl}>Lab Reference Number *</label><input style={ipt} value={labRef} onChange={e=>setLabRef(e.target.value)} placeholder="e.g. LAB-SA-2026-00441"/></div>

              {/* Mode toggle */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                {[['📤 Upload Result Report','upload','#38C6FF','rgba(0,170,255,.15)','rgba(0,170,255,.3)'],['✏️ Enter Manually','manual','#a78bfa','rgba(124,92,252,.15)','rgba(124,92,252,.3)']].map(([label,m,c,bg,border])=>(
                  <button key={m} onClick={()=>setMode(m)} style={{padding:'11px',fontSize:12,fontWeight:700,borderRadius:10,cursor:'pointer',fontFamily:'inherit',transition:'all .2s',background:mode===m?bg:'rgba(255,255,255,.04)',border:`1px solid ${mode===m?border:'rgba(255,255,255,.1)'}`,color:mode===m?c:'rgba(255,255,255,.4)'}}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Upload mode */}
              {mode==='upload'&&(
                <div>
                  <div style={{border:'2px dashed rgba(0,170,255,.2)',borderRadius:12,padding:28,textAlign:'center',background:'rgba(0,170,255,.02)',marginBottom:14}}>
                    {extracting?(
                      <div><div style={{fontSize:28,marginBottom:10}}>🤖</div><div style={{fontSize:13,fontWeight:700,color:'#38C6FF',marginBottom:4}}>AI is reading your report...</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>Extracting results, test values, and decisions</div></div>
                    ):extracted?(
                      <div><div style={{fontSize:28,marginBottom:10}}>✅</div><div style={{fontSize:13,fontWeight:700,color:'#00C896',marginBottom:4}}>Extraction complete</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:10}}>{file?.name}</div><button onClick={()=>{setExtracted(false);setFile(null);}} style={{fontSize:11,padding:'5px 12px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.6)',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>Upload different file</button></div>
                    ):(
                      <div>
                        <div style={{fontSize:36,marginBottom:12}}>📄</div>
                        <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:6}}>Upload Lab Result Report</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:18}}>PDF · Excel (.xlsx) · CSV · Word (.docx)</div>
                        <label style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 22px',background:'linear-gradient(135deg,rgba(0,170,255,.2),rgba(0,170,255,.1))',border:'1px solid rgba(0,170,255,.3)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer'}}>
                          📁 Choose File
                          <input type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt" style={{display:'none'}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Required tests */}
                  {shipment.products?.length>0&&!extracting&&(
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Required Tests — SFDA Standards</div>
                      {shipment.products.map((p,i)=>{
                        const tests=getTests(p.product_name_en);
                        const open=showTests[i];
                        return(
                          <div key={i} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,marginBottom:8,overflow:'hidden'}}>
                            <div onClick={()=>setShowTests(prev=>({...prev,[i]:!open}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',cursor:'pointer'}}>
                              <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{p.product_name_en}</div>
                              <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>{tests.length} tests</span><span style={{color:'#38C6FF',fontSize:11}}>{open?'▲':'▼'}</span></div>
                            </div>
                            {open&&(
                              <table style={{width:'100%',borderCollapse:'collapse',borderTop:'1px solid rgba(255,255,255,.06)'}}>
                                <thead><tr><th style={{padding:'7px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',background:'rgba(255,255,255,.02)'}}>Test</th><th style={{padding:'7px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',background:'rgba(255,255,255,.02)'}}>Unit</th><th style={{padding:'7px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',background:'rgba(255,255,255,.02)'}}>SFDA Limit</th></tr></thead>
                                <tbody>{tests.map((t,j)=><tr key={j}><td style={{padding:'7px 14px',fontSize:11,color:'rgba(255,255,255,.65)',borderBottom:'1px solid rgba(255,255,255,.04)'}}>{t.name}</td><td style={{padding:'7px 14px',fontSize:11,color:'rgba(255,255,255,.35)',borderBottom:'1px solid rgba(255,255,255,.04)'}}>{t.unit}</td><td style={{padding:'7px 14px',fontSize:11,color:'#38C6FF',borderBottom:'1px solid rgba(255,255,255,.04)'}}>{t.limit}</td></tr>)}</tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {mode==='manual'&&(
                <div style={{marginBottom:14}}>
                  {extracted&&<div style={{background:'rgba(0,200,150,.06)',border:'1px solid rgba(0,200,150,.2)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#00C896',fontWeight:600}}>🤖 AI extracted results from {file?.name} — review and confirm below</div>}
                  <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Per-Product Results</div>
                  {products.map((p,i)=>(
                    <div key={p.id} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:14,marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                        <div><div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{p.product_name_en}</div>{p.ecos_ma_number&&<div style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:2}}>E-Cosma: {p.ecos_ma_number}</div>}</div>
                        <select style={rsel(p.result)} value={p.result} onChange={e=>upd(i,'result',e.target.value)}><option value="APPROVED">✓ APPROVED</option><option value="CONDITIONALLY_APPROVED">⚠ CONDITIONAL</option><option value="REJECTED">✕ REJECTED</option></select>
                      </div>
                      <div style={{marginBottom:8}}>
                        <label style={lbl}>Test Performed</label>
                        <div style={{display:'flex',gap:6}}>
                          <input style={{...ipt,flex:1}} value={p.test_name||''} onChange={e=>upd(i,'test_name',e.target.value)} placeholder="e.g. Heavy Metals"/>
                          {p.tests?.length>0&&<select style={{...ipt,width:'auto',cursor:'pointer',color:'rgba(255,255,255,.4)',fontSize:11}} value="" onChange={e=>{if(e.target.value){const t=p.tests.find(x=>x.name===e.target.value);upd(i,'test_name',t.name);upd(i,'reference_range',t.limit);}}}><option value="">SFDA Tests ▼</option>{p.tests.map((t,j)=><option key={j} value={t.name}>{t.name}</option>)}</select>}
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                        <div><label style={lbl}>Measured Value</label><input style={ipt} value={p.result_value||''} onChange={e=>upd(i,'result_value',e.target.value)} placeholder="e.g. 0.5 mg/kg"/></div>
                        <div><label style={lbl}>Reference Range</label><input style={ipt} value={p.reference_range||''} onChange={e=>upd(i,'reference_range',e.target.value)} placeholder="e.g. Max 1.0 mg/kg"/></div>
                      </div>
                      <div><label style={lbl}>Lab Notes {p.result==='REJECTED'?'(required)':'(optional)'}</label><textarea style={{...ipt,resize:'vertical'}} value={p.pnotes||''} onChange={e=>upd(i,'pnotes',e.target.value)} rows={2} placeholder={p.result==='REJECTED'?'Describe non-conformity reason...':'Any observations...'}/></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer fields */}
              <div style={{marginBottom:10}}><label style={lbl}>Overall Notes</label><textarea style={{...ipt,resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="General analysis notes..."/></div>
              <div style={{marginBottom:12}}><label style={lbl}>Internal Lab Note (not shared with SFDA)</label><textarea style={{...ipt,resize:'vertical'}} value={internalNote} onChange={e=>setInternalNote(e.target.value)} rows={2} placeholder="Internal observations for lab records only..."/></div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',background:'rgba(255,84,112,.04)',border:'1px solid rgba(255,84,112,.15)',borderRadius:9}}>
                <input type="checkbox" id="retest" checked={retest} onChange={e=>setRetest(e.target.checked)} style={{width:14,height:14,cursor:'pointer',accentColor:'#FF5470'}}/>
                <label htmlFor="retest" style={{fontSize:12,color:'rgba(255,255,255,.6)',cursor:'pointer'}}>⚠ Flag one or more products for re-testing before final submission</label>
              </div>
              <button onClick={submit} disabled={acting} style={{width:'100%',padding:13,background:'linear-gradient(135deg,#38C6FF,#0088DD)',color:'#0D1940',fontSize:13,fontWeight:800,borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 20px rgba(0,170,255,.3)'}}>
                {acting?'Submitting...':'✓ Submit Results to SFDA'}
              </button>
            </div>
          )}

          {shipment.current_state==='RESULT_SUBMITTED'&&(
            <div style={{background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:12,padding:20,textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:8}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:'#00C896',marginBottom:4}}>Results submitted successfully</div>
              <div style={{fontSize:12,color:'rgba(0,200,150,.6)'}}>SFDA has been notified. Awaiting their decision.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────────
function Analytics({shipments}) {
  const completed=shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING','NON_CONFORMING','FINAL_CLEARANCE'].includes(s.current_state));
  const conforming=shipments.filter(s=>['CONFORMING','FINAL_CLEARANCE'].includes(s.current_state)).length;
  const nc=shipments.filter(s=>s.current_state==='NON_CONFORMING').length;
  const submitted=shipments.filter(s=>s.current_state==='RESULT_SUBMITTED').length;
  const inAnalysis=shipments.filter(s=>s.current_state==='IN_ANALYSIS').length;
  const pending=shipments.filter(s=>s.current_state==='RECORD_OPENED').length;
  const rate=completed.length>0?Math.round(conforming/completed.length*100):0;

  const cMap={};shipments.forEach(s=>{if(s.shipment_country)cMap[s.shipment_country]=(cMap[s.shipment_country]||0)+1;});
  const countries=Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxC=countries[0]?.[1]||1;

  const nMap={};shipments.filter(s=>s.current_state==='NON_CONFORMING').forEach(s=>{if(s.shipment_country)nMap[s.shipment_country]=(nMap[s.shipment_country]||0)+1;});
  const ncC=Object.entries(nMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxN=ncC[0]?.[1]||1;

  const metrics=[
    {label:'Conformity Rate',value:`${rate}%`,color:'#00C896',sub:`${conforming} of ${completed.length} completed`,icon:'✅'},
    {label:'Non-Conforming',value:nc,color:'#FF5470',sub:'Shipments with failures',icon:'⚠️'},
    {label:'Avg Turnaround',value:'36h',color:'#38C6FF',sub:'vs 48h SFDA target',icon:'⏱'},
    {label:'Total Completed',value:completed.length,color:'#fff',sub:'All time analyses',icon:'🔬'},
  ];

  return (
    <div style={{padding:'20px 24px'}}>
      {/* Metric cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {metrics.map((m,i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${m.color},transparent)`}}></div>
            <div style={{fontSize:20,marginBottom:8}}>{m.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>{m.label}</div>
            <div style={{fontSize:32,fontWeight:900,color:m.color,lineHeight:1,letterSpacing:'-1px',marginBottom:4}}>{m.value}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.25)'}}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>Current Workload</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:16}}>Status distribution of all assigned shipments</div>
          <Donut data={[{label:'In Analysis',value:inAnalysis,color:'#a78bfa'},{label:'Pending Acceptance',value:pending,color:'#F5A623'},{label:'Conforming',value:conforming,color:'#00C896'},{label:'Non-Conforming',value:nc,color:'#FF5470'},{label:'Result Submitted',value:submitted,color:'#38C6FF'}]}/>
        </div>
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>Conformity Outcomes</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:16}}>Final decisions on completed analyses</div>
          <Donut data={[{label:'Conforming',value:conforming,color:'#00C896'},{label:'Non-Conforming',value:nc,color:'#FF5470'},{label:'Awaiting Decision',value:submitted,color:'#38C6FF'}]}/>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>Shipments by Country</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:16}}>Top origin countries</div>
          {countries.length===0?<div style={{fontSize:12,color:'rgba(255,255,255,.2)'}}>No data</div>:countries.map(([c,n],i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.55)',width:70,textAlign:'right',flexShrink:0}}>{c}</div>
              <div style={{flex:1,height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}><div style={{width:`${Math.round(n/maxC*100)}%`,height:'100%',background:'#38C6FF',borderRadius:3}}></div></div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.55)',width:24,flexShrink:0}}>{n}</div>
            </div>
          ))}
        </div>
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>Non-Conformity by Country</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginBottom:16}}>Countries with highest rejection rates</div>
          {ncC.length===0?<div style={{fontSize:12,color:'rgba(0,200,150,.5)',fontWeight:600}}>✅ No non-conforming shipments</div>:ncC.map(([c,n],i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.55)',width:70,textAlign:'right',flexShrink:0}}>{c}</div>
              <div style={{flex:1,height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}><div style={{width:`${Math.round(n/maxN*100)}%`,height:'100%',background:'#FF5470',borderRadius:3}}></div></div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.55)',width:24,flexShrink:0}}>{n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────
export default function LabPortal({user:initUser,token,onLogout}) {
  const [user,setUser]=useState(initUser);
  const [shipments,setShipments]=useState([]);
  const [selected,setSelected]=useState(null);
  const [viewing,setViewing]=useState(null);
  const [declining,setDeclining]=useState(null);
  const [declineReason,setDeclineReason]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [tab,setTab]=useState('active');

  const fetch2=async()=>{
    try{
      setLoading(true);
      const [sRes,mRes]=await Promise.all([fetch(`${API_URL}/shipments`,{headers:{Authorization:`Bearer ${token}`}}),fetch(`${API_URL}/auth/me`,{headers:{Authorization:`Bearer ${token}`}})]);
      const sD=await sRes.json();const mD=await mRes.json();
      setShipments(sD.shipments||[]);if(mD.user)setUser(mD.user);setError(null);
    }catch{setError('Failed to connect.');}finally{setLoading(false);}
  };

  const labResponse=async(id,response,reason)=>{
    try{const r=await fetch(`${API_URL}/shipments/${id}/lab-response`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({response,decline_reason:reason})});const d=await r.json();if(d.success){fetch2();setDeclining(null);setDeclineReason('');}}catch{console.error('Lab response failed');}
  };

  const fetchDetail=async(s)=>{const r=await fetch(`${API_URL}/shipments/${s.id}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();setSelected(d.shipment);};

  useEffect(()=>{fetch2();const iv=setInterval(()=>{if(!selected&&!declining&&!viewing)fetch2();},30000);return()=>clearInterval(iv);},[selected,declining,viewing]);

  const active=shipments.filter(s=>['RECORD_OPENED','LAB_ACCEPTED','LAB_DECLINED','LAB_RECEIVED','IN_ANALYSIS'].includes(s.current_state));
  const completed=shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING','NON_CONFORMING','FINAL_CLEARANCE'].includes(s.current_state));
  const inAnalysis=shipments.filter(s=>s.current_state==='IN_ANALYSIS');
  const awaiting=shipments.filter(s=>s.current_state==='LAB_RECEIVED');
  const pending=shipments.filter(s=>s.current_state==='RECORD_OPENED');
  const ncList=shipments.filter(s=>s.current_state==='NON_CONFORMING');

  const rows=tab==='active'?active.filter(s=>s.current_state!=='LAB_DECLINED'):tab==='declined'?active.filter(s=>s.current_state==='LAB_DECLINED'):tab==='completed'?completed:tab==='nc'?ncList:[];

  const navItems=[
    {id:'active',icon:'🔬',label:'Active',count:active.filter(s=>s.current_state!=='LAB_DECLINED').length,color:'#38C6FF'},
    {id:'declined',icon:'✕',label:'Declined',count:active.filter(s=>s.current_state==='LAB_DECLINED').length,color:'#FF5470'},
    {id:'completed',icon:'✅',label:'Completed',count:completed.length,color:'#00C896'},
    {id:'nc',icon:'⚠️',label:'Non-Conformity',count:ncList.length,color:'#FF5470'},
    {id:'analytics',icon:'📊',label:'Analytics',count:null,color:'#a78bfa'},
  ];
  if(user?.is_org_admin) navItems.push({id:'org-admin',icon:'👥',label:'Organisation',count:null,color:'#00C896'});

  const kpis=[
    {label:'Awaiting Start',value:awaiting.length,color:'#38C6FF',icon:'📥'},
    {label:'In Analysis',value:inAnalysis.length,color:'#a78bfa',icon:'🔬'},
    {label:'Pending Accept',value:pending.length,color:'#F5A623',icon:'⏳'},
    {label:'Completed',value:completed.length,color:'#00C896',icon:'✅'},
    {label:'Non-Conforming',value:ncList.length,color:'#FF5470',icon:'⚠️'},
    {label:'Total Assigned',value:shipments.length,color:'#fff',icon:'📦'},
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#0B1535',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
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
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>DEMARA Masaar · QC Lab Portal</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          <NotificationBell token={token}/>
          {user&&(
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#38C6FF,#1E3A8A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{user.full_name?.charAt(0)||'L'}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>Lab Analyst</div></div>
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
              {kpis.map((k,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)'}}>
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
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>setTab(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',marginBottom:3,fontFamily:'inherit',fontSize:12,fontWeight:tab===n.id?700:500,background:tab===n.id?`rgba(${n.color==='#38C6FF'?'0,170,255':n.color==='#FF5470'?'255,84,112':n.color==='#00C896'?'0,200,150':n.color==='#a78bfa'?'124,92,252':'255,255,255'},.12)`:'transparent',color:tab===n.id?n.color:'rgba(255,255,255,.45)',border:tab===n.id?`1px solid ${n.color}33`:'1px solid transparent',transition:'all .15s',textAlign:'left'}}>
                <span style={{fontSize:15}}>{n.icon}</span>
                <span style={{flex:1}}>{n.label}</span>
                {n.count!=null&&n.count>0&&<span style={{fontSize:10,fontWeight:700,background:tab===n.id?n.color:'rgba(255,255,255,.1)',color:tab===n.id?'#0D1940':'rgba(255,255,255,.5)',padding:'1px 7px',borderRadius:10}}>{n.count}</span>}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)'}}>
            <button onClick={fetch2} style={{width:'100%',padding:'9px',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.2)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={tab} style={{flex:1,overflowY:'auto',background:'#0B1535'}}>

          {/* Alert cards */}
          {(awaiting.length>0||inAnalysis.length>0)&&tab!=='analytics'&&(
            <div style={{display:'grid',gridTemplateColumns:awaiting.length>0&&inAnalysis.length>0?'1fr 1fr':'1fr',gap:12,padding:'16px 20px 0'}}>
              {awaiting.length>0&&(
                <div style={{background:'rgba(0,170,255,.05)',border:'1px solid rgba(0,170,255,.18)',borderRadius:12,padding:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#38C6FF',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><span>📥</span>Samples Awaiting Analysis Start</div>
                  {awaiting.map(s=>(
                    <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',borderRadius:8,padding:'7px 12px',marginBottom:5,border:'1px solid rgba(255,255,255,.05)'}}>
                      <div><div style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</div><div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:1}}>{s.importer_name}</div></div>
                      <span style={{fontSize:11,fontWeight:700,color:'#38C6FF'}}>{elapsed(s.state_entered_at)} waiting</span>
                    </div>
                  ))}
                </div>
              )}
              {inAnalysis.length>0&&(
                <div style={{background:'rgba(124,92,252,.05)',border:'1px solid rgba(124,92,252,.18)',borderRadius:12,padding:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#a78bfa',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><span>🔬</span>Currently In Analysis</div>
                  {inAnalysis.map(s=>(
                    <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',borderRadius:8,padding:'7px 12px',marginBottom:5,border:'1px solid rgba(255,255,255,.05)'}}>
                      <div><div style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#a78bfa'}}>{s.faseh_request_number}</div><div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:1}}>{s.importer_name}</div></div>
                      <span style={{fontSize:11,fontWeight:700,color:'#a78bfa'}}>{elapsed(s.state_entered_at)} elapsed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics */}
          {tab==='analytics'&&<Analytics shipments={shipments}/>}

          {/* Org admin */}
          {tab==='org-admin'&&<OrgAdminPanel token={token}/>}

          {/* Table */}
          {['active','declined','completed','nc'].includes(tab)&&(
            <div style={{margin:'16px 20px 24px'}}>
              {/* Table header */}
              <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{tab==='active'?'Active Assignments':tab==='declined'?'Declined Assignments':tab==='nc'?'Non-Conformity Log':'Completed Analyses'}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2}}>{rows.length} record{rows.length!==1?'s':''}</div>
                </div>
              </div>

              {error&&<div style={{background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470',marginBottom:12}}>{error}</div>}

              {loading?(
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.25)'}}>
                  <div style={{fontSize:28,marginBottom:10}}>⏳</div>
                  <div style={{fontSize:14}}>Loading shipments...</div>
                </div>
              ):rows.length===0?(
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,.2)'}}>
                  <div style={{fontSize:36,marginBottom:12}}>🔬</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6,color:'rgba(255,255,255,.4)'}}>No samples in this queue</div>
                  <div style={{fontSize:12}}>{tab==='active'?'Samples appear here when assigned to your lab':tab==='declined'?'Declined assignments appear here':tab==='nc'?'Non-conforming shipments appear here':'Completed analyses appear here'}</div>
                </div>
              ):(
                <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'rgba(0,170,255,.04)'}}>
                        {['Faseh Reference','Importer','Country','Products','Status','Since','Action'].map(h=>(
                          <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(s=>(
                        <tr key={s.id} className="row" style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                          <td style={{padding:'13px 16px'}}><span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span></td>
                          <td style={{padding:'13px 16px'}}><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.importer_name}</div></td>
                          <td style={{padding:'13px 16px'}}><span style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{s.shipment_country}</span></td>
                          <td style={{padding:'13px 16px'}}><span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{s.product_count||'—'} products</span></td>
                          <td style={{padding:'13px 16px'}}>{badge(s.current_state)}</td>
                          <td style={{padding:'13px 16px'}}><span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{formatDate(s.state_entered_at)}</span></td>
                          <td style={{padding:'13px 16px'}}>
                            {s.current_state==='RECORD_OPENED'&&(
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={()=>labResponse(s.id,'ACCEPTED')} style={{background:'rgba(0,200,150,.12)',border:'1px solid rgba(0,200,150,.25)',color:'#00C896',fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>✓ Accept</button>
                                <button onClick={()=>setDeclining(s)} style={{background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>✕ Decline</button>
                              </div>
                            )}
                            {s.current_state==='LAB_ACCEPTED'&&<span style={{fontSize:11,color:'#00C896',fontWeight:600}}>✓ Accepted — Awaiting Sample</span>}
                            {['LAB_RECEIVED','IN_ANALYSIS'].includes(s.current_state)&&(
                              <button onClick={()=>fetchDetail(s)} style={{background:'rgba(0,170,255,.12)',border:'1px solid rgba(0,170,255,.25)',color:'#38C6FF',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>
                                {s.current_state==='LAB_RECEIVED'?'▶ Start Analysis':'📋 Enter Results'}
                              </button>
                            )}
                            {['RESULT_SUBMITTED','CONFORMING','NON_CONFORMING','FINAL_CLEARANCE'].includes(s.current_state)&&(
                              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                <span style={{fontSize:11,color:'#00C896',fontWeight:600}}>✓ Submitted</span>
                                <button onClick={()=>setViewing(s)} style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.55)',fontSize:11,fontWeight:600,padding:'5px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>View ↗</button>
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

      {/* ── Decline modal ── */}
      {declining&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'#0D1940',border:'1px solid rgba(0,170,255,.15)',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 24px 80px rgba(0,0,0,.8)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)'}}>
              <div><div style={{fontSize:15,fontWeight:800,color:'#fff'}}>Decline Assignment</div><div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{declining.faseh_request_number}</div></div>
              <button onClick={()=>{setDeclining(null);setDeclineReason('');}} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>
            <div style={{padding:'18px 22px'}}>
              <label style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:5,display:'block'}}>Reason for declining *</label>
              <textarea value={declineReason} onChange={e=>setDeclineReason(e.target.value)} rows={3} placeholder="Please provide a reason..." style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none',resize:'vertical'}}/>
              <div style={{display:'flex',gap:10,marginTop:14}}>
                <button onClick={()=>labResponse(declining.id,'DECLINED',declineReason)} disabled={!declineReason.trim()} style={{flex:1,padding:11,background:'rgba(255,84,112,.8)',border:'none',color:'#fff',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>Confirm Decline</button>
                <button onClick={()=>{setDeclining(null);setDeclineReason('');}} style={{padding:'10px 16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:12,fontWeight:600,borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected&&<ResultModal shipment={selected} token={token} onClose={()=>setSelected(null)} onRefresh={()=>{fetch2();setSelected(null);}}/>}
      {viewing&&<DetailModal shipment={viewing} token={token} onClose={()=>setViewing(null)}/>}
    </div>
  );
}
