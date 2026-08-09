// TNPS visual status helpers.
// React owns the application DOM. This module only adds CSS and reads the
// persisted runtime database status, so it never inserts/removes React nodes.
(() => {
  const setStatus = (connected) => {
    const value = connected === null ? 'Checking database…' : connected ? 'Connected' : 'Disconnected';
    document.documentElement.style.setProperty('--tnps-db-status', JSON.stringify(value));
    document.documentElement.style.setProperty('--tnps-db-color', connected === null ? '#7d8799' : connected ? '#8b5cf6' : '#c74e58');
  };

  const setGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning 👋';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon 👋';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening 👋';
    else if (hour >= 21 || hour < 5) greeting = 'Good night 👋';
    document.documentElement.style.setProperty('--tnps-dashboard-greeting', JSON.stringify(greeting));
  };

  const style = document.createElement('style');
  style.textContent = `
    .top-actions::before {
      content: '● ' var(--tnps-db-status, 'Checking database…');
      color: var(--tnps-db-color, #7d8799);
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      margin-right: 8px;
    }
    .main:has(.welcome) .topbar h1 { font-size: 0 !important; }
    .main:has(.welcome) .topbar h1::after {
      content: var(--tnps-dashboard-greeting, 'Good morning 👋');
      font-size: clamp(28px, 4vw, 42px);
      line-height: 1.1;
    }
    @media (max-width: 680px) {
      .top-actions::before { font-size: 9px; margin-right: 2px; }
      .main:has(.welcome) .topbar h1::after { font-size: 30px; }
    }
  `;
  document.head.appendChild(style);

  const initialStatus = typeof window.__tnpsDatabaseStatus === 'boolean' ? window.__tnpsDatabaseStatus : null;
  setStatus(initialStatus);
  window.addEventListener('tnps-database-ready', (event) => {
    const connected = event.detail?.connected;
    setStatus(connected === true ? true : connected === false ? false : null);
  });
  setGreeting();
  window.setInterval(setGreeting, 60_000);
})();
