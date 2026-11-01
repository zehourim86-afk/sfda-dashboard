import { useState, useEffect } from 'react';
import { API_URL, formatDate, PRODUCT_CATEGORIES } from './constants';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';
import DocumentReadiness from './DocumentReadiness';
import AIAssistant from './AIAssistant';
import PreShipmentCheck from './PreShipmentCheck';

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

function badge(label, tone = 'grey') {
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
  modal: (maxWidth) => ({background:'#332E8A',border:'1px solid rgba(0,170,255,.18)',borderRadius:18,width:'100%',maxWidth,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.8)',color:'#fff',fontFamily:'Inter,sans-serif'}),
  modalHead: {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'linear-gradient(180deg,rgba(0,170,255,.05),transparent)'},
  closeBtn: {width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.6)',fontSize:18,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  ipt: {width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#fff',fontFamily:'inherit',outline:'none',colorScheme:'dark'},
  lbl: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,display:'block'},
  section: {fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10},
  error: {background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470'},
  mono: 'JetBrains Mono,monospace',
  card: {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,padding:18},
  cardHead: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:14},
  cardTitle: {fontSize:13,fontWeight:700,color:'#fff'},
  cardSub: {fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2},
  subCard: {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 12px'},
  infoTile: {background:'rgba(0,170,255,.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:9,padding:'8px 12px'},
  meta: {fontSize:11,color:'rgba(255,255,255,.4)'},
  panel: (tone) => ({background:tint(tone,.06),border:`1px solid ${tint(tone,.22)}`,borderRadius:12,padding:'14px 16px'}),
  panelTitle: (tone) => ({fontSize:13,fontWeight:700,color:TONES[tone][0],marginBottom:6}),
  panelText: {fontSize:12,color:'rgba(255,255,255,.55)',marginTop:4,lineHeight:1.5},
  pill: (tone) => ({fontSize:10,fontWeight:700,color:TONES[tone][0],background:tint(tone,.12),border:`1px solid ${tint(tone,.3)}`,borderRadius:20,padding:'2px 8px',whiteSpace:'nowrap'}),
  primaryBtn: {width:'100%',padding:12,background:'linear-gradient(135deg,#38C6FF,#0088DD)',color:'#252266',fontSize:13,fontWeight:800,borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 20px rgba(0,170,255,.25)'},
  ghostBtn: {padding:'10px 16px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.65)',fontSize:12,fontWeight:600,borderRadius:9,cursor:'pointer',fontFamily:'inherit'},
};
const smallBtn = (tone) => ({background:tint(tone,.12),border:`1px solid ${tint(tone,.25)}`,color:TONES[tone][0],fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0});
// Two-way toggle (e.g. re-export vs destruction per product)
const choiceBtn = (on, tone) => ({flex:1,padding:'8px',fontSize:11,fontWeight:700,borderRadius:8,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
  background:on?tint(tone,.22):'transparent',border:`1px solid ${tint(tone,on?.6:.25)}`,color:on?'#fff':TONES[tone][0]});
// Large decision card button
const bigChoice = (tone, disabled) => ({padding:'14px 10px',borderRadius:12,textAlign:'center',cursor:'pointer',fontFamily:'inherit',
  background:tint(tone,.06),border:`1px solid ${tint(tone,.35)}`,opacity:disabled?.5:1});

const STATE_INFO = {
  RECORD_OPENED: { label: 'Record Opened', tone: 'grey', step: 1 },
  DECLARATION_FILED: { label: 'Declaration Filed', tone: 'cyan', step: 1 },
  CB_ASSIGNED: { label: 'CB Assigned', tone: 'cyan', step: 2 },
  CB_REVIEWING: { label: 'CB Reviewing', tone: 'amber', step: 2 },
  CHANGES_REQUESTED: { label: 'Changes Requested', tone: 'amber', step: 2 },
  CHANGES_SUBMITTED: { label: 'Changes Submitted', tone: 'amber', step: 2 },
  CB_APPROVED: { label: 'CB Approved', tone: 'green', step: 2 },
  CB_REJECTED: { label: 'CB Rejected', tone: 'red', step: 2 },
  CLEARANCE_DECLINED: { label: 'Clearance Declined', tone: 'red', step: 2 },
  SAMPLING_REQUESTED: { label: 'Sampling Requested', tone: 'amber', step: 3 },
  INSPECTOR_DISPATCHED: { label: 'Inspector Dispatched', tone: 'amber', step: 3 },
  SAMPLE_COLLECTED: { label: 'Sample Collected', tone: 'amber', step: 3 },
  IN_TRANSIT_TO_LAB: { label: 'In Transit to Lab', tone: 'amber', step: 3 },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', tone: 'amber', step: 3 },
  SAMPLE_PICKED_UP: { label: 'Sample Picked Up', tone: 'amber', step: 3 },
  IN_TRANSIT: { label: 'In Transit to Lab', tone: 'amber', step: 3 },
  LAB_ACCEPTED: { label: 'Lab Confirmed', tone: 'purple', step: 4 },
  LAB_DECLINED: { label: 'Lab Declined', tone: 'red', step: 4 },
  LAB_RECEIVED: { label: 'Lab Received', tone: 'purple', step: 4 },
  IN_ANALYSIS: { label: 'In Analysis', tone: 'purple', step: 4 },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', tone: 'purple', step: 4 },
  RESULT_SUBMITTED: { label: 'Result Submitted', tone: 'cyan', step: 4 },
  SFDA_NOTIFIED: { label: 'SFDA Notified', tone: 'cyan', step: 4 },
  DECISION_PENDING: { label: 'Awaiting SFDA Decision', tone: 'amber', step: 5 },
  CONFORMING: { label: 'Conforming ✓', tone: 'green', step: 5 },
  NON_CONFORMING: { label: 'Non-Conforming ✗', tone: 'red', step: 5 },
  PARTIALLY_CONFORMING: { label: 'Partially Conforming', tone: 'amber', step: 5 },
  CLEARANCE_IN_PROGRESS: { label: 'Clearance In Progress', tone: 'cyan', step: 6 },
  PARTIAL_CLEARANCE_IN_PROGRESS: { label: 'Partial Clearance', tone: 'cyan', step: 6 },
  PARTIAL_FINAL_CLEARANCE: { label: 'Partial Cleared', tone: 'green', step: 6 },
  BOND_RELEASED: { label: 'Bond Released', tone: 'cyan', step: 6 },
  DUTIES_PAID: { label: 'Duties Paid', tone: 'cyan', step: 6 },
  FINAL_CLEARANCE: { label: 'Final Clearance ✓', tone: 'green', step: 6 },
  RE_EXPORT_INITIATED: { label: 'Re-Export Initiated', tone: 'red', step: 6 },
  RE_EXPORT_BOOKING_CONFIRMED: { label: 'Re-Export Booking Confirmed', tone: 'amber', step: 6 },
  RE_EXPORT_PERMIT_ISSUED: { label: 'Re-Export Permit Issued', tone: 'amber', step: 6 },
  RE_EXPORT_LOADED: { label: 'Re-Export Goods Loaded', tone: 'amber', step: 6 },
  RE_EXPORT_COMPLETED: { label: 'Re-Export Completed', tone: 'grey', step: 6 },
  DECISION_OVERDUE: { label: 'Decision Overdue — Action Required', tone: 'red', step: 6 },
  SFDA_ORDERED_DESTRUCTION: { label: 'SFDA Ordered Destruction', tone: 'red', step: 6 },
  DESTRUCTION_PENDING: { label: 'Destruction Pending (24h grace)', tone: 'red', step: 6 },
  DESTRUCTION_REQUESTED: { label: 'Destruction Requested', tone: 'red', step: 6 },
  DESTRUCTION_SCHEDULED: { label: 'Destruction Scheduled', tone: 'red', step: 6 },
  DESTRUCTION_IN_PROGRESS: { label: 'Destruction In Progress', tone: 'red', step: 6 },
  DESTRUCTION_CERTIFICATE_ISSUED: { label: 'Certificate Issued', tone: 'amber', step: 6 },
  DESTRUCTION_CONFIRMED: { label: 'Destruction Confirmed', tone: 'grey', step: 6 },
  ARCHIVED: { label: 'Archived', tone: 'grey', step: 6 },
};

const STEPS = [
  { number: 1, label: 'Registration' },
  { number: 2, label: 'CB Review' },
  { number: 3, label: 'Sampling' },
  { number: 4, label: 'Lab Analysis' },
  { number: 5, label: 'Decision' },
  { number: 6, label: 'Clearance' },
];

function ProgressTracker({ currentStep, currentState }) {
  const subStateLabels = {
    RECORD_OPENED: 'Record opened',
    LAB_ACCEPTED: 'Lab confirmed',
    LAB_DECLINED: 'Lab declined',
    CLEARANCE_ACCEPTED: 'Clearance confirmed',
    SAMPLING_REQUESTED: 'Sampling requested',
    INSPECTOR_DISPATCHED: 'Inspector en route',
    SAMPLE_COLLECTED: 'Sample collected',
    IN_TRANSIT_TO_LAB: 'In transit',
    LAB_RECEIVED: 'Lab received',
    IN_ANALYSIS: 'Analysis ongoing',
    RESULT_SUBMITTED: 'Results submitted',
    CONFORMING: 'SFDA approved',
    NON_CONFORMING: 'SFDA rejected',
    PARTIALLY_CONFORMING: 'Partial approval',
    CLEARANCE_IN_PROGRESS: 'Clearance started',
    BOND_RELEASED: 'Bond released',
    DUTIES_PAID: 'Duties paid',
    FINAL_CLEARANCE: 'Cleared ✓',
    RE_EXPORT_INITIATED: 'Re-export started',
    RE_EXPORT_BOOKING_CONFIRMED: 'Booking confirmed',
    RE_EXPORT_PERMIT_ISSUED: 'Permit issued',
    RE_EXPORT_LOADED: 'Goods loaded',
    RE_EXPORT_COMPLETED: 'Re-exported',
    DESTRUCTION_PENDING: 'Grace period (24h)',
    DESTRUCTION_REQUESTED: 'Destruction requested',
    DESTRUCTION_SCHEDULED: 'Destruction scheduled',
    DESTRUCTION_IN_PROGRESS: 'Being destroyed',
    DESTRUCTION_CERTIFICATE_ISSUED: 'Certificate issued',
    DESTRUCTION_CONFIRMED: 'Destroyed',
  };

  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
      {STEPS.map((step, index) => {
        const done = currentStep > step.number;
        const current = currentStep === step.number;
        return (
          <div key={step.number} style={{display:'flex',alignItems:'flex-start'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,
                background: done ? '#00C896' : current ? '#38C6FF' : 'rgba(255,255,255,.06)',
                color: done || current ? '#252266' : 'rgba(255,255,255,.35)',
                border: done || current ? 'none' : '1px solid rgba(255,255,255,.1)',
                boxShadow: current ? '0 0 0 4px rgba(56,198,255,.15)' : 'none'}}>
                {currentStep > step.number ? '✓' : step.number}
              </div>
              <div style={{fontSize:10,color: current ? '#fff' : 'rgba(255,255,255,.4)',fontWeight: current ? 700 : 500,marginTop:6,textAlign:'center',width:64}}>{step.label}</div>
              {currentStep === step.number && currentState && subStateLabels[currentState] && (
                <div style={{fontSize:10,fontWeight:600,color:'#38C6FF',textAlign:'center',width:80,marginTop:2}}>
                  {subStateLabels[currentState]}
                </div>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div style={{height:2,width:40,margin:'15px 4px 0',borderRadius:1,background: currentStep > step.number ? '#00C896' : 'rgba(255,255,255,.1)'}} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// AI Document Upload and Parse Form
function NewShipmentForm({ token, organisations, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [documentText, setDocumentText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLabInfo, setSelectedLabInfo] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedClearanceId, setSelectedClearanceId] = useState('');
  const [restored, setRestored] = useState(false);

    // Auto-save form data every 30 seconds
  useEffect(() => {
    if (step === 2 && extractedData) {
      const saveData = {
        step,
        extractedData,
        selectedLabId,
        selectedClearanceId,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('demara_form_autosave', JSON.stringify(saveData));
    }
  }, [step, extractedData, selectedLabId, selectedClearanceId]);

  // Restore auto-saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem('demara_form_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedAt = new Date(parsed.savedAt);
        const ageMinutes = (new Date() - savedAt) / 60000;
        if (ageMinutes < 60 && parsed.extractedData) {
          setExtractedData(parsed.extractedData);
          setSelectedLabId(parsed.selectedLabId || '');
          setSelectedClearanceId(parsed.selectedClearanceId || '');
          setStep(2);
          setRestored(true);
        }
      } catch (err) {
        console.error('Auto-save restore failed');
      }
    }
  }, []);

  const clearanceCompanies = organisations.filter(o => o.org_type === 'CLEARANCE_COMPANY');
  const labs = organisations.filter(o => o.org_type === 'LAB');

  const SAMPLE_FASEH = `KINGDOM OF SAUDI ARABIA
Saudi Food and Drug Authority (SFDA)
CLEARANCE REQUEST CONFIRMATION

Request Reference: FASEH-2026-CS-10001
Request Date: 12 August 2026

IMPORTER DETAILS
Company Name: Al Noor Trading Co.
GHAD CR Number: CR-1234567890
Contact Email: omar@alnoor-pharma.com.sa
Port of Entry: King Abdulaziz Port - Dammam

PRODUCTS LISTED
1. Product Name: Moisturizing Face Cream 50ml
   E-Cosma Number: COSMA-SA-2024-0099
   Batch Number: BN-20260801
   Quantity: 500 units
   Country of Origin: France
   Production Date: 01 August 2026
   Expiry Date: 01 August 2028

2. Product Name: Vitamin C Serum 30ml
   E-Cosma Number: COSMA-SA-2024-0100
   Batch Number: BN-20260802
   Quantity: 300 units
   Country of Origin: France
   Expiry Date: 01 August 2028

SHIPMENT DETAILS
Shipment Country: France
Port of Entry: King Abdulaziz Port - Dammam`;

  const SAMPLE_EMAIL = `FROM: qc-sampling@sfda.gov.sa
TO: omar@alnoor-pharma.com.sa
CC: qc@demara.sa
SUBJECT: QC Sampling Required — FASEH-2026-CS-10001

Dear Al Noor Trading Co.,

A Quality Control sampling has been requested:

Faseh Reference: FASEH-2026-CS-10001
GHAD CR Number: CR-1234567890
Port of Entry: King Abdulaziz Port - Dammam
Shipment Country: France

Products requiring sampling:
1. Product Name: Moisturizing Face Cream 50ml
   E-Cosma Number: COSMA-SA-2024-0099
   Batch Number: BN-20260801
   Quantity: 500 units
   Country of Origin: France
   Expiry Date: 01 August 2028

2. Product Name: Vitamin C Serum 30ml
   E-Cosma Number: COSMA-SA-2024-0100
   Batch Number: BN-20260802
   Quantity: 300 units
   Country of Origin: France
   Expiry Date: 01 August 2028

Saudi Food and Drug Authority`;

  const handleParse = async () => {
    if (!documentText.trim()) {
      setError('Please paste your document content or upload a PDF');
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/parser/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email_text: documentText })
      });
      const data = await res.json();
      if (data.success) {
        // Add confidence flags to extracted data
        const extracted = data.extracted;
        const confidenceFlags = {
          faseh_request_number: extracted.faseh_request_number ? 'high' : 'low',
          ghad_cr_number: extracted.ghad_cr_number ? 'high' : 'low',
          importer_name: extracted.importer_name ? 'high' : 'low',
          port_of_entry: extracted.port_of_entry ? 'high' : 'low',
          shipment_country: extracted.shipment_country ? 'high' : 'low',
        };
        setExtractedData({...extracted, _confidence: confidenceFlags});
        setStep(2);
      } else {
        setError(data.message || 'Failed to parse document');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Check for duplicate Faseh reference before submitting
      if (extractedData.faseh_request_number) {
        const checkRes = await fetch(`${API_URL}/shipments?search=${extractedData.faseh_request_number}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const checkData = await checkRes.json();
        const existing = (checkData.shipments || []).find(s => 
          s.faseh_request_number === extractedData.faseh_request_number
        );
        if (existing) {
          setError(`A shipment record for ${extractedData.faseh_request_number} already exists. Please track the existing record instead of creating a duplicate.`);
          setSubmitting(false);
          return;
        }
      }
      const payload = {
        faseh_request_number: extractedData.faseh_request_number,
        ghad_cr_number: extractedData.ghad_cr_number,
        importer_name: extractedData.importer_name,
        port_of_entry: extractedData.port_of_entry,
        shipment_country: extractedData.shipment_country,
        supplier_name: extractedData.supplier_name?.trim() || null,
        product_category: extractedData.product_category || null,
        clearance_company_id: selectedClearanceId || null,
        lab_id: selectedLabId || null,
        products: (extractedData.products || []).map(p => ({
          ecos_ma_number: p.ecos_ma_number,
          product_name_en: p.product_name_en,
          batch_number: p.batch_number,
          quantity: p.quantity,
          quantity_unit: p.quantity_unit || 'units',
          country_of_origin: p.country_of_origin,
          production_date: p.production_date,
          expiry_date: p.expiry_date
        }))
      };

      const res = await fetch(`${API_URL}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('demara_form_autosave');
        onSuccess(data.faseh_request_number);
      } else {
        setError(data.message || 'Failed to open shipment record');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  const labInfoText = {fontSize:11,color:'rgba(255,255,255,.55)'};

  return (
    <div style={S.backdrop}>
      <div style={S.modal(700)}>
        <div style={S.modalHead}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>Open New Shipment Record</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>
              {step === 1 ? 'Step 1 — Upload your Faseh document or email' :
               step === 2 ? 'Step 2 — Review extracted information' :
               'Step 3 — Confirm and open record'}
            </div>
          </div>
          <button onClick={onCancel} style={S.closeBtn}>×</button>
        </div>

        <div style={{padding:'18px 22px'}}>
          {error && <div style={{...S.error,marginBottom:14}}>{error}</div>}

          {/* Step 1 — Upload */}
          {step === 1 && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={S.panel('cyan')}>
                <div style={{fontSize:12,fontWeight:700,color:'#38C6FF'}}>How it works</div>
                <div style={S.panelText}>Paste the content of your Faseh confirmation PDF or SFDA email. DEMARA AI will read it and extract all shipment details automatically.</div>
              </div>

              <div style={{display:'flex',gap:8}}>
                <button onClick={() => { setDocumentText(SAMPLE_FASEH); }}
                  style={{...smallBtn('grey'),color:'rgba(255,255,255,.65)'}}>
                  Load Sample Faseh PDF
                </button>
                <button onClick={() => { setDocumentText(SAMPLE_EMAIL); }}
                  style={{...smallBtn('grey'),color:'rgba(255,255,255,.65)'}}>
                  Load Sample SFDA Email
                </button>
              </div>

              {/* PDF Upload */}
              <div style={{border:'2px dashed rgba(0,170,255,.2)',borderRadius:12,padding:20,textAlign:'center',background:'rgba(0,170,255,.02)'}}>
                <input type="file" accept=".pdf,.txt" id="pdf-upload" style={{display:'none'}}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setParsing(true);
                    setError(null);
                    try {
                      // Read file as text directly in browser
                      const text = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsText(file);
                      });
                      setDocumentText(text);
                      // Auto-parse
                      const res = await fetch(`${API_URL}/parser/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ email_text: text })
                      });
                      const data = await res.json();
                      if (data.success) {
                        setExtractedData(data.extracted);
                        setStep(2);
                      } else {
                        setError(data.message || 'Failed to parse file');
                      }
                    } catch (err) {
                      setError('Failed to read file. Please paste the text instead.');
                    } finally {
                      setParsing(false);
                    }
                  }}
                />
                <label htmlFor="pdf-upload" style={{cursor:'pointer',display:'block'}}>
                  <div style={{fontSize:30,marginBottom:8}}>📄</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Click to upload PDF or TXT file</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:4}}>Or paste document text below</div>
                </label>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></div>
                <span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>or paste text below</span>
                <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></div>
              </div>

              <div>
                <label style={S.lbl}>Paste Document Content</label>
                <textarea
                  value={documentText}
                  onChange={e => setDocumentText(e.target.value)}
                  rows={8}
                  placeholder="Paste the content of your Faseh confirmation PDF or SFDA email here..."
                  style={{...S.ipt,fontFamily:S.mono,fontSize:11,resize:'vertical'}}
                />
              </div>

              <button onClick={handleParse} disabled={parsing || !documentText.trim()}
                style={{...S.primaryBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity: parsing || !documentText.trim() ? .5 : 1}}>
                {parsing ? (
                  <>
                    <span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</span>
                    DEMARA AI is reading your document...
                  </>
                ) : '🤖 Extract with DEMARA AI'}
              </button>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && extractedData && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {restored && (
                <div style={{...S.panel('amber'),display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#F5A623'}}>⚡ Your previous form data has been restored automatically.</div>
                  <button onClick={() => { localStorage.removeItem('demara_form_autosave'); setRestored(false); setStep(1); setExtractedData(null); }}
                    style={{background:'none',border:'none',color:'#F5A623',fontSize:11,textDecoration:'underline',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                    Start fresh
                  </button>
                </div>
              )}
              <div style={S.panel('green')}>
                <div style={{fontSize:12,fontWeight:700,color:'#00C896'}}>✓ DEMARA AI successfully extracted your document</div>
                <div style={S.panelText}>Review the extracted information below. Edit any field if needed.</div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={S.lbl}>Document Type</label>
                  <div style={{...S.ipt,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,.7)',fontWeight:600}}>
                    {extractedData.document_type?.replace(/_/g, ' ')}
                  </div>
                </div>
                {[
                  { key: 'faseh_request_number', label: 'Faseh Request Number' },
                  { key: 'ghad_cr_number', label: 'GHAD CR Number' },
                  { key: 'importer_name', label: 'Importer Name' },
                  { key: 'port_of_entry', label: 'Port of Entry' },
                  { key: 'shipment_country', label: 'Shipment Country' },
                ].map(field => {
                  const confidence = extractedData._confidence?.[field.key];
                  const isLow = confidence === 'low';
                  return (
                    <div key={field.key}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <label style={S.lbl}>{field.label}</label>
                        {isLow && (
                          <span style={{fontSize:10,color:'#F5A623',fontWeight:600}}>⚠️ Please confirm</span>
                        )}
                        {!isLow && extractedData[field.key] && (
                          <span style={{fontSize:10,color:'#00C896',fontWeight:600}}>✓ AI extracted</span>
                        )}
                      </div>
                      <input type="text" value={extractedData[field.key] || ''}
                        onChange={e => setExtractedData({...extractedData, [field.key]: e.target.value})}
                        style={{...S.ipt,
                          ...(isLow ? {borderColor:tint('amber',.45),background:tint('amber',.06)} :
                          extractedData[field.key] ? {borderColor:tint('green',.35),background:tint('green',.05)} : {})}} />
                    </div>
                  );
                })}
              <div>
                <label style={S.lbl}>
                  Supplier Name <span style={{textTransform:'none',fontWeight:400,color:'rgba(255,255,255,.25)'}}>(optional)</span>
                </label>
                <input type="text" value={extractedData.supplier_name || ''}
                  onChange={e => setExtractedData({...extractedData, supplier_name: e.target.value})}
                  placeholder="e.g. Almarai Company"
                  maxLength={255}
                  style={S.ipt} />
              </div>
              <div>
                <label style={S.lbl}>
                  Product Category <span style={{textTransform:'none',fontWeight:400,color:'rgba(255,255,255,.25)'}}>(optional)</span>
                </label>
                <select value={extractedData.product_category || ''}
                  onChange={e => setExtractedData({...extractedData, product_category: e.target.value})}
                  style={{...S.ipt,cursor:'pointer'}}>
                  <option value="">Select SFDA category</option>
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>QC Lab</label>
                <select value={selectedLabId}
                  onChange={e => {
                    setSelectedLabId(e.target.value);
                    const selected = labs.find(l => l.id === e.target.value);
                    setSelectedLabInfo(selected || null);
                  }}
                  style={{...S.ipt,cursor:'pointer'}}>
                  <option value="">Select QC lab</option>
                  {labs
                    .sort((a, b) => (a.average_turnaround_hours || 99) - (b.average_turnaround_hours || 99))
                    .map(l => {
                      const isTopPerformer = l.average_turnaround_hours <= 36 && l.total_tests_completed >= 200;
                      return (
                        <option key={l.id} value={l.id}>
                          {isTopPerformer ? '⭐ ' : ''}{l.name_en} {l.average_turnaround_hours ? `— ~${l.average_turnaround_hours}h` : ''}
                        </option>
                      );
                    })}
                </select>
                {selectedLabInfo && (
                  <div style={{...S.panel('cyan'),marginTop:8,padding:'10px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#38C6FF'}}>{selectedLabInfo.name_en}</div>
                      <div style={{display:'flex',gap:4}}>
                        {selectedLabInfo.average_turnaround_hours <= 36 && selectedLabInfo.total_tests_completed >= 200 && (
                          <span style={S.pill('amber')}>⭐ Top Performer</span>
                        )}
                        {selectedLabInfo.sfda_appointment_number && (
                          <span style={S.pill('green')}>✓ SFDA Appointed</span>
                        )}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                      {selectedLabInfo.sfda_appointment_number && (
                        <div style={labInfoText}>SFDA: {selectedLabInfo.sfda_appointment_number}</div>
                      )}
                      {selectedLabInfo.iso_accreditation_number && (
                        <div style={labInfoText}>ISO: {selectedLabInfo.iso_accreditation_number}</div>
                      )}
                      {selectedLabInfo.average_turnaround_hours && (
                        <div style={labInfoText}>Avg turnaround: {selectedLabInfo.average_turnaround_hours}h</div>
                      )}
                      {selectedLabInfo.total_tests_completed > 0 && (
                        <div style={labInfoText}>Tests completed: {selectedLabInfo.total_tests_completed}</div>
                      )}
                      {selectedLabInfo.sfda_appointment_expiry && (
                        <div style={labInfoText}>
                          Appointment expires: {new Date(selectedLabInfo.sfda_appointment_expiry).toLocaleDateString('en-SA', {day:'2-digit', month:'short', year:'numeric'})}
                          {new Date(selectedLabInfo.sfda_appointment_expiry) < new Date(Date.now() + 60*24*60*60*1000) && (
                            <span style={{color:'#F5A623',fontWeight:600}}> ⚠️ Expiring soon</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
                <div>
                  <label style={S.lbl}>Clearance Company</label>
                  <select value={selectedClearanceId} onChange={e => setSelectedClearanceId(e.target.value)}
                    style={{...S.ipt,cursor:'pointer'}}>
                    <option value="">Select clearance company</option>
                    {clearanceCompanies.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                  </select>
                </div>
              </div>

              {/* Products */}
              {extractedData.products && extractedData.products.length > 0 && (
                <div>
                  <label style={S.lbl}>Products Extracted ({extractedData.products.length})</label>
                  <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:6}}>
                    {extractedData.products.map((p, i) => (
                      <div key={i} style={S.subCard}>
                        <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{p.product_name_en}</div>
                        <div style={{display:'flex',gap:12,marginTop:4,flexWrap:'wrap'}}>
                          {p.ecos_ma_number && <span style={S.meta}>E-Cosma: {p.ecos_ma_number}</span>}
                          {p.batch_number && <span style={S.meta}>Batch: {p.batch_number}</span>}
                          {p.quantity && <span style={S.meta}>Qty: {p.quantity} {p.quantity_unit}</span>}
                          {p.country_of_origin && <span style={S.meta}>Origin: {p.country_of_origin}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.overall_decision && (
                <div style={S.panel(extractedData.overall_decision === 'CONFORMING' ? 'green' : 'red')}>
                  <div style={{fontSize:12,fontWeight:700,color:TONES[extractedData.overall_decision === 'CONFORMING' ? 'green' : 'red'][0]}}>Decision Detected: {extractedData.overall_decision}</div>
                </div>
              )}

              <div style={{display:'flex',gap:10}}>
                <button onClick={() => setStep(1)}
                  style={S.ghostBtn}>
                  ← Back
                </button>
                <button onClick={handleConfirm} disabled={submitting}
                  style={{...S.primaryBtn,flex:1,width:'auto',opacity:submitting ? .6 : 1}}>
                  {submitting ? 'Opening record...' : '✓ Confirm & Open Shipment Record'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Raise a Concern Component
function RaiseAConcern({ shipment, token }) {
  const [open, setOpen] = useState(false);
  const [concern, setConcern] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!concern.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/concern`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ concern })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setOpen(false);
        setConcern('');
      } else {
        setError('Failed to submit concern');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div style={{...S.panel('green'),textAlign:'center'}}>
      <div style={{fontSize:12,color:'#00C896',fontWeight:600}}>✓ Your concern has been submitted to DEMARA. We will follow up within 24 hours.</div>
    </div>
  );

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          style={{...S.ghostBtn,width:'100%',fontSize:11,padding:'9px 14px',color:'rgba(255,255,255,.5)'}}>
          ⚠️ Raise a Concern About This Shipment
        </button>
      ) : (
        <div style={S.panel('amber')}>
          <div style={S.panelTitle('amber')}>⚠️ Raise a Concern</div>
          <div style={{...S.panelText,marginBottom:10}}>Describe your concern about this shipment. DEMARA will review and respond within 24 hours.</div>
          {error && <div style={{fontSize:11,color:'#FF5470',marginBottom:8}}>{error}</div>}
          <textarea value={concern} onChange={e => setConcern(e.target.value)}
            rows={3} placeholder="Describe your concern..."
            style={{...S.ipt,resize:'vertical'}} />
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={handleSubmit} disabled={submitting || !concern.trim()}
              style={{...smallBtn('amber'),flex:1,padding:'9px 14px',fontSize:12,opacity: submitting || !concern.trim() ? .5 : 1}}>
              {submitting ? 'Submitting...' : 'Submit Concern'}
            </button>
            <button onClick={() => { setOpen(false); setConcern(''); }}
              style={S.ghostBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Destruction Grace Period Component
function DestructionGracePeriod({ shipment, token, onClose }) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const enteredAt = new Date(shipment.state_entered_at);
      const deadline = new Date(enteredAt.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = deadline - now;
      if (diff <= 0) return 0;
      return diff;
    };
    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [shipment.state_entered_at]);

  const formatTimeLeft = (ms) => {
    if (!ms || ms <= 0) return 'Expired';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: 'NON_CONFORMING',
          notes: 'MAH cancelled destruction within 24-hour grace period',
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.message || 'Failed to cancel');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setCancelling(false);
    }
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;

  return (
    <div style={{background:tint(isExpired ? 'red' : 'amber',.07),border:`2px solid ${tint(isExpired ? 'red' : 'amber',.5)}`,borderRadius:12,padding:'16px 18px'}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:8,color: isExpired ? '#FF5470' : '#F5A623'}}>
        🗑️ Destruction {isExpired ? 'Confirmed — Processing' : 'Pending — Grace Period Active'}
      </div>
      {!isExpired ? (
        <>
          <div style={{...S.panelText,marginBottom:12}}>You have selected destruction for this shipment. You have 24 hours to cancel before destruction procedures are initiated.</div>
          <div style={{background:'rgba(0,0,0,.2)',border:`1px solid ${tint('amber',.25)}`,borderRadius:10,padding:12,textAlign:'center',marginBottom:12}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'1px'}}>Time remaining to cancel</div>
            <div style={{fontSize:24,fontWeight:800,color:'#F5A623',fontFamily:S.mono,marginTop:4}}>{formatTimeLeft(timeLeft)}</div>
          </div>
          {error && <div style={{fontSize:11,color:'#FF5470',marginBottom:8}}>{error}</div>}
          <button onClick={handleCancel} disabled={cancelling}
            style={{...smallBtn('amber'),width:'100%',padding:'10px 14px',fontSize:12,border:`2px solid ${tint('amber',.5)}`,opacity:cancelling ? .5 : 1}}>
            {cancelling ? 'Cancelling...' : '↩ Cancel Destruction Request'}
          </button>
        </>
      ) : (
        <>
          <div style={{...S.panelText,color:'rgba(255,84,112,.85)',marginBottom:8}}>The 24-hour grace period has expired. Destruction procedures have been initiated and the clearance company has been notified.</div>
          <div style={{...S.panelText,color:'rgba(255,84,112,.85)'}}>If you wish to reverse this decision, please act immediately using the Raise a Concern button below. DEMARA admin will review your request and contact the clearance company. Reversal is only possible if the clearance company has not yet started destruction procedures.</div>
        </>
      )}
    </div>
  );
}

// Partial Conforming Action Component
function PartialConformingAction({ shipment, token, onClose }) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [productActions, setProductActions] = useState({});

  useEffect(() => {
    if (shipment.products) {
      const actions = {};
      shipment.products.forEach(p => {
        if (p.current_decision === 'REJECTED') {
          actions[p.id] = 'reexport';
        }
      });
      setProductActions(actions);
    }
  }, [shipment]);

  const handleSubmit = async () => {
    setActing(true);
    setError(null);
    try {
      // Update per-product actions
      for (const [productId, action] of Object.entries(productActions)) {
        await fetch(`${API_URL}/shipments/${shipment.id}/products/${productId}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            decision: 'REJECTED',
            decision_notes: action === 'reexport' ? 'MAH selected re-export' : 'MAH selected destruction'
          })
        });
      }

      // Transition to partial clearance
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: 'PARTIAL_CLEARANCE_IN_PROGRESS',
          notes: 'MAH selected actions for non-conforming products',
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {
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

  const rejectedProducts = shipment.products?.filter(p => p.current_decision === 'REJECTED') || [];
  const approvedProducts = shipment.products?.filter(p => p.current_decision === 'APPROVED') || [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {/* Approved products */}
      {approvedProducts.length > 0 && (
        <div style={S.panel('green')}>
          <div style={S.panelTitle('green')}>✅ Conforming Products — Will Proceed to Clearance</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {approvedProducts.map(p => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',flexShrink:0}}></span>
                <span style={{fontSize:12,color:'rgba(255,255,255,.75)'}}>{p.product_name_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected products — per product action */}
      {rejectedProducts.length > 0 && (
        <div style={S.panel('red')}>
          <div style={S.panelTitle('red')}>❌ Non-Conforming Products — Select Action Per Product</div>
          {error && <div style={{...S.error,marginBottom:10}}>{error}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {rejectedProducts.map(p => (
              <div key={p.id} style={S.subCard}>
                <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:8}}>{p.product_name_en}</div>
                <div style={{display:'flex',gap:8}}>
                  <button
                    onClick={() => setProductActions({...productActions, [p.id]: 'reexport'})}
                    style={choiceBtn(productActions[p.id] === 'reexport', 'amber')}>
                    🚢 Re-Export
                  </button>
                  <button
                    onClick={() => setProductActions({...productActions, [p.id]: 'destruction'})}
                    style={choiceBtn(productActions[p.id] === 'destruction', 'grey')}>
                    🗑️ Destruction
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={acting}
            style={{...S.primaryBtn,marginTop:12,opacity:acting ? .6 : 1}}>
            {acting ? 'Processing...' : 'Confirm Actions & Proceed'}
          </button>
        </div>
      )}
    </div>
  );
}

// Reassign Lab Component
function ReassignLabModal({ shipment, token, onClose }) {
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedLabInfo, setSelectedLabInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/labs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLabs(data.labs || []);
      } catch (err) {
        console.error('Failed to fetch labs');
      }
    };
    fetchLabs();
  }, []);

  const handleReassign = async () => {
    if (!selectedLabId) { setError('Please select a lab'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lab_id: selectedLabId })
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.message || 'Failed to reassign');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.panel('amber')}>
      <div style={S.panelTitle('amber')}>⚠️ Lab Declined — Select New QC Lab</div>
      <div style={{...S.panelText,marginBottom:10}}>The selected lab declined your assignment. Please select a different certified QC lab.</div>
      {error && <div style={{...S.error,marginBottom:10}}>{error}</div>}
      <select value={selectedLabId}
        onChange={e => {
          setSelectedLabId(e.target.value);
          const selected = labs.find(l => l.id === e.target.value);
          setSelectedLabInfo(selected || null);
        }}
        style={{...S.ipt,cursor:'pointer',marginBottom:10}}>
        <option value="">Select a new QC lab</option>
        {labs.map(l => (
          <option key={l.id} value={l.id}>
            {l.name_en} {l.average_turnaround_hours ? `— ~${l.average_turnaround_hours}h` : ''}
          </option>
        ))}
      </select>
      {selectedLabInfo && (
        <div style={{...S.subCard,marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{selectedLabInfo.name_en}</div>
            {selectedLabInfo.sfda_appointment_number && (
              <span style={S.pill('green')}>✓ SFDA Appointed</span>
            )}
          </div>
          {selectedLabInfo.average_turnaround_hours && (
            <div style={{...S.meta,marginTop:4}}>Avg turnaround: {selectedLabInfo.average_turnaround_hours}h · Tests: {selectedLabInfo.total_tests_completed}</div>
          )}
        </div>
      )}
      <button onClick={handleReassign} disabled={submitting || !selectedLabId}
        style={{...S.primaryBtn,opacity: submitting || !selectedLabId ? .5 : 1}}>
        {submitting ? 'Reassigning...' : 'Confirm New Lab Selection'}
      </button>
    </div>
  );
}

// Reassign Clearance Company Component
function ReassignClearanceModal({ shipment, token, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/organisations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setCompanies((data.organisations || []).filter(o => o.org_type === 'CLEARANCE_COMPANY'));
      } catch (err) {
        console.error('Failed to fetch companies');
      }
    };
    fetchCompanies();
  }, []);

  const handleReassign = async () => {
    if (!selectedId) { setError('Please select a clearance company'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clearance_company_id: selectedId })
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.message || 'Failed to reassign');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.panel('amber')}>
      <div style={S.panelTitle('amber')}>⚠️ Clearance Company Declined — Select New Company</div>
      <div style={{...S.panelText,marginBottom:10}}>The selected clearance company declined your assignment. Please select a different company.</div>
      {error && <div style={{...S.error,marginBottom:10}}>{error}</div>}
      <select value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        style={{...S.ipt,cursor:'pointer',marginBottom:10}}>
        <option value="">Select a new clearance company</option>
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.name_en}</option>
        ))}
      </select>
      <button onClick={handleReassign} disabled={submitting || !selectedId}
        style={{...S.primaryBtn,opacity: submitting || !selectedId ? .5 : 1}}>
        {submitting ? 'Reassigning...' : 'Confirm New Clearance Company'}
      </button>
    </div>
  );
}

// Non-Conforming Action Component
function NonConformingAction({ shipment, token, onClose }) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async (action) => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
          new_state: action === 'reexport' ? 'RE_EXPORT_INITIATED' : 'DESTRUCTION_PENDING',
          notes: action === 'reexport' ? 'MAH selected re-export' : 'MAH selected destruction — 24 hour grace period started',
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {
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
    <div style={S.panel('red')}>
      <div style={S.panelTitle('red')}>⚠️ Action Required — Non-Conforming Decision</div>
      <div style={{...S.panelText,marginBottom:12}}>One or more products did not pass SFDA quality control. Please select how you wish to proceed:</div>
      {error && <div style={{...S.error,marginBottom:10}}>{error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <button onClick={() => handleAction('reexport')} disabled={acting}
          style={bigChoice('red', acting)}>
          <div style={{fontSize:20}}>🚢</div>
          <div style={{fontSize:13,fontWeight:700,color:'#FF5470',marginTop:4}}>Re-Export</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:3}}>Return goods to origin country</div>
        </button>
        <button onClick={() => handleAction('destruction')} disabled={acting}
          style={bigChoice('grey', acting)}>
          <div style={{fontSize:20}}>🗑️</div>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginTop:4}}>Destruction</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:3}}>Destroy goods — 24 hours to cancel</div>
        </button>
      </div>
    </div>
  );
}

// Shown while a non-conforming shipment is DECISION_OVERDUE. The escalation job
// moves it to SFDA_ORDERED_DESTRUCTION 24 hours after it entered this state.
function OverdueDecisionBanner({ shipment, token, onClose }) {
  const hoursLeft = () => {
    const deadline = new Date(shipment.state_entered_at).getTime() + 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 3600000));
  };
  const [hours, setHours] = useState(hoursLeft);

  useEffect(() => {
    setHours(hoursLeft());
    const interval = setInterval(() => setHours(hoursLeft()), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment.state_entered_at]);

  const when = hours > 0 ? `in ${hours} hour${hours === 1 ? '' : 's'}` : 'at any moment';

  return (
    <div style={{padding:'16px 22px 0'}}>
      <div role="alert" style={{background:'#FF5470',color:'#fff',borderRadius:12,padding:'14px 16px',marginBottom:12,boxShadow:'0 4px 24px rgba(255,84,112,.35)'}}>
        <div style={{fontSize:14,fontWeight:800}}>⚠ Urgent: SFDA will order destruction {when} if you do not act now.</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.85)',marginTop:4}}>
          No re-export or destruction choice was made within 24 hours of the non-conforming result.
        </div>
      </div>
      <NonConformingAction shipment={shipment} token={token} onClose={onClose} />
    </div>
  );
}

// Shipment Detail Modal
// ============================================
// SLA timing — frontend only, timed from state_entered_at (per state, not per stage)
// ============================================
const HOUR_MS = 60 * 60 * 1000;
const OVERDUE_TO_DESTRUCTION_MS = 24 * HOUR_MS; // escalationJob: DECISION_OVERDUE → SFDA_ORDERED_DESTRUCTION

// SLA target in hours per state. States not listed have no SLA.
const SLA_HOURS = {};
[
  // Stage 2 — CB review and Faseh
  [24, ['CB_ASSIGNED', 'CB_REVIEWING', 'CHANGES_REQUESTED', 'CHANGES_SUBMITTED', 'CB_APPROVED', 'CLEARANCE_DECLINED', 'CLEARANCE_ACCEPTED']],
  // Stage 3 — sampling, 24h per step
  [24, ['SAMPLING_REQUESTED', 'INSPECTOR_DISPATCHED', 'SAMPLE_COLLECTED', 'PICKUP_SCHEDULED', 'SAMPLE_PICKED_UP', 'IN_TRANSIT', 'IN_TRANSIT_TO_LAB', 'LAB_RECEIVED']],
  // Stage 4 — lab analysis
  [48, ['LAB_ACCEPTED', 'IN_ANALYSIS', 'ANALYSIS_COMPLETE', 'RESULT_SUBMITTED']],
  // Stage 6 — clearance (CONFORMING: clearance company must start procedures)
  [24, ['CONFORMING', 'CLEARANCE_IN_PROGRESS', 'PARTIAL_CLEARANCE_IN_PROGRESS', 'BOND_RELEASED', 'DUTIES_PAID']],
  // Stage 6C — MAH must choose what happens to non-conforming goods
  [24, ['NON_CONFORMING', 'PARTIALLY_CONFORMING']],
].forEach(([hours, states]) => states.forEach(s => { SLA_HOURS[s] = hours; }));

// "5h 12m" under a day, "2 days 3 hours" from a day up
const formatSlaDuration = (ms) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days === 0) return `${hours}h ${minutes}m`;
  return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'}`;
};

// level: 'none' | 'ok' | 'approaching' | 'breached' | 'destruction-countdown'
function getSlaStatus(state, enteredAt, now = Date.now()) {
  if (!enteredAt) return null;
  const entered = new Date(enteredAt).getTime();
  const elapsed = Math.max(0, now - entered);

  if (state === 'DECISION_OVERDUE') {
    return { level: 'destruction-countdown', elapsed, remaining: entered + OVERDUE_TO_DESTRUCTION_MS - now };
  }
  const hours = SLA_HOURS[state];
  if (!hours) return { level: 'none', elapsed };

  const limit = hours * HOUR_MS;
  if (elapsed > limit) return { level: 'breached', elapsed, overBy: elapsed - limit };
  if (elapsed > limit * 0.75) return { level: 'approaching', elapsed, remaining: limit - elapsed };
  return { level: 'ok', elapsed };
}

const SLA_DOT = { ok: '🟢', approaching: '🟡', breached: '🔴', 'destruction-countdown': '🔴' };
const SLA_DOT_TITLE = { ok: 'On track', approaching: 'Approaching SLA', breached: 'SLA breached', 'destruction-countdown': 'Decision overdue' };

// Live SLA line for the detail modal; re-renders every minute
function SlaTimer({ state, enteredAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [state, enteredAt]);

  const sla = getSlaStatus(state, enteredAt, now);
  if (!sla) return null;

  let color, text, pulse = false;
  switch (sla.level) {
    case 'ok':
      color = '#00C896'; text = `On track · ${formatSlaDuration(sla.elapsed)} elapsed`; break;
    case 'approaching':
      color = '#F5A623'; text = `⚠ ${formatSlaDuration(sla.remaining)} remaining`; break;
    case 'breached':
      color = '#FF5470'; text = `⚠ Overdue by ${formatSlaDuration(sla.overBy)}`; break;
    case 'destruction-countdown': {
      const hoursLeft = Math.ceil(sla.remaining / HOUR_MS);
      color = '#FF5470'; pulse = true;
      text = hoursLeft > 0 ? `🚨 SFDA orders destruction in ${hoursLeft}h` : '🚨 SFDA destruction order imminent';
      break;
    }
    default:
      color = '#808285'; text = `${formatSlaDuration(sla.elapsed)} in this state`;
  }

  return (
    <div style={{fontSize:13,fontWeight:600,marginTop:8,color,animation: pulse ? 'pulse 2s infinite' : 'none'}}
      title={`In this state since ${formatDate(enteredAt)}`}>
      {text}
    </div>
  );
}

const scoreColor = (score) => score >= 80 ? '#00C896' : score >= 50 ? '#F5A623' : '#FF5470';

// AI findings for one uploaded document: its issues plus any failed or warned checks
const documentFindings = (doc) => {
  const v = doc?.validation_result || {};
  const issues = Array.isArray(v.issues) ? v.issues : [];
  const checks = (Array.isArray(v.checks) ? v.checks : [])
    .filter(c => c.status === 'FAIL' || c.status === 'WARN')
    .map(c => `${c.item} — ${c.message}`);
  return [...issues, ...checks];
};

// MAH reviews the AI validation and confirms before documents go to the clearance company
function ConfirmDocumentsPanel({ shipment, token, readiness, confirmation, onConfirmed }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!readiness) return null;

  if (confirmation.at) {
    return (
      <div style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.3)',borderRadius:'12px',padding:'14px 18px',marginBottom:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:700,color:'#00C896'}}>✓ Documents confirmed and shared</div>
        <div style={{fontSize:'12px',color:'rgba(255,255,255,.55)',marginTop:'2px'}}>
          Confirmed {formatDate(confirmation.at)} · AI validation score {confirmation.score}/100 · Visible to {shipment.clearance_company_name || 'your clearance company'}
        </div>
      </div>
    );
  }

  const uploadedCount = readiness.summary?.total_uploaded || 0;
  if (shipment.current_state !== 'DECLARATION_FILED' && uploadedCount === 0) return null;

  const score = readiness.overall_score ?? 0;
  const uploadedMap = {};
  (readiness.documents || []).forEach(d => { uploadedMap[d.document_type] = d; });

  const rows = Object.entries(readiness.document_types || {}).map(([type, def]) => {
    const doc = uploadedMap[type];
    if (!doc) {
      return def.required
        ? { type, label: def.label, icon: '✗', color: '#FF5470', status: 'Missing', findings: [] }
        : { type, label: def.label, icon: '○', color: '#808285', status: 'Optional — not uploaded', findings: [] };
    }
    const findings = documentFindings(doc);
    return doc.readiness_status === 'READY'
      ? { type, label: def.label, icon: '✓', color: '#00C896', status: 'Valid', findings }
      : { type, label: def.label, icon: '⚠', color: '#F5A623', status: 'Issues found', findings };
  });

  const canConfirm = checked && !submitting && uploadedCount > 0 && !!shipment.clearance_company_id;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/confirm-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmed: true, ai_score: score, confirmed_at: new Date().toISOString() })
      });
      const result = await res.json();
      if (result.success) {
        onConfirmed({ at: result.confirmed_at, score: result.ai_score });
      } else {
        setError(result.message || 'Confirmation failed');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToUploads = () => {
    document.getElementById(`document-upload-list-${shipment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{background:'rgba(255,255,255,0.05)',border:`2px solid ${scoreColor(score)}`,borderRadius:'14px',padding:'18px 20px',marginBottom:'20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'14px'}}>
        <div style={{width:'64px',height:'64px',borderRadius:'50%',flexShrink:0,
          border:`5px solid ${scoreColor(score)}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:'18px',fontWeight:800,color:scoreColor(score),lineHeight:1}}>{score}</div>
          <div style={{fontSize:'8px',color:'rgba(255,255,255,.4)'}}>/ 100</div>
        </div>
        <div>
          <div style={{fontSize:'16px',fontWeight:800,color:'#fff'}}>Review &amp; Confirm Documents</div>
          <div style={{fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'2px'}}>
            Review the AI validation below, then confirm to share your documents with the clearance company.
          </div>
        </div>
      </div>

      {/* Per-document status */}
      <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'14px'}}>
        {rows.map(r => (
          <div key={r.type} style={{padding:'7px 10px',borderRadius:'8px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{color:r.color,fontWeight:700,width:'14px',textAlign:'center'}}>{r.icon}</span>
              <span style={{fontSize:'12px',fontWeight:600,color:'#fff',flex:1}}>{r.label}</span>
              <span style={{fontSize:'11px',fontWeight:600,color:r.color}}>{r.status}</span>
            </div>
            {r.findings.length > 0 && (
              <ul style={{margin:'4px 0 0 22px',padding:0,listStyle:'disc'}}>
                {r.findings.map((f, i) => (
                  <li key={i} style={{fontSize:'11px',color:'rgba(255,255,255,.55)',lineHeight:1.5}}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <label style={{display:'flex',alignItems:'flex-start',gap:'8px',fontSize:'12px',color:'rgba(255,255,255,.8)',cursor:'pointer',marginBottom:'12px'}}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{marginTop:'2px',accentColor:'#38C6FF'}} />
        I have reviewed the AI findings and confirm these documents are ready for submission to the clearance company
      </label>

      {!shipment.clearance_company_id && (
        <div style={{fontSize:'11px',color:'#FF5470',marginBottom:'8px'}}>Assign a clearance company before confirming.</div>
      )}
      {error && <div style={{fontSize:'12px',color:'#FF5470',marginBottom:'8px'}}>⚠ {error}</div>}

      <div style={{display:'flex',gap:'8px'}}>
        <button onClick={scrollToUploads}
          style={S.ghostBtn}>
          Correct Issues
        </button>
        <button onClick={handleConfirm} disabled={!canConfirm}
          style={{flex:1,padding:'9px 16px',borderRadius:'8px',fontSize:'12px',fontWeight:700,border:'none',fontFamily:'inherit',
            color: canConfirm ? '#252266' : 'rgba(255,255,255,.35)',
            background: canConfirm ? 'linear-gradient(135deg,#38C6FF,#0088DD)' : 'rgba(255,255,255,.08)', cursor: canConfirm ? 'pointer' : 'not-allowed'}}>
          {submitting ? '⟳ Confirming...' : 'Confirm & Share with Clearance'}
        </button>
      </div>
    </div>
  );
}

function ShipmentDetailModal({ shipmentId, token, onClose }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState('details');
  const [readiness, setReadiness] = useState(null);
  const [confirmation, setConfirmation] = useState({ at: null, score: null });

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipment(data.shipment);
        if (data.shipment) {
          setConfirmation({ at: data.shipment.document_confirmed_at, score: data.shipment.document_ai_score });
        }
      } catch (err) {
        console.error('Failed to fetch shipment');
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [shipmentId]);

  if (loading) return (
    <div style={S.backdrop}>
      <div style={{background:'#332E8A',border:'1px solid rgba(0,170,255,.15)',borderRadius:14,padding:'28px 36px',fontSize:13,color:'rgba(255,255,255,.5)',fontFamily:'Inter,sans-serif'}}>Loading...</div>
    </div>
  );

  if (!shipment) return null;

  const stateInfo = STATE_INFO[shipment.current_state] || { label: shipment.current_state, tone: 'grey', step: 1 };

  const statusTone = shipment.current_state === 'FINAL_CLEARANCE' || shipment.current_state === 'CONFORMING' ? 'green' :
    shipment.current_state === 'NON_CONFORMING' || shipment.current_state === 'CB_REJECTED' ? 'red' : 'cyan';
  const decisionTone = (d) => d === 'APPROVED' ? 'green' : d === 'REJECTED' ? 'red' : 'grey';

  return (
    <div style={S.backdrop}>
      <div style={S.modal(820)}>
        <div style={S.modalHead}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#fff',fontFamily:S.mono}}>{shipment.faseh_request_number}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{shipment.importer_name}</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>×</button>
        </div>
        {shipment.current_state === 'DECISION_OVERDUE' && (
          <OverdueDecisionBanner shipment={shipment} token={token} onClose={onClose} />
        )}
        {/* Tab navigation */}
        <div style={{display:'flex',gap:2,padding:'0 22px',borderBottom:'1px solid rgba(0,170,255,.1)',background:'rgba(255,255,255,0.04)'}}>
          {[
            {key:'details',label:'📋 Shipment Details'},
            {key:'documents',label:'📁 Document Readiness'},
            {key:'timeline',label:'📅 Timeline'},
          ].map(tab => (
            <div key={tab.key}
              onClick={() => setDetailTab(tab.key)}
              style={{
                padding:'11px 16px',fontSize:'12px',fontWeight:600,cursor:'pointer',
                borderBottom:`2px solid ${detailTab === tab.key ? '#38C6FF' : 'transparent'}`,
                color: detailTab === tab.key ? '#fff' : 'rgba(255,255,255,.4)',
                marginBottom:'-1px',transition:'all 0.15s'
              }}>
              {tab.label}
            </div>
          ))}
        </div>

        <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:18}}>
          {detailTab === 'documents' && (
            <>
              <ConfirmDocumentsPanel
                shipment={shipment}
                token={token}
                readiness={readiness}
                confirmation={confirmation}
                onConfirmed={setConfirmation}
              />
              <DocumentReadiness
                shipmentId={shipment.id}
                token={token}
                shipment={shipment}
                onDataLoaded={(data, { changed }) => {
                  setReadiness(data);
                  // An upload or delete clears the confirmation on the server too
                  if (changed) setConfirmation({ at: null, score: null });
                }}
              />
            </>
          )}

          {detailTab === 'timeline' && (
            <div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'16px',fontWeight:700,color:'#fff',marginBottom:'4px'}}>Shipment Timeline</div>
                <div style={{fontSize:'12px',color:'rgba(255,255,255,.4)'}}>Complete audit trail — every state change, action, and notification</div>
              </div>
              {shipment.audit_log && shipment.audit_log.length > 0 ? (
                <div style={{position:'relative'}}>
                  {/* Vertical line */}
                  <div style={{position:'absolute',left:'15px',top:'8px',bottom:'8px',width:'2px',background:'rgba(255,255,255,0.08)',borderRadius:'1px'}}></div>
                  <div style={{display:'flex',flexDirection:'column',gap:'0px'}}>
                    {[...shipment.audit_log].reverse().map((log, index) => {
                      const sourceColor = log.trigger_source === 'EMAIL_PARSER' ? '#44C8F5' :
                                         log.trigger_source === 'SYSTEM' ? '#7C5CFC' : '#00C896';
                      const sourceLabel = log.trigger_source === 'EMAIL_PARSER' ? '📧 Email Parser' :
                                         log.trigger_source === 'SYSTEM' ? '⚙️ System' : '👤 Manual';
                      const isFirst = index === 0;
                      return (
                        <div key={log.id} style={{display:'flex',gap:'16px',paddingBottom:'20px',position:'relative'}}>
                          {/* Dot */}
                          <div style={{
                            width:'30px',height:'30px',borderRadius:'50%',
                            background: isFirst ? 'rgba(56,198,255,0.15)' : '#332E8A',
                            border:`2px solid ${isFirst ? '#38C6FF' : 'rgba(255,255,255,0.12)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            flexShrink:0,zIndex:1,
                            boxShadow: isFirst ? '0 0 0 4px rgba(56,198,255,0.12)' : 'none'
                          }}>
                            <div style={{
                              width:'8px',height:'8px',borderRadius:'50%',
                              background: isFirst ? '#38C6FF' : sourceColor
                            }}></div>
                          </div>
                          {/* Content */}
                          <div style={{
                            flex:1,background:'rgba(255,255,255,0.05)',
                            border:`1px solid ${isFirst ? 'rgba(56,198,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius:'10px',padding:'12px 14px',
                            boxShadow: isFirst ? '0 2px 12px rgba(56,198,255,0.08)' : 'none'
                          }}>
                            {/* State change */}
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                              <span style={{
                                fontFamily:'JetBrains Mono,monospace',fontSize:'11px',fontWeight:600,
                                color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.05)',
                                padding:'2px 8px',borderRadius:'4px'
                              }}>{log.from_state?.replace(/_/g,' ') || '—'}</span>
                              <span style={{color:'#38C6FF',fontSize:'14px',fontWeight:700}}>→</span>
                              <span style={{
                                fontFamily:'JetBrains Mono,monospace',fontSize:'11px',fontWeight:700,
                                color:'#38C6FF',background:'rgba(56,198,255,0.1)',
                                padding:'2px 8px',borderRadius:'4px',
                                border:'1px solid rgba(56,198,255,0.2)'
                              }}>{log.to_state?.replace(/_/g,' ') || '—'}</span>
                            </div>
                            {/* Event */}
                            {log.trigger_event && (
                              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.75)',marginBottom:'4px',fontWeight:500}}>
                                {log.trigger_event}
                              </div>
                            )}
                            {/* Notes */}
                            {log.notes && (
                              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',marginBottom:'6px',fontStyle:'italic'}}>
                                "{log.notes}"
                              </div>
                            )}
                            {/* Meta */}
                            <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                              <span style={{
                                fontSize:'10px',fontWeight:600,
                                color:sourceColor,
                                background:`${sourceColor}15`,
                                padding:'2px 8px',borderRadius:'10px',
                                border:`1px solid ${sourceColor}30`
                              }}>{sourceLabel}</span>
                              {log.actor_role && (
                                <span style={{fontSize:'10px',color:'rgba(255,255,255,0.35)'}}>
                                  {log.actor_role.replace(/_/g,' ')}
                                </span>
                              )}
                              <span style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',marginLeft:'auto'}}>
                                {new Date(log.occurred_at).toLocaleString('en-SA',{
                                  day:'2-digit',month:'short',year:'numeric',
                                  hour:'2-digit',minute:'2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.35)'}}>
                  <div style={{fontSize:'32px',marginBottom:'8px'}}>📅</div>
                  <div style={{fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.6)',marginBottom:'4px'}}>No timeline events yet</div>
                  <div style={{fontSize:'12px'}}>State changes will appear here as the shipment progresses</div>
                </div>
              )}
            </div>
          )}

          {detailTab !== 'documents' && detailTab !== 'timeline' && <>
          {/* Progress */}
          <ProgressTracker currentStep={stateInfo.step} currentState={shipment.current_state} />

          {/* Status */}
          <div style={{background:tint(statusTone,.06),border:`1px solid ${tint(statusTone,.2)}`,borderRadius:10,padding:'12px 14px'}}>
            {badge(stateInfo.label, stateInfo.tone)}
            <SlaTimer state={shipment.current_state} enteredAt={shipment.state_entered_at} />
          </div>

          {/* Details */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              ['Faseh Request', shipment.faseh_request_number, '#38C6FF', true],
              ['GHAD CR Number', shipment.ghad_cr_number, '#fff', false],
              ['Port of Entry', shipment.port_of_entry, '#fff', false],
              ['Country', shipment.shipment_country, '#fff', false],
              ['QC Lab', shipment.lab_name || '—', '#fff', false],
              ['Clearance Company', shipment.clearance_company_name || '—', '#fff', false],
            ].map(([label, value, color, mono]) => (
              <div key={label} style={S.infoTile}>
                <div style={S.lbl}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,color,fontFamily:mono ? S.mono : 'inherit'}}>{value}</div>
              </div>
            ))}
            {shipment.total_dwell_minutes && (
              <div style={{gridColumn:'1 / -1',background:tint('green',.06),border:`1px solid ${tint('green',.2)}`,borderRadius:10,padding:'10px 14px'}}>
                <div style={S.lbl}>Total Dwell Time</div>
                <div style={{fontSize:18,fontWeight:800,color:'#00C896'}}>
                  {Math.floor(shipment.total_dwell_minutes / 1440)} days {Math.floor((shipment.total_dwell_minutes % 1440) / 60)} hours
                </div>
                <div style={{fontSize:11,color:'rgba(0,200,150,.6)',marginTop:2}}>From record opened to final clearance</div>
              </div>
            )}
          </div>

          {/* Products */}
          {shipment.products && shipment.products.length > 0 && (
            <div>
              <div style={S.section}>Products ({shipment.products.length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {shipment.products.map(p => (
                  <div key={p.id} style={{borderRadius:10,padding:'12px 14px',
                    background: p.current_decision === 'REJECTED' ? tint('red',.06) : p.current_decision === 'APPROVED' ? tint('green',.05) : 'rgba(255,255,255,0.04)',
                    border:`1px solid ${p.current_decision === 'REJECTED' ? tint('red',.2) : p.current_decision === 'APPROVED' ? tint('green',.18) : 'rgba(255,255,255,.06)'}`}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{p.product_name_en}</div>
                      {badge(p.current_decision, decisionTone(p.current_decision))}
                    </div>
                    <div style={{display:'flex',gap:16,marginTop:4,flexWrap:'wrap'}}>
                      {p.ecos_ma_number && <span style={S.meta}>E-Cosma: {p.ecos_ma_number}</span>}
                      {p.batch_number && <span style={S.meta}>Batch: {p.batch_number}</span>}
                      {p.country_of_origin && <span style={S.meta}>Origin: {p.country_of_origin}</span>}
                    </div>
                    {p.current_decision === 'REJECTED' && p.decision_notes && (
                      <div style={{marginTop:8,background:tint('red',.1),borderRadius:8,padding:'8px 12px'}}>
                        <div style={{fontSize:11,color:'#FF5470',fontWeight:700}}>Rejection Reason:</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.65)',marginTop:2}}>{p.decision_notes}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {shipment.documents && shipment.documents.length > 0 && (
            <div>
              <div style={S.section}>Documents ({shipment.documents.length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {shipment.documents.map(doc => (
                  <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.05)',borderRadius:8}}>
                    <span style={{fontSize:16}}>📄</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#fff'}}>{doc.file_name}</div>
                      <div style={S.meta}>{doc.document_type} · {formatDate(doc.uploaded_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab declined — MAH must select new lab */}
          {shipment.current_state === 'LAB_DECLINED' && (
            <ReassignLabModal shipment={shipment} token={token} onClose={onClose} />
          )}

          {/* Clearance declined — MAH must select new clearance company */}
          {shipment.current_state === 'CLEARANCE_DECLINED' && (
            <ReassignClearanceModal shipment={shipment} token={token} onClose={onClose} />
          )}

          {/* Success moment on FINAL_CLEARANCE */}
          {shipment.current_state === 'FINAL_CLEARANCE' && (
            <div style={{background:tint('green',.07),border:`2px solid ${tint('green',.45)}`,borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:10}}>🎉</div>
              <div style={{fontSize:17,fontWeight:800,color:'#00C896'}}>Shipment Successfully Cleared!</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.6)',marginTop:4}}>All products have passed SFDA quality control and customs clearance is complete.</div>
              {shipment.total_dwell_minutes && (
                <div style={{marginTop:12,display:'inline-block',background:'rgba(0,0,0,.2)',border:`1px solid ${tint('green',.25)}`,borderRadius:10,padding:'8px 16px'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Total clearance time</div>
                  <div style={{fontSize:17,fontWeight:800,color:'#00C896'}}>
                    {Math.floor(shipment.total_dwell_minutes / 1440)} days {Math.floor((shipment.total_dwell_minutes % 1440) / 60)} hours
                  </div>
                </div>
              )}
              <div style={{fontSize:11,color:'rgba(0,200,150,.65)',marginTop:12}}>Your release certificate has been emailed to you. Your goods are ready for collection.</div>
            </div>
          )}

          {/* Raise a Concern */}
          <RaiseAConcern shipment={shipment} token={token} />

          {/* Non-conforming action selection */}
          {shipment.current_state === 'NON_CONFORMING' && (
            <NonConformingAction shipment={shipment} token={token} onClose={onClose} />
          )}

          {/* Destruction grace period */}
          {shipment.current_state === 'DESTRUCTION_PENDING' && (
            <DestructionGracePeriod shipment={shipment} token={token} onClose={onClose} />
          )}

          {/* Partially conforming — per product actions */}
          {shipment.current_state === 'PARTIALLY_CONFORMING' && (
            <PartialConformingAction shipment={shipment} token={token} onClose={onClose} />
          )}

          {/* Download dwell time report */}
          {shipment.current_state === 'FINAL_CLEARANCE' && (
            <div style={{display:'flex',justifyContent:'center'}}>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/shipments/${shipment.id}/dwell-report`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dwell-report-${shipment.faseh_request_number}.pdf`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Download failed');
                  }
                }}
                style={{...smallBtn('cyan'),display:'flex',alignItems:'center',gap:8,padding:'9px 16px',fontSize:12}}>
                📄 Download Dwell Time Report
              </button>
            </div>
          )}

          {/* Timeline */}
          {shipment.audit_log && shipment.audit_log.length > 0 && (
            <div>
              <div style={S.section}>Shipment Timeline</div>
              <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:192,overflowY:'auto'}}>
                {shipment.audit_log.map(log => (
                  <div key={log.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,0.04)'}}>
                    <span style={{marginTop:5,width:6,height:6,borderRadius:'50%',flexShrink:0,
                      background: log.trigger_source === 'EMAIL_PARSER' ? '#38C6FF' :
                      log.trigger_source === 'SYSTEM' ? '#a78bfa' : '#00C896'}}></span>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.8)'}}>{log.from_state} → {log.to_state}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.45)'}}>{log.trigger_event}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.25)'}}>{log.trigger_source} · {formatDate(log.occurred_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>}
        </div>
      </div>
    </div>
  );
}

// Estimated Clearance Component
function EstimatedClearance({ shipment, organisations }) {
  const lab = organisations.find(o => o.id === shipment.lab_id);
  const avgTurnaroundHours = lab?.average_turnaround_hours || 48;

  const stateOrder = [
    'RECORD_OPENED', 'LAB_ACCEPTED', 'SAMPLING_REQUESTED', 'INSPECTOR_DISPATCHED',
    'SAMPLE_COLLECTED', 'IN_TRANSIT_TO_LAB', 'LAB_RECEIVED', 'IN_ANALYSIS',
    'RESULT_SUBMITTED', 'CONFORMING', 'CLEARANCE_IN_PROGRESS', 'BOND_RELEASED',
    'DUTIES_PAID', 'FINAL_CLEARANCE'
  ];

  const currentIndex = stateOrder.indexOf(shipment.current_state);
  if (currentIndex < 0 || currentIndex >= stateOrder.length - 1) return null;

  // Estimate hours remaining based on current state
  const hoursRemaining = (() => {
    switch (shipment.current_state) {
      case 'RECORD_OPENED':
      case 'LAB_ACCEPTED':
      case 'CLEARANCE_ACCEPTED':
        return avgTurnaroundHours + 24 + 8; // lab + clearance
      case 'SAMPLING_REQUESTED':
      case 'INSPECTOR_DISPATCHED':
        return avgTurnaroundHours + 16;
      case 'SAMPLE_COLLECTED':
      case 'IN_TRANSIT_TO_LAB':
        return avgTurnaroundHours + 8;
      case 'LAB_RECEIVED':
        return avgTurnaroundHours + 8;
      case 'IN_ANALYSIS':
        return avgTurnaroundHours / 2 + 8;
      case 'RESULT_SUBMITTED':
      case 'CONFORMING':
        return 8;
      case 'CLEARANCE_IN_PROGRESS':
      case 'BOND_RELEASED':
      case 'DUTIES_PAID':
        return 4;
      default:
        return null;
    }
  })();

  if (!hoursRemaining) return null;

  const estimatedDate = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);
  const formattedDate = estimatedDate.toLocaleDateString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div style={{fontSize:11,color:'#38C6FF',marginTop:2,fontWeight:600}}>
      Est. clearance: {formattedDate}
    </div>
  );
}

// Compliance Profile Component
function ComplianceProfile({ shipments, user }) {
  const [expanded, setExpanded] = useState(false);

  const total = shipments.length;
  const cleared = shipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length;
  const nonConforming = shipments.filter(s => ['NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)).length;
  const conformityRate = total > 0 ? Math.round((cleared / total) * 100) : 0;

  const avgDwellMinutes = shipments
    .filter(s => s.total_dwell_minutes)
    .reduce((acc, s, _, arr) => acc + s.total_dwell_minutes / arr.length, 0);
  const avgDwellDays = avgDwellMinutes > 0 ? (avgDwellMinutes / 1440).toFixed(1) : '—';

  const cleanStreak = (() => {
    const sorted = [...shipments]
      .filter(s => ['FINAL_CLEARANCE', 'NON_CONFORMING', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    let streak = 0;
    for (const s of sorted) {
      if (s.current_state === 'FINAL_CLEARANCE') streak++;
      else break;
    }
    return streak;
  })();

  const riskLevel = conformityRate >= 90 ? { label: 'Low Risk', tone: 'green' } :
                    conformityRate >= 70 ? { label: 'Medium Risk', tone: 'amber' } :
                    { label: 'High Risk', tone: 'red' };

  if (total === 0) return null;

  return (
    <div style={{margin:'16px 20px 0',borderRadius:14,border:`1px solid ${tint(riskLevel.tone,.25)}`,background:tint(riskLevel.tone,.05),overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:'pointer'}} onClick={() => setExpanded(!expanded)}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:18}}>📋</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Your Compliance Profile</div>
            <div style={S.meta}>{user?.full_name} · {user?.organisation_name || 'DEMARA Platform'}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          {badge(riskLevel.label, riskLevel.tone)}
          <span style={{color:'rgba(255,255,255,.35)',fontSize:12}}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{padding:'0 16px 16px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:14}}>
            {[
              [total, 'Total shipments', '#fff'],
              [`${conformityRate}%`, 'Conformity rate', '#00C896'],
              [avgDwellDays, 'Avg dwell (days)', '#38C6FF'],
              [cleanStreak, 'Clean streak', '#a78bfa'],
            ].map(([value, label, color]) => (
              <div key={label} style={{...S.infoTile,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
                <div style={{...S.meta,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{marginTop:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <span style={S.meta}>Conformity rate</span>
              <span style={{fontSize:11,fontWeight:700,color:'#fff'}}>{conformityRate}%</span>
            </div>
            <div style={{width:'100%',height:6,background:'rgba(255,255,255,.08)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:3,transition:'all .3s',
                width: `${conformityRate}%`,
                background: conformityRate >= 90 ? '#00C896' : conformityRate >= 70 ? '#F5A623' : '#FF5470'
              }}></div>
            </div>
          </div>

          {nonConforming > 0 && (
            <div style={{...S.panel('red'),marginTop:12}}>
              <div style={{fontSize:12,color:'#FF5470',fontWeight:600}}>⚠️ {nonConforming} non-conforming shipment{nonConforming > 1 ? 's' : ''} on record</div>
              <div style={S.panelText}>Review your supplier quality certificates to improve your conformity rate.</div>
            </div>
          )}

          {cleanStreak >= 3 && (
            <div style={{...S.panel('green'),marginTop:12}}>
              <div style={{fontSize:12,color:'#00C896',fontWeight:600}}>🏆 {cleanStreak} consecutive conforming shipments</div>
              <div style={S.panelText}>Excellent compliance record. You may qualify for expedited clearance.</div>
            </div>
          )}

          <div style={{...S.meta,textAlign:'center',marginTop:12}}>
            This compliance profile is calculated from your DEMARA shipment history and updated in real time.
          </div>
        </div>
      )}
    </div>
  );
}

// Main MAH Portal
export default function ImporterPortal({ user: initialUser, token, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [shipments, setShipments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPort, setFilterPort] = useState('');
  const [activeKpi, setActiveKpi] = useState(null);
  const [showPreCheck, setShowPreCheck] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, orgsRes, labsRes] = await Promise.all([
        fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/organisations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/labs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const shipmentsData = await shipmentsRes.json();
      const orgsData = await orgsRes.json();
      const labsData = await labsRes.json();

      // Merge lab profiles into organisations
      const labProfiles = labsData.labs || [];
      const orgs = orgsData.organisations || [];
      const mergedOrgs = orgs.map(o => {
        const labProfile = labProfiles.find(l => l.id === o.id);
        return labProfile ? {...o, ...labProfile} : o;
      });

      setShipments(shipmentsData.shipments || []);
      setOrganisations(mergedOrgs);
      setError(null);

      // Check if user is org admin
      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      if (meData.user) setUser(meData.user);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!showNewForm && !selectedShipmentId) {
        fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [showNewForm, selectedShipmentId]);

  const activeShipments = shipments.filter(s =>
    !['FINAL_CLEARANCE', 'ARCHIVED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)
  );
  const completedShipments = shipments.filter(s =>
    ['FINAL_CLEARANCE', 'ARCHIVED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)
  );

  const filtered = (activeTab === 'active' ? activeShipments : completedShipments).filter(s => {
    const matchSearch = !search ||
      s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
      s.importer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.current_state === filterStatus;
    const matchPort = !filterPort || s.port_of_entry === filterPort;
    return matchSearch && matchStatus && matchPort;
  });

  const conformingCount = shipments.filter(s => s.current_state === 'CONFORMING').length;
  const nonConformingCount = shipments.filter(s => s.current_state === 'NON_CONFORMING').length;
  const inAnalysisCount = shipments.filter(s => ['IN_ANALYSIS', 'LAB_RECEIVED', 'ANALYSIS_COMPLETE'].includes(s.current_state)).length;

  const stateChartData = Object.entries(
    shipments.reduce((acc, s) => {
      const info = STATE_INFO[s.current_state];
      const label = info ? info.label : s.current_state;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

      const conformityRate = shipments.length > 0 ? Math.round((completedShipments.filter(s => s.current_state === 'FINAL_CLEARANCE').length / shipments.length) * 100) : 0;
    const avgDwell = shipments.filter(s => s.total_dwell_minutes).reduce((acc, s, _, arr) => acc + s.total_dwell_minutes / arr.length, 0);
    const avgDwellDays = avgDwell > 0 ? (avgDwell / 1440).toFixed(1) : '—';
    const userInitials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'MA';

    if (showPreCheck) {
      return (
        <PreShipmentCheck
          token={token}
          onProceed={(destination) => {
            setShowPreCheck(false);
            if (destination === 'new-shipment') setShowNewForm(true);
          }}
        />
      );
    }

    // ── Layout styles ──
    const KPI_TONE = { c: 'cyan', g: 'green', r: 'red', a: 'amber', v: 'purple' };
    const TREND_TONE = { up: 'green', down: 'red', neutral: 'grey' };
    const kpiCard = (ico, on) => ({...S.card,padding:'16px 18px',position:'relative',overflow:'hidden',cursor:'pointer',transition:'all .15s',
      border:`1px solid ${on ? '#38C6FF' : 'rgba(0,170,255,.1)'}`,boxShadow: on ? '0 0 0 3px rgba(56,198,255,.15)' : 'none',
      backgroundImage:`linear-gradient(90deg,${TONES[KPI_TONE[ico]][0]},transparent)`,backgroundSize:'100% 2px',backgroundRepeat:'no-repeat'});
    const navSection = {fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'2px',margin:'14px 0 8px',paddingLeft:4};
    const navItem = (on, tone = 'cyan') => ({width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',marginBottom:3,fontFamily:'inherit',fontSize:12,textAlign:'left',transition:'all .15s',
      fontWeight:on ? 700 : 500,background:on ? tint(tone,.12) : 'transparent',color:on ? TONES[tone][0] : 'rgba(255,255,255,.5)',border:on ? `1px solid ${tint(tone,.3)}` : '1px solid transparent'});
    const navBadge = (tone) => ({fontSize:10,fontWeight:700,background:tint(tone,.18),color:TONES[tone][0],padding:'1px 7px',borderRadius:10});
    const alertBox = (tone) => ({display:'flex',gap:10,alignItems:'flex-start',background:tint(tone,.06),border:`1px solid ${tint(tone,.22)}`,borderRadius:10,padding:'10px 12px'});
    const alertTitleS = {fontSize:12,fontWeight:700,color:'#fff'};
    const alertDesc = {fontSize:11,color:'rgba(255,255,255,.5)',marginTop:2};
    const alertAction = {display:'inline-block',fontSize:11,fontWeight:700,color:'#38C6FF',marginTop:6,cursor:'pointer'};
    const tableSelect = {...S.ipt,width:'auto',padding:'6px 10px',fontSize:11,cursor:'pointer'};
    const th = {padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'};
    const td = {padding:'12px 16px',verticalAlign:'top'};

    return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#2D2B7A',fontFamily:'Inter,sans-serif',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,170,255,.2);border-radius:2px}
        input:focus,textarea:focus,select:focus{border-color:rgba(0,170,255,.5)!important;outline:none}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2)}
        select option{background:#332E8A;color:#fff}
        tr.row:hover td{background:rgba(0,170,255,.04)!important}
      `}</style>

      {/* ── Topbar ── */}
      <div style={{height:58,background:'#1E1A5E',borderBottom:'1px solid rgba(0,170,255,.1)',display:'flex',alignItems:'center',padding:'0 24px',gap:14,flexShrink:0,zIndex:10}}>
        <img src="/demara-logo-transparent.png" alt="DEMARA" style={{height:'52px', width:'auto', display:'block', objectFit:'contain'}} />
        <div style={{width:1,height:28,background:'rgba(255,255,255,.08)'}}></div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.3px'}}>MASAAR</div>
          <div style={{fontSize:10,color:'#38C6FF',fontWeight:600,letterSpacing:'.3px'}}>MAH Portal</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#00C896',background:'rgba(0,200,150,.08)',border:'1px solid rgba(0,200,150,.2)',borderRadius:20,padding:'4px 10px'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#00C896',animation:'pulse 2s infinite',display:'inline-block'}}></span>Live
          </div>
          <button onClick={() => setShowNewForm(true)} style={{background:'linear-gradient(135deg,#38C6FF,#0088DD)',border:'none',color:'#252266',fontSize:12,fontWeight:800,padding:'8px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(0,170,255,.25)'}}>+ New Shipment</button>
          <NotificationBell token={token} />
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg, #38C6FF 0%, #2D2B7A 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>{userInitials}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{user.full_name}</div><div style={{fontSize:10,color:'#38C6FF',marginTop:1}}>Marketing Authorisation Holder</div></div>
            </div>
          )}
          <button onClick={onLogout} style={{background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>Sign Out</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ── Sidebar ── */}
        <div style={{width:220,background:'#2D2B7A',borderRight:'1px solid rgba(0,170,255,.08)',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'}}>
          <div style={{padding:'4px 10px 12px',flex:1}}>
            <div style={navSection}>Shipments</div>
            <button style={navItem(activeTab === 'active')} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>
              <span style={{fontSize:15}}>📊</span><span style={{flex:1}}>Dashboard</span>
            </button>
            <button style={navItem(false)} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>
              <span style={{fontSize:15}}>📦</span><span style={{flex:1}}>Active Shipments</span>
              {activeShipments.length > 0 && <span style={navBadge('amber')}>{activeShipments.length}</span>}
            </button>
            <button style={navItem(activeTab === 'completed', 'green')} onClick={() => { setActiveTab('completed'); setFilterStatus(''); setActiveKpi(null); }}>
              <span style={{fontSize:15}}>✅</span><span style={{flex:1}}>Completed</span>
              {completedShipments.length > 0 && <span style={navBadge('cyan')}>{completedShipments.length}</span>}
            </button>
            <button style={navItem(false)} onClick={() => setShowNewForm(true)}>
              <span style={{fontSize:15}}>➕</span><span style={{flex:1}}>New Record</span>
            </button>

            <div style={navSection}>Insights</div>
            <button style={navItem(activeTab === 'active' && filterStatus === 'NON_CONFORMING', 'red')} onClick={() => { setActiveTab('active'); setFilterStatus('NON_CONFORMING'); setActiveKpi('non-conforming'); }}>
              <span style={{fontSize:15}}>❌</span><span style={{flex:1}}>Non-Conforming</span>
              {nonConformingCount > 0 && <span style={navBadge('red')}>{nonConformingCount}</span>}
            </button>
            <button style={navItem(activeTab === 'active' && filterStatus === 'FINAL_CLEARANCE', 'green')} onClick={() => { setActiveTab('completed'); setFilterStatus('FINAL_CLEARANCE'); setActiveKpi('cleared'); }}>
              <span style={{fontSize:15}}>📈</span><span style={{flex:1}}>Compliance Profile</span>
            </button>

            <div style={navSection}>Account</div>
            {user?.is_org_admin && (
              <button style={navItem(activeTab === 'org-admin', 'green')} onClick={() => setActiveTab('org-admin')}>
                <span style={{fontSize:15}}>👥</span><span style={{flex:1}}>My Organisation</span>
              </button>
            )}
            <button style={navItem(activeTab === 'assistant', 'purple')} onClick={() => setActiveTab('assistant')}>
              <span style={{fontSize:15}}>🤖</span><span style={{flex:1}}>AI Assistant</span>
            </button>
            <button style={{...navItem(false),color:'rgba(255,84,112,0.8)'}} onClick={onLogout}>
              <span style={{fontSize:15}}>🚪</span><span style={{flex:1}}>Sign Out</span>
            </button>
          </div>

          {/* Refresh */}
          <div style={{padding:'12px 14px',borderTop:'1px solid rgba(0,170,255,.06)'}}>
            <button onClick={fetchData} style={{width:'100%',padding:'9px',background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.2)',color:'#38C6FF',fontSize:12,fontWeight:700,borderRadius:9,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div key={activeTab} style={{flex:1,overflowY:'auto',background:'#2D2B7A',padding:'20px 24px'}}>

          {/* Load error (set by fetchData) */}
          {error && (
            <div role="alert" style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,84,112,0.1)',border:'1px solid rgba(255,84,112,0.3)',borderRadius:10,padding:'12px 16px',marginBottom:16}}>
              <span style={{fontSize:15,flexShrink:0}}>⚠️</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:'#FF5470'}}>Unable to load shipments. Please refresh or contact support.</span>
              <button onClick={() => setError(null)} aria-label="Dismiss"
                style={{width:26,height:26,borderRadius:7,background:'transparent',border:'1px solid rgba(255,84,112,0.3)',color:'#FF5470',fontSize:16,lineHeight:1,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>×</button>
            </div>
          )}

          {/* AI Assistant */}
          {activeTab === 'assistant' && (
            <div style={{height:'calc(100vh - 98px)'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'4px'}}>🤖 DEMARA AI Assistant</div>
                <div style={{fontSize:'13px',color:'rgba(255,255,255,.4)'}}>Ask anything about SFDA import regulations, document requirements, and compliance</div>
              </div>
              <div style={{height:'calc(100% - 60px)'}}>
                <AIAssistant token={token} />
              </div>
            </div>
          )}

          {/* Org admin — full page, no KPIs */}
          {activeTab === 'org-admin' && (
            <div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'18px',fontWeight:800,color:'#fff',marginBottom:'4px'}}>My Organisation</div>
                <div style={{fontSize:'13px',color:'rgba(255,255,255,.4)'}}>Manage user access for your organisation</div>
              </div>
              <OrgAdminPanel token={token} />
            </div>
          )}

          {/* KPI Row — only show when not org-admin or assistant */}
          {activeTab !== 'org-admin' && activeTab !== 'assistant' && <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'16px'}}>
            {[
              { key:'all', ico:'c', emoji:'📦', value:shipments.length, label:'Total Shipments', foot:'All time', trend:'neutral', trendLabel:'All' },
              { key:'cleared', ico:'g', emoji:'✅', value:completedShipments.filter(s=>s.current_state==='FINAL_CLEARANCE').length, label:'Cleared', foot:'Final clearance', trend:'up', trendLabel:'↑' },
              { key:'non-conforming', ico:'r', emoji:'❌', value:nonConformingCount, label:'Non-Conforming', foot:'SFDA rejected', trend:'down', trendLabel:'↑' },
              { key:'dwell', ico:'a', emoji:'⏱', value:avgDwellDays, label:'Avg Dwell Time', foot:'Days to clearance', trend:'neutral', trendLabel:'Avg', suffix:'d' },
              { key:'conformity', ico:'v', emoji:'🎯', value:conformityRate, label:'Conformity Rate', foot:'All time average', trend: conformityRate >= 70 ? 'up' : 'down', trendLabel:`${conformityRate}%`, suffix:'%' },
            ].map(({key, ico, emoji, value, label, foot, trend, trendLabel, suffix}) => (
              <div
                key={key}
                style={kpiCard(ico, activeKpi === key)}
                onClick={() => {
                  if (activeKpi === key) {
                    setActiveKpi(null);
                    setFilterStatus('');
                  } else {
                    setActiveKpi(key);
                    if (key === 'cleared') setFilterStatus('FINAL_CLEARANCE');
                    else if (key === 'non-conforming') setFilterStatus('NON_CONFORMING');
                    else if (key === 'conformity') setFilterStatus('CONFORMING');
                    else setFilterStatus('');
                  }
                }}
                title={`Click to filter by ${label}`}
              >
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div style={{width:34,height:34,borderRadius:9,background:tint(KPI_TONE[ico],.12),display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{emoji}</div>
                  <div style={{fontSize:10,fontWeight:700,color:TONES[TREND_TONE[trend]][0],background:tint(TREND_TONE[trend],.1),borderRadius:10,padding:'2px 8px'}}>{trendLabel}</div>
                </div>
                <div style={{fontSize:28,fontWeight:900,color:TONES[KPI_TONE[ico]][0],lineHeight:1,letterSpacing:'-1px'}}>
                  {value}{suffix && <span style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,.35)',marginLeft:1}}>{suffix}</span>}
                </div>
                <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'1px',marginTop:8}}>{label}</div>
                <div style={{fontSize:10,color: activeKpi === key ? '#38C6FF' : 'rgba(255,255,255,.25)',marginTop:3}}>{activeKpi === key ? '✕ Click to clear filter' : foot}</div>
              </div>
            ))}
          </div>

          {/* Analytics Section */}
          {activeTab !== 'org-admin' && (
            <div style={{marginBottom:'18px'}}>

              {/* Charts row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'14px',marginBottom:'14px'}}>

                {/* Area chart */}
                <div style={S.card}>
                  <div style={S.cardHead}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={S.cardTitle}>Shipment Activity</div>
                        <span title="Illustrative chart — not live data" style={{fontSize:9,fontWeight:800,letterSpacing:'.8px',color:'#F5A623',background:'rgba(245,166,35,.12)',border:'1px solid rgba(245,166,35,.35)',borderRadius:10,padding:'2px 8px'}}>SAMPLE DATA</span>
                      </div>
                      <div style={S.cardSub}>Volume and clearance outcomes · Last 30 days</div>
                    </div>
                  </div>
                  <svg width="100%" height="160" viewBox="0 0 560 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D2C8" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#00D2C8" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00C896" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#00C896" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[40,80,120].map(y => (
                      <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                    ))}
                    <path d="M0,110 C70,90 140,100 210,60 C280,75 350,45 420,30 C490,22 530,15 560,10 L560,160 L0,160Z" fill="url(#gC)"/>
                    <path d="M0,110 C70,90 140,100 210,60 C280,75 350,45 420,30 C490,22 530,15 560,10" fill="none" stroke="#00D2C8" strokeWidth="2"/>
                    <path d="M0,130 C70,115 140,120 210,90 C280,105 350,75 420,55 C490,45 530,38 560,32 L560,160 L0,160Z" fill="url(#gG)"/>
                    <path d="M0,130 C70,115 140,120 210,90 C280,105 350,75 420,55 C490,45 530,38 560,32" fill="none" stroke="#00C896" strokeWidth="1.5" strokeDasharray="5,3"/>
                    <path d="M0,152 C70,150 140,151 210,148 C280,150 350,147 420,145 C490,143 530,142 560,140" fill="none" stroke="#FF5470" strokeWidth="1.5" strokeDasharray="5,3"/>
                    {['Aug 1','Aug 8','Aug 15','Aug 22','Sep 1'].map((label, i) => (
                      <text key={label} x={i * 140} y="158" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="Inter, sans-serif">{label}</text>
                    ))}
                  </svg>
                  <div style={{display:'flex',gap:'14px',marginTop:'10px',flexWrap:'wrap'}}>
                    {[['#00D2C8','Total shipments'],['#00C896','Cleared'],['#FF5470','Non-conforming']].map(([color,label]) => (
                      <div key={label} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,.45)'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color}}></div>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right stack */}
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

                  {/* Donut */}
                  <div style={S.card}>
                    <div style={S.cardHead}>
                      <div style={S.cardTitle}>Status Distribution</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <svg width="90" height="90" viewBox="0 0 90 90" style={{flexShrink:0}}>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"/>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="#00C896" strokeWidth="12"
                          strokeDasharray={`${conformityRate * 1.885} 188.5`} strokeDashoffset="47" strokeLinecap="round"/>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="#FF5470" strokeWidth="12"
                          strokeDasharray={`${(nonConformingCount/Math.max(shipments.length,1)*100)*1.885} 188.5`}
                          strokeDashoffset={`${-(conformityRate*1.885)+47}`} strokeLinecap="round"/>
                        <text x="45" y="41" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">{conformityRate}%</text>
                        <text x="45" y="52" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="Inter, sans-serif">Conformity</text>
                      </svg>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'7px'}}>
                        {[
                          ['#00C896','Cleared', completedShipments.filter(s=>s.current_state==='FINAL_CLEARANCE').length],
                          ['#00D2C8','In Progress', activeShipments.length],
                          ['#FF5470','Non-Conforming', nonConformingCount],
                          ['#F5A623','Pending', shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING'].includes(s.current_state)).length],
                        ].map(([color,label,count]) => (
                          <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'6px',color:'rgba(255,255,255,.5)'}}>
                              <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color,flexShrink:0}}></div>
                              {label}
                            </div>
                            <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#fff',fontSize:'11px'}}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  <div style={S.card}>
                    <div style={S.cardHead}>
                      <div style={S.cardTitle}>Alerts</div>
                    </div>
                    {shipments.filter(s => s.current_state === 'NON_CONFORMING').slice(0,1).map(s => (
                      <div key={s.id} style={{...alertBox('red'),marginBottom:'8px'}}>
                        <span style={{fontSize:'14px',flexShrink:0}}>🚨</span>
                        <div>
                          <div style={alertTitleS}>Action required</div>
                          <div style={alertDesc}>{s.faseh_request_number} — Select re-export or destruction</div>
                          <span style={alertAction} onClick={() => setSelectedShipmentId(s.id)}>Take action →</span>
                        </div>
                      </div>
                    ))}
                    {shipments.filter(s => ['SAMPLING_REQUESTED','PICKUP_SCHEDULED'].includes(s.current_state)).slice(0,1).map(s => (
                      <div key={s.id} style={{...alertBox('amber'),marginBottom:'8px'}}>
                        <span style={{fontSize:'14px',flexShrink:0}}>⚠️</span>
                        <div>
                          <div style={alertTitleS}>Pickup pending</div>
                          <div style={alertDesc}>{s.faseh_request_number} — Awaiting sample collection</div>
                        </div>
                      </div>
                    ))}
                    {shipments.filter(s => ['NON_CONFORMING','SAMPLING_REQUESTED','PICKUP_SCHEDULED'].includes(s.current_state)).length === 0 && (
                      <div style={{fontSize:'12px',color:'#00C896',textAlign:'center',padding:'12px 0'}}>✓ No active alerts</div>
                    )}
                  </div>

                </div>
              </div>

              {/* Bottom stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px',marginBottom:'14px'}}>

                {/* Port breakdown */}
                <div style={S.card}>
                  <div style={S.cardHead}>
                    <div style={S.cardTitle}>Shipments by Port</div>
                    <div style={S.cardSub}>Volume distribution</div>
                  </div>
                  {[...new Set(shipments.map(s => s.port_of_entry))].slice(0,5).map(port => {
                    const count = shipments.filter(s => s.port_of_entry === port).length;
                    const pct = Math.round(count / Math.max(shipments.length,1) * 100);
                    return (
                      <div key={port} style={{marginBottom:'10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,.6)'}}>{port}</span>
                          <span style={{fontSize:'11px',fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#fff'}}>{count} <span style={{color:'rgba(255,255,255,.35)',fontWeight:400}}>{pct}%</span></span>
                        </div>
                        <div style={{height:'5px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:'#38C6FF',borderRadius:'3px',transition:'width 0.3s'}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Country breakdown */}
                <div style={S.card}>
                  <div style={S.cardHead}>
                    <div style={S.cardTitle}>Top Origin Countries</div>
                    <div style={S.cardSub}>By shipment count</div>
                  </div>
                  {Object.entries(
                    shipments.reduce((acc, s) => { acc[s.shipment_country] = (acc[s.shipment_country]||0)+1; return acc; }, {})
                  ).sort((a,b) => b[1]-a[1]).slice(0,5).map(([country, count]) => {
                    const pct = Math.round(count / Math.max(shipments.length,1) * 100);
                    const nonConform = shipments.filter(s => s.shipment_country === country && s.current_state === 'NON_CONFORMING').length;
                    return (
                      <div key={country} style={{marginBottom:'10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,.6)'}}>{country}</span>
                          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                            {nonConform > 0 && <span style={{fontSize:'10px',color:'#FF5470',fontWeight:600}}>{nonConform} NC</span>}
                            <span style={{fontSize:'11px',fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#fff'}}>{count}</span>
                          </div>
                        </div>
                        <div style={{height:'5px',background:'rgba(255,255,255,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background: nonConform > 0 ? '#F5A623' : '#00C896',borderRadius:'3px'}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

                        {/* Quick stats strip */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'14px'}}>
            {[
              {icon:'⏱',label:'Avg Dwell Time',value:avgDwellDays+'d',sub:'Days to clearance',color:'#F5A623'},
                  {icon:'🧪',label:'Active Labs',value:[...new Set(shipments.map(s=>s.lab_id).filter(Boolean))].length,sub:'QC labs assigned',color:'#a78bfa'},
                  {icon:'🏛️',label:'Clearance Cos.',value:[...new Set(shipments.map(s=>s.clearance_company_id).filter(Boolean))].length,sub:'Companies assigned',color:'#38C6FF'},
                  {icon:'📋',label:'Pending Decision',value:shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING'].includes(s.current_state)).length,sub:'Awaiting SFDA',color:'#00C896'},
                ].map(({icon,label,value,sub,color}) => (
                  <div key={label} style={{...S.card,display:'flex',alignItems:'center',gap:'14px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:'22px',fontWeight:800,color:'#fff',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{value}</div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:'3px'}}>{label}</div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.25)',marginTop:'1px'}}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Shipments table */}
          {activeTab !== 'org-admin' && (
            <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid rgba(0,170,255,.08)',flexWrap:'wrap'}}>
                <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Shipments</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>{filtered.length} results</div>
                <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <input placeholder="🔍 Search shipments..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{...S.ipt,width:220,padding:'6px 10px',fontSize:11}} />
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setActiveKpi(null); }} style={tableSelect}>
                    <option value="">All States</option>
                    <option value="RECORD_OPENED">Record Opened</option>
                    <option value="SAMPLING_REQUESTED">Sampling Requested</option>
                    <option value="IN_ANALYSIS">In Analysis</option>
                    <option value="RESULT_SUBMITTED">Result Submitted</option>
                    <option value="CONFORMING">Conforming</option>
                    <option value="NON_CONFORMING">Non-Conforming</option>
                    <option value="FINAL_CLEARANCE">Final Clearance</option>
                    <option value="RE_EXPORT_COMPLETED">Re-Export Completed</option>
                  </select>
                  <select value={filterPort} onChange={e => setFilterPort(e.target.value)} style={tableSelect}>
                    <option value="">All Ports</option>
                    {[...new Set(shipments.map(s => s.port_of_entry))].sort().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button style={{...smallBtn('grey'),color:'rgba(255,255,255,.6)'}}>⬇ Export</button>
                </div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(0,170,255,.04)'}}>
                    {['Faseh Reference', 'Importer', 'Port · Country', 'Status', 'Lab', 'Est. Clearance', 'Dwell', ''].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,.3)'}}>Loading shipments...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="8" style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,.3)'}}>
                      {activeTab === 'active' ? 'No active shipments — open a new record to get started' : 'No completed shipments yet'}
                    </td></tr>
                  ) : filtered.map(s => {
                    const badgeTone = {
                      'FINAL_CLEARANCE': 'green',
                      'CONFORMING': 'green',
                      'NON_CONFORMING': 'red',
                      'PARTIALLY_CONFORMING': 'amber',
                      'IN_ANALYSIS': 'purple',
                      'RESULT_SUBMITTED': 'amber',
                      'SAMPLING_REQUESTED': 'amber',
                      'PICKUP_SCHEDULED': 'amber',
                      'SAMPLE_PICKED_UP': 'amber',
                      'IN_TRANSIT': 'amber',
                      'LAB_RECEIVED': 'cyan',
                      'RECORD_OPENED': 'amber',
                      'RE_EXPORT_COMPLETED': 'green',
                      'DESTRUCTION_CONFIRMED': 'green',
                    }[s.current_state] || 'amber';

                    const stateLabel = {
                      'FINAL_CLEARANCE': 'Final Clearance',
                      'CONFORMING': 'Conforming',
                      'NON_CONFORMING': 'Non-Conforming',
                      'PARTIALLY_CONFORMING': 'Partially Conforming',
                      'IN_ANALYSIS': 'In Analysis',
                      'RESULT_SUBMITTED': 'Result Submitted',
                      'SAMPLING_REQUESTED': 'Sampling Requested',
                      'PICKUP_SCHEDULED': 'Pickup Scheduled',
                      'SAMPLE_PICKED_UP': 'Sample Picked Up',
                      'IN_TRANSIT': 'In Transit',
                      'LAB_RECEIVED': 'Lab Received',
                      'RECORD_OPENED': 'Record Opened',
                      'RE_EXPORT_COMPLETED': 'Re-Export Done',
                      'DESTRUCTION_CONFIRMED': 'Destroyed',
                      'DESTRUCTION_PENDING': 'Destruction Pending',
                      'DESTRUCTION_REQUESTED': 'Destruction Requested',
                    }[s.current_state] || s.current_state.replace(/_/g, ' ');

                    const dwellDays = s.total_dwell_minutes ? (s.total_dwell_minutes / 1440).toFixed(1) + 'd' : '—';
                    const dwellColor = s.total_dwell_minutes > 7200 ? '#FF5470' : s.total_dwell_minutes > 4320 ? '#F5A623' : '#00C896';

                    return (
                      <tr key={s.id} className="row" style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                        <td style={td}><span style={{fontFamily:S.mono,fontSize:12,fontWeight:700,color:'#38C6FF'}}>{s.faseh_request_number}</span></td>
                        <td style={td}>
                          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.importer_name}</div>
                          <div style={{fontSize:10,color:'rgba(255,255,255,.35)',fontFamily:S.mono,marginTop:2}}>{s.ghad_cr_number}</div>
                        </td>
                        <td style={td}>
                          <div style={{fontSize:'11px',color:'rgba(255,255,255,.6)'}}>{s.port_of_entry}</div>
                          <div style={{fontSize:'10px',color:'rgba(255,255,255,.35)'}}>{s.shipment_country}</div>
                        </td>
                        <td style={td}>
                          {badge(stateLabel, badgeTone)}
                          {(() => {
                            const sla = getSlaStatus(s.current_state, s.state_entered_at);
                            return sla && SLA_DOT[sla.level] ? (
                              <span title={SLA_DOT_TITLE[sla.level]} style={{ marginLeft: '6px', fontSize: '10px' }}>{SLA_DOT[sla.level]}</span>
                            ) : null;
                          })()}
                          {s.document_confirmed_at && (
                            <div title={`Documents confirmed and shared with clearance on ${formatDate(s.document_confirmed_at)}`}
                              style={{fontSize:'10px',color:'#00C896',fontWeight:600,marginTop:'4px'}}>
                              ✓ Docs shared
                            </div>
                          )}
                        </td>
                        <td style={td}><div style={{fontSize:'11px',color:'rgba(255,255,255,.6)'}}>{s.lab_name || '—'}</div></td>
                        <td style={td}>
                          {s.estimated_clearance_date ? (
                            <>
                              <div style={{fontSize:'11px',color:'#38C6FF',fontWeight:600}}>{new Date(s.estimated_clearance_date).toLocaleDateString('en-SA',{day:'2-digit',month:'short',year:'numeric'})}</div>
                              <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)'}}>Estimated</div>
                            </>
                          ) : s.current_state === 'FINAL_CLEARANCE' ? (
                            <div style={{fontSize:'11px',color:'#00C896',fontWeight:600}}>Cleared ✓</div>
                          ) : (
                            <div style={{fontSize:'10px',color:'rgba(255,255,255,.3)'}}>Pending</div>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{fontFamily:S.mono,fontSize:'11px',fontWeight:500,color:dwellColor}}>{dwellDays}</span>
                        </td>
                        <td style={td}>
                          <button style={smallBtn('cyan')} onClick={() => setSelectedShipmentId(s.id)}>Track</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}


          </>}
        </div>
      </div>

      {/* Modals — keep all existing */}
      {showNewForm && (
        <NewShipmentForm
          token={token}
          organisations={organisations}
          onSuccess={(faseRef) => {
            setShowNewForm(false);
            fetchData();
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}
      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          token={token}
          onClose={() => { setSelectedShipmentId(null); fetchData(); }}
        />
      )}
    </div>
  );
}