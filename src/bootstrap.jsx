import './tn-brand.css';
import './auth-bootstrap.js';
import './main.jsx';

const load = async (label, loader) => {
  try { return await loader(); }
  catch (error) { console.error(`[TNPS] ${label} failed to load`, error); return null; }
};

void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  const result = await Promise.race([
    initDatabaseBridge(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
  ]);
  window.dispatchEvent(new CustomEvent('tnps-database-ready', { detail: { connected: Boolean(result?.authenticated) } }));
  return result;
});
void load('forced password change', () => import('./force-password-change.js'));
void import('./tnps-runtime-enhancements.js').catch(error => console.error('[TNPS] runtime enhancements failed', error));
void import('./tnps-control-center.js').catch(error => console.error('[TNPS] control center failed', error));
