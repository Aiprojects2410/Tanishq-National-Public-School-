import './tn-brand.css';

// Authentication must initialize before the ERP UI so unauthenticated users
// never see the dashboard underneath the login screen.
import './auth-bootstrap.js';
import './main.jsx';

const load = async (label, loader) => {
  try {
    await loader();
  } catch (error) {
    console.error(`[TNPS] ${label} failed to load`, error);
  }
};

// React owns the application DOM. Optional services are isolated so a failure
// in one enhancement cannot freeze navigation or blank the entire ERP.
void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  await Promise.race([
    initDatabaseBridge(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)),
  ]);
});
void load('forced password change', () => import('./force-password-change.js'));
void load('runtime fixes', () => import('./runtime-fixes.js'));
