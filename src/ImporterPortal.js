import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';
import DocumentReadiness from './DocumentReadiness';
import AIAssistant from './AIAssistant';
import './masaar-design.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const API_URL = 'http://localhost:3000/api/v1';
const CHART_COLORS = ['#2D2B7A', '#00B4D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATE_INFO = {
  RECORD_OPENED: { label: 'Record Opened', color: 'bg-gray-100 text-gray-700', step: 1 },
  DECLARATION_FILED: { label: 'Declaration Filed', color: 'bg-blue-100 text-blue-700', step: 1 },
  CB_ASSIGNED: { label: 'CB Assigned', color: 'bg-blue-100 text-blue-700', step: 2 },
  CB_REVIEWING: { label: 'CB Reviewing', color: 'bg-yellow-100 text-yellow-700', step: 2 },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: 'bg-orange-100 text-orange-700', step: 2 },
  CHANGES_SUBMITTED: { label: 'Changes Submitted', color: 'bg-yellow-100 text-yellow-700', step: 2 },
  CB_APPROVED: { label: 'CB Approved', color: 'bg-green-100 text-green-700', step: 2 },
  CB_REJECTED: { label: 'CB Rejected', color: 'bg-red-100 text-red-700', step: 2 },
  SAMPLING_REQUESTED: { label: 'Sampling Requested', color: 'bg-orange-100 text-orange-700', step: 3 },
  INSPECTOR_DISPATCHED: { label: 'Inspector Dispatched', color: 'bg-orange-100 text-orange-700', step: 3 },
  SAMPLE_COLLECTED: { label: 'Sample Collected', color: 'bg-yellow-100 text-yellow-700', step: 3 },
  IN_TRANSIT_TO_LAB: { label: 'In Transit to Lab', color: 'bg-yellow-100 text-yellow-700', step: 3 },
  LAB_RECEIVED: { label: 'Lab Received', color: 'bg-purple-100 text-purple-700', step: 4 },
  IN_ANALYSIS: { label: 'In Analysis', color: 'bg-purple-100 text-purple-700', step: 4 },
  ANALYSIS_COMPLETE: { label: 'Analysis Complete', color: 'bg-purple-100 text-purple-700', step: 4 },
  RESULT_SUBMITTED: { label: 'Result Submitted', color: 'bg-blue-100 text-blue-700', step: 4 },
  SFDA_NOTIFIED: { label: 'SFDA Notified', color: 'bg-blue-100 text-blue-700', step: 4 },
  DECISION_PENDING: { label: 'Decision Pending', color: 'bg-yellow-100 text-yellow-700', step: 5 },
  CONFORMING: { label: 'Conforming ✓', color: 'bg-green-100 text-green-700', step: 5 },
  NON_CONFORMING: { label: 'Non-Conforming ✗', color: 'bg-red-100 text-red-700', step: 5 },
  PARTIALLY_CONFORMING: { label: 'Partially Conforming', color: 'bg-orange-100 text-orange-700', step: 5 },
  CLEARANCE_IN_PROGRESS: { label: 'Clearance In Progress', color: 'bg-blue-100 text-blue-700', step: 6 },
  BOND_RELEASED: { label: 'Bond Released', color: 'bg-blue-100 text-blue-700', step: 6 },
  DUTIES_PAID: { label: 'Duties Paid', color: 'bg-blue-100 text-blue-700', step: 6 },
  FINAL_CLEARANCE: { label: 'Final Clearance ✓', color: 'bg-green-100 text-green-700', step: 6 },
  RE_EXPORT_INITIATED: { label: 'Re-Export Initiated', color: 'bg-red-100 text-red-700', step: 6 },
  RE_EXPORT_COMPLETED: { label: 'Re-Export Completed', color: 'bg-gray-100 text-gray-700', step: 6 },
  DESTRUCTION_REQUESTED: { label: 'Destruction Requested', color: 'bg-red-100 text-red-700', step: 6 },
  DESTRUCTION_CONFIRMED: { label: 'Destruction Confirmed', color: 'bg-gray-100 text-gray-700', step: 6 },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-500', step: 6 },
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
    RE_EXPORT_COMPLETED: 'Re-exported',
    DESTRUCTION_REQUESTED: 'Destruction pending',
    DESTRUCTION_CONFIRMED: 'Destroyed',
  };

  return (
    <div className="flex items-center justify-between mb-2">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep > step.number ? 'bg-green-500 text-white' :
              currentStep === step.number ? 'text-white' : 'bg-gray-200 text-gray-500'
            }`} style={currentStep === step.number ? {background: '#2D2B7A'} : {}}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center w-16">{step.label}</p>
            {currentStep === step.number && currentState && subStateLabels[currentState] && (
              <p className="text-xs font-medium text-center w-20 mt-0.5" style={{color: '#2D2B7A'}}>
                {subStateLabels[currentState]}
              </p>
            )}
          </div>
          {index < STEPS.length - 1 && (
            <div className={`h-0.5 w-10 mx-1 mb-5 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Open New Shipment Record</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? 'Step 1 — Upload your Faseh document or email' :
               step === 2 ? 'Step 2 — Review extracted information' :
               'Step 3 — Confirm and open record'}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">{error}</div>}

          {/* Step 1 — Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium">How it works</p>
                <p className="text-xs text-blue-600 mt-1">Paste the content of your Faseh confirmation PDF or SFDA email. DEMARA AI will read it and extract all shipment details automatically.</p>
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => { setDocumentText(SAMPLE_FASEH); }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                  Load Sample Faseh PDF
                </button>
                <button onClick={() => { setDocumentText(SAMPLE_EMAIL); }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                  Load Sample SFDA Email
                </button>
              </div>

              {/* PDF Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input type="file" accept=".pdf,.txt" id="pdf-upload" className="hidden"
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
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm font-medium text-gray-700">Click to upload PDF or TXT file</p>
                  <p className="text-xs text-gray-500 mt-1">Or paste document text below</p>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400">or paste text below</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Paste Document Content</label>
                <textarea
                  value={documentText}
                  onChange={e => setDocumentText(e.target.value)}
                  rows={8}
                  placeholder="Paste the content of your Faseh confirmation PDF or SFDA email here..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2"
                  style={{'--tw-ring-color': '#2D2B7A'}}
                />
              </div>

              <button onClick={handleParse} disabled={parsing || !documentText.trim()}
                className="w-full py-3 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{background: '#2D2B7A'}}>
                {parsing ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    DEMARA AI is reading your document...
                  </>
                ) : '🤖 Extract with DEMARA AI'}
              </button>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && extractedData && (
            <div className="space-y-4">
              {restored && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                  <p className="text-xs text-yellow-700 font-medium">⚡ Your previous form data has been restored automatically.</p>
                  <button onClick={() => { localStorage.removeItem('demara_form_autosave'); setRestored(false); setStep(1); setExtractedData(null); }}
                    className="text-xs text-yellow-600 underline hover:text-yellow-800">
                    Start fresh
                  </button>
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium">✓ DEMARA AI successfully extracted your document</p>
                <p className="text-xs text-green-600 mt-1">Review the extracted information below. Edit any field if needed.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Document Type</label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-700">
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
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-600 uppercase">{field.label}</label>
                        {isLow && (
                          <span className="text-xs text-orange-600 font-medium">⚠️ Please confirm</span>
                        )}
                        {!isLow && extractedData[field.key] && (
                          <span className="text-xs text-green-600 font-medium">✓ AI extracted</span>
                        )}
                      </div>
                      <input type="text" value={extractedData[field.key] || ''}
                        onChange={e => setExtractedData({...extractedData, [field.key]: e.target.value})}
                        className={`mt-1 w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 ${
                          isLow ? 'border-orange-300 bg-orange-50 focus:ring-orange-200' :
                          extractedData[field.key] ? 'border-green-300 bg-green-50' :
                          'border-gray-300'
                        }`} />
                    </div>
                  );
                })}
                              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">QC Lab</label>
                <select value={selectedLabId}
                  onChange={e => {
                    setSelectedLabId(e.target.value);
                    const selected = labs.find(l => l.id === e.target.value);
                    setSelectedLabInfo(selected || null);
                  }}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2">
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
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-blue-700">{selectedLabInfo.name_en}</p>
                      <div className="flex gap-1">
                        {selectedLabInfo.average_turnaround_hours <= 36 && selectedLabInfo.total_tests_completed >= 200 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⭐ Top Performer</span>
                        )}
                        {selectedLabInfo.sfda_appointment_number && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ SFDA Appointed</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {selectedLabInfo.sfda_appointment_number && (
                        <p className="text-xs text-blue-600">SFDA: {selectedLabInfo.sfda_appointment_number}</p>
                      )}
                      {selectedLabInfo.iso_accreditation_number && (
                        <p className="text-xs text-blue-600">ISO: {selectedLabInfo.iso_accreditation_number}</p>
                      )}
                      {selectedLabInfo.average_turnaround_hours && (
                        <p className="text-xs text-blue-600">Avg turnaround: {selectedLabInfo.average_turnaround_hours}h</p>
                      )}
                      {selectedLabInfo.total_tests_completed > 0 && (
                        <p className="text-xs text-blue-600">Tests completed: {selectedLabInfo.total_tests_completed}</p>
                      )}
                      {selectedLabInfo.sfda_appointment_expiry && (
                        <p className="text-xs text-blue-600">
                          Appointment expires: {new Date(selectedLabInfo.sfda_appointment_expiry).toLocaleDateString('en-SA', {day:'2-digit', month:'short', year:'numeric'})}
                          {new Date(selectedLabInfo.sfda_appointment_expiry) < new Date(Date.now() + 60*24*60*60*1000) && (
                            <span className="text-orange-600 font-medium"> ⚠️ Expiring soon</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Clearance Company</label>
                  <select value={selectedClearanceId} onChange={e => setSelectedClearanceId(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                    <option value="">Select clearance company</option>
                    {clearanceCompanies.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                  </select>
                </div>
              </div>

              {/* Products */}
              {extractedData.products && extractedData.products.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Products Extracted ({extractedData.products.length})</label>
                  <div className="space-y-2 mt-2">
                    {extractedData.products.map((p, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-900">{p.product_name_en}</p>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {p.ecos_ma_number && <span className="text-xs text-gray-500">E-Cosma: {p.ecos_ma_number}</span>}
                          {p.batch_number && <span className="text-xs text-gray-500">Batch: {p.batch_number}</span>}
                          {p.quantity && <span className="text-xs text-gray-500">Qty: {p.quantity} {p.quantity_unit}</span>}
                          {p.country_of_origin && <span className="text-xs text-gray-500">Origin: {p.country_of_origin}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.overall_decision && (
                <div className={`rounded-lg p-3 ${extractedData.overall_decision === 'CONFORMING' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-xs font-semibold">Decision Detected: {extractedData.overall_decision}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{background: '#2D2B7A'}}>
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
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
      <p className="text-xs text-green-700 font-medium">✓ Your concern has been submitted to DEMARA. We will follow up within 24 hours.</p>
    </div>
  );

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full py-2 border border-gray-300 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
          ⚠️ Raise a Concern About This Shipment
        </button>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-2">⚠️ Raise a Concern</h3>
          <p className="text-xs text-orange-600 mb-3">Describe your concern about this shipment. DEMARA will review and respond within 24 hours.</p>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <textarea value={concern} onChange={e => setConcern(e.target.value)}
            rows={3} placeholder="Describe your concern..."
            className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} disabled={submitting || !concern.trim()}
              className="flex-1 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#F59E0B'}}>
              {submitting ? 'Submitting...' : 'Submit Concern'}
            </button>
            <button onClick={() => { setOpen(false); setConcern(''); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
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
    <div className={`rounded-xl p-4 border-2 ${isExpired ? 'bg-red-50 border-red-400' : 'bg-orange-50 border-orange-400'}`}>
      <h3 className="text-sm font-semibold mb-2" style={{color: isExpired ? '#EF4444' : '#F59E0B'}}>
        🗑️ Destruction {isExpired ? 'Confirmed — Processing' : 'Pending — Grace Period Active'}
      </h3>
      {!isExpired ? (
        <>
          <p className="text-xs text-orange-600 mb-3">You have selected destruction for this shipment. You have 24 hours to cancel before destruction procedures are initiated.</p>
          <div className="bg-white rounded-lg p-3 text-center border border-orange-200 mb-3">
            <p className="text-xs text-gray-500">Time remaining to cancel</p>
            <p className="text-2xl font-bold text-orange-600 font-mono">{formatTimeLeft(timeLeft)}</p>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button onClick={handleCancel} disabled={cancelling}
            className="w-full py-2 border-2 border-orange-400 text-orange-700 font-semibold text-sm rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50">
            {cancelling ? 'Cancelling...' : '↩ Cancel Destruction Request'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-red-600 mb-3">The 24-hour grace period has expired. Destruction procedures have been initiated and the clearance company has been notified.</p>
          <p className="text-xs text-red-600 mb-3">If you wish to reverse this decision, please act immediately using the Raise a Concern button below. DEMARA admin will review your request and contact the clearance company. Reversal is only possible if the clearance company has not yet started destruction procedures.</p>
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
    <div className="space-y-3">
      {/* Approved products */}
      {approvedProducts.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-700 mb-2">✅ Conforming Products — Will Proceed to Clearance</h3>
          <div className="space-y-1">
            {approvedProducts.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <p className="text-xs text-green-700">{p.product_name_en}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected products — per product action */}
      {rejectedProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">❌ Non-Conforming Products — Select Action Per Product</h3>
          {error && <div className="bg-red-100 rounded-lg p-2 text-red-700 text-xs mb-3">{error}</div>}
          <div className="space-y-3">
            {rejectedProducts.map(p => (
              <div key={p.id} className="bg-white rounded-lg p-3 border border-red-100">
                <p className="text-xs font-medium text-gray-900 mb-2">{p.product_name_en}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProductActions({...productActions, [p.id]: 'reexport'})}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                      productActions[p.id] === 'reexport'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-orange-600 border-orange-300'
                    }`}>
                    🚢 Re-Export
                  </button>
                  <button
                    onClick={() => setProductActions({...productActions, [p.id]: 'destruction'})}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                      productActions[p.id] === 'destruction'
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}>
                    🗑️ Destruction
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={acting}
            className="mt-3 w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{background: '#2D2B7A'}}>
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
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-orange-700 mb-2">⚠️ Lab Declined — Select New QC Lab</h3>
      <p className="text-xs text-orange-600 mb-3">The selected lab declined your assignment. Please select a different certified QC lab.</p>
      {error && <div className="bg-red-100 rounded-lg p-2 text-red-700 text-xs mb-3">{error}</div>}
      <select value={selectedLabId}
        onChange={e => {
          setSelectedLabId(e.target.value);
          const selected = labs.find(l => l.id === e.target.value);
          setSelectedLabInfo(selected || null);
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none mb-3">
        <option value="">Select a new QC lab</option>
        {labs.map(l => (
          <option key={l.id} value={l.id}>
            {l.name_en} {l.average_turnaround_hours ? `— ~${l.average_turnaround_hours}h` : ''}
          </option>
        ))}
      </select>
      {selectedLabInfo && (
        <div className="bg-white rounded-lg p-3 border border-orange-100 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-900">{selectedLabInfo.name_en}</p>
            {selectedLabInfo.sfda_appointment_number && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ SFDA Appointed</span>
            )}
          </div>
          {selectedLabInfo.average_turnaround_hours && (
            <p className="text-xs text-gray-500 mt-1">Avg turnaround: {selectedLabInfo.average_turnaround_hours}h · Tests: {selectedLabInfo.total_tests_completed}</p>
          )}
        </div>
      )}
      <button onClick={handleReassign} disabled={submitting || !selectedLabId}
        className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
        style={{background: '#2D2B7A'}}>
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
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-orange-700 mb-2">⚠️ Clearance Company Declined — Select New Company</h3>
      <p className="text-xs text-orange-600 mb-3">The selected clearance company declined your assignment. Please select a different company.</p>
      {error && <div className="bg-red-100 rounded-lg p-2 text-red-700 text-xs mb-3">{error}</div>}
      <select value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none mb-3">
        <option value="">Select a new clearance company</option>
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.name_en}</option>
        ))}
      </select>
      <button onClick={handleReassign} disabled={submitting || !selectedId}
        className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
        style={{background: '#2D2B7A'}}>
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
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-red-700 mb-2">⚠️ Action Required — Non-Conforming Decision</h3>
      <p className="text-xs text-red-600 mb-3">One or more products did not pass SFDA quality control. Please select how you wish to proceed:</p>
      {error && <div className="bg-red-100 rounded-lg p-2 text-red-700 text-xs mb-3">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleAction('reexport')} disabled={acting}
          className="py-3 border-2 border-red-400 rounded-xl text-center hover:bg-red-100 transition-colors disabled:opacity-50">
          <p className="text-lg">🚢</p>
          <p className="text-sm font-semibold text-red-700">Re-Export</p>
          <p className="text-xs text-red-500 mt-1">Return goods to origin country</p>
        </button>
        <button onClick={() => handleAction('destruction')} disabled={acting}
          className="py-3 border-2 border-gray-400 rounded-xl text-center hover:bg-gray-100 transition-colors disabled:opacity-50">
          <p className="text-lg">🗑️</p>
          <p className="text-sm font-semibold text-gray-700">Destruction</p>
          <p className="text-xs text-gray-500 mt-1">Destroy goods — 24 hours to cancel</p>
        </button>
      </div>
    </div>
  );
}

