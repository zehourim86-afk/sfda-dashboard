// Faseh RPA sync UI (backend: /api/v1/faseh, routes/fasehConnection.js).
//   useFasehStatus(token)   GET /faseh/status for the caller's organisation (clearance company / DEMARA admin)
//   FasehSyncBar            green "Faseh Auto-Sync Active" bar with a Sync now link
//   FasehConnectionCard     Settings → Connected Accounts: connect / status / sync history / disconnect
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, timeAgo, fmtDateTime, ConfirmDialog } from './mahShared';

export function useFasehStatus(token) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    try {
      setStatus(await apiFetch(token, '/faseh/status'));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);
  useEffect(() => { reload(); }, [reload]);
  return { status, error, reload };
}

// Runs POST /faseh/sync-now; returns [syncing, syncNow, syncError]
function useSyncNow(token, onDone) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const syncNow = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await apiFetch(token, '/faseh/sync-now', { method: 'POST' });
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
      await onDone?.();
    }
  };
  return [syncing, syncNow, syncError];
}

// lastSyncAt / tracked: shown on the bar. onSyncNow: omit to hide the link (MAH side).
export function FasehSyncBar({ lastSyncAt, tracked, onSyncNow, syncing, compact = false }) {
  return (
    <div className={`faseh-live${compact ? ' faseh-live-compact' : ''}`} role="status">
      <span className="faseh-live-dot" aria-hidden="true" />
      <div className="faseh-live-text">
        <strong>{onSyncNow ? 'Faseh Auto-Sync Active' : 'Faseh sync active'}</strong>
        <span>
          {lastSyncAt ? `Last synced: ${timeAgo(lastSyncAt)}` : 'Waiting for the first sync'}
          {tracked != null && ` · ${tracked} declaration${tracked === 1 ? '' : 's'} tracked`}
          {!onSyncNow && ' — SFDA decisions are read from Faseh by your clearance company'}
        </span>
      </div>
      {onSyncNow && (
        <button className="mah-link-btn" onClick={onSyncNow} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
      )}
    </div>
  );
}

// The bar for a clearance user: own status from /faseh/status
export function ClearanceFasehBar({ token, status, reload }) {
  const [syncing, syncNow, syncError] = useSyncNow(token, reload);
  return (
    <>
      <FasehSyncBar lastSyncAt={status.last_sync_at} tracked={status.last_sync_declarations_checked}
        onSyncNow={syncNow} syncing={syncing || status.last_sync_status === 'RUNNING'} />
      {syncError && <div className="mah-alert mah-alert-red">{syncError}</div>}
    </>
  );
}

const BENEFITS = [
  'Automatic SFDA decision updates',
  'Real-time sampling notices',
  'Automatic state transitions',
  'No manual recording needed',
];
const LOG_TONES = { SUCCESS: 'green', PARTIAL: 'amber', FAILED: 'red' };

function SyncResult({ status }) {
  switch (status.last_sync_status) {
    case 'SUCCESS':
      return <span className="mah-text-green">✓ {status.last_sync_declarations_checked} checked, {status.last_sync_updates_made} updated</span>;
    case 'FAILED':
      return <span className="mah-text-red">✗ Sync failed — {status.last_sync_error || 'unknown error'}</span>;
    case 'RUNNING':
      return <span className="mah-text-blue"><span className="mah-spinner" aria-hidden="true" /> Syncing...</span>;
    default:
      return <span className="mah-muted">No sync yet</span>;
  }
}

