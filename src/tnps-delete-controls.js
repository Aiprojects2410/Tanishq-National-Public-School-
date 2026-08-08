import { supabase } from './lib/supabase.js';

(() => {
  const STORAGE='tnps-erp-v2';
  const endpoint=()=>`${import.meta.env?.VITE_SUPABASE_URL || ''}/functions/v1/manage-user`;
  async function deletePerson(type,id,name){
    if(!id)return;
    if(!confirm(`Delete ${name || id}? This permanently removes the ${type} record, QR data, attendance records and linked portal login.`))return;
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){alert('Your session has expired. Sign in again.');return;}
    const base=import.meta.env?.VITE_SUPABASE_URL;
    if(!base){alert('TNPS database configuration is missing.');return;}
    const r=await fetch(`${base}/functions/v1/manage-user`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'delete_person',person_type:type,person_id:id})});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||out.error){alert(out.error||'Delete failed.');return;}
    try{
      const raw=localStorage.getItem(STORAGE);const d=raw?JSON.parse(raw):null;
      if(d){if(type==='student')d.students=(d.students||[]).filter(x=>x.id!==id);else d.teachers=(d.teachers||[]).filter(x=>x.id!==id);d.attendance=(d.attendance||[]).filter(a=>a.id!==id);localStorage.setItem(STORAGE,JSON.stringify(d));}
    }catch{}
    location.reload();
  }
  function scan(){
    const title=(document.querySelector('.topbar h1')?.textContent||'').trim();
    const type=title==='Students'?'student':title==='Teachers & Staff'?'teacher':null;
    if(!type)return;
    document.querySelectorAll('.table-wrap tbody tr').forEach(row=>{
      if(row.dataset.deleteBound)return;
      const code=row.querySelector('code');const open=row.querySelector('.table-action');if(!code||!open)return;
      const id=code.textContent.trim();const name=row.querySelector('.person strong')?.textContent?.trim()||id;
      const b=document.createElement('button');b.type='button';b.className='table-action danger';b.textContent='Delete';b.style.marginLeft='6px';b.onclick=()=>deletePerson(type,id,name);
      open.insertAdjacentElement('afterend',b);row.dataset.deleteBound='1';
    });
  }
  const style=document.createElement('style');style.textContent='.table-action.danger{color:#b42318!important;border-color:#f1c6c2!important}.table-action.danger:hover{background:#fff1f0!important}';document.head.appendChild(style);
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  setInterval(scan,700);scan();
})();
