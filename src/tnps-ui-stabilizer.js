import { supabase } from './lib/supabase.js';

(() => {
  const PROFILE_KEY = 'tnps-profile-cache';
  const STORAGE = 'tnps-erp-v2';
  const roleLabel = {
    developer: 'Developer',
    principal: 'Principal',
    teacher: 'Teacher',
    parent: 'Parent',
  };
  const classes = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));

  let connected = (() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem(STORAGE) || '{}')._databaseConnected);
    } catch {
      return false;
    }
  })();
  let frame = 0;
  let applying = false;
  let attendanceClass = 'All';

  const style = document.createElement('style');
  style.textContent = `
    body { overflow-x: hidden; }
    .tn-db-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-right: 8px;
      color: var(--muted, #7d8799);
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }
    .tn-db-status i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: block;
      background: #8b5cf6;
    }
    .tn-db-status.off i { background: #c74e58; }
    .tn-profile-avatar {
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .tn-class-filter {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      margin: 0 0 12px;
      padding-bottom: 3px;
    }
    .tn-class-filter button {
      border: 1px solid var(--line, #e8eaf0);
      background: var(--surface, #fff);
      color: var(--muted, #7d8799);
      border-radius: 9px;
      padding: 8px 11px;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 700;
    }
    .tn-class-filter button.active {
      background: #eeecff;
      color: #5f55d7;
      border-color: #d9d4ff;
    }
    .tn-scan-queue {
      margin-top: 12px;
      border-top: 1px solid var(--line, #e8eaf0);
      padding-top: 12px;
    }
    .tn-scan-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 10px;
      margin-top: 6px;
      border-radius: 9px;
      background: var(--surface-2, #f5f6fa);
      font-size: 11px;
    }
    .tn-scan-row small {
      display: block;
      color: var(--muted, #7d8799);
      margin-top: 2px;
    }
    @media (max-width: 680px) {
      .tn-db-status { font-size: 9px; margin-right: 2px; }
      .tn-db-status i { width: 6px; height: 6px; }
    }
  `;
  document.head.appendChild(style);

  const getCached = () => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const getData = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || '{}');
    } catch {
      return {};
    }
  };

  const currentUser = async () => {
    try {
      return (await supabase?.auth?.getUser())?.data?.user || null;
    } catch {
      return null;
    }
  };

  const renderStatus = () => {
    const actions = document.querySelector('.top-actions');
    if (!actions) return;

    let node = actions.querySelector('.tn-db-status');
    if (!node) {
      node = document.createElement('span');
      node.className = 'tn-db-status';
      actions.prepend(node);
    }

    const text = connected ? 'Connected' : 'Disconnected';
    const nextClass = connected ? 'tn-db-status' : 'tn-db-status off';
    if (node.className !== nextClass) node.className = nextClass;
    if (node.dataset.status !== text) {
      node.dataset.status = text;
      node.innerHTML = `<i></i>${text}`;
    }
  };

  const renderProfile = async () => {
    const chip = document.querySelector('.profile-chip');
    if (!chip) return;

    const user = await currentUser();
    const cached = getCached();
    const metadata = user?.user_metadata || {};
    const name = cached.name
      || metadata.full_name
      || metadata.display_name
      || metadata.name
      || user?.email?.split('@')[0]
      || roleLabel[localStorage.getItem('tnps-auth-role')]
      || 'User';
    const role = roleLabel[localStorage.getItem('tnps-auth-role')] || 'User';
    const photo = cached.photo_url || cached.photo || metadata.avatar_url || '';

    const avatar = chip.querySelector('.avatar, .tn-profile-avatar');
    if (avatar) {
      const current = avatar.tagName === 'IMG' ? avatar.getAttribute('src') : '';
      if (photo && current !== photo) {
        const replacement = Object.assign(document.createElement('img'), {
          className: 'tn-profile-avatar',
          src: photo,
          alt: '',
        });
        avatar.replaceWith(replacement);
      } else if (!photo && avatar.tagName !== 'DIV') {
        const replacement = Object.assign(document.createElement('div'), {
          className: 'tn-profile-avatar',
          textContent: name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase(),
        });
        avatar.replaceWith(replacement);
      }
    }

    const text = chip.querySelector('div:nth-child(2)');
    if (text) {
      const html = `<strong>${esc(name)}</strong><small>${esc(role)}</small>`;
      if (text.innerHTML !== html) text.innerHTML = html;
    }
  };

  const cleanupDashboard = () => {
    document.querySelectorAll('.dashboard-tools').forEach((node) => node.remove());
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length) return;
      if (node.textContent?.trim() === 'TNPS Database Connected') node.remove();
    });
  };

  const fixSidebar = () => {
    const side = document.querySelector('.sidebar');
    if (!side || window.innerWidth > 680) return;

    const next = {
      display: 'flex',
      position: 'fixed',
      left: '0',
      top: '0',
      bottom: '0',
      width: 'min(86vw,310px)',
      height: '100dvh',
      zIndex: '10001',
      transform: side.classList.contains('mobile-open')
        ? 'translate3d(0,0,0)'
        : 'translate3d(-110%,0,0)',
    };

    Object.entries(next).forEach(([key, value]) => {
      if (side.style[key] !== value) side.style[key] = value;
    });

    const scrim = document.querySelector('.mobile-scrim');
    if (scrim) {
      scrim.style.zIndex = '10000';
      scrim.style.position = 'fixed';
      scrim.style.inset = '0';
    }
  };

  const fixStudentClassTabs = () => {
    const panel = [...document.querySelectorAll('.panel')]
      .find((node) => node.querySelector('h2')?.textContent?.trim() === 'Students');
    if (!panel) return;

    panel.querySelectorAll('.class-tabs button').forEach((tab) => {
      if (tab.dataset.tnBound) return;
      tab.dataset.tnBound = '1';
      tab.addEventListener('click', () => {
        const wanted = (tab.textContent || '').replace(/\s*\(\d+\)$/, '').trim();
        const target = [...panel.querySelectorAll('.class-filter button')]
          .find((button) => (button.textContent || '').trim().toLowerCase() === wanted.toLowerCase());
        target?.click();
      });
    });
  };

  const fixAttendanceFilter = () => {
    const heading = document.querySelector('.topbar h1');
    if (heading?.textContent?.trim() !== 'Student Attendance') return;

    const panel = [...document.querySelectorAll('.panel')]
      .find((node) => node.querySelector('h2')?.textContent?.trim() === 'Student Attendance');
    if (!panel) return;

    let bar = panel.querySelector('.tn-class-filter');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'tn-class-filter';
      panel.querySelector('.section-head')?.after(bar);
    }

    const desired = ['All', ...classes];
    if (bar.dataset.ready !== '1') {
      bar.innerHTML = '';
      desired.forEach((className) => {
        const button = document.createElement('button');
        button.textContent = className;
        button.className = className === attendanceClass ? 'active' : '';
        button.onclick = () => {
          attendanceClass = className;
          fixAttendanceFilter();
        };
        bar.appendChild(button);
      });
      bar.dataset.ready = '1';
    } else {
      bar.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.textContent === attendanceClass);
      });
    }

    const data = getData();
    const studentClass = new Map((data.students || []).map((student) => [student.id, student.className]));
    panel.querySelectorAll('tbody tr').forEach((row) => {
      const id = row.children[1]?.textContent?.trim();
      const className = studentClass.get(id);
      const display = attendanceClass === 'All' || className === attendanceClass ? '' : 'none';
      if (row.style.display !== display) row.style.display = display;
    });
  };

  const renderScannerQueue = () => {
    const heading = document.querySelector('.topbar h1');
    if (heading?.textContent?.trim() !== 'Scanner') return;

    const note = document.querySelector('.scanner-note');
    if (!note) return;

    let box = note.parentElement?.querySelector('.tn-scan-queue');
    if (!box) {
      box = document.createElement('div');
      box.className = 'tn-scan-queue';
      note.parentElement?.appendChild(box);
    }
    if (!box) return;

    const today = new Date().toISOString().slice(0, 10);
    const rows = (getData().attendance || []).filter((entry) => entry.date === today);
    const html = rows.length
      ? `<strong>Today's Scan Queue</strong>${rows.slice(-12).reverse().map((entry) => `
          <div class="tn-scan-row">
            <div>
              <strong>${esc(entry.name || 'Unknown')}</strong>
              <small>${esc(entry.kind === 'teacher' ? 'Teacher' : entry.className || 'Student')} · ${esc(entry.status || 'present')}</small>
            </div>
            <span>${esc(entry.time || '—')}</span>
          </div>
        `).join('')}`
      : `<strong>Today's Scan Queue</strong><div style="margin-top:7px;color:var(--muted,#7d8799);font-size:11px">No scans yet.</div>`;

    if (box.dataset.content !== html) {
      box.dataset.content = html;
      box.innerHTML = html;
    }
  };

  const apply = () => {
    if (applying) return;
    applying = true;
    try {
      cleanupDashboard();
      renderStatus();
      fixSidebar();
      fixStudentClassTabs();
      fixAttendanceFilter();
      renderScannerQueue();
    } finally {
      applying = false;
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  };

  window.addEventListener('tnps-database-ready', (event) => {
    const next = Boolean(event.detail?.connected);
    if (next !== connected) {
      connected = next;
      schedule();
    }
  });

  window.addEventListener('tnps-auth-ready', () => {
    schedule();
    void renderProfile();
  });

  window.addEventListener('resize', schedule);

  const observer = new MutationObserver(() => {
    if (!applying) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      apply();
      void renderProfile();
    }, { once: true });
  } else {
    setTimeout(() => {
      apply();
      void renderProfile();
    }, 50);
  }
})();
