import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const STATUS_CONFIG = {
  READY: { color: '#00C896', bg: 'rgba(0,200,150,0.1)', border: 'rgba(0,200,150,0.2)', icon: '✓', label: 'Ready' },
  WARNING: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.2)', icon: '⚠', label: 'Warning' },
  MISSING_INFO: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.2)', icon: '⚠', label: 'Missing Info' },
  CRITICAL_ISSUE: { color: '#FF5470', bg: 'rgba(255,84,112,0.1)', border: 'rgba(255,84,112,0.2)', icon: '✕', label: 'Critical Issue' },
  PENDING: { color: '#808285', bg: 'rgba(128,130,133,0.1)', border: 'rgba(128,130,133,0.2)', icon: '○', label: 'Not Uploaded' },
};

const OVERALL_CONFIG = {
  READY: { color: '#00C896', label: 'Ready to Submit', desc: 'All documents validated — cleared for submission' },
  READY_WITH_WARNINGS: { color: '#F5A623', label: 'Ready with Warnings', desc: 'Documents uploaded but some items need attention' },
  NOT_READY: { color: '#FF5470', label: 'Not Ready', desc: 'Missing required documents or critical issues found' },
};

export default function DocumentReadiness({ shipmentId, token, shipment }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [pasteMode, setPasteMode] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/documents/${shipmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) setData(result);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [shipmentId]);

  const handleUpload = async (documentType, fileName, content) => {
    setUploading(documentType);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/documents/${shipmentId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_type: documentType, file_name: fileName, file_content: content })
      });
      const result = await res.json();
      if (result.success) {
        setPasteMode(null);
        setPasteText('');
        await fetchDocuments();
        setExpanded(documentType);
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = async (documentType, file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      await handleUpload(documentType, file.name, e.target.result);
    };
    reader.readAsText(file);
  };

  const handleDelete = async (documentType) => {
    try {
      await fetch(`${API_URL}/documents/${shipmentId}/${documentType}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchDocuments();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  if (loading) return (
    <div style={{padding:'40px',textAlign:'center',color:'#808285'}}>
      <div style={{fontSize:'24px',marginBottom:'8px'}}>⟳</div>
      Analyzing documents...
    </div>
  );

  if (!data) return null;

  const overall = OVERALL_CONFIG[data.overall_status] || OVERALL_CONFIG.NOT_READY;
  const uploadedMap = {};
  (data.documents || []).forEach(d => { uploadedMap[d.document_type] = d; });
  const allTypes = data.document_types || {};

  return (
    <div style={{fontFamily:'Inter,sans-serif'}}>

      {/* Overall Readiness Score */}
      <div style={{
        background:'#FFFFFF',
        border:`2px solid ${overall.color}`,
        borderRadius:'14px',
        padding:'20px 24px',
        marginBottom:'20px',
        display:'flex',
        alignItems:'center',
        gap:'20px'
      }}>
        {/* Score circle */}
        <div style={{flexShrink:0}}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(39,48,110,0.08)" strokeWidth="8"/>
            <circle cx="40" cy="40" r="32" fill="none" stroke={overall.color} strokeWidth="8"
              strokeDasharray={`${data.overall_score * 2.01} 201`}
              strokeDashoffset="50" strokeLinecap="round"
              style={{transition:'stroke-dasharray 0.5s ease'}}/>
            <text x="40" y="36" textAnchor="middle" fill="#27306E" fontSize="16" fontWeight="800" fontFamily="Inter">{data.overall_score}</text>
            <text x="40" y="50" textAnchor="middle" fill="#808285" fontSize="8" fontFamily="Inter">/ 100</text>
          </svg>
        </div>

        {/* Status text */}
        <div style={{flex:1}}>
          <div style={{fontSize:'18px',fontWeight:800,color:'#27306E',marginBottom:'4px'}}>
            Document Readiness Report
          </div>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'6px',
            background:`${overall.color}18`,
            border:`1px solid ${overall.color}40`,
            borderRadius:'20px',padding:'4px 12px',
            fontSize:'12px',fontWeight:700,color:overall.color,
            marginBottom:'8px'
          }}>
            {overall.label}
          </div>
          <div style={{fontSize:'13px',color:'#808285'}}>{overall.desc}</div>
        </div>

        {/* Summary stats */}
        <div style={{display:'flex',gap:'16px',flexShrink:0}}>
          {[
            {label:'Uploaded',value:data.summary.total_uploaded,color:'#27306E'},
            {label:'Required',value:data.summary.required_total,color:'#808285'},
            {label:'Missing',value:data.summary.missing_required,color:'#FF5470'},
            {label:'Issues',value:data.summary.critical_issues,color:'#FF5470'},
            {label:'Warnings',value:data.summary.warnings,color:'#F5A623'},
          ].map(({label,value,color}) => (
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontSize:'22px',fontWeight:800,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:'10px',color:'#808285',marginTop:'2px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{background:'rgba(255,84,112,0.08)',border:'1px solid rgba(255,84,112,0.2)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#CC0030'}}>
          ⚠ {error}
        </div>
      )}

      {/* Missing documents alert */}
      {data.missing_documents.length > 0 && (
        <div style={{background:'rgba(255,84,112,0.06)',border:'1px solid rgba(255,84,112,0.15)',borderRadius:'10px',padding:'14px 16px',marginBottom:'16px'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'#CC0030',marginBottom:'8px'}}>
            🚨 {data.missing_documents.length} required document{data.missing_documents.length > 1 ? 's' : ''} missing
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {data.missing_documents.map(d => (
              <span key={d.document_type} style={{
                background:'rgba(255,84,112,0.1)',border:'1px solid rgba(255,84,112,0.2)',
                borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:600,color:'#CC0030'
              }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {Object.entries(allTypes).map(([typeKey, typeDef]) => {
          const uploaded = uploadedMap[typeKey];
          const validation = uploaded?.validation_result;
          const status = uploaded ? (uploaded.readiness_status || 'PENDING') : 'PENDING';
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
          const isExpanded = expanded === typeKey;
          const isUploading = uploading === typeKey;
          const isPasting = pasteMode === typeKey;

          return (
            <div key={typeKey} style={{
              background:'#FFFFFF',
              border:`1px solid ${uploaded ? cfg.border : 'rgba(39,48,110,0.08)'}`,
              borderRadius:'10px',
              overflow:'hidden',
              transition:'all 0.15s'
            }}>
              {/* Document row */}
              <div style={{
                display:'flex',alignItems:'center',gap:'12px',
                padding:'14px 16px',cursor:'pointer',
                background: uploaded ? cfg.bg : '#FFFFFF'
              }} onClick={() => setExpanded(isExpanded ? null : typeKey)}>

                {/* Status icon */}
                <div style={{
                  width:'32px',height:'32px',borderRadius:'8px',
                  background: uploaded ? cfg.bg : 'rgba(39,48,110,0.06)',
                  border:`1px solid ${uploaded ? cfg.border : 'rgba(39,48,110,0.1)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'14px',fontWeight:700,color: uploaded ? cfg.color : '#808285',
                  flexShrink:0
                }}>
                  {isUploading ? '⟳' : cfg.icon}
                </div>

                {/* Document info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'13px',fontWeight:600,color:'#27306E'}}>{typeDef.label}</span>
                    {typeDef.required && (
                      <span style={{fontSize:'9px',background:'rgba(39,48,110,0.08)',color:'#808285',padding:'2px 6px',borderRadius:'10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Required</span>
                    )}
                    {!typeDef.required && (
                      <span style={{fontSize:'9px',background:'rgba(68,200,245,0.08)',color:'#44C8F5',padding:'2px 6px',borderRadius:'10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Optional</span>
                    )}
                  </div>
                  <div style={{fontSize:'11px',color:'#808285',marginTop:'2px'}}>
                    {uploaded ? (
                      <span>
                        {uploaded.file_name || 'Uploaded'} ·
                        <span style={{color:cfg.color,fontWeight:600,marginLeft:'4px'}}>{cfg.label}</span>
                        {validation?.score !== undefined && <span style={{color:'#808285',marginLeft:'4px'}}>· Score: {validation.score}/100</span>}
                      </span>
                    ) : (
                      typeDef.description
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:'flex',gap:'6px',flexShrink:0}} onClick={e => e.stopPropagation()}>
                  {!uploaded && !isPasting && (
                    <>
                      <label style={{
                        padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:600,
                        cursor:'pointer',border:'1px solid rgba(68,200,245,0.3)',
                        background:'rgba(68,200,245,0.08)',color:'#27306E'
                      }}>
                        ↑ Upload
                        <input type="file" accept=".pdf,.txt,.doc,.docx,.jpg,.png" style={{display:'none'}}
                          onChange={e => { if (e.target.files[0]) handleFileUpload(typeKey, e.target.files[0]); }} />
                      </label>
                      <button onClick={() => { setPasteMode(typeKey); setPasteText(''); }}
                        style={{padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:600,
                          cursor:'pointer',border:'1px solid rgba(39,48,110,0.15)',
                          background:'#FFFFFF',color:'#808285'}}>
                        ✎ Paste
                      </button>
                    </>
                  )}
                  {uploaded && (
                    <>
                      <label style={{
                        padding:'5px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:600,
                        cursor:'pointer',border:'1px solid rgba(68,200,245,0.3)',
                        background:'rgba(68,200,245,0.08)',color:'#27306E'
                      }}>
                        ↑ Replace
                        <input type="file" accept=".pdf,.txt,.doc,.docx,.jpg,.png" style={{display:'none'}}
                          onChange={e => { if (e.target.files[0]) handleFileUpload(typeKey, e.target.files[0]); }} />
                      </label>
                      <button onClick={() => handleDelete(typeKey)}
                        style={{padding:'5px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:600,
                          cursor:'pointer',border:'1px solid rgba(255,84,112,0.2)',
                          background:'rgba(255,84,112,0.06)',color:'#CC0030'}}>
                        ✕
                      </button>
                    </>
                  )}
                  <span style={{color:'#808285',fontSize:'14px',padding:'5px'}}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Paste area */}
              {isPasting && (
                <div style={{padding:'14px 16px',borderTop:'1px solid rgba(39,48,110,0.06)',background:'#F8F9FF'}}>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    rows={5}
                    placeholder={`Paste the content of your ${typeDef.label} here...`}
                    style={{
                      width:'100%',border:'1px solid rgba(39,48,110,0.15)',borderRadius:'8px',
                      padding:'10px 12px',fontSize:'12px',fontFamily:'JetBrains Mono,monospace',
                      color:'#27306E',background:'#FFFFFF',outline:'none',resize:'vertical'
                    }}
                  />
                  <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                    <button
                      onClick={() => handleUpload(typeKey, `${typeDef.label}.txt`, pasteText)}
                      disabled={!pasteText.trim() || isUploading}
                      style={{
                        padding:'7px 16px',borderRadius:'6px',fontSize:'12px',fontWeight:700,
                        cursor:'pointer',border:'none',
                        background: pasteText.trim() ? '#44C8F5' : '#808285',
                        color:'#27306E',opacity: isUploading ? 0.6 : 1
                      }}>
                      {isUploading ? '⟳ Analyzing...' : '🤖 Analyze with AI'}
                    </button>
                    <button onClick={() => { setPasteMode(null); setPasteText(''); }}
                      style={{padding:'7px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:500,
                        cursor:'pointer',border:'1px solid rgba(39,48,110,0.15)',background:'#FFFFFF',color:'#808285'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded validation results */}
              {isExpanded && uploaded && validation && (
                <div style={{borderTop:'1px solid rgba(39,48,110,0.06)',padding:'16px',background:'#FAFBFF'}}>

                  {/* Summary */}
                  <div style={{
                    padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',
                    background:cfg.bg,border:`1px solid ${cfg.border}`
                  }}>
                    <div style={{fontSize:'12px',fontWeight:700,color:cfg.color,marginBottom:'2px'}}>
                      {cfg.icon} AI Assessment
                    </div>
                    <div style={{fontSize:'12px',color:'#3A4080'}}>{validation.summary}</div>
                  </div>

                  {/* Extracted data */}
                  {validation.extracted && Object.keys(validation.extracted).some(k => validation.extracted[k]) && (
                    <div style={{marginBottom:'14px'}}>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#808285',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Extracted Information</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'6px'}}>
                        {Object.entries(validation.extracted).filter(([,v]) => v && v !== 'null').map(([key,value]) => (
                          <div key={key} style={{background:'#FFFFFF',border:'1px solid rgba(39,48,110,0.08)',borderRadius:'6px',padding:'8px 10px'}}>
                            <div style={{fontSize:'9px',fontWeight:700,color:'#808285',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'2px'}}>{key.replace(/_/g,' ')}</div>
                            <div style={{fontSize:'11px',color:'#27306E',fontWeight:500,fontFamily:'JetBrains Mono,monospace'}}>
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checks */}
                  {validation.checks && validation.checks.length > 0 && (
                    <div style={{marginBottom:'14px'}}>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#808285',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Validation Checks</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                        {validation.checks.map((check, i) => {
                          const checkColor = check.status === 'PASS' ? '#00C896' : check.status === 'WARN' ? '#F5A623' : check.status === 'FAIL' ? '#FF5470' : '#808285';
                          const checkIcon = check.status === 'PASS' ? '✓' : check.status === 'WARN' ? '⚠' : check.status === 'FAIL' ? '✕' : '○';
                          return (
                            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',padding:'7px 10px',background:'#FFFFFF',borderRadius:'6px',border:'1px solid rgba(39,48,110,0.06)'}}>
                              <span style={{color:checkColor,fontWeight:700,flexShrink:0,marginTop:'1px'}}>{checkIcon}</span>
                              <div style={{flex:1}}>
                                <span style={{fontSize:'11px',fontWeight:600,color:'#27306E'}}>{check.item}</span>
                                <span style={{fontSize:'11px',color:'#808285',marginLeft:'6px'}}>— {check.message}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {validation.issues && validation.issues.length > 0 && (
                    <div style={{marginBottom:'14px'}}>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#FF5470',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Issues Found</div>
                      {validation.issues.map((issue, i) => (
                        <div key={i} style={{display:'flex',gap:'8px',padding:'7px 10px',background:'rgba(255,84,112,0.04)',borderRadius:'6px',marginBottom:'4px',border:'1px solid rgba(255,84,112,0.1)'}}>
                          <span style={{color:'#FF5470',flexShrink:0}}>✕</span>
                          <span style={{fontSize:'12px',color:'#3A4080'}}>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {validation.recommendations && validation.recommendations.length > 0 && (
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#44C8F5',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Recommendations</div>
                      {validation.recommendations.map((rec, i) => (
                        <div key={i} style={{display:'flex',gap:'8px',padding:'7px 10px',background:'rgba(68,200,245,0.04)',borderRadius:'6px',marginBottom:'4px',border:'1px solid rgba(68,200,245,0.1)'}}>
                          <span style={{color:'#44C8F5',flexShrink:0}}>→</span>
                          <span style={{fontSize:'12px',color:'#3A4080'}}>{rec}</span>
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
    </div>
  );
}