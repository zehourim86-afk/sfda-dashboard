import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

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
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleOpen}
        className="relative p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors">
        <span className="text-white text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
            style={{background: 'linear-gradient(135deg, #2D2B7A, #1a1854)'}}>
            <p className="text-white text-sm font-semibold">Notifications</p>
            <span className="text-xs text-blue-300">{notifications.length} recent</span>
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.map(n => {
                const isUnread = new Date(n.created_at) > new Date(lastSeen);
                return (
                  <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">
                        {STATE_ICONS[n.notification_type] || '📌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {n.faseh_request_number || 'DEMARA Notification'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.subject}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                      </div>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <button onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}