export function FasehConnectionCard({ token }) {
  const { status, error: loadError, reload } = useFasehStatus(token);
  const [formOpen, setFormOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [syncing, syncNow, syncError] = useSyncNow(token, reload);

  async function connect(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, '/faseh/connect', { method: 'POST', body: { username: username.trim(), password } });
      setPassword('');
      setFormOpen(false);
      await reload();
    } catch (err) {
      setError(err.data?.details ? `${err.message} (${err.data.details})` : err.message);
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(token, '/faseh/disconnect', { method: 'DELETE' });
      setConfirmDisconnect(false);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const head = (badge) => (
    <div className="faseh-card-head">
      <div className="faseh-card-title">
        <span className="faseh-logo" aria-hidden="true">F</span>
        <span>{status?.connected ? 'Faseh' : 'Faseh — Saudi Customs Portal'}</span>
      </div>
      {badge}
    </div>
  );

  if (!status) {
    return (
      <section className="faseh-card">
        {loadError ? <div className="mah-alert mah-alert-red">Could not load the Faseh connection: {loadError}</div>
          : <div className="mah-loading">Loading Faseh connection…</div>}
      </section>
    );
  }

  if (!status.connected) {
    return (
      <section className="faseh-card">
        {head(<span className="mah-badge mah-tone-grey">Not connected</span>)}
        <p className="faseh-desc">
          Connect your Faseh account to enable automatic shipment tracking. MASAAR will check your declarations every
          15 minutes and update shipment statuses automatically.
        </p>
        <ul className="faseh-benefits">{BENEFITS.map(b => <li key={b}>✓ {b}</li>)}</ul>
        <div className="faseh-consent">
          By connecting, you authorize MASAAR to access your Faseh account on your behalf to read declaration statuses
          and file documents. MASAAR will never access other company accounts or modify your Faseh profile settings.
        </div>
        {formOpen ? (
          <form className="faseh-form" onSubmit={connect}>
            <label className="mah-field">
              <span>Faseh username</span>
              <input className="mah-input" value={username} onChange={e => setUsername(e.target.value)} maxLength={255}
                autoComplete="username" required autoFocus />
            </label>
            <label className="mah-field">
              <span>Faseh password</span>
              <div className="faseh-password">
                <input className="mah-input" type={showPassword ? 'text' : 'password'} value={password} maxLength={500}
                  onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="mah-link-btn" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <p className="faseh-security">
              🔒 Your password is encrypted with AES-256 before storage. MASAAR never stores your password in plain text.
            </p>
            {error && <div className="mah-alert mah-alert-red" role="alert">{error}</div>}
            <div className="mah-remove-warning-actions">
              <button type="button" className="mah-btn mah-btn-ghost" onClick={() => setFormOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="mah-btn mah-btn-navy" disabled={busy || !username.trim() || !password}>
                {busy ? 'Testing connection...' : 'Connect Faseh account →'}
              </button>
            </div>
          </form>
        ) : (
          <button className="mah-btn mah-btn-navy mah-self-start" onClick={() => { setError(null); setFormOpen(true); }}>Connect</button>
        )}
      </section>
    );
  }

  const failures = status.consecutive_failures;
  const failureTone = failures === 0 ? 'green' : failures < 3 ? 'amber' : 'red';
  return (
    <section className="faseh-card">
      {head(<span className="mah-badge mah-tone-green">Connected ✓</span>)}
      <div className="faseh-sync-row">
        <div>
          <div className="mah-small">
            Last sync: <strong>{status.last_sync_at ? timeAgo(status.last_sync_at) : '—'}</strong>
            {status.faseh_username && <span className="mah-muted"> · as {status.faseh_username}</span>}
            {status.mode === 'simulation' && <span className="mah-badge mah-tone-purple faseh-mode">Simulation mode</span>}
          </div>
          <div className="mah-small"><SyncResult status={status} /></div>
        </div>
        <button className="mah-btn mah-btn-sm mah-btn-ghost" onClick={syncNow} disabled={syncing || status.last_sync_status === 'RUNNING'}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      {syncError && <div className="mah-alert mah-alert-red">{syncError}</div>}

      <div className="faseh-stats">
        <div><span>Declarations tracked</span><strong>{status.last_sync_declarations_checked}</strong></div>
        <div><span>Last updated</span><strong>{status.last_sync_at ? timeAgo(status.last_sync_at) : '—'}</strong></div>
        <div>
          <span>Consecutive failures</span>
          <strong className={`mah-text-${failureTone}`}>{failures}{failures >= 3 ? ' ⚠' : ''}</strong>
        </div>
      </div>

      <button className="mah-tier-head" onClick={() => setHistoryOpen(o => !o)} aria-expanded={historyOpen}>
        <span>View sync history</span>
        <span className="mah-small mah-muted">{status.sync_log.length} run{status.sync_log.length === 1 ? '' : 's'} {historyOpen ? '▾' : '▸'}</span>
      </button>
      {historyOpen && (
        status.sync_log.length === 0 ? <p className="mah-muted mah-small">No sync runs yet.</p> : (
          <div className="mah-table-wrap">
            <table className="mah-table">
              <thead><tr><th>Time</th><th>Status</th><th>Checked</th><th>Updated</th></tr></thead>
              <tbody>
                {status.sync_log.map(l => (
                  <tr key={l.id} title={l.error_message || ''}>
                    <td>{fmtDateTime(l.sync_started_at)}</td>
                    <td><span className={`mah-badge mah-tone-${LOG_TONES[l.status] || 'grey'}`}>{l.status}</span></td>
                    <td>{l.declarations_checked}</td>
                    <td>{l.updates_made}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {error && <div className="mah-alert mah-alert-red">{error}</div>}
      <button className="mah-btn mah-btn-sm mah-btn-outline-red mah-self-start" onClick={() => { setError(null); setConfirmDisconnect(true); }}>
        Disconnect
      </button>
      {confirmDisconnect && (
        <ConfirmDialog title="Disconnect Faseh account?" confirmLabel="Disconnect" tone="red" busy={busy} error={error}
          message="MASAAR will stop automatic syncing. You can reconnect at any time."
          onConfirm={disconnect} onClose={() => { if (!busy) setConfirmDisconnect(false); }} />
      )}
    </section>
  );
}
