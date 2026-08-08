(() => {
  const STYLE_ID = 'tnps-feedback-style';
  const WIDGET_ID = 'tnps-feedback-widget';
  if (document.getElementById(WIDGET_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${WIDGET_ID}{position:fixed;right:0;top:42%;z-index:9999;font-family:DM Sans,system-ui,sans-serif;user-select:none;touch-action:none}
    #${WIDGET_ID}.dragging{transition:none!important}
    #${WIDGET_ID} .tnps-feedback-tab{height:50px;min-width:50px;padding:0 13px;border:0;border-radius:16px 0 0 16px;background:#6d62e8;color:#fff;box-shadow:0 8px 24px rgba(70,60,160,.24);display:flex;align-items:center;justify-content:center;gap:8px;cursor:grab;font-weight:700;font-size:12px;letter-spacing:.1px;transition:width .25s ease,transform .25s ease}
    #${WIDGET_ID} .tnps-feedback-tab:active{cursor:grabbing}
    #${WIDGET_ID} .tnps-feedback-icon{width:25px;height:25px;border-radius:9px;background:rgba(255,255,255,.18);display:grid;place-items:center;flex:0 0 25px}
    #${WIDGET_ID} .tnps-feedback-label{display:none;white-space:nowrap}
    #${WIDGET_ID}.peek .tnps-feedback-tab{transform:translateX(-6px)}
    #${WIDGET_ID}.open .tnps-feedback-tab{padding:0 15px}
    #${WIDGET_ID}.open .tnps-feedback-label{display:inline}
    #${WIDGET_ID}.panel{position:absolute;right:0;top:58px;width:285px;background:#fff;border:1px solid #e8eaf0;border-radius:16px;padding:16px;box-shadow:0 16px 45px rgba(25,30,50,.18);display:none;color:#253047}
    #${WIDGET_ID}.open .panel{display:block}
    #${WIDGET_ID} .panel h3{margin:0;font-size:15px;font-weight:700}
    #${WIDGET_ID} .panel p{margin:5px 0 13px;color:#7d8799;font-size:11px;line-height:1.5}
    #${WIDGET_ID} .feedback-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #${WIDGET_ID} .feedback-actions button{border:1px solid #e8eaf0;background:#fafaff;color:#5f687b;border-radius:10px;padding:10px 8px;font-size:10px;font-weight:700;cursor:pointer}
    #${WIDGET_ID} .feedback-actions button:hover{border-color:#d7d2ff;color:#6d62e8;background:#f7f5ff}
    #${WIDGET_ID} .feedback-close{position:absolute;right:10px;top:10px;border:0;background:transparent;color:#9aa1b0;cursor:pointer}
    @media(max-width:600px){#${WIDGET_ID} .panel{width:260px}.tnps-feedback-tab{min-width:48px}}
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.innerHTML = `
    <button class="tnps-feedback-tab" aria-label="Feedback and Support" title="Feedback & Support">
      <span class="tnps-feedback-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.7 9.7 0 0 1-4-.9L3 21l1.9-4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></span>
      <span class="tnps-feedback-label">Feedback!</span>
    </button>
    <div class="panel">
      <button class="feedback-close" aria-label="Close">×</button>
      <h3>Feedback & Support</h3>
      <p>Report a problem, request help, or send feedback from anywhere in the ERP.</p>
      <div class="feedback-actions">
        <button data-feedback="bug">🐛 Report Bug</button>
        <button data-feedback="help">❓ Get Help</button>
        <button data-feedback="feature">💡 Feature Request</button>
        <button data-feedback="ticket">🎫 My Tickets</button>
      </div>
    </div>`;
  document.body.appendChild(widget);

  const tab = widget.querySelector('.tnps-feedback-tab');
  const panel = widget.querySelector('.panel');
  let timer = null;
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0, startTop = 0;

  const peek = () => {
    if (dragging || widget.classList.contains('open')) return;
    widget.classList.add('peek');
    clearTimeout(timer);
    timer = setTimeout(() => widget.classList.remove('peek'), 2200);
  };
  setTimeout(peek, 2400);
  setInterval(peek, 12000);

  tab.addEventListener('click', () => {
    if (moved) return;
    widget.classList.toggle('open');
    widget.classList.remove('peek');
  });

  widget.querySelector('.feedback-close').addEventListener('click', () => widget.classList.remove('open'));
  widget.querySelectorAll('[data-feedback]').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.feedback;
    window.dispatchEvent(new CustomEvent('tnps:feedback', {detail:{type}}));
    widget.classList.remove('open');
    const toast = document.createElement('div');
    toast.textContent = type === 'bug' ? 'Bug report started.' : type === 'help' ? 'Help request started.' : type === 'feature' ? 'Feature request started.' : 'Opening your tickets.';
    Object.assign(toast.style,{position:'fixed',right:'20px',bottom:'20px',zIndex:'10000',background:'#253047',color:'#fff',padding:'11px 14px',borderRadius:'11px',font:'11px DM Sans,system-ui,sans-serif',boxShadow:'0 10px 30px rgba(20,25,40,.2)'});
    document.body.appendChild(toast); setTimeout(()=>toast.remove(),1800);
  }));

  tab.addEventListener('pointerdown', e => {
    dragging = true; moved = false; widget.classList.add('dragging');
    startX=e.clientX; startY=e.clientY; startTop=widget.getBoundingClientRect().top;
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener('pointermove', e => {
    if(!dragging) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) moved=true;
    const top=Math.max(12,Math.min(window.innerHeight-62,startTop+dy));
    widget.style.top=`${top}px`;
  });
  tab.addEventListener('pointerup', e => {
    dragging=false; widget.classList.remove('dragging');
    try{tab.releasePointerCapture(e.pointerId)}catch{}
    setTimeout(()=>moved=false,0);
  });
})();
