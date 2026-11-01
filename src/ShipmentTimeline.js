import { useState, useEffect } from 'react';
import { API_URL } from './constants';

const STATE_COLORS = {
  FINAL_CLEARANCE: '#00C896',
  CONFORMING: '#00C896',
  NON_CONFORMING: '#FF5470',
  PARTIALLY_CONFORMING: '#F5A623',
  IN_ANALYSIS: '#a78bfa',
  RESULT_SUBMITTED: '#38C6FF',
  SAMPLING_REQUESTED: '#F5A623',
  PICKUP_SCHEDULED: '#F5A623',
  SAMPLE_PICKED_UP: '#F5A623',
  IN_TRANSIT: '#F5A623',
  LAB_RECEIVED: '#a78bfa',
  RECORD_OPENED: '#808285',
  RE_EXPORT_COMPLETED: '#808285',
  DESTRUCTION_CONFIRMED: '#808285',
  DESTRUCTION_PENDING: '#FF5470',
  DESTRUCTION_REQUESTED: '#FF5470',
};

const SOURCE_CONFIG = {
  EMAIL_PARSER: { icon: '📧', label: 'Email Parser', color: '#38C6FF' },
  SYSTEM: { icon: '⚙️', label: 'System', color: '#a78bfa' },
  MANUAL: { icon: '👤', label: 'Manual', color: '#00C896' },
};

const SIGNIFICANCE_CONFIG = {
  critical: { bg: 'rgba(255,84,112,0.06)', border: 'rgba(255,84,112,0.2)', dot: '#FF5470' },
  important: { bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.2)', dot: '#F5A623' },
  normal: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', dot: '#38C6FF' },
};

