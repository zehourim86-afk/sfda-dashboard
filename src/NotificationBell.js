import { useState, useEffect, useRef } from 'react';
import { API_URL } from './constants';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const STATE_ICONS = {
  SAMPLING_REQUESTED: '📋',
  CONFORMING: '✅',
  NON_CONFORMING: '❌',
  FINAL_CLEARANCE: '✅',
  LAB_RECEIVED: '🔬',
  IN_ANALYSIS: '🔬',
  RESULT_SUBMITTED: '📊',
  RE_EXPORT_INITIATED: '🚢',
  DESTRUCTION_REQUESTED: '🗑️',
  LAB_ACCEPTED: '✓',
  CLEARANCE_ACCEPTED: '✓',
  SAMPLE_COLLECTED: '📦',
  DECISION_PENDING: '⏳',
  DECISION_OVERDUE: '🚨',
  SFDA_ORDERED_DESTRUCTION: '⛔',
};

export default function NotificationBell({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(localStorage.getItem('demara_last_seen') || new Date(0).toISOString());
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/shipments/notifications/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => new Date(n.created_at) > new Date(lastSeen)).length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      const now = new Date().toISOString();
      setLastSeen(now);
      localStorage.setItem('demara_last_seen', now);
    }
  };

  return (
    <div style={{position:'relative',fontFamily:'Inter,sans-serif'}} ref={dropdownRef}>
      {/* Hover states can't be inline styles; scoped to the nb- class names */}
      <style>{`
        .nb-bell:hover{background:rgba(255,255,255,.1)!important}
        .nb-item{transition:background .15s}
        .nb-item:hover{background:rgba(56,198,255,.05)}
        .nb-item.nb-unread{background:rgba(56,198,255,.08)}
        .nb-close:hover{color:#fff!important}
      `}</style>
      <button onClick={handleOpen} className="nb-bell"
        style={{position:'relative',width:38,height:38,borderRadius:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background .15s',padding:0}}>
        <span style={{fontSize:17,lineHeight:1}}>🔔</span>
        {unreadCount > 0 && (
          <span style={{position:'absolute',top:-6,right:-6,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#FF5470',color:'#fff',
            fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #091230'}}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{position:'absolute',right:0,marginTop:8,width:320,background:'#0D1940',border:'1px solid rgba(56,198,255,0.12)',borderRadius:12,
          boxShadow:'0 20px 60px rgba(0,0,0,.6)',zIndex:50,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',background:'#091230',borderBottom:'1px solid rgba(56,198,255,0.12)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>Notifications</div>
            <span style={{fontSize:11,color:'#38C6FF'}}>{notifications.length} recent</span>
          </div>

          {notifications.length === 0 ? (
            <div style={{padding:'32px 0',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.4)'}}>
              No notifications yet
            </div>
          ) : (
            <div style={{maxHeight:320,overflowY:'auto'}}>
              {notifications.map(n => {
                const isUnread = new Date(n.created_at) > new Date(lastSeen);
                return (
                  <div key={n.id} className={`nb-item${isUnread ? ' nb-unread' : ''}`}
                    style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <span style={{fontSize:17,flexShrink:0,lineHeight:1.2}}>
                        {STATE_ICONS[n.notification_type] || '📌'}
                      </span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#fff',fontFamily:'JetBrains Mono,monospace',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {n.faseh_request_number || 'DEMARA Notification'}
                        </div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:2,lineHeight:1.45,
                          display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{n.subject}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4}}>{formatDate(n.created_at)}</div>
                      </div>
                      {isUnread && (
                        <span style={{width:8,height:8,borderRadius:'50%',background:'#38C6FF',flexShrink:0,marginTop:4,boxShadow:'0 0 6px rgba(56,198,255,.6)'}}></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{padding:'8px 16px',borderTop:'1px solid rgba(56,198,255,0.12)',textAlign:'center'}}>
            <button onClick={() => setOpen(false)} className="nb-close"
              style={{background:'none',border:'none',fontSize:12,color:'rgba(255,255,255,0.45)',cursor:'pointer',fontFamily:'inherit',transition:'color .15s'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}