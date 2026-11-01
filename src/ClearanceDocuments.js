import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const STATUS_CONFIG = {
  READY: { color: '#00C896', bg: 'rgba(0,200,150,0.1)', icon: '✓', label: 'Ready' },
  WARNING: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', icon: '⚠', label: 'Warning' },
  MISSING_INFO: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', icon: '⚠', label: 'Missing Info' },
  CRITICAL_ISSUE: { color: '#FF5470', bg: 'rgba(255,84,112,0.1)', icon: '✕', label: 'Critical Issue' },
  PENDING: { color: '#808285', bg: 'rgba(128,130,133,0.1)', icon: '○', label: 'Pending' },
};

export default function ClearanceDocuments({ shipmentId, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/documents/${shipmentId}/shared`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) setData(result);
      } catch (err) {
        console.error('Failed to load shared documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [shipmentId]);

  const handleReview = async (documentType) => {
    try {
      await fetch(`${API_URL}/documents/${shipmentId}/clearance-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_type: documentType, notes: reviewNotes })
      });
      // Refresh
      const res = await fetch(`${API_URL}/documents/${shipmentId}/shared`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) setData(result);
      setReviewing(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Review failed');
    }
  };

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:1000,padding:'20px',fontFamily:'Inter,sans-serif'
    }}>
      <div style={{
        background:'#252266',borderRadius:'16px',
        width:'100%',maxWidth:'760px',
        maxHeight:'90vh',overflow:'hidden',
        display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.6)'
      }}>

        {/* Header */}
        <div style={{
          padding:'18px 24px',
          background:'linear-gradient(135deg, #252266 0%, #1E1A5E 100%)',
          display:'flex',alignItems:'center',gap:'12px',
          flexShrink:0
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:'16px',fontWeight:700,color:'#FFFFFF',marginBottom:'2px'}}>
              📁 Shared Documents
            </div>
            {data?.shipment && (
              <div style={{fontSize:'12px',color:'#38C6FF'}}>
                {data.shipment.faseh_request_number} · {data.shipment.importer_name} · Shared {data.shipment.documents_shared_at ? new Date(data.shipment.documents_shared_at).toLocaleDateString('en-SA', {day:'2-digit',month:'short',year:'numeric'}) : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width:'32px',height:'32px',borderRadius:'8px',
            background:'rgba(255,255,255,0.1)',border:'none',
            color:'white',fontSize:'18px',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

          {loading && (
            <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.45)'}}>
              Loading shared documents...
            </div>
          )}

          {data && !loading && (
            <>
              {/* Shipment context */}
              <div style={{
                display:'grid',gridTemplateColumns:'repeat(4,1fr)',
                gap:'8px',marginBottom:'20px'
              }}>
                {[
                  {label:'Port',value:data.shipment.port_of_entry},
                  {label:'Country',value:data.shipment.shipment_country},
                  {label:'Status',value:data.shipment.current_state?.replace(/_/g,' ')},
                  {label:'Documents',value:data.documents.length + ' shared'},
                ].map(({label,value}) => (
                  <div key={label} style={{
                    background:'rgba(0,170,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:'8px',padding:'10px 12px'
                  }}>
                    <div style={{fontSize:'9px',fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'3px'}}>{label}</div>
                    <div style={{fontSize:'11px',fontWeight:600,color:'#FFFFFF'}}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              {data.documents.length > 0 && (
                <div style={{
                  background:'rgba(56,198,255,0.06)',border:'1px solid rgba(56,198,255,0.15)',
                  borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',
                  display:'flex',alignItems:'center',gap:'12px'
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#FFFFFF',marginBottom:'4px'}}>
                      Review Progress
                    </div>
                    <div style={{height:'6px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{
                        height:'100%',
                        width:`${Math.round((data.documents.filter(d=>d.clearance_reviewed).length / data.documents.length) * 100)}%`,
                        background:'#38C6FF',borderRadius:'3px',transition:'width 0.3s'
                      }}></div>
                    </div>
                  </div>
                  <div style={{fontSize:'22px',fontWeight:800,color:'#FFFFFF',flexShrink:0}}>
                    {data.documents.filter(d=>d.clearance_reviewed).length}/{data.documents.length}
                  </div>
                </div>
              )}

              {data.documents.length === 0 && (
                <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.45)'}}>
                  <div style={{fontSize:'32px',marginBottom:'8px'}}>📭</div>
                  <div style={{fontSize:'14px',fontWeight:600,color:'#FFFFFF',marginBottom:'4px'}}>No documents shared yet</div>
                  <div style={{fontSize:'12px'}}>The MAH has not shared any documents for this shipment</div>
                </div>
              )}

              {/* Document list */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {data.documents.map(doc => {
                  const validation = doc.validation_result;
                  const status = doc.readiness_status || 'PENDING';
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                  const isExpanded = expanded === doc.document_type;
                  const isReviewed = doc.clearance_reviewed;

                  return (
                    <div key={doc.document_type} style={{
                      background:'rgba(255,255,255,0.05)',
                      border:`1px solid ${isReviewed ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:'10px',overflow:'hidden'
                    }}>
                      {/* Row */}
                      <div style={{
                        display:'flex',alignItems:'center',gap:'12px',
                        padding:'14px 16px',cursor:'pointer',
                        background: isReviewed ? 'rgba(0,200,150,0.04)' : 'transparent'
                      }} onClick={() => setExpanded(isExpanded ? null : doc.document_type)}>

                        {/* Status icon */}
                        <div style={{
                          width:'32px',height:'32px',borderRadius:'8px',
                          background:cfg.bg,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:'14px',fontWeight:700,color:cfg.color,
                          flexShrink:0
                        }}>{cfg.icon}</div>

                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'13px',fontWeight:600,color:'#FFFFFF'}}>{doc.label}</span>
                            <span style={{
                              fontSize:'10px',fontWeight:600,
                              color:cfg.color,background:cfg.bg,
                              padding:'2px 8px',borderRadius:'10px'
                            }}>{cfg.label}</span>
                            {isReviewed && (
                              <span style={{
                                fontSize:'10px',fontWeight:600,
                                color:'#00C896',background:'rgba(0,200,150,0.1)',
                                padding:'2px 8px',borderRadius:'10px',
                                border:'1px solid rgba(0,200,150,0.2)'
                              }}>✓ Reviewed</span>
                            )}
                          </div>
                          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',marginTop:'2px'}}>
                            {doc.file_name} · Shared {doc.shared_at ? new Date(doc.shared_at).toLocaleDateString('en-SA',{day:'2-digit',month:'short'}) : ''}
                            {doc.clearance_notes && <span style={{marginLeft:'8px',fontStyle:'italic'}}>"{doc.clearance_notes}"</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e => e.stopPropagation()}>
                          {!isReviewed && reviewing !== doc.document_type && (
                            <button onClick={() => setReviewing(doc.document_type)}
                              style={{
                                padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:600,
                                cursor:'pointer',border:'1px solid rgba(56,198,255,0.3)',
                                background:'rgba(56,198,255,0.08)',color:'#38C6FF'
                              }}>
                              ✓ Mark Reviewed
                            </button>
                          )}
                          <span style={{color:'rgba(255,255,255,0.45)',fontSize:'14px',padding:'5px'}}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Review notes input */}
                      {reviewing === doc.document_type && (
                        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'#2D2B7A'}}>
                          <div style={{fontSize:'11px',fontWeight:600,color:'#FFFFFF',marginBottom:'6px'}}>
                            Add a note (optional) before marking as reviewed:
                          </div>
                          <textarea
                            value={reviewNotes}
                            onChange={e => setReviewNotes(e.target.value)}
                            rows={2}
                            placeholder="e.g. Document verified — matches shipment details"
                            style={{
                              width:'100%',border:'1px solid rgba(255,255,255,0.15)',
                              borderRadius:'8px',padding:'8px 12px',
                              fontSize:'12px',color:'#FFFFFF',background:'#252266',
                              fontFamily:'Inter,sans-serif',outline:'none',resize:'none'
                            }}
                          />
                          <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                            <button onClick={() => handleReview(doc.document_type)}
                              style={{
                                padding:'6px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:700,
                                cursor:'pointer',border:'none',
                                background:'#38C6FF',color:'#252266'
                              }}>
                              ✓ Confirm Review
                            </button>
                            <button onClick={() => { setReviewing(null); setReviewNotes(''); }}
                              style={{
                                padding:'6px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:500,
                                cursor:'pointer',border:'1px solid rgba(255,255,255,0.15)',
                                background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.45)'
                              }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* AI Validation results */}
                      {isExpanded && validation && (
                        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'16px',background:'#2D2B7A'}}>

                          {/* Summary */}
                          <div style={{
                            padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',
                            background:cfg.bg,border:`1px solid ${cfg.color}30`
                          }}>
                            <div style={{fontSize:'11px',fontWeight:700,color:cfg.color,marginBottom:'2px'}}>
                              🤖 AI Validation — {cfg.label}
                            </div>
                            <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)'}}>{validation.summary}</div>
                          </div>

                          {/* Checks */}
                          {validation.checks && validation.checks.length > 0 && (
                            <div style={{marginBottom:'12px'}}>
                              <div style={{fontSize:'10px',fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>Validation Checks</div>
                              <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                                {validation.checks.map((check, i) => {
                                  const checkColor = check.status === 'PASS' ? '#00C896' : check.status === 'WARN' ? '#F5A623' : check.status === 'FAIL' ? '#FF5470' : '#808285';
                                  const checkIcon = check.status === 'PASS' ? '✓' : check.status === 'WARN' ? '⚠' : check.status === 'FAIL' ? '✕' : '○';
                                  return (
                                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',padding:'6px 10px',background:'#252266',borderRadius:'6px',border:'1px solid rgba(255,255,255,0.06)'}}>
                                      <span style={{color:checkColor,fontWeight:700,flexShrink:0}}>{checkIcon}</span>
                                      <div>
                                        <span style={{fontSize:'11px',fontWeight:600,color:'#FFFFFF'}}>{check.item}</span>
                                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',marginLeft:'6px'}}>— {check.message}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}


                          {/* Issues */}
                          {validation.issues && validation.issues.length > 0 && validation.issues[0] !== 'issue1' && (
                            <div>
                              <div style={{fontSize:'10px',fontWeight:700,color:'#FF5470',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>Issues to Address</div>
                              {validation.issues.map((issue, i) => (
                                <div key={i} style={{display:'flex',gap:'8px',padding:'6px 10px',background:'rgba(255,84,112,0.04)',borderRadius:'6px',marginBottom:'4px',border:'1px solid rgba(255,84,112,0.1)'}}>
                                  <span style={{color:'#FF5470',flexShrink:0}}>✕</span>
                                  <span style={{fontSize:'12px',color:'rgba(255,255,255,0.7)'}}>{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}