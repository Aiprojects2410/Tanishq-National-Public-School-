(() => {
  const STYLE_ID = 'tnps-runtime-fixes-style';
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width:820px){
      body{overflow-x:hidden!important}
      .app-shell{min-width:0!important;width:100%!important}
      .sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(84vw,300px)!important;transform:translateX(-110%)!important;transition:transform .2s ease!important;z-index:10000!important;overflow-y:auto!important;box-shadow:18px 0 45px rgba(20,25,40,.14)!important}
      .sidebar.tnps-mobile-open{transform:translateX(0)!important}
      .main{margin-left:0!important;width:100%!important;min-width:0!important}
      .topbar{padding:0 14px!important;height:72px!important}
      .content{padding:16px!important}
      .mobile-menu{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:42px!important;height:42px!important;min-width:42px!important;border-radius:10px!important;background:#fff!important;border:1px solid var(--line,#e8eaf0)!important;margin-right:10px!important;touch-action:manipulation!important;position:relative!important;z-index:20!important}
      .profile-chip{max-width:150px!important}
      .profile-chip small{display:none!important}
      .welcome{height:auto!important;min-height:180px!important;padding:22px!important}
      .welcome-art{display:none!important}
      .stats-grid,.quick-grid,.academics-grid,.form-grid{grid-template-columns:1fr!important}
      .stats-grid.mini{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .quick-grid{gap:10px!important}
      .panel{padding:16px!important;border-radius:16px!important}
      .section-head{align-items:flex-start!important;flex-wrap:wrap!important}
      .search{min-width:0!important;width:100%!important}
      .table-wrap{width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
      .table-wrap table{min-width:620px!important}
      .segmented{max-width:100%!important;overflow-x:auto!important}
      .modal-backdrop{padding:8px!important}
      .scanner-modal{width:100%!important;max-height:calc(100dvh - 16px)!important;overflow:auto!important}
      .reader{min-height:260px!important}
      .db-badge{top:auto!important;bottom:10px!important;right:10px!important;z-index:90!important;font-size:9px!important}
    }
    .tnps-mobile-scrim{display:none}
    @media (max-width:820px){.tnps-mobile-scrim.tnps-visible{display:block;position:fixed;inset:0;background:rgba(20,25,40,.28);z-index:9999}}
  `;
  document.head.appendChild(style);

  const closeMenu = () => {
    document.querySelector('.sidebar')?.classList.remove('tnps-mobile-open');
    document.querySelector('.tnps-mobile-scrim')?.classList.remove('tnps-visible');
  };
  const openMenu = () => {
    document.querySelector('.sidebar')?.classList.add('tnps-mobile-open');
    document.querySelector('.tnps-mobile-scrim')?.classList.add('tnps-visible');
  };

  const install = () => {
    if (!document.body || document.body.dataset.tnpsRuntimeInstalled) return;
    document.body.dataset.tnpsRuntimeInstalled = '1';
    if (!document.querySelector('.tnps-mobile-scrim')) {
      const scrim = document.createElement('div');
      scrim.className = 'tnps-mobile-scrim';
      scrim.addEventListener('click', closeMenu);
      document.body.appendChild(scrim);
    }
    document.addEventListener('click', (event) => {
      const menu = event.target.closest?.('.mobile-menu');
      if (menu) {
        event.preventDefault();
        event.stopPropagation();
        const sidebar = document.querySelector('.sidebar');
        sidebar?.classList.contains('tnps-mobile-open') ? closeMenu() : openMenu();
        return;
      }
      if (window.innerWidth <= 820 && event.target.closest?.('.sidebar .nav-item')) closeMenu();
    }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  };

  const syncRole = () => {
    const role = localStorage.getItem('tnps-auth-role');
    const select = document.querySelector('.role-switcher select');
    if (!role || !select || !['developer','principal','teacher','parent'].includes(role)) return;
    if (select.value !== role) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(select, role);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const placeBrand = () => {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    const strong = brand.querySelector('strong');
    const small = brand.querySelector('small');
    if (strong) strong.textContent = 'Tanishq National';
    if (small) small.textContent = 'Public School';
  };

  const showRuntimeError = (message) => {
    if (document.getElementById('tnps-runtime-error')) return;
    const box = document.createElement('div');
    box.id = 'tnps-runtime-error';
    box.style.cssText = 'position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:20px;background:#f7f8fc;font:14px system-ui;color:#253047';
    box.innerHTML = `<div style="max-width:520px;background:#fff;border:1px solid #e8eaf0;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(20,25,40,.12)"><strong style="font-size:17px">TNPS encountered a page error</strong><p style="color:#7d8799;line-height:1.5">The application stopped rendering this screen. Refreshing will retry safely.</p><button id="tnps-runtime-reload" style="border:0;border-radius:10px;padding:10px 14px;background:#6d62e8;color:#fff;font-weight:700">Refresh page</button><details style="margin-top:12px"><summary>Technical details</summary><pre style="white-space:pre-wrap;font-size:11px;color:#8b4b4b">${String(message).replace(/[<>]/g,'')}</pre></details></div>`;
    document.body.appendChild(box);
    box.querySelector('#tnps-runtime-reload').onclick = () => location.reload();
  };

  const boot = () => {
    install();
    placeBrand();
    syncRole();
    setInterval(() => { syncRole(); placeBrand(); }, 1000);
  };
  window.addEventListener('error', e => showRuntimeError(e.error?.stack || e.message || 'Unknown JavaScript error'));
  window.addEventListener('unhandledrejection', e => showRuntimeError(e.reason?.stack || e.reason || 'Unhandled promise rejection'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
