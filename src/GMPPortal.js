import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  AUDITED: 'bg-yellow-100 text-yellow-800',
  CERTIFIED: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-red-100 text-red-500',
};

const AUDIT_STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// Register Site Modal
function RegisterSiteModal({ token, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    organisation_name: '',
    site_name: '',
    site_address: '',
    country: '',
    site_type: 'MANUFACTURING',
    product_categories: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const SITE_TYPES = ['MANUFACTURING', 'PACKAGING', 'TESTING', 'WAREHOUSE'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/qms/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to register site');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Register Manufacturing Site</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Manufacturer Name</label>
            <input type="text" required value={form.organisation_name}
              onChange={e => setForm({...form, organisation_name: e.target.value})}
              placeholder="e.g. Sandoz GmbH"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Site Name</label>
            <input type="text" required value={form.site_name}
              onChange={e => setForm({...form, site_name: e.target.value})}
              placeholder="e.g. Sandoz Kundl Plant"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Site Address</label>
            <textarea required value={form.site_address}
              onChange={e => setForm({...form, site_address: e.target.value})}
              rows={2} placeholder="Full site address"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Country</label>
              <input type="text" required value={form.country}
                onChange={e => setForm({...form, country: e.target.value})}
                placeholder="e.g. Germany"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Site Type</label>
              <select value={form.site_type}
                onChange={e => setForm({...form, site_type: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Product Categories</label>
            <input type="text" required value={form.product_categories}
              onChange={e => setForm({...form, product_categories: e.target.value})}
              placeholder="e.g. Oral Solid Dosage, Injectable, API"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#2D2B7A'}}>
              {submitting ? 'Registering...' : 'Register Site'}
            </button>
            <button type="button" onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Schedule Audit Modal
function ScheduleAuditModal({ sites, token, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    site_id: '',
    auditor_id: '',
    audit_type: 'INITIAL',
    scheduled_date: ''
  });
  const [auditors, setAuditors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const AUDIT_TYPES = ['INITIAL', 'SURVEILLANCE', 'RENEWAL', 'FOR_CAUSE'];

  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setAuditors((data.users || []).filter(u => u.role === 'GMP_AUDITOR' && u.is_active));
      } catch (err) {
        console.error('Failed to fetch auditors');
      }
    };
    fetchAuditors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/qms/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to schedule audit');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Schedule Audit</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Manufacturing Site</label>
            <select required value={form.site_id}
              onChange={e => setForm({...form, site_id: e.target.value})}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.site_name} — {s.country}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Lead Auditor</label>
            <select required value={form.auditor_id}
              onChange={e => setForm({...form, auditor_id: e.target.value})}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select auditor</option>
              {auditors.length === 0 && <option disabled>No GMP auditors available</option>}
              {auditors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Audit Type</label>
              <select value={form.audit_type}
                onChange={e => setForm({...form, audit_type: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {AUDIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Scheduled Date</label>
              <input type="date" required value={form.scheduled_date}
                onChange={e => setForm({...form, scheduled_date: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#2D2B7A'}}>
              {submitting ? 'Scheduling...' : 'Schedule Audit'}
            </button>
            <button type="button" onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Complete Audit Modal
function CompleteAuditModal({ audit, token, onSuccess, onCancel }) {
  const [outcome, setOutcome] = useState('PASS');
  const [findings, setFindings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const addFinding = () => {
    setFindings([...findings, { classification: 'MAJOR', description: '', gmp_clause: '', due_date: '' }]);
  };

  const updateFinding = (index, field, value) => {
    const updated = [...findings];
    updated[index][field] = value;
    setFindings(updated);
  };

  const removeFinding = (index) => {
    setFindings(findings.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/qms/audits/${audit.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ overall_outcome: outcome, findings })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.gmp_certificate_number);
      } else {
        setError(data.message || 'Failed to complete audit');
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
            <h2 className="text-lg font-bold text-gray-900">Complete Audit</h2>
            <p className="text-sm text-gray-500">{audit.audit_number} · {audit.site_name}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Overall Outcome</label>
            <div className="flex gap-3 mt-2">
              {['PASS', 'CONDITIONAL', 'FAIL'].map(o => (
                <button key={o} type="button" onClick={() => setOutcome(o)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    outcome === o
                      ? o === 'PASS' ? 'bg-green-600 text-white border-green-600'
                        : o === 'CONDITIONAL' ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}>
                  {o}
                </button>
              ))}
            </div>
            {outcome === 'PASS' && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-xs">
                ✓ A GMP certificate will be automatically generated and valid for 3 years.
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase">Findings / Non-Conformities</label>
              <button type="button" onClick={addFinding}
                className="text-xs px-3 py-1 rounded-lg text-white hover:opacity-90"
                style={{background: '#00B4D8'}}>
                + Add Finding
              </button>
            </div>
            {findings.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                No findings — click "Add Finding" to log non-conformities
              </p>
            )}
            <div className="space-y-3">
              {findings.map((finding, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Finding F-{String(index+1).padStart(3,'0')}</span>
                    <button type="button" onClick={() => removeFinding(index)}
                      className="text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Classification</label>
                      <select value={finding.classification}
                        onChange={e => updateFinding(index, 'classification', e.target.value)}
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none">
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="MAJOR">MAJOR</option>
                        <option value="MINOR">MINOR</option>
                        <option value="OBSERVATION">OBSERVATION</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">GMP Clause</label>
                      <input type="text" value={finding.gmp_clause}
                        onChange={e => updateFinding(index, 'gmp_clause', e.target.value)}
                        placeholder="e.g. EU GMP 4.1"
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Description</label>
                      <textarea value={finding.description}
                        onChange={e => updateFinding(index, 'description', e.target.value)}
                        rows={2} placeholder="Describe the non-conformity..."
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">CAPA Due Date</label>
                      <input type="date" value={finding.due_date}
                        onChange={e => updateFinding(index, 'due_date', e.target.value)}
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#2D2B7A'}}>
              {submitting ? 'Completing...' : 'Complete Audit'}
            </button>
            <button type="button" onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main GMP Portal
export default function GMPPortal({ user, token, onLogout }) {
  const [sites, setSites] = useState([]);
  const [audits, setAudits] = useState([]);
  const [gmpCerts, setGmpCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sites');
  const [showRegisterSite, setShowRegisterSite] = useState(false);
  const [showScheduleAudit, setShowScheduleAudit] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showCompleteAudit, setShowCompleteAudit] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sitesRes, auditsRes, certsRes] = await Promise.all([
        fetch(`${API_URL}/qms/sites`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/qms/audits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/qms/certificates`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const sitesData = await sitesRes.json();
      const auditsData = await auditsRes.json();
      const certsData = await certsRes.json();
      setSites(sitesData.sites || []);
      setAudits(auditsData.audits || []);
      setGmpCerts(certsData.certificates || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const openCompleteAudit = async (audit) => {
    try {
      const res = await fetch(`${API_URL}/qms/audits/${audit.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedAudit(data.audit);
      setShowCompleteAudit(true);
    } catch (err) {
      console.error('Failed to fetch audit details');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const pendingSites = sites.filter(s => s.gmp_status === 'PENDING').length;
  const certifiedSites = sites.filter(s => s.gmp_status === 'CERTIFIED').length;
  const scheduledAudits = audits.filter(a => a.status === 'SCHEDULED').length;
  const activeCerts = gmpCerts.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">Drug Import Traceability Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Digital QMS · GMP Audit Management</p>
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
                  <p className="text-xs" style={{color: '#00B4D8'}}>{user.role.replace(/_/g, ' ')}</p>
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
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{sites.length}</p>
            <p className="text-xs text-gray-500">Total sites</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{pendingSites}</p>
            <p className="text-xs text-gray-500">Pending audit</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{certifiedSites}</p>
            <p className="text-xs text-gray-500">Certified</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{scheduledAudits}</p>
            <p className="text-xs text-gray-500">Audits scheduled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeCerts}</p>
            <p className="text-xs text-gray-500">Active GMP certs</p>
          </div>
        </div>
      </div>

      {/* Tabs and actions */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 border-b border-gray-200">
            {['sites', 'audits', 'certificates'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab ? 'border-b-2' : 'border-transparent text-gray-500'
                }`}
                style={activeTab === tab ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
                {tab === 'sites' ? `Sites (${sites.length})` :
                 tab === 'audits' ? `Audits (${audits.length})` :
                 `GMP Certificates (${gmpCerts.length})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {activeTab === 'sites' && (
              <button onClick={() => setShowRegisterSite(true)}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
                style={{background: '#2D2B7A'}}>
                + Register Site
              </button>
            )}
            {activeTab === 'audits' && (
              <button onClick={() => setShowScheduleAudit(true)}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
                style={{background: '#2D2B7A'}}>
                + Schedule Audit
              </button>
            )}
            <button onClick={fetchData}
              className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
              style={{background: '#00B4D8'}}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading QMS data...</div>
        ) : activeTab === 'sites' ? (
          sites.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No manufacturing sites registered</p>
              <p className="text-sm mt-1">Click "Register Site" to add a manufacturing site</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Site Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manufacturer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GMP Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Audit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Next Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sites.map(site => (
                    <tr key={site.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{site.site_name}</p>
                        <p className="text-xs text-gray-500">{site.product_categories}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{site.organisation_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{site.country}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{site.site_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[site.gmp_status] || 'bg-gray-100 text-gray-700'}`}>
                          {site.gmp_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(site.last_audit_date)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(site.next_audit_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'audits' ? (
          audits.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No audits scheduled</p>
              <p className="text-sm mt-1">Click "Schedule Audit" to plan a GMP audit</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Audit No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Site</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Auditor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Scheduled</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Outcome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {audits.map(audit => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{audit.audit_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{audit.site_name}</p>
                        <p className="text-xs text-gray-500">{audit.site_country}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{audit.audit_type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{audit.auditor_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AUDIT_STATUS_COLORS[audit.status] || 'bg-gray-100 text-gray-700'}`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(audit.scheduled_date)}</td>
                      <td className="px-4 py-3">
                        {audit.overall_outcome ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            audit.overall_outcome === 'PASS' ? 'bg-green-100 text-green-700' :
                            audit.overall_outcome === 'CONDITIONAL' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{audit.overall_outcome}</span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {audit.status === 'SCHEDULED' && (
                          <button onClick={() => openCompleteAudit(audit)}
                            className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                            style={{background: '#2D2B7A'}}>
                            Complete
                          </button>
                        )}
                        {audit.status === 'COMPLETED' && (
                          <span className="text-xs text-gray-400">Done ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          gmpCerts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No GMP certificates issued yet</p>
              <p className="text-sm mt-1">GMP certificates are auto-generated when an audit is completed with PASS outcome</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Certificate No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Site</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gmpCerts.map(cert => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{cert.certificate_number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cert.site_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cert.site_country}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          cert.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{cert.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(cert.issue_date)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(cert.expiry_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cert.issued_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showRegisterSite && (
        <RegisterSiteModal
          token={token}
          onSuccess={() => { setShowRegisterSite(false); fetchData(); }}
          onCancel={() => setShowRegisterSite(false)}
        />
      )}

      {showScheduleAudit && (
        <ScheduleAuditModal
          sites={sites}
          token={token}
          onSuccess={() => { setShowScheduleAudit(false); fetchData(); }}
          onCancel={() => setShowScheduleAudit(false)}
        />
      )}

      {showCompleteAudit && selectedAudit && (
        <CompleteAuditModal
          audit={selectedAudit}
          token={token}
          onSuccess={(certNumber) => {
            setShowCompleteAudit(false);
            setSelectedAudit(null);
            fetchData();
            if (certNumber) alert(`GMP Certificate ${certNumber} auto-generated successfully!`);
          }}
          onCancel={() => { setShowCompleteAudit(false); setSelectedAudit(null); }}
        />
      )}
    </div>
  );
}