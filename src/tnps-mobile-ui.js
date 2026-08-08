function refreshTNPSMobileUI() {
  document.querySelectorAll('.brand').forEach(function (brand) {
    var mark = brand.querySelector('.brand-mark');
    var strong = brand.querySelector('strong');
    var small = brand.querySelector('small');
    if (mark) mark.textContent = 'TN';
    if (strong) strong.textContent = 'Tanishq National';
    if (small) small.textContent = 'Public School';
  });
  document.querySelectorAll('.mobile-menu').forEach(function (button) {
    if (button.dataset.tnpsReady) return;
    button.dataset.tnpsReady = '1';
    button.addEventListener('click', function () {
      var sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('mobile-open');
    });
  });
  document.querySelectorAll('.sidebar .nav-item').forEach(function (button) {
    if (button.dataset.tnpsCloseReady) return;
    button.dataset.tnpsCloseReady = '1';
    button.addEventListener('click', function () {
      if (window.innerWidth <= 820) {
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
      }
    });
  });
  document.querySelectorAll('[data-tnps-class-tabs]').forEach(function (wrap) {
    ['5th','6th','7th','8th'].forEach(function (cls) {
      if (wrap.querySelector('[data-tnps-extra-class="' + cls + '"]')) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.tnpsExtraClass = cls;
      button.textContent = cls;
      button.addEventListener('click', function () {
        wrap.querySelectorAll('button').forEach(function (b) { b.classList.remove('selected'); });
        button.classList.add('selected');
        var panel = wrap.closest('.panel');
        if (!panel) return;
        panel.querySelectorAll('tbody tr').forEach(function (row) {
          row.style.display = row.textContent.toLowerCase().indexOf(cls.toLowerCase()) >= 0 ? '' : 'none';
        });
      });
      wrap.appendChild(button);
    });
  });
  document.querySelectorAll('.modal, [role="dialog"], .scanner-modal').forEach(function (modal) {
    if (!/scanner/i.test(modal.textContent || '') || modal.querySelector('[data-tnps-back]')) return;
    var close = modal.querySelector('button[aria-label*="lose"], button[title*="lose"]');
    if (!close) {
      var buttons = modal.querySelectorAll('button');
      close = buttons.length ? buttons[buttons.length - 1] : null;
    }
    var back = document.createElement('button');
    back.type = 'button';
    back.dataset.tnpsBack = '1';
    back.textContent = '← Back';
    back.style.cssText = 'min-height:40px;padding:8px 14px;margin:0 0 10px 0;border:1px solid var(--border,#ddd);border-radius:10px;background:var(--surface,#fff);cursor:pointer;touch-action:manipulation;';
    back.addEventListener('click', function () { if (close) close.click(); });
    modal.insertBefore(back, modal.firstChild);
  });
  var style = document.getElementById('tnps-mobile-ui-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'tnps-mobile-ui-style';
    style.textContent = '@media (max-width:820px){.sidebar{transform:translateX(-105%);transition:transform .2s ease;position:fixed!important;left:0;top:0;bottom:0;z-index:1000;width:min(86vw,300px)}.sidebar.mobile-open{transform:translateX(0)}.main{width:100%;min-width:0}.content{padding:14px!important}.mobile-menu{display:inline-flex!important;min-width:42px;min-height:42px;align-items:center;justify-content:center}.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.segmented{overflow-x:auto;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch}.segmented button{flex:0 0 auto;min-height:40px}.modal,[role="dialog"],.scanner-modal{max-height:92vh;overflow:auto;-webkit-overflow-scrolling:touch}.brand strong{font-size:1.02rem}.brand small{font-size:.7rem!important}}';
    document.head.appendChild(style);
  }
}
var tnpsMobileObserver = new MutationObserver(refreshTNPSMobileUI);
function startTNPSMobileUI() { refreshTNPSMobileUI(); tnpsMobileObserver.observe(document.body,{childList:true,subtree:true}); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startTNPSMobileUI, {once:true}); else startTNPSMobileUI();
