// Notification bell for the design-system portals (MAH, Clearance, SFDA, Admin, Lab, Shipping).
// Light theme to match mah-portal.css. (The older dark NotificationBell.js still serves the
// legacy dark portals, so this is a separate component rather than an overwrite.)
//
// Backend note: GET /api/v1/notifications returns only UNREAD rows, scoped to the caller's
// organisation. Roles whose users have no organisation, or orgs that receive no notifications,
// will see an empty bell. Row-click marks read locally only (per spec); "Mark all read" also
// tells the server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, timeAgo, Icon } from './mahShared';

const REFRESH_MS = 60000;

// Dot colour by what the notification is about
function dotTone(n) {
  const key = `${n.event_type || ''} ${n.data?.to_state || ''}`.toUpperCase();
  if (/REJECT|SFDA_RELEASED|PARTIALLY_RELEASED|DESTROYED|REEXPORTED/.test(key)) return 'red';   // SFDA decision
  if (/INFO_REQUEST/.test(key)) return 'amber';                                                   // info request
  if (/^STATE_|STATE_/.test(key)) return 'blue';                                                  // state transition
  return 'grey';
}

export default function PortalNotificationBell({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const localRead = useRef(new Set());             // ids marked read locally this session
  const wrapRef = useRef(null);

  const applyLocalRead = useCallback((rows) =>
    rows.map(n => (localRead.current.has(n.id) ? { ...n, is_read: true } : n)), []);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(token, '/notifications');
      setNotifications(applyLocalRead(data.notifications || []));
      setStatus('ok');
    } catch {
      setStatus(s => (s === 'loading' ? 'error' : s)); // keep showing what we have on a refresh blip
    }
  }, [token, applyLocalRead]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Close on outside click / ESC
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markOne = (id) => {
    localRead.current.add(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const markAll = async () => {
    notifications.forEach(n => localRead.current.add(n.id));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await apiFetch(token, '/notifications?mark_read=true'); } catch { /* local state already updated */ }
  };

  return (
    <div className="notification-bell-wrapper" ref={wrapRef}>
      <button className="notification-bell" onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`} aria-expanded={open}>
        <Icon name="bell" size={19} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && <button className="notification-markall" onClick={markAll}>Mark all read</button>}
          </div>

          {status === 'loading' ? (
            <div className="notification-list">
              {[0, 1, 2].map(i => (
                <div key={i} className="notification-item"><span className="notification-dot notification-dot-grey" />
                  <div className="mah-grow"><span className="mah-skel-bar notification-skel" /></div></div>
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="notification-empty"><p className="mah-muted">Could not load notifications</p></div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon"><Icon name="bell" size={28} /></div>
              <strong>No notifications yet</strong>
              <p className="mah-muted mah-small">New updates on your shipments will appear here.</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(n => (
                <button key={n.id} className={`notification-item${n.is_read ? '' : ' unread'}`} onClick={() => markOne(n.id)}>
                  <span className={`notification-dot notification-dot-${dotTone(n)}`} />
                  <span className="notification-body">
                    <span className="notification-message">{n.message || 'Notification'}</span>
                    <span className="notification-time">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="notification-unread-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
