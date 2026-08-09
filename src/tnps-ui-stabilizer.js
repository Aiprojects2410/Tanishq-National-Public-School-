// TNPS visual status helpers.
// React owns the application DOM. This module only adds CSS and listens for real
// database status events, so it never inserts/removes React-managed nodes.
(() => {
  const setStatus = (connected) => {
    document.documentElement.style.setProperty('--tnps-db-status', JSON.stringify(connected === null ? 'Checking database…' : connected ? 'Connected' : 'Disconnected'));
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
    /* The old control-center status was hard-coded to Connected. Hide that node
       completely. The single status shown below comes from the real DB event. */
    .top-actions > .tn-db-status { display:none !important; }

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

  window.addEventListener('tnps-database-ready', (event) => {
    setStatus(event.detail?.connected === true);
  });

  // Never claim a connection before the real runtime check reports one.
  setStatus(null);
  setGreeting();
  window.setInterval(setGreeting, 60_000);
})();
