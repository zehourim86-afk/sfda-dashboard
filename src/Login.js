import { useState } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    organisation_name: '',
    organisation_type: 'IMPORTER',
    requested_role: 'IMPORTER',
    cr_number: '',
    ghad_cr_number: '',
    sfda_facility_number: '',
    cr_document: null,
    sfda_certificate: null
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      localStorage.setItem('demara_token', data.token);
      localStorage.setItem('demara_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);

    } catch (err) {
      setError('Failed to connect to platform. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('full_name', registerForm.full_name);
      formData.append('email', registerForm.email);
      formData.append('password', registerForm.password);
      formData.append('organisation_name', registerForm.organisation_name);
      formData.append('organisation_type', registerForm.organisation_type);
      formData.append('requested_role', registerForm.requested_role);
      formData.append('cr_number', registerForm.cr_number || '');
      formData.append('ghad_cr_number', registerForm.ghad_cr_number || '');
      formData.append('sfda_facility_number', registerForm.sfda_facility_number || '');
      if (registerForm.cr_document) formData.append('cr_document', registerForm.cr_document);
      if (registerForm.sfda_certificate) formData.append('sfda_certificate', registerForm.sfda_certificate);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return;
      }

      setSuccess('Registration submitted successfully. DEMARA will review and approve your account.');
      setMode('login');

    } catch (err) {
      setError('Failed to connect to platform.');
    } finally {
      setLoading(false);
    }
  };

  const ROLE_OPTIONS = [
    { value: 'SFDA_REVIEWER', label: 'SFDA Reviewer' },
    { value: 'SFDA_INSPECTOR', label: 'SFDA Inspector' },
    { value: 'LAB_ANALYST', label: 'Lab Analyst' },
    { value: 'IMPORTER', label: 'Importer' },
    { value: 'NOTIFIED_BODY', label: 'Notified Body' },
    { value: 'GMP_AUDITOR', label: 'GMP Auditor' },
  ];

  const ORG_TYPES = [
    { value: 'SFDA', label: 'SFDA' },
    { value: 'IMPORTER', label: 'Importing Company' },
    { value: 'LAB', label: 'Testing Laboratory' },
    { value: 'NOTIFIED_BODY', label: 'Notified Body' },
    { value: 'MANUFACTURER', label: 'Manufacturer' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #2D2B7A 0%, #1a1854 100%)'}}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/demara-logo.png" alt="DEMARA" className="mx-auto mb-4" style={{height: '100px', width: '250px', objectFit: 'contain'}} />
          <h1 className="text-white text-xl font-bold">Drug Import Traceability Platform</h1>
          <p className="text-sm mt-1" style={{color: '#00B4D8'}}>Powered by DEMARA · Regulatory Consulting</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
              style={mode === 'login' ? {background: '#2D2B7A'} : {}}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
              style={mode === 'register' ? {background: '#2D2B7A'} : {}}
            >
              Request Access
            </button>
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Work Email</label>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="you@organisation.com"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{'--tw-ring-color': '#2D2B7A'}}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="••••••••"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{background: '#2D2B7A'}}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.full_name}
                    onChange={e => setRegisterForm({...registerForm, full_name: e.target.value})}
                    placeholder="Your full name"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Work Email</label>
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={e => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="you@organisation.com"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                    placeholder="Minimum 8 characters"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Organisation Name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.organisation_name}
                    onChange={e => setRegisterForm({...registerForm, organisation_name: e.target.value})}
                    placeholder="Your company or body name"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">GHAD CR Number</label>
                  <input
                    type="text"
                    value={registerForm.ghad_cr_number}
                    onChange={e => setRegisterForm({...registerForm, ghad_cr_number: e.target.value})}
                    placeholder="e.g. CR-1234567890"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">SFDA Facility Registration Number</label>
                  <input
                    type="text"
                    value={registerForm.sfda_facility_number}
                    onChange={e => setRegisterForm({...registerForm, sfda_facility_number: e.target.value})}
                    placeholder="e.g. SFDA-FAC-2024-00441"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">CR Document (PDF) *</label>
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <input type="file" accept=".pdf" id="cr-doc" className="hidden"
                      onChange={e => setRegisterForm({...registerForm, cr_document: e.target.files[0]})} />
                    <label htmlFor="cr-doc" className="cursor-pointer">
                      {registerForm.cr_document ? (
                        <p className="text-xs text-green-600 font-medium">✓ {registerForm.cr_document.name}</p>
                      ) : (
                        <p className="text-xs text-gray-500">📄 Click to upload CR document</p>
                      )}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">SFDA Facility Certificate (PDF)</label>
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <input type="file" accept=".pdf" id="sfda-cert" className="hidden"
                      onChange={e => setRegisterForm({...registerForm, sfda_certificate: e.target.files[0]})} />
                    <label htmlFor="sfda-cert" className="cursor-pointer">
                      {registerForm.sfda_certificate ? (
                        <p className="text-xs text-green-600 font-medium">✓ {registerForm.sfda_certificate.name}</p>
                      ) : (
                        <p className="text-xs text-gray-500">📄 Click to upload SFDA facility certificate</p>
                      )}
                    </label>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-semibold">📋 Document Verification</p>
                  <p className="text-xs text-blue-600 mt-1">Uploaded documents will be reviewed by the DEMARA team. Your account will be activated after verification — typically within 1 business day.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700 font-semibold">📧 Email Notification Consent</p>
                  <p className="text-xs text-gray-600 mt-1">By registering, you consent to DEMARA receiving a copy of SFDA communications related to your shipments when CC'd to qc@demara.sa. DEMARA uses these emails solely to automate shipment tracking and notifications. SFDA systems are never accessed or modified by DEMARA.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Organisation Type</label>
                  <select
                    value={registerForm.organisation_type}
                    onChange={e => setRegisterForm({...registerForm, organisation_type: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  >
                    {ORG_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Requested Role</label>
                  <select
                    value={registerForm.requested_role}
                    onChange={e => setRegisterForm({...registerForm, requested_role: e.target.value})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  >
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">CR Number (optional)</label>
                  <input
                    type="text"
                    value={registerForm.cr_number}
                    onChange={e => setRegisterForm({...registerForm, cr_number: e.target.value})}
                    placeholder="Commercial registration number"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90"
                  style={{background: '#00B4D8'}}
                >
                  {loading ? 'Submitting...' : 'Request Access'}
                </button>
              </form>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Access is granted by DEMARA after verification · Sessions expire after 1 hour of inactivity
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-xs text-gray-400">🇸🇦 Data hosted in Saudi Arabia · STC Cloud KSA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}