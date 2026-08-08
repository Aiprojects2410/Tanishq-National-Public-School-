const PRINTED_KEY = 'tnps-printed-qr-cards';
const getPrinted = () => new Set(JSON.parse(localStorage.getItem(PRINTED_KEY) || '[]'));
const savePrinted = set => localStorage.setItem(PRINTED_KEY, JSON.stringify([...set]));

function cardId(card) {
  return card.querySelector('.qr-person small')?.textContent?.trim() || '';
}

function personName(card) {
  return card.querySelector('.qr-person strong')?.textContent?.trim() || 'TNPS Card';
}

function openPrint(card, savePdf = false) {
  const id = cardId(card);
  const name = personName(card);
  const qr = card.querySelector('img')?.src || '';
  const role = card.closest('.qr-grid')?.dataset.kind === 'teacher' ? 'Teacher' : 'Student';
  const detail = card.querySelector('.qr-footer span')?.textContent?.trim() || role;
  if (!id || !qr) return;

  const printed = getPrinted();
  printed.add(id);
  savePrinted(printed);
  card.dataset.printed = 'true';
  addPrintedBadge(card);
  applyFilter();

  const popup = window.open('', '_blank', 'width=760,height=900');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${savePdf ? 'Save PDF - ' : 'Print - '}${name}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#20263a}.card{width:340px;margin:30px auto;border:1px solid #ddd;border-radius:18px;padding:24px;text-align:center}.school{font-size:13px;font-weight:700;margin-bottom:18px}.role{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:1px}.photo{width:64px;height:64px;border-radius:50%;margin:12px auto;background:#eeecff;color:#6d62e8;display:grid;place-items:center;font-size:24px;font-weight:700}.name{font-size:20px;font-weight:700;margin:8px 0}.id{font-size:11px;color:#667085}.detail{font-size:11px;color:#667085;margin-top:4px}.qr{width:220px;height:220px;margin:18px auto}.hint{font-size:9px;color:#888;margin-top:10px}@media print{body{margin:0}.card{margin:0 auto;box-shadow:none}}</style></head><body><div class="card"><div class="school">Tanishq National Public School</div><div class="role">${role}</div><div class="photo">${name.charAt(0)}</div><div class="name">${name}</div><div class="id">${id}</div><div class="detail">${detail}</div><img class="qr" src="${qr}" alt="QR Code"/><div class="hint">Use this QR for attendance scanning.</div></div><script>window.onload=()=>setTimeout(()=>window.print(),250);</script></body></html>`);
  popup.document.close();
}

function addPrintedBadge(card) {
  if (card.querySelector('.qr-printed-badge')) return;
  const badge = document.createElement('span');
  badge.className = 'qr-printed-badge';
  badge.textContent = '✓ Printed';
  const person = card.querySelector('.qr-person');
  if (person) person.appendChild(badge);
}

function decorateCards() {
  const printed = getPrinted();
  document.querySelectorAll('.qr-card').forEach(card => {
    const id = cardId(card);
    if (!id || card.querySelector('.qr-card-actions')) return;
    if (printed.has(id)) { card.dataset.printed = 'true'; addPrintedBadge(card); }
    const actions = document.createElement('div');
    actions.className = 'qr-card-actions';
    const print = document.createElement('button');
    print.className = 'qr-action';
    print.textContent = '🖨 Print';
    print.onclick = () => openPrint(card, false);
    const pdf = document.createElement('button');
    pdf.className = 'qr-action primary-lite';
    pdf.textContent = '↓ Save PDF';
    pdf.onclick = () => openPrint(card, true);
    actions.append(print, pdf);
    card.appendChild(actions);
  });
}

function buildControls() {
  const panel = [...document.querySelectorAll('.panel')].find(p => p.querySelector('h2')?.textContent?.trim() === 'QR attendance');
  if (!panel) return;
  let controls = panel.querySelector('.qr-print-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'qr-print-controls';
    controls.innerHTML = '<div class="qr-status-tabs"><button data-filter="all" class="active">All Cards</button><button data-filter="remaining">Remaining Cards</button></div><span class="qr-print-help">Print or save a card as PDF. Printed cards are tracked on this device.</span>';
    const segmented = panel.querySelector('.segmented');
    segmented?.after(controls);
    controls.querySelectorAll('button').forEach(btn => btn.onclick = () => {
      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  }
}

function applyFilter(filter) {
  const active = filter || document.querySelector('.qr-status-tabs button.active')?.dataset.filter || 'all';
  document.querySelectorAll('.qr-card').forEach(card => {
    card.style.display = active === 'remaining' && card.dataset.printed === 'true' ? 'none' : '';
  });
}

function markGridKind() {
  const panel = [...document.querySelectorAll('.panel')].find(p => p.querySelector('h2')?.textContent?.trim() === 'QR attendance');
  const segmented = panel?.querySelector('.segmented');
  const selected = segmented?.querySelector('.selected')?.textContent?.trim().toLowerCase();
  const grid = panel?.querySelector('.qr-grid');
  if (grid) grid.dataset.kind = selected?.startsWith('teacher') ? 'teacher' : 'student';
}

function enhanceQrPage() {
  buildControls();
  markGridKind();
  decorateCards();
  applyFilter();
}

const observer = new MutationObserver(() => enhanceQrPage());
observer.observe(document.body, { childList: true, subtree: true });
window.setTimeout(enhanceQrPage, 300);
