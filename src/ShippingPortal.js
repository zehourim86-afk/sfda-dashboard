import { useState, useEffect } from 'react';
import { API_URL, formatDate } from './constants';
import NotificationBell from './NotificationBell';
import OrgAdminPanel from './OrgAdminPanel';

const INSPECTOR_STATES = [
  'SAMPLING_REQUESTED',
  'PICKUP_SCHEDULED',
  'SAMPLE_PICKED_UP',
  'IN_TRANSIT',
  'LAB_RECEIVED'
];

const STATE_INFO = {
  SAMPLING_REQUESTED: { label: 'Pickup Requested', color: 'bg-orange-100 text-orange-700', action: 'Confirm Pickup Scheduled with MAH', next: 'PICKUP_SCHEDULED' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: 'bg-blue-100 text-blue-700', action: 'Confirm Sample Picked Up from MAH', next: 'SAMPLE_PICKED_UP' },
  SAMPLE_PICKED_UP: { label: 'Sample Picked Up', color: 'bg-yellow-100 text-yellow-700', action: 'Confirm In Transit to Lab', next: 'IN_TRANSIT' },
  IN_TRANSIT: { label: 'In Transit to Lab', color: 'bg-purple-100 text-purple-700', action: 'Confirm Lab Receipt', next: 'LAB_RECEIVED' },
  LAB_RECEIVED: { label: 'Delivered to Lab', color: 'bg-green-100 text-green-700', action: null, next: null },
};

// ─── MASAAR Sampling Recommendation ────────────────────────────

const MANDATORY_CATEGORIES = ['Cosmetic', 'Cosmetic Device', 'Food Supplement'];

const RECOMMENDATION_STYLE = {
  MANDATORY: { label: 'MANDATORY', color: '#FF5470', bg: 'rgba(255,84,112,.1)', border: 'rgba(255,84,112,.3)' },
  EXEMPT: { label: 'EXEMPT', color: '#00C896', bg: 'rgba(0,200,150,.1)', border: 'rgba(0,200,150,.3)' },
  SFDA_DISCRETION: { label: 'SFDA DISCRETION', color: '#F5A623', bg: 'rgba(245,166,35,.1)', border: 'rgba(245,166,35,.3)' },
};

// Fields come from GET /shipments. null means "not known yet", which never triggers a rule.
function getSamplingRecommendation(s) {
  const mandatoryReasons = [];
  if (s.sampling_history === 0) mandatoryReasons.push('First shipment of this product by this MAH — no clean sampling history');
  if (s.supplier_first_time === true) mandatoryReasons.push('First shipment from this supplier');
  if (s.country_risk === 'HIGH') mandatoryReasons.push(`Country of origin (${s.shipment_country || 'unknown'}) is rated high risk`);
  if (s.previous_non_conformity === true) mandatoryReasons.push('This MAH has a previous non-conformity for this product');
  if (MANDATORY_CATEGORIES.includes(s.product_category)) mandatoryReasons.push(`${s.product_category} is a mandatory-sampling category`);

  const unknown = [];
  if (s.sampling_history == null) unknown.push('sampling history');
  if (s.certificate_of_conformity == null) unknown.push('certificate of conformity');
  if (s.supplier_first_time == null) unknown.push('supplier history');
  if (s.product_category == null) unknown.push('product category');

  if (mandatoryReasons.length > 0) {
    return { recommendation: 'MANDATORY', reasons: mandatoryReasons, unknown };
  }

  const hasCoc = s.certificate_of_conformity === true;
  const history = s.sampling_history;
  const cleanRecord = s.previous_non_conformity === false;

  if (hasCoc && history >= 3 && cleanRecord) {
    return {
      recommendation: 'EXEMPT',
      reasons: [
        'Valid Certificate of Conformity on file',
        `${history} prior clean shipments of this product by this MAH`,
        'No previous non-conformity recorded',
      ],
      unknown,
    };
  }

  const reasons = ['No mandatory sampling triggers found'];
  if (!hasCoc) reasons.push(s.certificate_of_conformity === false ? 'No valid Certificate of Conformity on file' : 'Certificate of Conformity could not be checked');
  if (history == null) reasons.push('Sampling history could not be checked — no products listed on this shipment');
  else if (history < 3) reasons.push(`Only ${history} prior clean shipment${history === 1 ? '' : 's'} (3 needed for exemption)`);
  if (s.previous_non_conformity == null) reasons.push('Non-conformity history could not be checked');
  return { recommendation: 'SFDA_DISCRETION', reasons, unknown };
}