export default function ShipmentTimeline({ shipmentId, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/assistant/timeline-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ shipment_id: shipmentId })
        });
        const result = await res.json();
        if (result.success) setData(result);
        else setError('Failed to load timeline');
      } catch (err) {
        setError('Failed to connect to platform');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [shipmentId]);

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, padding:'20px', fontFamily:'Inter,sans-serif'
    }}>
      <div style={{
        background:'#252266', borderRadius:'16px',
        width:'100%', maxWidth:'720px',
        maxHeight:'90vh', overflow:'hidden',
        display:'flex', flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.6)'
      }}>

        {/* Header */}
        <div style={{
          padding:'18px 24px',
          background:'linear-gradient(135deg, #252266 0%, #1E1A5E 100%)',
          display:'flex', alignItems:'center', gap:'12px',
          flexShrink:0
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:'16px',fontWeight:700,color:'#FFFFFF',marginBottom:'2px'}}>
              📅 Shipment Timeline
            </div>
            {data && data.shipment && (
              <div style={{fontSize:'12px',color:'#38C6FF'}}>
                {data.shipment.faseh_request_number} · {data.shipment.importer_name} · {data.shipment.shipment_country}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width:'32px', height:'32px', borderRadius:'8px',
            background:'rgba(255,255,255,0.1)', border:'none',
            color:'white', fontSize:'18px', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{flex:1, overflowY:'auto', padding:'20px 24px'}}>

          {loading && (
            <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.45)'}}>
              <div style={{fontSize:'32px', marginBottom:'12px'}}>🤖</div>
              <div style={{fontSize:'14px', fontWeight:600, color:'#FFFFFF', marginBottom:'4px'}}>
                AI is analyzing this shipment...
              </div>
              <div style={{fontSize:'12px'}}>Reading audit trail and generating insights</div>
            </div>
          )}

          {error && (
            <div style={{padding:'20px', background:'rgba(255,84,112,0.08)', borderRadius:'10px', color:'#FF5470', fontSize:'13px'}}>
              ⚠ {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* AI Overall Summary */}
              <div style={{
                background:'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(56,198,255,0.06))',
                border:'1px solid rgba(56,198,255,0.2)',
                borderRadius:'12px', padding:'16px', marginBottom:'20px'
              }}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                  <span style={{fontSize:'16px'}}>🤖</span>
                  <span style={{fontSize:'12px', fontWeight:700, color:'#FFFFFF', textTransform:'uppercase', letterSpacing:'0.8px'}}>
                    AI Intelligence Summary
                  </span>
                </div>
                <div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:1.7}}>
                  {data.overall_summary}
                </div>
              </div>

              {/* Shipment details strip */}
              <div style={{
                display:'grid', gridTemplateColumns:'repeat(4,1fr)',
                gap:'8px', marginBottom:'20px'
              }}>
                {[
                  {label:'Port', value:data.shipment?.port_of_entry},
                  {label:'Lab', value:data.shipment?.lab_name || 'Not assigned'},
                  {label:'Clearance Co.', value:data.shipment?.clearance_company_name || 'Not assigned'},
                  {label:'Current Status', value:data.shipment?.current_state?.replace(/_/g,' ')},
                ].map(({label, value}) => (
                  <div key={label} style={{
                    background:'rgba(0,170,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:'8px', padding:'10px 12px'
                  }}>
                    <div style={{fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'3px'}}>{label}</div>
                    <div style={{fontSize:'11px', fontWeight:600, color:'#FFFFFF'}}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Timeline steps */}
              <div style={{fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'12px'}}>
                Timeline — {data.steps.length} events
              </div>

              <div style={{position:'relative'}}>
                {/* Vertical line */}
                <div style={{
                  position:'absolute', left:'15px', top:'8px', bottom:'8px',
                  width:'2px', background:'rgba(255,255,255,0.08)', borderRadius:'1px'
                }}></div>

                <div style={{display:'flex', flexDirection:'column', gap:'0'}}>
                  {data.steps.map((step, index) => {
                    const sig = SIGNIFICANCE_CONFIG[step.significance] || SIGNIFICANCE_CONFIG.normal;
                    const src = SOURCE_CONFIG[step.trigger_source] || SOURCE_CONFIG.MANUAL;
                    const toColor = STATE_COLORS[step.to_state] || '#808285';
                    const isLast = index === data.steps.length - 1;

                    return (
                      <div key={index} style={{display:'flex', gap:'16px', paddingBottom:'16px', position:'relative'}}>
                        {/* Dot */}
                        <div style={{
                          width:'30px', height:'30px', borderRadius:'50%',
                          background: isLast ? 'rgba(56,198,255,0.15)' : '#252266',
                          border:`2px solid ${isLast ? '#38C6FF' : sig.dot}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0, zIndex:1,
                          boxShadow: isLast ? '0 0 0 4px rgba(56,198,255,0.15)' : 'none'
                        }}>
                          <div style={{
                            width:'8px', height:'8px', borderRadius:'50%',
                            background: isLast ? '#38C6FF' : sig.dot
                          }}></div>
                        </div>

                        {/* Content */}
                        <div style={{
                          flex:1,
                          background:sig.bg,
                          border:`1px solid ${sig.border}`,
                          borderRadius:'10px', padding:'12px 14px',
                          boxShadow: isLast ? '0 2px 12px rgba(56,198,255,0.1)' : 'none'
                        }}>
                          {/* State transition */}
                          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap'}}>
                            <span style={{
                              fontFamily:'JetBrains Mono,monospace', fontSize:'10px',
                              fontWeight:600, color:'rgba(255,255,255,0.45)',
                              background:'rgba(255,255,255,0.06)',
                              padding:'2px 7px', borderRadius:'4px'
                            }}>{step.from_state?.replace(/_/g,' ') || 'START'}</span>
                            <span style={{color:'#38C6FF', fontSize:'13px', fontWeight:700}}>→</span>
                            <span style={{
                              fontFamily:'JetBrains Mono,monospace', fontSize:'10px',
                              fontWeight:700, color:toColor,
                              background:`${toColor}15`,
                              padding:'2px 7px', borderRadius:'4px',
                              border:`1px solid ${toColor}30`
                            }}>{step.to_state?.replace(/_/g,' ')}</span>
                            {step.significance === 'critical' && (
                              <span style={{fontSize:'10px', background:'rgba(255,84,112,0.1)', color:'#FF5470', padding:'2px 7px', borderRadius:'10px', fontWeight:600}}>⚠ Critical</span>
                            )}
                            {step.significance === 'important' && (
                              <span style={{fontSize:'10px', background:'rgba(245,166,35,0.1)', color:'#F5A623', padding:'2px 7px', borderRadius:'10px', fontWeight:600}}>Important</span>
                            )}
                          </div>

                          {/* AI explanation */}
                          <div style={{fontSize:'12px', color:'rgba(255,255,255,0.7)', marginBottom:'6px', lineHeight:1.5, fontWeight:500}}>
                            {step.explanation}
                          </div>

                          {/* Notes */}
                          {step.notes && (
                            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.45)', marginBottom:'6px', fontStyle:'italic'}}>
                              "{step.notes}"
                            </div>
                          )}

                          {/* Meta */}
                          <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                            <span style={{
                              fontSize:'10px', fontWeight:600,
                              color:src.color,
                              background:`${src.color}15`,
                              padding:'2px 7px', borderRadius:'10px',
                              border:`1px solid ${src.color}30`
                            }}>{src.icon} {src.label}</span>
                            {step.actor_role && (
                              <span style={{fontSize:'10px', color:'rgba(255,255,255,0.45)'}}>
                                {step.actor_role.replace(/_/g,' ')}
                              </span>
                            )}
                            <span style={{fontSize:'10px', color:'rgba(255,255,255,0.45)', marginLeft:'auto'}}>
                              {new Date(step.occurred_at).toLocaleString('en-SA', {
                                day:'2-digit', month:'short', year:'numeric',
                                hour:'2-digit', minute:'2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}