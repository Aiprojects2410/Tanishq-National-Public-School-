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
  var style = document.getElementById('tnps-mobile-ui-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'tnps-mobile-ui-style';
    style.textContent = '@media (max-width:820px){.sidebar{transform:translateX(-105%);transition:transform .2s ease;position:fixed!important;left:0;top:0;bottom:0;z-index:1000;width:min(86vw,300px)}.sidebar.mobile-open{transform:translateX(0)}.main{width:100%;min-width:0}.content{padding:14px!important}.mobile-menu{display:inline-flex!important;min-width:42px;min-height:42px;align-items:center;justify-content:center}.table-wrap{overflow-x:auto}.segmented{overflow-x:auto;flex-wrap:nowrap!important}.segmented button{flex:0 0 auto;min-height:40px}}';
    document.head.appendChild(style);
  }
}
var tnpsMobileObserver = new MutationObserver(refreshTNPSMobileUI);
function startTNPSMobileUI() { refreshTNPSMobileUI(); tnpsMobileObserver.observe(document.body,{childList:true,subtree:true}); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startTNPSMobileUI, {once:true}); else startTNPSMobileUI();
