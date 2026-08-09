import './tn-brand.css';

const KNOWN_ROLES = new Set(['developer','principal','teacher','parent']);
const savedRole = localStorage.getItem('tnps-auth-role');
if (savedRole && !KNOWN_ROLES.has(savedRole)) localStorage.removeItem('tnps-auth-role');

const showFatal = (error) => {
  console.error('[TNPS] Application runtime error', error);
  const root = document.getElementById('root');
  if (!root || root.children.length > 0 || document.getElementById('tnps-runtime-error')) return;
  const box = document.createElement('div');
  box.id = 'tnps-runtime-error';
  box.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:24px;background:#f7f8fc;font-family:system-ui,sans-serif;color:#253047;text-align:center';
  const detail = error?.message ? String(error.message).replace(/[<>]/g, '') : 'Unexpected application error';
  box.innerHTML = `<div style="max-width:460px;background:#fff;border:1px solid #e5e7ee;border-radius:18px;padding:28px;box-shadow:0 18px 50px rgba(20,25,40,.10)"><h2 style="margin:0 0 8px">TNPS could not load this page</h2><p style="margin:0 0 12px;color:#667085;font-size:14px">The application hit a runtime error. Login and database data have not been changed.</p><p style="margin:0 0 18px;color:#a94738;font-size:12px;word-break:break-word">${detail}</p><button id="tnps-runtime-reload" style="border:0;border-radius:10px;padding:11px 18px;background:#6d62e8;color:#fff;font-weight:700;cursor:pointer">Reload TNPS</button></div>`;
  root.appendChild(box);
  document.getElementById('tnps-runtime-reload').onclick = () => location.reload();
};
window.addEventListener('error', (event) => setTimeout(() => showFatal(event.error || event.message), 0));
window.addEventListener('unhandledrejection', (event) => setTimeout(() => showFatal(event.reason), 0));

const load = async (label, loader) => {
  try { return await loader(); }
  catch (error) { console.error(`[TNPS] ${label} failed to load`, error); return null; }
};

void load('authentication', () => import('./auth-bootstrap.js'));

let databaseBootstrapped = false;
const bootstrapDatabase = async () => {
  if (databaseBootstrapped) return;
  databaseBootstrapped = true;
  await load('database bridge', async () => {
    const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
    try {
      const result = await Promise.race([
        initDatabaseBridge(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
      ]);
      const connected = Boolean(result?.authenticated);
      window.__tnpsDatabaseStatus = connected;
      window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected, authenticated: connected } }));
      return result;
    } catch (error) {
      window.__tnpsDatabaseStatus = false;
      window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: false, authenticated: false, error: error?.message } }));
      return null;
    }
  });
};

void (async () => {
  const app = await load('application', () => import('./main.jsx'));
  if (!app) {
    localStorage.removeItem('tnps-auth-role');
    const retry = await load('application retry', () => import('./main.jsx'));
    if (!retry) showFatal(new Error('Application module failed to load after a clean session retry'));
  }
  await load('forced password change', () => import('./force-password-change.js'));
  // The legacy control-center module directly mutated React-owned DOM nodes and
  // was the source of the recurring removeChild runtime crashes and duplicate
  // database indicators. Its functionality is no longer loaded into the app.
  await load('ui stabilization', () => import('./tnps-ui-stabilizer.js'));
  window.addEventListener('tnps-auth-ready', bootstrapDatabase, { once: true });
})();
