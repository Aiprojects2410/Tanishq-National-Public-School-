import './tn-brand.css';

const load = async (label, loader) => {
  try { return await loader(); }
  catch (error) { console.error(`[TNPS] ${label} failed to load`, error); return null; }
};

const authReady = new Promise(resolve => window.addEventListener('tnps-auth-ready', event => resolve(event.detail || {}), { once:true }));
void load('authentication', () => import('./auth-bootstrap.js'));

void (async () => {
  await authReady;
  const db = await load('database bridge', async () => {
    const { initDatabaseBridge } = await import('./lib/databaseBridge.js');
    try {
      const result = await Promise.race([initDatabaseBridge(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Database bootstrap timeout')),10000))]);
      window.dispatchEvent(new CustomEvent('tnps-database-ready',{detail:{connected:Boolean(result?.authenticated),authenticated:Boolean(result?.authenticated)}}));
      return result;
    } catch(error) {
      window.dispatchEvent(new CustomEvent('tnps-database-ready',{detail:{connected:false,error:error.message}}));
      throw error;
    }
  });
  await load('application',()=>import('./main.jsx'));
  await load('forced password change',()=>import('./force-password-change.js'));
  await load('control center',()=>import('./tnps-control-center.js'));
  await load('ui stabilization',()=>import('./tnps-ui-stabilizer.js'));
  if(!db?.authenticated)console.warn('[TNPS] Database is unavailable.');
})();
