// Notification Centre — full-page list of all notifications (read and unread) for the
// caller's organisation. Opened from the bell's "View all notifications" link in every portal.
//
// Props: { token, onNavigateToShipment(shipmentId)? }
// (API base URL comes from apiFetch, so no apiUrl prop is needed.)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, fmtDateTime, Icon } from './mahShared';
import { ChipRow } from './clearanceShared';
import { dotTone } from './PortalNotificationBell';

const PAGE_SIZE = 20;
const FETCH_STEP = 100; // server default; "Load more" asks for more once these are all shown
const FETCH_MAX = 500;  // server cap

const SFDA_DECISION_STATES = ['SFDA_INFO_REQUESTED', 'SAMPLING', 'SFDA_RELEASED', 'PARTIALLY_RELEASED', 'SFDA_REJECTED'];

// Which filter chip a notification belongs to (besides All / Unread)
export function notificationCategory(n) {
  const type = (n.event_type || '').toUpperCase();
  const toState = (n.data?.to_state || '').toUpperCase();
  if (/^(BROKER_|AGREEMENT_|CLEARANCE_COMPANY)/.test(type)) return 'broker';
  if (SFDA_DECISION_STATES.includes(toState) || /^SFDA_/.test(type)) return 'sfda';
  if (toState === 'DISPOSITION_PENDING' || /DEADLINE|ESCALAT|EXPIR|OVERDUE/.test(type)
      || /deadline|expire|overdue|days left/i.test(n.message || '')) return 'deadlines';
  return 'system';
}

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'unread', label: 'Unread', test: n => !n.is_read },
  { key: 'sfda', label: 'SFDA Decisions', test: n => notificationCategory(n) === 'sfda' },
  { key: 'broker', label: 'Broker Updates', test: n => notificationCategory(n) === 'broker' },
  { key: 'deadlines', label: 'Deadlines', test: n => notificationCategory(n) === 'deadlines' },
  { key: 'system', label: 'System', test: n => notificationCategory(n) === 'system' },
];

export default function NotificationCentre({ token, onNavigateToShipment }) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [fetchLimit, setFetchLimit] = useState(FETCH_STEP);
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (limit) => {
    try {
      const data = await apiFetch(token, `/notifications?include_read=true&limit=${limit}`);
      setNotifications(data.notifications || []);
      setStatus('ok');
    } catch {
      setStatus(s => (s === 'loading' ? 'error' : s));
    }
  }, [token]);

  useEffect(() => { load(fetchLimit); }, [load, fetchLimit]);

  const active = FILTERS.find(f => f.key === filter);
  const rows = useMemo(() => notifications.filter(active.test), [notifications, active]);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  // More may exist on the server when we got back as many as we asked for
  const serverHasMore = notifications.length >= fetchLimit && fetchLimit < FETCH_MAX;

  const changeFilter = (key) => { setFilter(key); setShown(PAGE_SIZE); };

  const loadMore = () => {
    if (shown + PAGE_SIZE > rows.length && serverHasMore) setFetchLimit(l => Math.min(l + FETCH_STEP, FETCH_MAX));
    setShown(s => s + PAGE_SIZE);
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    apiFetch(token, `/notifications/${id}/read`, { method: 'PUT' }).catch(() => { /* local state already updated */ });
  };

  const markAll = async () => {
    setMarking(true);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await apiFetch(token, '/notifications?mark_read=true'); } catch { /* local state already updated */ }
    setMarking(false);
  };

  const viewShipment = (n) => {
    if (!n.is_read) markRead(n.id);
    onNavigateToShipment(n.shipment_id);
  };

  return (
    <div className="mah-page">
      <div className="mah-page-head">
        <div>
          <h1>Notification Centre</h1>
          <p className="mah-muted">
            {status === 'ok' ? `${unreadCount} unread · ${notifications.length} total` : 'All notifications for your organisation'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="mah-btn mah-btn-ghost" onClick={markAll} disabled={marking}>
            {marking ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      <ChipRow label="Filter notifications" value={filter} onChange={changeFilter}
        options={FILTERS.map(f => ({ ...f, count: notifications.filter(f.test).length }))} />

      {status === 'loading' ? (
        <div className="nc-list">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="nc-card"><span className="notification-dot notification-dot-grey" />
              <div className="mah-grow"><span className="mah-skel-bar notification-skel" /></div></div>
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="mah-alert mah-alert-amber">Could not load notifications. Please try again shortly.</div>
      ) : rows.length === 0 ? (
        <div className="nc-empty">
          <div className="notification-empty-icon"><Icon name="bell" size={32} /></div>
          <strong>{notifications.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}</strong>
          <p className="mah-muted mah-small">
            {notifications.length === 0 ? 'Notifications about your shipments will appear here' : 'Try another filter to see more notifications.'}
          </p>
        </div>
      ) : (
        <>
          <div className="nc-list">
            {rows.slice(0, shown).map(n => (
              <article key={n.id} className={`nc-card${n.is_read ? '' : ' is-unread'}`}>
                <span className={`notification-dot notification-dot-${dotTone(n)}`} />
                <div className="nc-body">
                  <div className="nc-message">{n.message || 'Notification'}</div>
                  <div className="nc-meta">
                    <time dateTime={n.created_at}>{fmtDateTime(n.created_at)}</time>
                    {n.shipment_id && onNavigateToShipment && (
                      <button className="nc-link" onClick={() => viewShipment(n)}>View shipment →</button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {(shown < rows.length || serverHasMore) && (
            <div className="nc-more">
              <button className="mah-btn mah-btn-ghost" onClick={loadMore}>Load more</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
