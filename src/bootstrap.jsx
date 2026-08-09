import './tn-brand.css';
import './main.jsx';

const load = async (label, loader) => {
  try {
    await loader();
  } catch (error) {
    console.error(`[TNPS] ${label} failed to load`, error);
  }
};

// React owns the application DOM. Legacy enhancement scripts that directly
// rewrote React-managed nodes were disabled because they could detach event
// handlers and freeze navigation after a re-render.
void load('authentication', () => import('./auth-bootstrap.js'));
void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  await Promise.race([
    initDatabaseBridge(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
  ]);
});
void load('forced password change', () => import('./force-password-change.js'));
void load('runtime fixes', () => import('./runtime-fixes.js'));
