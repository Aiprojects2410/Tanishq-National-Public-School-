import { supabase } from './lib/supabase.js';

(() => {
  const PROFILE_KEY = 'tnps-profile-cache';
  const roleLabel = { developer:'Developer', principal:'Principal', teacher:'Teacher', parent:'Parent' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let connected = false;
  const style = document.createElement('style');
  style.textContent = `body{overflow-x:hidden}.tn-db-status{display:inline-flex;align-items:center;gap:6px;margin-right:8px;color:var(--muted,#7d8799);font-size:10px;font-weight:700;white-space:nowrap}.tn-db-status i{width:7px;height:7px;border-radius:50%;display:block;background:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}.tn-db-status.off i{background:#c74e58;box-shadow:0 0 0 3px rgba(199,78,88,.12)}.tn-profile-avatar{display:grid;place-items:center;overflow:hidden}@media(max-width:680px){.tn-db-status{font-size:9px;margin-right:2px}.tn-db-status i{width:6px;height:6px}}`;
  document.head.appendChild(style);
  const getCached=()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return {}}};
  const currentUser=async()=>{if(!supabase)return null;try{return (await supabase.auth.getUser()).data?.user||null}catch{return null}};
  const renderStatus=()=>{document.querySelectorAll('.db-badge').forEach(n=>n.remove());const actions=document.querySelector('.top-actions');if(!actions)return;let node=actions.querySelector('.tn-db-status');if(!node){node=document.createElement('span');node.className='tn-db-status';actions.prepend(node)}node.classList.toggle('off',!connected);node.innerHTML=`<i></i>${connected?'Connected':'Disconnected'}`};
  const renderProfile=async()=>{const chip=document.querySelector('.profile-chip');if(!chip)return;const user=await currentUser(),cached=getCached(),metadata=user?.user_metadata||{},name=cached.name||metadata.full_name||metadata.display_name||metadata.name||user?.email?.split('@')[0]||roleLabel[localStorage.getItem('tnps-auth-role')]||'User',role=roleLabel[localStorage.getItem('tnps-auth-role')]||'User',photo=cached.photo||metadata.avatar_url||'';const avatar=chip.querySelector('.avatar,.tn-profile-avatar');if(avatar){const replacement=photo?Object.assign(document.createElement('img'),{className:'tn-profile-avatar',src:photo,alt:''}):Object.assign(document.createElement('div'),{className:'tn-profile-avatar',textContent:name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()});avatar.replaceWith(replacement)}const text=chip.querySelector('div:nth-child(2)');if(text)text.innerHTML=`<strong>${esc(name)}</strong><small>${esc(role)}</small>`};
  const cleanupDashboard=()=>document.querySelectorAll('.dashboard-tools').forEach(n=>n.remove());
  const fixSidebar=()=>{const side=document.querySelector('.sidebar');if(!side||innerWidth>680)return;side.style.display='flex';side.style.position='fixed';side.style.left='0';side.style.top='0';side.style.bottom='0';side.style.width='min(86vw,310px)';side.style.height='100dvh';side.style.zIndex='10001';side.style.transform=side.classList.contains('mobile-open')?'translate3d(0,0,0)':'translate3d(-110%,0,0)';const scrim=document.querySelector('.mobile-scrim');if(scrim){scrim.style.zIndex='10000';scrim.style.position='fixed';scrim.style.inset='0'}};
  const apply=async()=>{cleanupDashboard();renderStatus();fixSidebar();await renderProfile()};
  window.addEventListener('tnps-database-ready',e=>{connected=Boolean(e.detail?.connected);apply()});window.addEventListener('tnps-auth-ready',apply);window.addEventListener('resize',fixSidebar);
  const observer=new MutationObserver(()=>{cleanupDashboard();fixSidebar();renderStatus()});observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else setTimeout(apply,50);
})();
