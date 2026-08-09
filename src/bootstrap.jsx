import './tn-brand.css';

const showFatal = (error) => {
  console.error('[TNPS] Application runtime error', error);
  if (document.getElementById('tnps-runtime-error')) return;
  const root = document.getElementById('root');
  if (!root || root.children.length > 0) return;
  const box = document.createElement('div');
  box.id = 'tnps-runtime-error';
  box.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:24px;background:#f7f8fc;font-family:system-ui,sans-serif;color:#253047;text-align:center';
  box.innerHTML = '<div style="max-width:420px;background:#fff;border:1px solid #e5e7ee;border-radius:18px;padding:28px;box-shadow:0 18px 50px rgba(20,25,40,.10)"><h2 style="margin:0 0 8px">TNPS could not load this page</h2><p style="margin:0 0 18px;color:#667085;font-size:14px">The application hit a runtime error. Your login session and database are not being changed by this error.</p><button id="tnps-runtime-reload" style="border:0;border-radius:10px;padding:11px 18px;background:#6d62e8;color:#fff;font-weight:700;cursor:pointer">Reload TNPS</button></div>';
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
  const db = await load('database bridge', async () => {
    const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
    try {
      const result = await Promise.race([
        initDatabaseBridge(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
      ]);
      window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: Boolean(result?.authenticated), authenticated: Boolean(result?.authenticated) } }));
      return result;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: false, authenticated: false, error: error.message } }));
      return null;
    }
  });
  if (!db?.authenticated) console.warn('[TNPS] Database is unavailable or the current session is not authenticated.');
};

void (async () => {
  const app = await load('application', () => import('./main.jsx'));
  if (!app) showFatal(new Error('Application module failed to load'));
  await load('forced password change', () => import('./force-password-change.js'));
  await load('control center', () => import('./tnps-control-center.js'));
  await load('ui stabilization', () => import('./tnps-ui-stabilizer.js'));
  window.addEventListener('tnps-auth-ready', bootstrapDatabase, { once: true });
})();
