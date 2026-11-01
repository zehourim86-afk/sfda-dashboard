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
    { value: 'CLEARANCE_COMPANY', label: 'Clearance Company' },
    { value: 'SHIPPING_COMPANY', label: 'Shipping / Logistics Company' },
  ];

  const ORG_TYPES = [
    { value: 'SFDA', label: 'SFDA' },
    { value: 'IMPORTER', label: 'Importing Company' },
    { value: 'LAB', label: 'Testing Laboratory' },
    { value: 'NOTIFIED_BODY', label: 'Notified Body' },
    { value: 'CLEARANCE_COMPANY', label: 'Clearance Company' },
    { value: 'SHIPPING_COMPANY', label: 'Shipping / Logistics Company' },
  ];
  // Not offered on its own; only reached through the GMP Auditor role
  const MANUFACTURER_ORG = { value: 'MANUFACTURER', label: 'Manufacturer' };

  // Each role belongs to exactly one organisation type (the backend enforces the same pairs)
  const ROLE_TO_ORG_TYPE = {
    IMPORTER: 'IMPORTER',
    CLEARANCE_COMPANY: 'CLEARANCE_COMPANY',
    SHIPPING_COMPANY: 'SHIPPING_COMPANY',
    LAB_ANALYST: 'LAB',
    SFDA_REVIEWER: 'SFDA',
    SFDA_INSPECTOR: 'SFDA',
    NOTIFIED_BODY: 'NOTIFIED_BODY',
    GMP_AUDITOR: 'MANUFACTURER',
  };
  const orgTypeOptions = registerForm.organisation_type === MANUFACTURER_ORG.value
    ? [...ORG_TYPES, MANUFACTURER_ORG] : ORG_TYPES;
  const orgTypeAutoMatched = Boolean(ROLE_TO_ORG_TYPE[registerForm.requested_role]);

  const selectRole = (role) => setRegisterForm({
    ...registerForm,
    requested_role: role,
    organisation_type: ROLE_TO_ORG_TYPE[role] || registerForm.organisation_type
  });

  // ── Dark theme styles ──
  const ipt = {width:'100%',marginTop:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:'11px 14px',fontSize:13,color:'#fff',fontFamily:'inherit',outline:'none',colorScheme:'dark',boxSizing:'border-box'};
  const lbl = {display:'block',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.45)',textTransform:'uppercase',letterSpacing:'1.2px'};
  const tabBtn = (on) => ({flex:1,padding:'14px 0',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',border:'none',transition:'all .15s',
    background:on ? 'rgba(56,198,255,.1)' : 'transparent',color:on ? '#38C6FF' : 'rgba(255,255,255,.45)',borderBottom:`2px solid ${on ? '#38C6FF' : 'transparent'}`});
  const primaryBtn = {width:'100%',padding:'13px 0',borderRadius:10,border:'none',fontSize:14,fontWeight:800,fontFamily:'inherit',cursor:'pointer',
    color:'#2D2B7A',background:'linear-gradient(135deg,#38C6FF,#0088DD)',boxShadow:'0 6px 24px rgba(56,198,255,.3)',transition:'opacity .15s'};
  const notice = (rgb, color) => ({background:`rgba(${rgb},.1)`,border:`1px solid rgba(${rgb},.3)`,borderRadius:10,padding:'11px 14px',marginBottom:16,fontSize:13,color});
  const infoBox = {background:'rgba(56,198,255,.05)',border:'1px solid rgba(56,198,255,.15)',borderRadius:10,padding:'11px 14px'};
  const dropZone = {marginTop:6,border:'2px dashed rgba(56,198,255,.25)',borderRadius:10,padding:'12px',textAlign:'center',background:'rgba(56,198,255,.03)'};

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px',boxSizing:'border-box',fontFamily:'Inter,sans-serif',color:'#fff',
      background:'radial-gradient(900px 520px at 50% -8%, rgba(56,198,255,.16), transparent 65%), radial-gradient(700px 400px at 100% 110%, rgba(124,92,252,.10), transparent 60%), #2D2B7A'}}>
      <style>{`
        .login-root input::placeholder{color:rgba(255,255,255,.25)}
        .login-root input:focus,.login-root select:focus{border-color:rgba(56,198,255,.6)!important;box-shadow:0 0 0 3px rgba(56,198,255,.12)}
        .login-root select option{background:#252266;color:#fff}
        .login-tab:hover{color:#fff!important}
      `}</style>
      <div className="login-root" style={{width:'100%',maxWidth:460}}>

        {/* Logo / branding */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <img src="/logo_1.png" alt="DEMARA" style={{height:'72px', width:'auto', display:'block', margin:'0 auto 20px'}} />
          <div style={{display:'inline-block',fontSize:11,fontWeight:800,letterSpacing:'5px',color:'#38C6FF',textTransform:'uppercase',padding:'4px 12px',border:'1px solid rgba(56,198,255,.3)',borderRadius:20,background:'rgba(56,198,255,.08)',marginBottom:12}}>MASAAR</div>
          <h1 style={{margin:0,fontSize:30,fontWeight:900,letterSpacing:'-.6px',color:'#fff'}}>DEMARA Masaar</h1>
          <p style={{margin:'8px 0 0',fontSize:13,color:'rgba(255,255,255,.55)'}}>Drug Import Traceability Platform · Powered by DEMARA</p>
        </div>

        {/* Card */}
        <div style={{background:'#252266',border:'1px solid rgba(56,198,255,.15)',borderRadius:18,boxShadow:'0 30px 80px rgba(0,0,0,.55)',overflow:'hidden'}}>

          {/* Tabs */}
          <div style={{display:'flex',background:'#1E1A5E',borderBottom:'1px solid rgba(56,198,255,0.2)'}}>
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className="login-tab" style={tabBtn(mode === 'login')}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
              className="login-tab" style={tabBtn(mode === 'register')}
            >
              Request Access
            </button>
          </div>

          <div style={{padding:'24px 26px'}}>
            {/* Error */}
            {error && (
              <div style={notice('255,84,112', '#FF5470')}>
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={notice('0,200,150', '#00C896')}>
                {success}
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:16}}>
                <div>
                  <label style={lbl}>Work Email</label>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    placeholder="you@organisation.com"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>Password</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="••••••••"
                    style={ipt}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{...primaryBtn,marginTop:4,opacity: loading ? .5 : 1}}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label style={lbl}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.full_name}
                    onChange={e => setRegisterForm({...registerForm, full_name: e.target.value})}
                    placeholder="Your full name"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>Work Email</label>
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={e => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="you@organisation.com"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>Password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                    placeholder="Minimum 8 characters"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>Organisation Name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.organisation_name}
                    onChange={e => setRegisterForm({...registerForm, organisation_name: e.target.value})}
                    placeholder="Your company or body name"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>GHAD CR Number</label>
                  <input
                    type="text"
                    value={registerForm.ghad_cr_number}
                    onChange={e => setRegisterForm({...registerForm, ghad_cr_number: e.target.value})}
                    placeholder="e.g. CR-1234567890"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>SFDA Facility Registration Number</label>
                  <input
                    type="text"
                    value={registerForm.sfda_facility_number}
                    onChange={e => setRegisterForm({...registerForm, sfda_facility_number: e.target.value})}
                    placeholder="e.g. SFDA-FAC-2024-00441"
                    style={ipt}
                  />
                </div>
                <div>
                  <label style={lbl}>CR Document (PDF) *</label>
                  <div style={dropZone}>
                    <input type="file" accept=".pdf" id="cr-doc" style={{display:'none'}}
                      onChange={e => setRegisterForm({...registerForm, cr_document: e.target.files[0]})} />
                    <label htmlFor="cr-doc" style={{cursor:'pointer',display:'block'}}>
                      {registerForm.cr_document ? (
                        <p style={{margin:0,fontSize:12,color:'#00C896',fontWeight:600}}>✓ {registerForm.cr_document.name}</p>
                      ) : (
                        <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,.5)'}}>📄 Click to upload CR document</p>
                      )}
                    </label>
                  </div>
                </div>
                <div>
                  <label style={lbl}>SFDA Facility Certificate (PDF)</label>
                  <div style={dropZone}>
                    <input type="file" accept=".pdf" id="sfda-cert" style={{display:'none'}}
                      onChange={e => setRegisterForm({...registerForm, sfda_certificate: e.target.files[0]})} />
                    <label htmlFor="sfda-cert" style={{cursor:'pointer',display:'block'}}>
                      {registerForm.sfda_certificate ? (
                        <p style={{margin:0,fontSize:12,color:'#00C896',fontWeight:600}}>✓ {registerForm.sfda_certificate.name}</p>
                      ) : (
                        <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,.5)'}}>📄 Click to upload SFDA facility certificate</p>
                      )}
                    </label>
                  </div>
                </div>
                <div style={infoBox}>
                  <p style={{margin:0,fontSize:12,color:'#38C6FF',fontWeight:700}}>📋 Document Verification</p>
                  <p style={{margin:'4px 0 0',fontSize:12,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>Uploaded documents will be reviewed by the DEMARA team. Your account will be activated after verification — typically within 1 business day.</p>
                </div>
                <div style={{...infoBox,background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,.08)'}}>
                  <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,.85)',fontWeight:700}}>📧 Email Notification Consent</p>
                  <p style={{margin:'4px 0 0',fontSize:12,color:'rgba(255,255,255,.55)',lineHeight:1.5}}>By registering, you consent to DEMARA receiving a copy of SFDA communications related to your shipments when CC'd to qc@demara.sa. DEMARA uses these emails solely to automate shipment tracking and notifications. SFDA systems are never accessed or modified by DEMARA.</p>
                </div>
                <div>
                  <label style={lbl}>Requested Role</label>
                  <select
                    value={registerForm.requested_role}
                    onChange={e => selectRole(e.target.value)}
                    style={{...ipt,cursor:'pointer'}}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Organisation Type</label>
                  <select
                    value={registerForm.organisation_type}
                    onChange={e => setRegisterForm({...registerForm, organisation_type: e.target.value})}
                    disabled={orgTypeAutoMatched}
                    style={{...ipt,cursor:orgTypeAutoMatched ? 'not-allowed' : 'pointer',opacity:orgTypeAutoMatched ? .6 : 1}}
                  >
                    {orgTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {orgTypeAutoMatched && (
                    <p style={{margin:'6px 0 0',fontSize:11,color:'rgba(255,255,255,.4)'}}>Auto-matched to your role</p>
                  )}
                </div>
                <div>
                  <label style={lbl}>CR Number (optional)</label>
                  <input
                    type="text"
                    value={registerForm.cr_number}
                    onChange={e => setRegisterForm({...registerForm, cr_number: e.target.value})}
                    placeholder="Commercial registration number"
                    style={ipt}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{...primaryBtn,marginTop:4,opacity: loading ? .5 : 1}}
                >
                  {loading ? 'Submitting...' : 'Request Access'}
                </button>
              </form>
            )}

            {/* Footer */}
            <p style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,.4)',margin:'20px 0 0',lineHeight:1.5}}>
              Access is granted by DEMARA after verification · Sessions expire after 1 hour of inactivity
            </p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginTop:8}}>
              <span style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>🇸🇦 Data hosted in Saudi Arabia · STC Cloud KSA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}