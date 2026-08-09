import { supabase } from './lib/supabase.js';

// TNPS UI stabilizer is intentionally non-destructive. React owns the application
// DOM, so this module must never remove/replace React-managed nodes or install a
// MutationObserver that mutates the tree while React is reconciling it.
(() => {
  const PROFILE_KEY = 'tnps-profile-cache';
  const STORAGE = 'tnps-erp-v2';

  let connected = false;
  try {
    connected = Boolean(JSON.parse(localStorage.getItem(STORAGE) || '{}')._databaseConnected);
  } catch {
    connected = false;
  }

  const renderStatus = () => {
    const actions = document.querySelector('.top-actions');
    if (!actions) return;

    let node = actions.querySelector('.tn-db-status');
    if (!node) {
      node = document.createElement('span');
      node.className = 'tn-db-status';
      node.setAttribute('aria-label', 'Database connection status');
      actions.prepend(node);
    }

    const text = connected ? 'Connected' : 'Disconnected';
    node.className = connected ? 'tn-db-status' : 'tn-db-status off';
    if (node.dataset.status !== text) {
      node.dataset.status = text;
      node.innerHTML = `<i></i>${text}`;
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    .tn-db-status { display:inline-flex; align-items:center; gap:6px; margin-right:8px; color:var(--muted,#7d8799); font-size:10px; font-weight:700; white-space:nowrap; }
    .tn-db-status i { width:7px; height:7px; border-radius:50%; display:block; background:#8b5cf6; }
    .tn-db-status.off i { background:#c74e58; }
    @media (max-width:680px) { .tn-db-status { font-size:9px; margin-right:2px; } .tn-db-status i { width:6px; height:6px; } }
  `;
  document.head.appendChild(style);

  const renderProfile = async () => {
    // Profile data is read-only here. Do not replace React-owned avatar/profile nodes.
    try {
      const user = (await supabase?.auth?.getUser())?.data?.user || null;
      if (user) window.dispatchEvent(new CustomEvent('tnps-profile-loaded', { detail: { email: user.email || '' } }));
    } catch {
      // Profile enrichment is optional and must never affect application rendering.
    }
  };

  window.addEventListener('tnps-database-ready', (event) => {
    connected = Boolean(event.detail?.connected);
    renderStatus();
  });

  window.addEventListener('tnps-auth-ready', () => {
    renderStatus();
    void renderProfile();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStatus, { once: true });
  } else {
    setTimeout(renderStatus, 0);
  }
})();
