import './tn-brand.css';
import './main.jsx';

const load = async (label, loader) => {
  try {
    await loader();
  } catch (error) {
    console.error(`[TNPS] ${label} failed to load`, error);
  }
};

// The core React app is imported by Vite as part of the production bundle.
// Optional integrations are isolated so one broken module cannot blank the ERP.
void load('authentication', () => import('./auth-bootstrap.js'));

void load('database bridge', async () => {
  const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
  await Promise.race([
    initDatabaseBridge(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database bootstrap timeout')), 10000)
    ),
  ]);
});

void load('ERP enhancements', () => import('./tnps-enhancements.js'));
void load('QR printing', () => import('./qr-printing.js'));
void load('feedback widget', () => import('./feedback-widget.js'));
void load('developer controls', () => import('./developer-user-control.js'));
void load('mobile UI', () => import('./tnps-mobile-ui.js'));
void load('login provisioning', () => import('./login-provisioning.js'));
void load('forced password change', () => import('./force-password-change.js'));