const panel = {
  wrap: { background: '#0D1940', border: '1px solid rgba(56,198,255,0.12)', borderRadius: 14, padding: 20, fontFamily: 'Inter, sans-serif', color: '#fff' },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#38C6FF', marginBottom: 12 },
  reason: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 6 },
  primary: { flex: 1, background: '#38C6FF', color: '#0B1535', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghost: { flex: 1, background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.75)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  input: { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
  error: { background: 'rgba(255,84,112,.08)', border: '1px solid rgba(255,84,112,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#FF5470', marginTop: 12 },
};

function SamplingRecommendation({ shipment, token, onExempted }) {
  const { recommendation, reasons, unknown } = getSamplingRecommendation(shipment);
  const style = RECOMMENDATION_STYLE[recommendation];
  const [recorded, setRecorded] = useState(shipment.sampling_decision || null);
  const [overriding, setOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const opposite = recommendation === 'MANDATORY' ? 'EXEMPT' : 'MANDATORY';

  const submit = async (decision, override) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.id}/sampling-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          decision,
          override,
          override_reason: override ? overrideReason.trim() : '',
          recommendation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to record sampling decision');
        return;
      }
      if (decision === 'EXEMPT') {
        onExempted();
      } else {
        setRecorded('MANDATORY');
        setOverriding(false);
      }
    } catch {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  if (recorded === 'MANDATORY') {
    return (
      <div style={panel.wrap}>
        <div style={panel.eyebrow}>MASAAR Sampling Recommendation</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,.8)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5470', flexShrink: 0 }}></span>
          Decision recorded: sampling is mandatory. Proceed with sample collection below.
        </div>
      </div>
    );
  }

  const busy = submitting ? { opacity: 0.5, cursor: 'not-allowed' } : {};

  return (
    <div style={panel.wrap}>
      <div style={panel.eyebrow}>MASAAR Sampling Recommendation</div>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, fontSize: 16, fontWeight: 800, letterSpacing: '.05em', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color }}></span>
        {style.label}
      </span>

      <div style={{ marginTop: 14 }}>
        {reasons.map((r, i) => (
          <div key={i} style={panel.reason}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: style.color, marginTop: 6, flexShrink: 0 }}></span>
            <span>{r}</span>
          </div>
        ))}
        {unknown.length > 0 && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 8 }}>
            Not yet available: {unknown.join(', ')}
          </div>
        )}
      </div>

      {overriding ? (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Override to {RECOMMENDATION_STYLE[opposite].label} — reason
          </label>
          <textarea
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            rows={2}
            placeholder="Why are you overriding the recommendation?"
            style={panel.input}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => submit(opposite, true)}
              disabled={submitting || !overrideReason.trim()}
              style={{ ...panel.primary, ...(submitting || !overrideReason.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
            >
              {submitting ? 'Saving…' : 'Confirm Override'}
            </button>
            <button onClick={() => { setOverriding(false); setOverrideReason(''); }} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
              Cancel
            </button>
          </div>
        </div>
      ) : recommendation === 'SFDA_DISCRETION' ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => submit('MANDATORY', false)} disabled={submitting} style={{ ...panel.primary, ...busy }}>
            Require Sampling
          </button>
          <button onClick={() => submit('EXEMPT', false)} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
            Exempt
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => submit(recommendation, false)} disabled={submitting} style={{ ...panel.primary, ...busy }}>
            {submitting ? 'Saving…' : 'Accept Recommendation'}
          </button>
          <button onClick={() => setOverriding(true)} disabled={submitting} style={{ ...panel.ghost, ...busy }}>
            Override
          </button>
        </div>
      )}

      {error && <div style={panel.error}>{error}</div>}
    </div>
  );
}

