import './tn-brand.css';

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
      window.dispatchEvent(new CustomEvent('tnps-database-ready', {
        detail: { connected: Boolean(result?.authenticated), authenticated: Boolean(result?.authenticated) },
      }));
      return result;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tnps-database-ready', {
        detail: { connected: false, authenticated: false, error: error.message },
      }));
      return null;
    }
  });
  if (!db?.authenticated) console.warn('[TNPS] Database is unavailable or the current session is not authenticated.');
};

void (async () => {
  // Never block application rendering on authentication. The login overlay owns
  // the unauthenticated state, while the application can safely render behind it.
  await load('application', () => import('./main.jsx'));
  await load('forced password change', () => import('./force-password-change.js'));
  await load('control center', () => import('./tnps-control-center.js'));
  await load('ui stabilization', () => import('./tnps-ui-stabilizer.js'));

  // Database bootstrap requires an authenticated session, so start it only after
  // the existing auth system reports a valid TNPS session.
  window.addEventListener('tnps-auth-ready', bootstrapDatabase, { once: true });
})();