// Shipment Detail Modal
function ShipmentDetailModal({ shipmentId, token, onClose }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState('details');

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const res = await fetch(`${API_URL}/shipments/${shipmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShipment(data.shipment);
      } catch (err) {
        console.error('Failed to fetch shipment');
      } finally {
        setLoading(false);
      }
    };
    fetchShipment();
  }, [shipmentId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-gray-500">Loading...</div>
    </div>
  );

  if (!shipment) return null;

  const stateInfo = STATE_INFO[shipment.current_state] || { label: shipment.current_state, color: 'bg-gray-100 text-gray-700', step: 1 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{shipment.faseh_request_number}</h2>
            <p className="text-sm text-gray-500">{shipment.importer_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        {/* Tab navigation */}
        <div style={{display:'flex',gap:'2px',padding:'0 24px',borderBottom:'1px solid rgba(39,48,110,0.08)',background:'#FAFBFF'}}>
          {[
            {key:'details',label:'📋 Shipment Details'},
            {key:'documents',label:'📁 Document Readiness'},
            {key:'timeline',label:'📅 Timeline'},
          ].map(tab => (
            <div key={tab.key}
              onClick={() => setDetailTab(tab.key)}
              style={{
                padding:'10px 16px',fontSize:'12px',fontWeight:600,cursor:'pointer',
                borderBottom:`2px solid ${detailTab === tab.key ? '#44C8F5' : 'transparent'}`,
                color: detailTab === tab.key ? '#27306E' : '#808285',
                marginBottom:'-1px',transition:'all 0.15s'
              }}>
              {tab.label}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {detailTab === 'documents' && (
            <DocumentReadiness shipmentId={shipment.id} token={token} shipment={shipment} />
          )}

          {detailTab === 'timeline' && (
            <div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'16px',fontWeight:700,color:'#27306E',marginBottom:'4px'}}>Shipment Timeline</div>
                <div style={{fontSize:'12px',color:'#808285'}}>Complete audit trail — every state change, action, and notification</div>
              </div>
              {shipment.audit_log && shipment.audit_log.length > 0 ? (
                <div style={{position:'relative'}}>
                  {/* Vertical line */}
                  <div style={{position:'absolute',left:'15px',top:'8px',bottom:'8px',width:'2px',background:'rgba(39,48,110,0.08)',borderRadius:'1px'}}></div>
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
                            background: isFirst ? '#27306E' : '#FFFFFF',
                            border:`2px solid ${isFirst ? '#44C8F5' : 'rgba(39,48,110,0.15)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            flexShrink:0,zIndex:1,
                            boxShadow: isFirst ? '0 0 0 4px rgba(68,200,245,0.15)' : 'none'
                          }}>
                            <div style={{
                              width:'8px',height:'8px',borderRadius:'50%',
                              background: isFirst ? '#44C8F5' : sourceColor
                            }}></div>
                          </div>
                          {/* Content */}
                          <div style={{
                            flex:1,background:'#FFFFFF',
                            border:`1px solid ${isFirst ? 'rgba(68,200,245,0.3)' : 'rgba(39,48,110,0.08)'}`,
                            borderRadius:'10px',padding:'12px 14px',
                            boxShadow: isFirst ? '0 2px 12px rgba(68,200,245,0.1)' : 'none'
                          }}>
                            {/* State change */}
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                              <span style={{
                                fontFamily:'JetBrains Mono,monospace',fontSize:'11px',fontWeight:600,
                                color:'#808285',background:'rgba(39,48,110,0.06)',
                                padding:'2px 8px',borderRadius:'4px'
                              }}>{log.from_state?.replace(/_/g,' ') || '—'}</span>
                              <span style={{color:'#44C8F5',fontSize:'14px',fontWeight:700}}>→</span>
                              <span style={{
                                fontFamily:'JetBrains Mono,monospace',fontSize:'11px',fontWeight:700,
                                color:'#27306E',background:'rgba(68,200,245,0.1)',
                                padding:'2px 8px',borderRadius:'4px',
                                border:'1px solid rgba(68,200,245,0.2)'
                              }}>{log.to_state?.replace(/_/g,' ') || '—'}</span>
                            </div>
                            {/* Event */}
                            {log.trigger_event && (
                              <div style={{fontSize:'12px',color:'#3A4080',marginBottom:'4px',fontWeight:500}}>
                                {log.trigger_event}
                              </div>
                            )}
                            {/* Notes */}
                            {log.notes && (
                              <div style={{fontSize:'11px',color:'#808285',marginBottom:'6px',fontStyle:'italic'}}>
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
                                <span style={{fontSize:'10px',color:'#808285'}}>
                                  {log.actor_role.replace(/_/g,' ')}
                                </span>
                              )}
                              <span style={{fontSize:'10px',color:'#808285',marginLeft:'auto'}}>
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
                <div style={{textAlign:'center',padding:'40px',color:'#808285'}}>
                  <div style={{fontSize:'32px',marginBottom:'8px'}}>📅</div>
                  <div style={{fontSize:'14px',fontWeight:600,color:'#27306E',marginBottom:'4px'}}>No timeline events yet</div>
                  <div style={{fontSize:'12px'}}>State changes will appear here as the shipment progresses</div>
                </div>
              )}
            </div>
          )}

          {detailTab !== 'documents' && detailTab !== 'timeline' && <>
          {/* Progress */}
          <ProgressTracker currentStep={stateInfo.step} currentState={shipment.current_state} />

          {/* Status */}
          <div className={`rounded-lg p-4 ${
            shipment.current_state === 'FINAL_CLEARANCE' || shipment.current_state === 'CONFORMING' ? 'bg-green-50 border border-green-200' :
            shipment.current_state === 'NON_CONFORMING' || shipment.current_state === 'CB_REJECTED' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stateInfo.color}`}>
              {stateInfo.label}
            </span>
            <p className="text-sm text-gray-600 mt-2">Since {formatDate(shipment.state_entered_at)}</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Faseh Request</p>
              <p className="text-sm font-medium">{shipment.faseh_request_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">GHAD CR Number</p>
              <p className="text-sm font-medium">{shipment.ghad_cr_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium">{shipment.port_of_entry}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
              <p className="text-sm font-medium">{shipment.shipment_country}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">QC Lab</p>
              <p className="text-sm font-medium">{shipment.lab_name || '—'}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Clearance Company</p>
              <p className="text-sm font-medium">{shipment.clearance_company_name || '—'}</p></div>
            {shipment.total_dwell_minutes && (
              <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Dwell Time</p>
                <p className="text-lg font-bold text-green-700">
                  {Math.floor(shipment.total_dwell_minutes / 1440)} days {Math.floor((shipment.total_dwell_minutes % 1440) / 60)} hours
                </p>
                <p className="text-xs text-green-600 mt-0.5">From record opened to final clearance</p>
              </div>
            )}
          </div>

          {/* Products */}
          {shipment.products && shipment.products.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Products ({shipment.products.length})</h3>
              <div className="space-y-2">
                {shipment.products.map(p => (
                  <div key={p.id} className={`rounded-lg p-3 ${
                    p.current_decision === 'REJECTED' ? 'bg-red-50 border border-red-200' :
                    p.current_decision === 'APPROVED' ? 'bg-green-50 border border-green-200' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">{p.product_name_en}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.current_decision === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        p.current_decision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{p.current_decision}</span>
                    </div>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {p.ecos_ma_number && <span className="text-xs text-gray-500">E-Cosma: {p.ecos_ma_number}</span>}
                      {p.batch_number && <span className="text-xs text-gray-500">Batch: {p.batch_number}</span>}
                      {p.country_of_origin && <span className="text-xs text-gray-500">Origin: {p.country_of_origin}</span>}
                    </div>
                    {p.current_decision === 'REJECTED' && p.decision_notes && (
                      <div className="mt-2 bg-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-700 font-semibold">Rejection Reason:</p>
                        <p className="text-xs text-red-600 mt-0.5">{p.decision_notes}</p>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Documents ({shipment.documents.length})</h3>
              <div className="space-y-1">
                {shipment.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-lg">📄</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{doc.document_type} · {formatDate(doc.uploaded_at)}</p>
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
            <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-green-700">Shipment Successfully Cleared!</h3>
              <p className="text-sm text-green-600 mt-1">All products have passed SFDA quality control and customs clearance is complete.</p>
              {shipment.total_dwell_minutes && (
                <div className="mt-3 inline-block bg-white rounded-lg px-4 py-2 border border-green-200">
                  <p className="text-xs text-gray-500">Total clearance time</p>
                  <p className="text-lg font-bold text-green-700">
                    {Math.floor(shipment.total_dwell_minutes / 1440)} days {Math.floor((shipment.total_dwell_minutes % 1440) / 60)} hours
                  </p>
                </div>
              )}
              <p className="text-xs text-green-500 mt-3">Your release certificate has been emailed to you. Your goods are ready for collection.</p>
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
            <div className="flex justify-center">
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
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
                style={{background: '#2D2B7A'}}>
                📄 Download Dwell Time Report
              </button>
            </div>
          )}

          {/* Timeline */}
          {shipment.audit_log && shipment.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Shipment Timeline</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shipment.audit_log.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      log.trigger_source === 'EMAIL_PARSER' ? 'bg-blue-500' :
                      log.trigger_source === 'SYSTEM' ? 'bg-purple-500' : 'bg-green-500'
                    }`}></span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{log.from_state} → {log.to_state}</p>
                      <p className="text-xs text-gray-500">{log.trigger_event}</p>
                      <p className="text-xs text-gray-400">{log.trigger_source} · {formatDate(log.occurred_at)}</p>
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
    <p className="text-xs text-blue-600 mt-0.5 font-medium">
      Est. clearance: {formattedDate}
    </p>
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

  const riskLevel = conformityRate >= 90 ? { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' } :
                    conformityRate >= 70 ? { label: 'Medium Risk', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' } :
                    { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };

  if (total === 0) return null;

  return (
    <div className={`mx-6 mt-4 rounded-xl border ${riskLevel.border} ${riskLevel.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your Compliance Profile</p>
            <p className="text-xs text-gray-500">{user?.full_name} · {user?.organisation_name || 'DEMARA Platform'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskLevel.color} border ${riskLevel.border} bg-white`}>
            {riskLevel.label}
          </span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-white">
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{total}</p>
              <p className="text-xs text-gray-500 mt-1">Total shipments</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{conformityRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Conformity rate</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{avgDwellDays}</p>
              <p className="text-xs text-gray-500 mt-1">Avg dwell (days)</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{cleanStreak}</p>
              <p className="text-xs text-gray-500 mt-1">Clean streak</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Conformity rate</span>
              <span className="text-xs font-semibold text-gray-700">{conformityRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${conformityRate}%`,
                background: conformityRate >= 90 ? '#10B981' : conformityRate >= 70 ? '#F59E0B' : '#EF4444'
              }}></div>
            </div>
          </div>

          {nonConforming > 0 && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">⚠️ {nonConforming} non-conforming shipment{nonConforming > 1 ? 's' : ''} on record</p>
              <p className="text-xs text-red-500 mt-0.5">Review your supplier quality certificates to improve your conformity rate.</p>
            </div>
          )}

          {cleanStreak >= 3 && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-700 font-medium">🏆 {cleanStreak} consecutive conforming shipments</p>
              <p className="text-xs text-green-500 mt-0.5">Excellent compliance record. You may qualify for expedited clearance.</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 text-center">
            This compliance profile is calculated from your DEMARA shipment history and updated in real time.
          </p>
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

    return (
    <div className="m-app">

      {/* Icon Strip */}
      <div className="m-strip">
        <div className="m-strip-logo">DM</div>
        <div className="m-strip-divider"></div>
        <div className={`m-strip-icon ${activeTab === 'active' ? 'active' : ''}`} title="Dashboard" onClick={() => setActiveTab('active')}>📊</div>
        <div className={`m-strip-icon ${activeTab === 'completed' ? 'active' : ''}`} title="Completed Shipments" onClick={() => setActiveTab('completed')}>✅</div>
        <div className="m-strip-icon" title="New Record" onClick={() => setShowNewForm(true)}>➕</div>
        <div className={`m-strip-icon ${activeTab === 'org-admin' ? 'active' : ''}`} title="My Organisation" onClick={() => setActiveTab('org-admin')}>👥</div>
        <div className={`m-strip-icon ${activeTab === 'assistant' ? 'active' : ''}`} title="AI Assistant" onClick={() => setActiveTab('assistant')}>🤖</div>
        <div className="m-strip-bottom">
          <div className="m-strip-avatar" title={user?.full_name} onClick={onLogout}>{userInitials}</div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="m-sidebar">
        <div className="m-sidebar-header">
          <div className="m-sidebar-name">MAH Portal</div>
          <div className="m-sidebar-sub">{user?.full_name || 'MAH User'}</div>
        </div>
        <nav className="m-sidebar-nav">
          <div className="m-sidebar-section">Shipments</div>
          <div className={`m-nav-item ${activeTab === 'active' ? 'active' : ''}`} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>
            <span className="m-nav-icon">📊</span> Dashboard
          </div>
          <div className={`m-nav-item ${activeTab === 'active' && filterStatus === '' ? '' : ''}`} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>
            <span className="m-nav-icon">📦</span> Active Shipments
            {activeShipments.length > 0 && <span className="m-nav-badge amber">{activeShipments.length}</span>}
          </div>
          <div className={`m-nav-item ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => { setActiveTab('completed'); setFilterStatus(''); setActiveKpi(null); }}>
            <span className="m-nav-icon">✅</span> Completed
            {completedShipments.length > 0 && <span className="m-nav-badge cyan">{completedShipments.length}</span>}
          </div>
          <div className="m-nav-item" onClick={() => setShowNewForm(true)}>
            <span className="m-nav-icon">➕</span> New Record
          </div>
          <div className="m-sidebar-section">Insights</div>
          <div className={`m-nav-item ${activeTab === 'active' && filterStatus === 'NON_CONFORMING' ? 'active' : ''}`} onClick={() => { setActiveTab('active'); setFilterStatus('NON_CONFORMING'); setActiveKpi('non-conforming'); }}>
            <span className="m-nav-icon">❌</span> Non-Conforming
            {nonConformingCount > 0 && <span className="m-nav-badge">{nonConformingCount}</span>}
          </div>
          <div className={`m-nav-item ${activeTab === 'active' && filterStatus === 'FINAL_CLEARANCE' ? 'active' : ''}`} onClick={() => { setActiveTab('completed'); setFilterStatus('FINAL_CLEARANCE'); setActiveKpi('cleared'); }}>
            <span className="m-nav-icon">📈</span> Compliance Profile
          </div>
          <div className="m-sidebar-section">Account</div>
          {user?.is_org_admin && (
            <div className={`m-nav-item ${activeTab === 'org-admin' ? 'active' : ''}`} onClick={() => setActiveTab('org-admin')}>
              <span className="m-nav-icon">👥</span> My Organisation
            </div>
          )}
          <div className={`m-nav-item ${activeTab === 'assistant' ? 'active' : ''}`} onClick={() => setActiveTab('assistant')}>
            <span className="m-nav-icon">🤖</span> AI Assistant
          </div>
          <div className="m-nav-item" onClick={onLogout} style={{color:'rgba(255,84,112,0.8)'}}>
            <span className="m-nav-icon">🚪</span> Sign Out
          </div>
        </nav>
        <div className="m-sidebar-footer">
          <div className="m-status-pill">
            <div className="m-pulse-dot"></div>
            Live · All systems operational
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="m-main">

        {/* Topbar */}
        <header className="m-topbar">
          <div className="m-breadcrumb">
            <span>Home</span>
            <span style={{color:'var(--m-text-3)'}}>/</span>
            <span className="m-breadcrumb-active">Dashboard</span>
          </div>
          <div className="m-topbar-right">
            <div className="m-autorefresh">
              <div className="m-pulse-dot"></div>
              Live data
            </div>
            <button className="m-btn-ghost" onClick={fetchData}>↻ Refresh</button>
            <button className="m-btn-ghost">⬇ Export</button>
            <button className="m-btn-primary" onClick={() => setShowNewForm(true)}>+ New Shipment</button>
            <button className="m-btn-ghost" onClick={onLogout} style={{color:'var(--m-red)',borderColor:'rgba(255,84,112,0.2)'}}>Sign Out</button>
          </div>
        </header>

        {/* Subnav */}
        <div className="m-subnav">
          <div className={`m-subnav-tab ${activeTab === 'active' && !activeKpi ? 'active' : ''}`} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>Overview</div>
          <div className={`m-subnav-tab ${activeTab === 'active' && !filterStatus ? 'active' : ''}`} onClick={() => { setActiveTab('active'); setFilterStatus(''); setActiveKpi(null); }}>Active ({activeShipments.length})</div>
          <div className={`m-subnav-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => { setActiveTab('completed'); setFilterStatus(''); setActiveKpi(null); }}>Completed ({completedShipments.length})</div>
          {user?.is_org_admin && <div className={`m-subnav-tab ${activeTab === 'org-admin' ? 'active' : ''}`} onClick={() => setActiveTab('org-admin')}>My Organisation</div>}
          <div className={`m-subnav-tab ${activeTab === 'assistant' ? 'active' : ''}`} onClick={() => setActiveTab('assistant')} style={{color: activeTab === 'assistant' ? '#44C8F5' : ''}}>🤖 AI Assistant</div>
          <div className="m-subnav-right">
            <div className="m-search">
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:'12px'}}>🔍</span>
              <input placeholder="Search shipments..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Scroll area */}
        <div className="m-scroll">

          {/* AI Assistant */}
          {activeTab === 'assistant' && (
            <div style={{height:'calc(100vh - 120px)'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'18px',fontWeight:700,color:'#27306E',marginBottom:'4px'}}>🤖 DEMARA AI Assistant</div>
                <div style={{fontSize:'13px',color:'#808285'}}>Ask anything about SFDA import regulations, document requirements, and compliance</div>
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
                <div style={{fontSize:'18px',fontWeight:700,color:'#27306E',marginBottom:'4px'}}>My Organisation</div>
                <div style={{fontSize:'13px',color:'#808285'}}>Manage user access for your organisation</div>
              </div>
              <OrgAdminPanel token={token} />
            </div>
          )}

          {/* KPI Row — only show when not org-admin or assistant */}
          {activeTab !== 'org-admin' && activeTab !== 'assistant' && <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'14px',marginBottom:'20px'}}>
            {[
              { key:'all', ico:'c', emoji:'📦', value:shipments.length, label:'Total Shipments', foot:'All time', trend:'neutral', trendLabel:'All' },
              { key:'cleared', ico:'g', emoji:'✅', value:completedShipments.filter(s=>s.current_state==='FINAL_CLEARANCE').length, label:'Cleared', foot:'Final clearance', trend:'up', trendLabel:'↑' },
              { key:'non-conforming', ico:'r', emoji:'❌', value:nonConformingCount, label:'Non-Conforming', foot:'SFDA rejected', trend:'down', trendLabel:'↑' },
              { key:'dwell', ico:'a', emoji:'⏱', value:avgDwellDays, label:'Avg Dwell Time', foot:'Days to clearance', trend:'neutral', trendLabel:'Avg', suffix:'d' },
              { key:'conformity', ico:'v', emoji:'🎯', value:conformityRate, label:'Conformity Rate', foot:'All time average', trend: conformityRate >= 70 ? 'up' : 'down', trendLabel:`${conformityRate}%`, suffix:'%' },
            ].map(({key, ico, emoji, value, label, foot, trend, trendLabel, suffix}) => (
              <div
                key={key}
                className={`m-kpi ${activeKpi === key ? 'active-filter' : ''}`}
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
                <div className="m-kpi-top">
                  <div className={`m-kpi-ico ${ico}`}>{emoji}</div>
                  <div className={`m-kpi-trend ${trend}`}>{trendLabel}</div>
                </div>
                <div className="m-kpi-num">
                  {value}{suffix && <span style={{fontSize:'16px',fontWeight:400,color:'var(--m-gray)'}}>{suffix}</span>}
                </div>
                <div className="m-kpi-lbl">{label}</div>
                <div className="m-kpi-foot">{activeKpi === key ? '✕ Click to clear filter' : foot}</div>
              </div>
            ))}
          </div>

          {/* Analytics Section */}
          {activeTab !== 'org-admin' && (
            <div style={{marginBottom:'18px'}}>

              {/* Charts row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'14px',marginBottom:'14px'}}>

                {/* Area chart */}
                <div className="m-card">
                  <div className="m-card-head">
                    <div>
                      <div className="m-card-title">Shipment Activity</div>
                      <div className="m-card-sub">Volume and clearance outcomes · Last 30 days</div>
                    </div>
                    <div className="m-three-dot">⋮</div>
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
                      <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="rgba(39,48,110,0.06)" strokeWidth="1"/>
                    ))}
                    <path d="M0,110 C70,90 140,100 210,60 C280,75 350,45 420,30 C490,22 530,15 560,10 L560,160 L0,160Z" fill="url(#gC)"/>
                    <path d="M0,110 C70,90 140,100 210,60 C280,75 350,45 420,30 C490,22 530,15 560,10" fill="none" stroke="#00D2C8" strokeWidth="2"/>
                    <path d="M0,130 C70,115 140,120 210,90 C280,105 350,75 420,55 C490,45 530,38 560,32 L560,160 L0,160Z" fill="url(#gG)"/>
                    <path d="M0,130 C70,115 140,120 210,90 C280,105 350,75 420,55 C490,45 530,38 560,32" fill="none" stroke="#00C896" strokeWidth="1.5" strokeDasharray="5,3"/>
                    <path d="M0,152 C70,150 140,151 210,148 C280,150 350,147 420,145 C490,143 530,142 560,140" fill="none" stroke="#FF5470" strokeWidth="1.5" strokeDasharray="5,3"/>
                    {['Aug 1','Aug 8','Aug 15','Aug 22','Sep 1'].map((label, i) => (
                      <text key={label} x={i * 140} y="158" fill="#808285" fontSize="8" fontFamily="Inter">{label}</text>
                    ))}
                  </svg>
                  <div style={{display:'flex',gap:'14px',marginTop:'10px',flexWrap:'wrap'}}>
                    {[['#00D2C8','Total shipments'],['#00C896','Cleared'],['#FF5470','Non-conforming']].map(([color,label]) => (
                      <div key={label} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'#808285'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color}}></div>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right stack */}
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

                  {/* Donut */}
                  <div className="m-card">
                    <div className="m-card-head">
                      <div className="m-card-title">Status Distribution</div>
                      <div className="m-three-dot">⋮</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <svg width="90" height="90" viewBox="0 0 90 90" style={{flexShrink:0}}>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"/>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="#00C896" strokeWidth="12"
                          strokeDasharray={`${conformityRate * 1.885} 188.5`} strokeDashoffset="47" strokeLinecap="round"/>
                        <circle cx="45" cy="45" r="30" fill="none" stroke="#FF5470" strokeWidth="12"
                          strokeDasharray={`${(nonConformingCount/Math.max(shipments.length,1)*100)*1.885} 188.5`}
                          strokeDashoffset={`${-(conformityRate*1.885)+47}`} strokeLinecap="round"/>
                        <text x="45" y="41" textAnchor="middle" fill="#27306E" fontSize="13" fontWeight="800" fontFamily="Inter">{conformityRate}%</text>
                        <text x="45" y="52" textAnchor="middle" fill="#808285" fontSize="6" fontFamily="Inter">Conformity</text>
                      </svg>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'7px'}}>
                        {[
                          ['#00C896','Cleared', completedShipments.filter(s=>s.current_state==='FINAL_CLEARANCE').length],
                          ['#00D2C8','In Progress', activeShipments.length],
                          ['#FF5470','Non-Conforming', nonConformingCount],
                          ['#F5A623','Pending', shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING'].includes(s.current_state)).length],
                        ].map(([color,label,count]) => (
                          <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'6px',color:'#808285'}}>
                              <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color,flexShrink:0}}></div>
                              {label}
                            </div>
                            <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#27306E',fontSize:'11px'}}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="m-card">
                    <div className="m-card-head">
                      <div className="m-card-title">Alerts</div>
                      <div className="m-three-dot">⋮</div>
                    </div>
                    {shipments.filter(s => s.current_state === 'NON_CONFORMING').slice(0,1).map(s => (
                      <div key={s.id} className="m-alert-danger" style={{marginBottom:'8px'}}>
                        <span style={{fontSize:'14px',flexShrink:0}}>🚨</span>
                        <div>
                          <div className="m-alert-title">Action required</div>
                          <div className="m-alert-desc">{s.faseh_request_number} — Select re-export or destruction</div>
                          <span className="m-alert-action" onClick={() => setSelectedShipmentId(s.id)}>Take action →</span>
                        </div>
                      </div>
                    ))}
                    {shipments.filter(s => ['SAMPLING_REQUESTED','PICKUP_SCHEDULED'].includes(s.current_state)).slice(0,1).map(s => (
                      <div key={s.id} className="m-alert-warn" style={{marginBottom:'8px'}}>
                        <span style={{fontSize:'14px',flexShrink:0}}>⚠️</span>
                        <div>
                          <div className="m-alert-title">Pickup pending</div>
                          <div className="m-alert-desc">{s.faseh_request_number} — Awaiting sample collection</div>
                        </div>
                      </div>
                    ))}
                    {shipments.filter(s => ['NON_CONFORMING','SAMPLING_REQUESTED','PICKUP_SCHEDULED'].includes(s.current_state)).length === 0 && (
                      <div style={{fontSize:'12px',color:'#808285',textAlign:'center',padding:'12px 0'}}>✓ No active alerts</div>
                    )}
                  </div>

                </div>
              </div>

              {/* Bottom stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'14px',marginBottom:'14px'}}>

                {/* Port breakdown */}
                <div className="m-card">
                  <div className="m-card-head">
                    <div className="m-card-title">Shipments by Port</div>
                    <div className="m-card-sub">Volume distribution</div>
                  </div>
                  {[...new Set(shipments.map(s => s.port_of_entry))].slice(0,5).map(port => {
                    const count = shipments.filter(s => s.port_of_entry === port).length;
                    const pct = Math.round(count / Math.max(shipments.length,1) * 100);
                    return (
                      <div key={port} style={{marginBottom:'10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                          <span style={{fontSize:'11px',color:'#3A4080'}}>{port}</span>
                          <span style={{fontSize:'11px',fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#27306E'}}>{count} <span style={{color:'#808285',fontWeight:400}}>{pct}%</span></span>
                        </div>
                        <div style={{height:'5px',background:'rgba(39,48,110,0.08)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:'#44C8F5',borderRadius:'3px',transition:'width 0.3s'}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Country breakdown */}
                <div className="m-card">
                  <div className="m-card-head">
                    <div className="m-card-title">Top Origin Countries</div>
                    <div className="m-card-sub">By shipment count</div>
                  </div>
                  {Object.entries(
                    shipments.reduce((acc, s) => { acc[s.shipment_country] = (acc[s.shipment_country]||0)+1; return acc; }, {})
                  ).sort((a,b) => b[1]-a[1]).slice(0,5).map(([country, count]) => {
                    const pct = Math.round(count / Math.max(shipments.length,1) * 100);
                    const nonConform = shipments.filter(s => s.shipment_country === country && s.current_state === 'NON_CONFORMING').length;
                    return (
                      <div key={country} style={{marginBottom:'10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                          <span style={{fontSize:'11px',color:'#3A4080'}}>{country}</span>
                          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                            {nonConform > 0 && <span style={{fontSize:'10px',color:'#FF5470',fontWeight:600}}>{nonConform} NC</span>}
                            <span style={{fontSize:'11px',fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#27306E'}}>{count}</span>
                          </div>
                        </div>
                        <div style={{height:'5px',background:'rgba(39,48,110,0.08)',borderRadius:'3px',overflow:'hidden'}}>
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
                  {icon:'🧪',label:'Active Labs',value:[...new Set(shipments.map(s=>s.lab_id).filter(Boolean))].length,sub:'QC labs assigned',color:'var(--m-violet)'},
                  {icon:'🏛️',label:'Clearance Cos.',value:[...new Set(shipments.map(s=>s.clearance_company_id).filter(Boolean))].length,sub:'Companies assigned',color:'var(--m-blue)'},
                  {icon:'📋',label:'Pending Decision',value:shipments.filter(s=>['RESULT_SUBMITTED','CONFORMING'].includes(s.current_state)).length,sub:'Awaiting SFDA',color:'var(--m-cyan)'},
                ].map(({icon,label,value,sub,color}) => (
                  <div key={label} className="m-card" style={{display:'flex',alignItems:'center',gap:'14px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>{icon}</div>
                    <div>
                      <div style={{fontSize:'22px',fontWeight:800,color:'#27306E',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{value}</div>
                      <div style={{fontSize:'10px',color:'#808285',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:'3px'}}>{label}</div>
                      <div style={{fontSize:'10px',color:'#808285',marginTop:'1px'}}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Shipments table */}
          {activeTab !== 'org-admin' && (
            <div className="m-table-wrap m-table">
              <div className="m-table-bar">
                <div className="m-table-title">Shipments</div>
                <div className="m-table-count">{filtered.length} results</div>
                <div className="m-table-right">
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setActiveKpi(null); }} className="m-select">
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
                  <select value={filterPort} onChange={e => setFilterPort(e.target.value)} className="m-select">
                    <option value="">All Ports</option>
                    {[...new Set(shipments.map(s => s.port_of_entry))].sort().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button className="m-btn-ghost" style={{fontSize:'11px',padding:'5px 10px'}}>⬇ Export</button>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Faseh Reference</th>
                    <th>Importer</th>
                    <th>Port · Country</th>
                    <th>Status</th>
                    <th>Lab</th>
                    <th>Est. Clearance</th>
                    <th>Dwell</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{textAlign:'center',padding:'40px',color:'var(--m-text-3)'}}>Loading shipments...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="8" style={{textAlign:'center',padding:'40px',color:'var(--m-text-3)'}}>
                      {activeTab === 'active' ? 'No active shipments — open a new record to get started' : 'No completed shipments yet'}
                    </td></tr>
                  ) : filtered.map(s => {
                    const badgeClass = {
                      'FINAL_CLEARANCE': 'm-badge-clear',
                      'CONFORMING': 'm-badge-conform',
                      'NON_CONFORMING': 'm-badge-bad',
                      'PARTIALLY_CONFORMING': 'm-badge-pend',
                      'IN_ANALYSIS': 'm-badge-anly',
                      'RESULT_SUBMITTED': 'm-badge-pend',
                      'SAMPLING_REQUESTED': 'm-badge-pend',
                      'PICKUP_SCHEDULED': 'm-badge-pend',
                      'SAMPLE_PICKED_UP': 'm-badge-pend',
                      'IN_TRANSIT': 'm-badge-pend',
                      'LAB_RECEIVED': 'm-badge-prog',
                      'RECORD_OPENED': 'm-badge-pend',
                      'RE_EXPORT_COMPLETED': 'm-badge-clear',
                      'DESTRUCTION_CONFIRMED': 'm-badge-clear',
                    }[s.current_state] || 'm-badge-pend';

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
                    }[s.current_state] || s.current_state.replace(/_/g, ' ');

                    const dwellDays = s.total_dwell_minutes ? (s.total_dwell_minutes / 1440).toFixed(1) + 'd' : '—';
                    const dwellColor = s.total_dwell_minutes > 7200 ? 'var(--m-red)' : s.total_dwell_minutes > 4320 ? 'var(--m-amber)' : 'var(--m-green)';

                    return (
                      <tr key={s.id}>
                        <td><div className="m-ref">{s.faseh_request_number}</div></td>
                        <td>
                          <div className="m-name">{s.importer_name}</div>
                          <div className="m-cr">{s.ghad_cr_number}</div>
                        </td>
                        <td>
                          <div style={{fontSize:'11px',color:'var(--m-text-2)'}}>{s.port_of_entry}</div>
                          <div style={{fontSize:'10px',color:'var(--m-text-3)'}}>{s.shipment_country}</div>
                        </td>
                        <td>
                          <span className={`m-badge ${badgeClass}`}>
                            <span className="m-bd"></span>
                            {stateLabel}
                          </span>
                        </td>
                        <td><div style={{fontSize:'11px',color:'var(--m-text-2)'}}>{s.lab_name || '—'}</div></td>
                        <td>
                          {s.estimated_clearance_date ? (
                            <>
                              <div style={{fontSize:'11px',color:'var(--m-cyan)',fontWeight:600}}>{new Date(s.estimated_clearance_date).toLocaleDateString('en-SA',{day:'2-digit',month:'short',year:'numeric'})}</div>
                              <div style={{fontSize:'10px',color:'var(--m-text-3)'}}>Estimated</div>
                            </>
                          ) : s.current_state === 'FINAL_CLEARANCE' ? (
                            <div style={{fontSize:'11px',color:'var(--m-green)',fontWeight:600}}>Cleared ✓</div>
                          ) : (
                            <div style={{fontSize:'10px',color:'var(--m-text-3)'}}>Pending</div>
                          )}
                        </td>
                        <td>
                          <span className="m-mono" style={{fontSize:'11px',fontWeight:500,color:dwellColor}}>{dwellDays}</span>
                        </td>
                        <td>
                          <button className="m-act-btn" onClick={() => setSelectedShipmentId(s.id)}>Track</button>
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
      </main>

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