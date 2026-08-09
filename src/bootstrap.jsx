import './tn-brand.css';
import './auth-bootstrap.js';
import './main.jsx';

const load = async (label, loader) => {
  try { return await loader(); }
  catch (error) { console.error(`[TNPS] ${label} failed to load`, error); return null; }
};

void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  try {
    const result = await Promise.race([
      initDatabaseBridge(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
    ]);
    window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: Boolean(result?.authenticated) } }));
    return result;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: false, error: error.message } }));
    throw error;
  }
});
void load('forced password change', () => import('./force-password-change.js'));
void load('control center', () => import('./tnps-control-center.js'));
void load('ui stabilization', () => import('./tnps-ui-stabilizer.js'));
