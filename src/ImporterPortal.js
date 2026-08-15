import { useState, useEffect } from 'react';
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

function ProgressTracker({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-4">
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
  const [step, setStep] = useState(1); // 1=upload, 2=review, 3=confirm
  const [documentText, setDocumentText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'pdf'

  const clearanceCompanies = organisations.filter(o => o.org_type === 'CLEARANCE_COMPANY');
  const labs = organisations.filter(o => o.org_type === 'LAB');

  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedClearanceId, setSelectedClearanceId] = useState('');

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
        setExtractedData(data.extracted);
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
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Faseh Request Number</label>
                  <input type="text" value={extractedData.faseh_request_number || ''}
                    onChange={e => setExtractedData({...extractedData, faseh_request_number: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">GHAD CR Number</label>
                  <input type="text" value={extractedData.ghad_cr_number || ''}
                    onChange={e => setExtractedData({...extractedData, ghad_cr_number: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Importer Name</label>
                  <input type="text" value={extractedData.importer_name || ''}
                    onChange={e => setExtractedData({...extractedData, importer_name: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Port of Entry</label>
                  <input type="text" value={extractedData.port_of_entry || ''}
                    onChange={e => setExtractedData({...extractedData, port_of_entry: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Shipment Country</label>
                  <input type="text" value={extractedData.shipment_country || ''}
                    onChange={e => setExtractedData({...extractedData, shipment_country: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">QC Lab</label>
                  <select value={selectedLabId} onChange={e => setSelectedLabId(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                    <option value="">Select QC lab</option>
                    {labs.map(l => <option key={l.id} value={l.id}>{l.name_en}</option>)}
                  </select>
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

// Shipment Detail Modal
function ShipmentDetailModal({ shipmentId, token, onClose }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <div className="p-6 space-y-5">
          {/* Progress */}
          <ProgressTracker currentStep={stateInfo.step} />

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
          </div>

          {/* Products */}
          {shipment.products && shipment.products.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Products ({shipment.products.length})</h3>
              <div className="space-y-2">
                {shipment.products.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-lg p-3">
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
        </div>
      </div>
    </div>
  );
}

// Main MAH Portal
export default function ImporterPortal({ user, token, onLogout }) {
  const [shipments, setShipments] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, orgsRes] = await Promise.all([
        fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/organisations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const shipmentsData = await shipmentsRes.json();
      const orgsData = await orgsRes.json();
      setShipments(shipmentsData.shipments || []);
      setOrganisations(orgsData.organisations || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeShipments = shipments.filter(s =>
    !['FINAL_CLEARANCE', 'ARCHIVED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)
  );
  const completedShipments = shipments.filter(s =>
    ['FINAL_CLEARANCE', 'ARCHIVED', 'RE_EXPORT_COMPLETED', 'DESTRUCTION_CONFIRMED'].includes(s.current_state)
  );

  const filtered = (activeTab === 'active' ? activeShipments : completedShipments).filter(s =>
    !search ||
    s.faseh_request_number.toLowerCase().includes(search.toLowerCase()) ||
    s.importer_name.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">DEMARA Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>MAH Import Clearance Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </span>
            {user && (
              <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">{user.full_name}</p>
                  <p className="text-xs" style={{color: '#00B4D8'}}>MAH</p>
                </div>
              </div>
            )}
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{shipments.length}</p>
            <p className="text-xs text-gray-500">Total shipments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{activeShipments.length}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{inAnalysisCount}</p>
            <p className="text-xs text-gray-500">In analysis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{conformingCount}</p>
            <p className="text-xs text-gray-500">Conforming</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{nonConformingCount}</p>
            <p className="text-xs text-gray-500">Non-conforming</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      {shipments.length > 0 && (
        <div className="px-6 pt-4 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Shipments by Status</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stateChartData} margin={{bottom: 30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{fontSize: 8}} angle={-30} textAnchor="end" />
                <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2D2B7A" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview</h3>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: activeShipments.length },
                    { name: 'Completed', value: completedShipments.length },
                    { name: 'Conforming', value: conformingCount },
                    { name: 'Non-Conforming', value: nonConformingCount },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={60}
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                  labelLine={false}>
                  {CHART_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-6 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <input type="text" placeholder="Search by Faseh number or importer name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none" />
          <button onClick={() => setShowNewForm(true)}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
            style={{background: '#2D2B7A'}}>
            + Open New Record
          </button>
          <button onClick={fetchData}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
            style={{background: '#00B4D8'}}>
            Refresh
          </button>
        </div>
        <div className="flex gap-2 border-b border-gray-200">
          <button onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
            style={activeTab === 'active' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
            Active ({activeShipments.length})
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'completed' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
            style={activeTab === 'completed' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
            Completed ({completedShipments.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading shipments...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No shipments found</p>
            <p className="text-sm mt-1">Click "Open New Record" to start tracking a shipment</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Request No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Update</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const info = STATE_INFO[s.current_state] || { label: s.current_state, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{s.faseh_request_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.importer_name}</p>
                        <p className="text-xs text-gray-500">{s.ghad_cr_number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.shipment_country}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.port_of_entry}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.updated_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedShipmentId(s.id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                          style={{background: '#2D2B7A'}}>
                          Track
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

      {showNewForm && (
        <NewShipmentForm
          token={token}
          organisations={organisations}
          onSuccess={(faseRef) => {
            setShowNewForm(false);
            fetchData();
            alert(`Shipment record opened for ${faseRef}. DEMARA will now monitor for SFDA emails matching this reference.`);
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          token={token}
          onClose={() => setSelectedShipmentId(null)}
        />
      )}
    </div>
  );
}