import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SA', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  ISSUED: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

const CERT_TYPES = ['COC', 'CE', 'FDA', 'ISO', 'GMP', 'OTHER'];

// New Certificate Form
function NewCertificateForm({ token, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    certificate_type: 'COC',
    expiry_date: '',
    notes: '',
    importer_email: '',
    products: [{ product_name_en: '', product_number: '', manufacturer_name: '', manufacturer_country: '' }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const addProduct = () => {
    setForm({...form, products: [...form.products, { product_name_en: '', product_number: '', manufacturer_name: '', manufacturer_country: '' }]});
  };

  const removeProduct = (index) => {
    setForm({...form, products: form.products.filter((_, i) => i !== index)});
  };

  const updateProduct = (index, field, value) => {
    const updated = [...form.products];
    updated[index][field] = value;
    setForm({...form, products: updated});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.certificate_number);
      } else {
        setError(data.message || 'Failed to create certificate');
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
          <h2 className="text-lg font-bold text-gray-900">Issue New Certificate</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Certificate Type</label>
              <select value={form.certificate_type} onChange={e => setForm({...form, certificate_type: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Expiry Date</label>
              <input type="date" required value={form.expiry_date}
                onChange={e => setForm({...form, expiry_date: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Importer Email (optional)</label>
            <input type="email" value={form.importer_email}
              onChange={e => setForm({...form, importer_email: e.target.value})}
              placeholder="importer@company.com.sa"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              rows={2} placeholder="Any additional conditions or notes..."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 uppercase">Products Covered</label>
              <button type="button" onClick={addProduct}
                className="text-xs px-3 py-1 rounded-lg text-white hover:opacity-90"
                style={{background: '#00B4D8'}}>
                + Add Product
              </button>
            </div>
            <div className="space-y-3">
              {form.products.map((product, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Product {index + 1}</span>
                    {form.products.length > 1 && (
                      <button type="button" onClick={() => removeProduct(index)}
                        className="text-xs text-red-600 hover:underline">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Product Name</label>
                      <input type="text" required value={product.product_name_en}
                        onChange={e => updateProduct(index, 'product_name_en', e.target.value)}
                        placeholder="e.g. Amoxicillin 500mg"
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Product Number (optional)</label>
                      <input type="text" value={product.product_number}
                        onChange={e => updateProduct(index, 'product_number', e.target.value)}
                        placeholder="e.g. DRUG-SA-2024-0042"
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Manufacturer Name</label>
                      <input type="text" required value={product.manufacturer_name}
                        onChange={e => updateProduct(index, 'manufacturer_name', e.target.value)}
                        placeholder="e.g. Sandoz GmbH"
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Manufacturer Country</label>
                      <input type="text" required value={product.manufacturer_country}
                        onChange={e => updateProduct(index, 'manufacturer_country', e.target.value)}
                        placeholder="e.g. Germany"
                        className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#2D2B7A'}}>
              {submitting ? 'Submitting...' : 'Submit Certificate for Review'}
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

// Certificate Detail Modal
function CertificateDetailModal({ certId, token, onClose }) {
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await fetch(`${API_URL}/certificates/${certId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setCert(data.certificate);
      } catch (err) {
        console.error('Failed to fetch certificate');
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [certId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-gray-500">Loading...</div>
    </div>
  );

  if (!cert) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cert.certificate_number}</h2>
            <p className="text-sm text-gray-500">{cert.certificate_type} Certificate</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[cert.current_status]}`}>
              {cert.current_status}
            </span>
            {cert.current_status === 'ISSUED' && (
              <span className="text-xs text-green-600">✓ Valid certificate</span>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Notified Body</p>
              <p className="text-sm font-medium">{cert.notified_body_name || '—'}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Designation No.</p>
              <p className="text-sm font-medium">{cert.designation_number || '—'}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Issue Date</p>
              <p className="text-sm font-medium">{formatDateShort(cert.issue_date)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Expiry Date</p>
              <p className="text-sm font-medium">{formatDateShort(cert.expiry_date)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Issued By</p>
              <p className="text-sm font-medium">{cert.issued_by_name || '—'}</p></div>
            <div><p className="text-xs text-gray-500 uppercase font-semibold">Created</p>
              <p className="text-sm font-medium">{formatDate(cert.created_at)}</p></div>
          </div>

          {/* Notes */}
          {cert.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Notes</p>
              <p className="text-sm text-gray-700">{cert.notes}</p>
            </div>
          )}

          {/* Products */}
          {cert.products && cert.products.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Products Covered ({cert.products.length})</h3>
              <div className="space-y-2">
                {cert.products.map(p => (
                  <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900 text-sm">{p.product_name_en}</p>
                    <div className="flex gap-4 mt-1 flex-wrap">
                      {p.product_number && <span className="text-xs text-gray-500">No: {p.product_number}</span>}
                      <span className="text-xs text-gray-500">Mfr: {p.manufacturer_name}</span>
                      <span className="text-xs text-gray-500">Country: {p.manufacturer_country}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          {cert.audit_log && cert.audit_log.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Certificate History</h3>
              <div className="space-y-2">
                {cert.audit_log.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-blue-50">
                    <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{log.from_status} → {log.to_status}</p>
                      {log.notes && <p className="text-xs text-gray-500">{log.notes}</p>}
                      <p className="text-xs text-gray-400">{log.actor_name} · {formatDate(log.occurred_at)}</p>
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

// Approve Request Modal
function ApproveModal({ request, token, onSuccess, onCancel }) {
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    if (!expiryDate) { setError('Expiry date is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/certificates/requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expiry_date: expiryDate, notes })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.certificate_number);
      } else {
        setError(data.message || 'Failed to approve');
      }
    } catch (err) {
      setError('Failed to connect to platform');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!notes) { setError('Please provide a rejection reason'); return; }
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/certificates/requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes })
      });
      onSuccess(null);
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
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Certificate Request</h2>
            <p className="text-sm text-gray-500">{request.trace_number}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Importer</span>
              <span className="font-medium">{request.importer_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Product</span>
              <span className="font-medium">{request.product_name_en}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Product No.</span>
              <span className="font-medium">{request.product_number || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Country</span>
              <span className="font-medium">{request.shipment_country}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Requested</span>
              <span className="font-medium">{formatDate(request.requested_at)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Certificate Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Notes (required for rejection)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Any conditions, restrictions, or rejection reason..."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleApprove} disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#10B981'}}>
              {submitting ? 'Processing...' : '✓ Issue Certificate'}
            </button>
            <button onClick={handleReject} disabled={submitting}
              className="flex-1 py-2.5 text-white font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{background: '#EF4444'}}>
              ✕ Reject Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Notified Body Portal
export default function NotifiedBodyPortal({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedCertId, setSelectedCertId] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, certRes] = await Promise.all([
        fetch(`${API_URL}/certificates/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/certificates`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const reqData = await reqRes.json();
      const certData = await certRes.json();
      setRequests(reqData.requests || []);
      setCertificates(certData.certificates || []);
      setError(null);
    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const reviewedRequests = requests.filter(r => r.status !== 'PENDING');
  const issuedCerts = certificates.filter(c => c.current_status === 'ISSUED').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/demara-logo.png" alt="DEMARA" style={{height: '80px', width: '200px', objectFit: 'contain'}} />
            <div>
              <h1 className="text-lg font-bold text-white">Drug Import Traceability Platform</h1>
              <p className="text-xs mt-0.5" style={{color: '#00B4D8'}}>Notified Body Portal · Certificate Management</p>
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
            <p className="text-2xl font-bold text-orange-600">{pendingRequests.length}</p>
            <p className="text-xs text-gray-500">Pending requests</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{issuedCerts}</p>
            <p className="text-xs text-gray-500">Certificates issued</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{reviewedRequests.length}</p>
            <p className="text-xs text-gray-500">Reviewed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{color: '#2D2B7A'}}>{requests.length}</p>
            <p className="text-xs text-gray-500">Total requests</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requests' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'requests' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Pending Requests ({pendingRequests.length})
            </button>
            <button onClick={() => setActiveTab('reviewed')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reviewed' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'reviewed' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Reviewed ({reviewedRequests.length})
            </button>
            <button onClick={() => setActiveTab('certificates')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'certificates' ? 'border-b-2' : 'border-transparent text-gray-500'}`}
              style={activeTab === 'certificates' ? {borderColor: '#2D2B7A', color: '#2D2B7A'} : {}}>
              Issued Certificates ({issuedCerts})
            </button>
          </div>
          <button onClick={fetchData}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90"
            style={{background: '#00B4D8'}}>
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : activeTab === 'requests' ? (
          pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No pending certificate requests</p>
              <p className="text-sm mt-1">Requests are created automatically when importers submit clearance requests</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Importer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requested</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{req.trace_number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{req.importer_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{req.product_name_en}</p>
                        {req.product_number && <p className="text-xs text-gray-500">{req.product_number}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{req.shipment_country}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(req.requested_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                          style={{background: '#2D2B7A'}}>
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'reviewed' ? (
          reviewedRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No reviewed requests yet</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trace No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviewedRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{req.trace_number}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{req.product_name_en}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(req.reviewed_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{req.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          certificates.filter(c => c.current_status === 'ISSUED').length === 0 ? (
            <div className="text-center py-12 text-gray-400">No certificates issued yet</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Certificate No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {certificates.filter(c => c.current_status === 'ISSUED').map(cert => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{color: '#2D2B7A'}}>{cert.certificate_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{cert.certificate_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[cert.current_status]}`}>
                          {cert.current_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(cert.issue_date)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(cert.expiry_date)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedCertId(cert.id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90"
                          style={{background: '#2D2B7A'}}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {selectedRequest && (
        <ApproveModal
          request={selectedRequest}
          token={token}
          onSuccess={(certNumber) => {
            setSelectedRequest(null);
            fetchData();
            if (certNumber) alert(`Certificate ${certNumber} issued successfully and linked to the shipment.`);
          }}
          onCancel={() => setSelectedRequest(null)}
        />
      )}

      {selectedCertId && (
        <CertificateDetailModal
          certId={selectedCertId}
          token={token}
          onClose={() => setSelectedCertId(null)}
        />
      )}
    </div>
  );
}