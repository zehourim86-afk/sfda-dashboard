import { useState } from 'react';
import { API_URL, PRODUCT_CATEGORIES as CATEGORIES } from './constants';

// ─── Reference data ────────────────────────────────────────────

const GCC_COUNTRIES = ['Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'];

const COUNTRIES = [
  ...GCC_COUNTRIES,
  'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'France',
  'Germany', 'India', 'Indonesia', 'Ireland', 'Italy', 'Japan', 'Jordan', 'Lebanon', 'Malaysia',
  'Morocco', 'Netherlands', 'New Zealand', 'Pakistan', 'Philippines', 'Poland', 'Portugal',
  'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Tunisia', 'Turkey',
  'United Kingdom', 'United States', 'Vietnam',
];

// Same 9 document types as DOCUMENT_TYPES in sfda-platform/src/routes/documents.js
const DOCUMENT_TYPES = [
  { key: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', required: true },
  { key: 'BILL_OF_LADING', label: 'Bill of Lading / Airway Bill', required: true },
  { key: 'PACKING_LIST', label: 'Packing List', required: true },
  { key: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', required: true },
  { key: 'HEALTH_CERTIFICATE', label: 'Health Certificate', required: true },
  { key: 'CERTIFICATE_OF_ANALYSIS', label: 'Certificate of Analysis', required: true },
  { key: 'HALAL_CERTIFICATE', label: 'Halal Certificate', required: false },
  { key: 'ARABIC_LABEL', label: 'Arabic Label Artwork', required: true },
  { key: 'SFDA_REGISTRATION', label: 'SFDA Product Registration', required: true },
];

const RISK_STYLE = {
  LOW: { color: '#00C896', bg: 'rgba(0,200,150,.1)', border: 'rgba(0,200,150,.3)' },
  MEDIUM: { color: '#F5A623', bg: 'rgba(245,166,35,.1)', border: 'rgba(245,166,35,.3)' },
  HIGH: { color: '#FF5470', bg: 'rgba(255,84,112,.1)', border: 'rgba(255,84,112,.3)' },
};

const TIMELINES = {
  LOW: { track: 'Fast track', duration: '48 hours' },
  MEDIUM: { track: 'Standard', duration: '5 days' },
  HIGH: { track: 'Enhanced', duration: '7 days' },
};

// ─── Mock risk logic (used until /shipments/pre-check exists) ──

const KNOWN_SUPPLIER_KEYWORDS = ['almarai', 'nestle', 'savola', 'sadafco', 'agthia', 'americana', 'unilever'];
const FOOD_CATEGORIES = ['Food Product', 'Beverage', 'Health Food', 'Functional Food'];
const SUPPLIER_HISTORY_KEY = 'masaar_known_suppliers';

function loadSupplierHistory() {
  try {
    return JSON.parse(localStorage.getItem(SUPPLIER_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function rememberSupplier(name) {
  try {
    const list = loadSupplierHistory();
    const key = name.trim().toLowerCase();
    if (key && !list.includes(key)) {
      localStorage.setItem(SUPPLIER_HISTORY_KEY, JSON.stringify([...list, key]));
    }
  } catch {
    // Storage unavailable — nothing to remember.
  }
}

function mockAssessment({ product_category, country_of_origin, supplier_name }) {
  const country = country_of_origin.trim().toLowerCase();
  const supplier = supplier_name.trim().toLowerCase();
  const isGcc = GCC_COUNTRIES.some(c => c.toLowerCase() === country);
  const hasKeyword = KNOWN_SUPPLIER_KEYWORDS.some(k => supplier.includes(k));
  const seenBefore = loadSupplierHistory().includes(supplier);
  const knownSupplier = hasKeyword || seenBefore;
  const isCosmeticOrSupplement = ['Cosmetic', 'Cosmetic Device', 'Food Supplement'].includes(product_category);
  const isFood = FOOD_CATEGORIES.includes(product_category);

  const reasons = [];
  let risk;

  if (!isGcc || !knownSupplier) {
    risk = 'HIGH';
    if (!isGcc) reasons.push(`Country of origin (${country_of_origin}) is outside the GCC — enhanced border inspection applies`);
    if (!knownSupplier) reasons.push(`Supplier "${supplier_name}" has no previous clearance history on MASAAR`);
    if (isCosmeticOrSupplement) reasons.push(`${product_category} is a higher-scrutiny SFDA category`);
  } else if (isCosmeticOrSupplement) {
    risk = 'MEDIUM';
    reasons.push(`Country of origin (${country_of_origin}) is a GCC member state`);
    reasons.push(`${product_category} requires additional SFDA laboratory verification`);
    reasons.push(seenBefore ? 'Supplier has previous clearance history' : 'Supplier is a recognised manufacturer');
  } else if (isFood) {
    risk = 'LOW';
    reasons.push(`Country of origin (${country_of_origin}) is a GCC member state`);
    reasons.push(seenBefore ? 'Supplier has previous clearance history' : 'Supplier is a recognised manufacturer');
    reasons.push(`${product_category} is a standard food category`);
  } else {
    risk = 'MEDIUM';
    reasons.push(`${product_category} requires standard SFDA review`);
  }

  return {
    risk_level: risk,
    reasons,
    required_documents: DOCUMENT_TYPES,
    timeline: TIMELINES[risk],
    is_mock: true,
  };
}

// The API returns timeline as '48hr' | '5 days' | '7 days'.
const API_TIMELINE_LABELS = { '48hr': '48 hours' };

// Fills in anything the API response leaves out.
function normaliseResult(data) {
  const risk = ['LOW', 'MEDIUM', 'HIGH'].includes(data.risk_level) ? data.risk_level : 'MEDIUM';
  const timeline = typeof data.timeline === 'string'
    ? { track: TIMELINES[risk].track, duration: API_TIMELINE_LABELS[data.timeline] || data.timeline }
    : data.timeline || TIMELINES[risk];
  return {
    risk_level: risk,
    reasons: data.reasons || data.risk_reasons || [],
    required_documents: data.required_documents || DOCUMENT_TYPES,
    timeline,
    is_mock: false,
  };
}

// ─── Styles (match LabPortal.js) ───────────────────────────────

const BORDER = 'rgba(56,198,255,0.2)';
const ACCENT = '#38C6FF';

const s = {
  page: { minHeight: '100vh', background: '#2D2B7A', fontFamily: 'Inter, sans-serif', color: '#fff', padding: '40px 16px' },
  wrap: { maxWidth: 760, margin: '0 auto' },
  card: { background: '#332E8A', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28, marginBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 6, lineHeight: 1.5 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' },
  field: { marginBottom: 16 },
  primaryBtn: { background: ACCENT, color: '#2D2B7A', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '12px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '24px 0 12px' },
  row: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 8, marginBottom: 8, fontSize: 13 },
  error: { background: 'rgba(255,84,112,.08)', border: '1px solid rgba(255,84,112,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#FF5470', marginBottom: 16 },
};

// ─── Component ─────────────────────────────────────────────────

export default function PreShipmentCheck({ token, onProceed }) {
  const [form, setForm] = useState({ product_category: '', country_of_origin: '', supplier_name: '' });
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canSubmit = form.product_category && form.country_of_origin.trim() && form.supplier_name.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setChecking(true);
    setError(null);
    setResult(null);

    const payload = {
      product_category: form.product_category,
      country_of_origin: form.country_of_origin.trim(),
      supplier_name: form.supplier_name.trim(),
    };

    try {
      const res = await fetch(`${API_URL}/shipments/pre-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      setResult(data && data.risk_level ? normaliseResult(data) : mockAssessment(payload));
    } catch {
      // Endpoint not reachable yet — fall back to the demo assessment.
      setResult(mockAssessment(payload));
    } finally {
      setChecking(false);
    }
  };

  const handleProceed = () => {
    rememberSupplier(form.supplier_name);
    onProceed('new-shipment');
  };

  const risk = result ? RISK_STYLE[result.risk_level] : null;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header + form */}
        <div style={s.card}>
          <div style={s.eyebrow}>Step 0 · Pre-Clearance Check</div>
          <h1 style={s.title}>Shipment Risk Assessment</h1>
          <p style={s.subtitle}>
            Check your shipment's risk level, required documents and expected clearance time before opening a shipment record.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            {error && <div style={s.error}>{error}</div>}

            <div style={s.field}>
              <label style={s.label} htmlFor="pc-category">Product Category</label>
              <select
                id="pc-category"
                value={form.product_category}
                onChange={e => setForm({ ...form, product_category: e.target.value })}
                style={{ ...s.input, cursor: 'pointer' }}
              >
                <option value="" style={{ background: '#332E8A' }}>Select SFDA category…</option>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#332E8A' }}>{c}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="pc-country">Country of Origin</label>
              <input
                id="pc-country"
                list="pc-country-list"
                value={form.country_of_origin}
                onChange={e => setForm({ ...form, country_of_origin: e.target.value })}
                placeholder="Start typing a country…"
                autoComplete="off"
                style={s.input}
              />
              <datalist id="pc-country-list">
                {COUNTRIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="pc-supplier">Supplier Name</label>
              <input
                id="pc-supplier"
                value={form.supplier_name}
                onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                placeholder="e.g. Almarai Company"
                style={s.input}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || checking}
              style={{ ...s.primaryBtn, opacity: !canSubmit || checking ? 0.5 : 1, cursor: !canSubmit || checking ? 'not-allowed' : 'pointer' }}
            >
              {checking ? 'Assessing…' : 'Run Risk Assessment'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span
              role="link"
              tabIndex={0}
              onClick={() => onProceed()}
              onKeyDown={e => { if (e.key === 'Enter') onProceed(); }}
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
            >
              Skip — go to my shipments
            </span>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{ ...s.card, borderColor: risk.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={s.eyebrow}>Risk Assessment</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                  {form.product_category} · {form.country_of_origin} · {form.supplier_name}
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 800, letterSpacing: '.06em', background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color }}></span>
                {result.risk_level} RISK
              </span>
            </div>

            {result.is_mock && (
              <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                Demo assessment — the live risk service is not connected yet.
              </div>
            )}

            {/* Reasons */}
            <div style={s.sectionTitle}>Why this risk level</div>
            {result.reasons.map((r, i) => (
              <div key={i} style={s.row}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: risk.color, marginTop: 6, flexShrink: 0 }}></span>
                <span style={{ color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}

            {/* Timeline */}
            <div style={s.sectionTitle}>Estimated clearance timeline</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', background: 'rgba(56,198,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: ACCENT }}>{result.timeline.duration}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{result.timeline.track} clearance</div>
            </div>

            {/* Documents */}
            <div style={s.sectionTitle}>Required documents · {form.product_category}</div>
            {result.required_documents.map(d => (
              <div key={d.key || d.label} style={{ ...s.row, justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${d.required ? ACCENT : 'rgba(255,255,255,.2)'}`, flexShrink: 0 }}></span>
                  <span style={{ color: 'rgba(255,255,255,.85)' }}>{d.label}</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: d.required ? ACCENT : 'rgba(255,255,255,.35)' }}>
                  {d.required ? 'Required' : 'Optional'}
                </span>
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleProceed} style={s.primaryBtn}>
                Proceed — Open Shipment Record
              </button>
              <button type="button" onClick={() => setResult(null)} style={s.ghostBtn}>
                Check Another Shipment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
