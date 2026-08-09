import './tn-brand.css';
import './main.jsx';

const load = async (label, loader) => {
  try {
    await loader();
  } catch (error) {
    console.error(`[TNPS] ${label} failed to load`, error);
  }
};

// Keep React in control of its own DOM. Earlier enhancement scripts were
// directly rewriting React-managed tables/panels, which could detach React's
// event handlers and make navigation appear frozen, especially on mobile.
void load('authentication', () => import('./auth-bootstrap.js'));
void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  await Promise.race([
    initDatabaseBridge(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
  ]);
});
void load('runtime fixes', () => import('./runtime-fixes.js'));