// Sample Collection Modal
function SampleActionModal({ shipment, token, isInspector, onClose, onRefresh }) {
  const [acting, setActing] = useState(false);
  const [sealId, setSealId] = useState('');
  const [samplePhoto, setSamplePhoto] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const stateInfo = STATE_INFO[shipment.current_state];

    const handleBulkJourney = async () => {
    if (!sealId.trim()) {
      setError('Please enter a seal ID before completing the full journey');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const steps = [
        { state: 'PICKUP_SCHEDULED', notes: 'Shipping company confirmed pickup scheduling with MAH' },
        { state: 'SAMPLE_PICKED_UP', notes: `Seal ID: ${sealId}${notes ? ' — ' + notes : ''}` },
        { state: 'IN_TRANSIT', notes: 'Sample in transit to assigned lab' },
        { state: 'LAB_RECEIVED', notes: 'Lab confirmed sample receipt' }
      ];

      for (const step of steps) {
        await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ new_state: step.state, notes: step.notes, trigger_source: 'MANUAL' })
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Failed to complete journey — check connection');
    } finally {
      setActing(false);
    }
  };

  const performTransition = async () => {
    if (shipment.current_state === 'PICKUP_SCHEDULED' && !sealId.trim()) {
      setError('Seal ID is required when collecting samples');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const actionNotes = sealId ? `Seal ID: ${sealId}${notes ? ' — ' + notes : ''}${samplePhoto ? ' — Photo uploaded' : ''}` : notes;

      const res = await fetch(`${API_URL}/shipments/${shipment.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          new_state: stateInfo.next,
          notes: actionNotes,
          trigger_source: 'MANUAL'
        })
      });
      const data = await res.json();
      if (data.success) {

        // Create lab sample record when sample collected
        if (shipment.current_state === 'PICKUP_SCHEDULED' && shipment.lab_id) {
          await fetch(`${API_URL}/inspector/samples`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              shipment_id: shipment.id,
              lab_organisation_id: shipment.lab_id,
              seal_id: sealId,
              notes: notes
            })
          });
        }

        onRefresh();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{shipment.faseh_request_number}</h2>
            <p className="text-sm text-gray-500">{shipment.importer_name} · {shipment.port_of_entry}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current status */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stateInfo?.color}`}>
              {stateInfo?.label}
            </span>
            <p className="text-sm text-gray-600 mt-2">Since {formatDate(shipment.state_entered_at)}</p>
          </div>

          {/* Shipment details */}
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Faseh Reference</p>
              <p className="text-sm font-medium">{shipment.faseh_request_number}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Port of Entry</p>
              <p className="text-sm font-medium">{shipment.port_of_entry}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Shipment Country</p>
              <p className="text-sm font-medium">{shipment.shipment_country}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">QC Lab</p>
              <p className="text-sm font-medium">{shipment.lab_name || '—'}</p></div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          {/* Seal ID and photo — when collecting sample or doing bulk journey */}
          {(shipment.current_state === 'PICKUP_SCHEDULED' || shipment.current_state === 'SAMPLING_REQUESTED') && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Seal ID *</label>
                <input type="text" value={sealId} onChange={e => setSealId(e.target.value)}
                  placeholder="e.g. SEAL-SA-2026-00441"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
                <p className="text-xs text-gray-400 mt-1">Record the seal ID placed on the sample container</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Sample Photo</label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input type="file" accept="image/*" id="sample-photo" className="hidden"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setSamplePhoto(ev.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {samplePhoto ? (
                    <div>
                      <img src={samplePhoto} alt="Sample" className="max-h-32 mx-auto rounded-lg" />
                      <button type="button" onClick={() => setSamplePhoto(null)}
                        className="mt-2 text-xs text-red-500 hover:underline">Remove photo</button>
                    </div>
                  ) : (
                    <label htmlFor="sample-photo" className="cursor-pointer">
                      <p className="text-2xl mb-1">📷</p>
                      <p className="text-xs text-gray-500">Click to take or upload a photo of the sealed sample</p>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Any observations or notes..."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          {isInspector && shipment.current_state === 'SAMPLING_REQUESTED' && (
            <SamplingRecommendation shipment={shipment} token={token} onExempted={onRefresh} />
          )}

          {stateInfo?.action && (
            <button onClick={performTransition} disabled={acting}
              className="w-full py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#2D2B7A'}}>
              {acting ? 'Processing...' : stateInfo.action}
            </button>
          )}

          {shipment.current_state === 'SAMPLING_REQUESTED' && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <button onClick={handleBulkJourney} disabled={acting}
                className="w-full py-2.5 font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 border-2"
                style={{color: '#2D2B7A', borderColor: '#2D2B7A', background: 'white'}}>
                {acting ? '⏳ Completing journey...' : '⚡ Complete Full Sample Journey'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-1">
                Records all steps from collection to lab receipt in one action
              </p>
            </div>
          )}

          {shipment.current_state === 'LAB_RECEIVED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-700 font-semibold text-sm">✓ Sample successfully delivered to lab</p>
              <p className="text-green-600 text-xs mt-1">The lab will now proceed with analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Inspector App
export default function InspectorApp({ user: initialUser, token, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

    const fetchShipments = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, meRes] = await Promise.all([
        fetch(`${API_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const shipmentsData = await shipmentsRes.json();
      const meData = await meRes.json();
      setShipments(shipmentsData.shipments || []);
      if (meData.user) setUser(meData.user);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    const interval = setInterval(() => {
      if (!selectedShipment) {
        fetchShipments();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedShipment]);

  const activeShipments = shipments.filter(s => INSPECTOR_STATES.includes(s.current_state));
  const completedShipments = shipments.filter(s => !INSPECTOR_STATES.includes(s.current_state) &&
    ['IN_ANALYSIS', 'ANALYSIS_COMPLETE', 'RESULT_SUBMITTED', 'CONFORMING', 'NON_CONFORMING', 'FINAL_CLEARANCE'].includes(s.current_state));

  const filtered = activeTab === 'active' ? activeShipments : activeTab === 'org-admin' ? [] : completedShipments;

  const samplingRequested = shipments.filter(s => s.current_state === 'SAMPLING_REQUESTED').length;
  const inProgress = shipments.filter(s => ['PICKUP_SCHEDULED', 'SAMPLE_PICKED_UP', 'IN_TRANSIT'].includes(s.current_state)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">DEMARA Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>DEMARA Masaar · Shipping Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </span>
            <NotificationBell token={token} />
            {user && (
              <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <p className="text-white text-xs font-semibold">{user.full_name}</p>
                  <p className="text-xs" style={{color: '#00B4D8'}}>Shipping Agent</p>
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
            <p className="text-2xl font-bold text-orange-600">{samplingRequested}</p>
            <p className="text-xs text-gray-500">Awaiting pickup</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{inProgress}</p>
            <p className="text-xs text-gray-500">In progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedShipments.length}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{shipments.length}</p>
            <p className="text-xs text-gray-500">Total assigned</p>
          </div>
        </div>
      </div>

      {/* Workload summary */}
      {samplingRequested > 0 && (
        <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-2">⚠️ Pending Sample Pickups</h3>
          <div className="space-y-2">
            {shipments.filter(s => s.current_state === 'SAMPLING_REQUESTED').map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                <div>
                  <span className="font-mono text-xs font-semibold" style={{color: '#2D2B7A'}}>{s.faseh_request_number}</span>
                  <span className="text-xs text-gray-500 ml-2">{s.importer_name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{s.port_of_entry}</p>
                  <p className="text-xs text-orange-600 font-medium">Waiting {Math.floor((new Date() - new Date(s.state_entered_at)) / (1000 * 60 * 60))}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'active' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Active Pickups ({activeShipments.length})
            </button>
            <button onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'completed' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'completed' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Completed ({completedShipments.length})
            </button>
            {user?.is_org_admin && (
              <button onClick={() => setActiveTab('org-admin')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'org-admin' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
                style={activeTab === 'org-admin' ? {borderColor: '#10B981', color: '#10B981'} : {}}>
                👥 My Organisation
              </button>
            )}
          </div>
          <button onClick={fetchShipments}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
            style={{background: '#00B4D8'}}>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {activeTab !== 'org-admin' && <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No shipments in this queue</p>
            <p className="text-sm mt-1">
              {activeTab === 'active' ? 'Pickup requests will appear here when a shipment is ready for sample collection' : 'Completed pickup assignments will appear here'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faseh Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lab</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Since</th>
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
                        <p className="text-xs text-gray-500">{s.shipment_country}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.port_of_entry}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.lab_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.state_entered_at)}</td>
                      <td className="px-4 py-3">
                        {INSPECTOR_STATES.includes(s.current_state) && s.current_state !== 'LAB_RECEIVED' && (
                          <button onClick={() => setSelectedShipment(s)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90 ${s.current_state === 'SAMPLING_REQUESTED' ? 'animate-pulse' : ''}`}
                            style={{background: '#2D2B7A'}}>
                            {s.current_state === 'SAMPLING_REQUESTED' ? '⚡ Act' : 'Update'}
                          </button>
                        )}
                        {s.current_state === 'LAB_RECEIVED' && (
                          <span className="text-xs text-green-600 font-medium">✓ Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
            </div>}

      {activeTab === 'org-admin' && (
        <OrgAdminPanel token={token} />
      )}

      {selectedShipment && (
        <SampleActionModal
          shipment={selectedShipment}
          token={token}
          isInspector={user?.role === 'SFDA_INSPECTOR'}
          onClose={() => setSelectedShipment(null)}
          onRefresh={() => {
            fetchShipments();
            setSelectedShipment(null);
          }}
        />
      )}
    </div>
  );
}