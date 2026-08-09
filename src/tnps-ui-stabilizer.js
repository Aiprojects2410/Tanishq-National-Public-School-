// TNPS visual status helpers.
// IMPORTANT: this file must never add/remove/replace children inside the React root.
// React owns that DOM tree; external DOM mutation was the source of the removeChild crash.
(() => {
  const setStatus = (connected) => {
    document.documentElement.style.setProperty('--tnps-db-status', JSON.stringify(connected ? 'Connected' : 'Disconnected'));
    document.documentElement.style.setProperty('--tnps-db-color', connected ? '#8b5cf6' : '#c74e58');
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
    /* Database status is a CSS pseudo-element, not a foreign React child. */
    .top-actions::before {
      content: '● ' var(--tnps-db-status, 'Disconnected');
      color: var(--tnps-db-color, #c74e58);
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      margin-right: 8px;
    }

    /* Dashboard greeting follows the user's local clock without changing React DOM. */
    .main:has(.welcome) .topbar h1 {
      font-size: 0 !important;
    }
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
    setStatus(Boolean(event.detail?.connected));
  });

  // Start pessimistically. A later real database-ready event can change it to Connected.
  setStatus(false);
  setGreeting();
  window.setInterval(setGreeting, 60_000);
})();
