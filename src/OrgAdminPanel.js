import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

export default function OrgAdminPanel({ token }) {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(null);

  const fetchOrgUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/org-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrgData(data);
      else setError(data.message || 'Failed to load');
    } catch (err) {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgUsers(); }, []);

  const handleToggle = async (userId) => {
    setToggling(userId);
    try {
      const res = await fetch(`${API_URL}/admin/org-users/${userId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchOrgUsers();
    } catch (err) {
      console.error('Toggle failed');
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div style={{padding:'48px 24px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,.35)',fontFamily:'Inter,sans-serif'}}>Loading organisation users...</div>;
  if (error) return <div style={{margin:'16px 24px',background:'rgba(255,84,112,.08)',border:'1px solid rgba(255,84,112,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FF5470',fontFamily:'Inter,sans-serif'}}>{error}</div>;
  if (!orgData) return null;

  const th = {padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'1px',borderBottom:'1px solid rgba(0,170,255,.08)',whiteSpace:'nowrap'};
  const td = {padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.04)'};
  const pill = (text, bg, border) => ({display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:text,background:bg,border:`1px solid ${border}`});

  return (
    <div style={{padding:'16px 24px',fontFamily:'Inter,sans-serif',color:'#fff'}}>
      <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(0,170,255,.1)',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(0,170,255,.08)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Organisation Users — {orgData.organisation_name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:2}}>Manage user access for your organisation</div>
          </div>
          <button onClick={fetchOrgUsers} style={{background:'rgba(0,170,255,.1)',border:'1px solid rgba(0,170,255,.25)',color:'#38C6FF',fontSize:11,fontWeight:700,padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'rgba(0,170,255,.04)'}}>
              {['Name', 'Email', 'Role', 'Status', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {orgData.users.map(u => (
              <tr key={u.id}>
                <td style={{...td,fontSize:13,fontWeight:600,color:'#fff'}}>
                  {u.full_name}
                  {u.is_org_admin && <span style={{marginLeft:8,fontSize:11,fontWeight:600,color:'#00C896'}}>✓ Admin</span>}
                </td>
                <td style={{...td,fontSize:12,color:'rgba(255,255,255,.45)'}}>{u.email}</td>
                <td style={td}>
                  <span style={pill('#38C6FF','rgba(0,170,255,.1)','rgba(0,170,255,.3)')}>
                    {u.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td style={td}>
                  <span style={u.is_active ? pill('#00C896','rgba(0,200,150,.1)','rgba(0,200,150,.3)') : pill('#FF5470','rgba(255,84,112,.1)','rgba(255,84,112,.3)')}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={td}>
                  {!u.is_org_admin && (
                    <button onClick={() => handleToggle(u.id)} disabled={toggling === u.id}
                      style={{fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',opacity:toggling === u.id ? .5 : 1,
                        ...(u.is_active
                          ? {background:'rgba(255,84,112,.12)',border:'1px solid rgba(255,84,112,.25)',color:'#FF5470'}
                          : {background:'rgba(0,200,150,.12)',border:'1px solid rgba(0,200,150,.25)',color:'#00C896'})}}>
                      {toggling === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:12,background:'rgba(0,170,255,.05)',border:'1px solid rgba(0,170,255,.15)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'rgba(255,255,255,.55)'}}>
        As organisation admin you can activate or deactivate user accounts. To add new users contact DEMARA admin.
      </div>
    </div>
  );
}