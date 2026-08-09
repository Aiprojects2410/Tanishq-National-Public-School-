import { supabase, supabaseConfigured, getCurrentProfile } from './lib/supabase.js';

(() => {
  const ID = 'tnps-auth-overlay';
  const css = `
    body.tnps-auth-pending .app-shell{visibility:hidden}
    #${ID}{position:fixed;inset:0;z-index:20000;background:rgba(245,247,252,.98);display:grid;place-items:center;font-family:DM Sans,system-ui,sans-serif;color:#253047;padding:16px;pointer-events:auto;touch-action:auto;-webkit-text-size-adjust:100%}
    #${ID} *{box-sizing:border-box}
    .auth-card{width:min(420px,100%);background:#fff;border:1px solid #e8eaf0;border-radius:24px;padding:30px;box-shadow:0 24px 70px rgba(30,35,55,.14);pointer-events:auto}
    .auth-field{margin:12px 0}.auth-field label{display:block;font-size:12px;font-weight:700;margin-bottom:6px}
    .auth-field input{display:block;width:100%;min-height:46px;padding:12px 13px;border:1px solid #e1e4eb;border-radius:11px;outline:none;font:inherit;background:#fff;color:#253047;pointer-events:auto;touch-action:auto;-webkit-user-select:text;user-select:text}
    .auth-btn,.auth-link{width:100%;min-height:46px;border:0;border-radius:11px;padding:12px;font-weight:800;cursor:pointer;margin-top:8px;pointer-events:auto;touch-action:manipulation}
    .auth-btn{background:#6d62e8;color:#fff}.auth-link{background:transparent;color:#6d62e8}
    .auth-error{background:#fff1f1;color:#b33a3a;border-radius:10px;padding:10px;font-size:12px;margin-top:12px}
    .auth-ok{background:#effaf3;color:#247a45;border-radius:10px;padding:10px;font-size:12px;margin-top:12px}
    .auth-loading{opacity:.7;pointer-events:none}.auth-retry{margin-top:8px}
  `;
  document.body.classList.add('tnps-auth-pending');
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  document.title = 'Tanishq National Public School | TNPS';
  const remove = () => { document.getElementById(ID)?.remove(); document.body.classList.remove('tnps-auth-pending'); };
  const cache = (p,u) => localStorage.setItem('tnps-profile-cache',JSON.stringify({name:p?.display_name||u?.user_metadata?.display_name||u?.email?.split('@')[0]||'',email:u?.email||'',phone:p?.phone||u?.phone||'',photo:u?.user_metadata?.avatar_url||''}));
  const message = (root,text,ok=false) => { const node=root.querySelector('#tnps-auth-msg'); if(node){node.className=ok?'auth-ok':'auth-error';node.textContent=text;} };
  const setBusy = (root,busy) => { root.classList.toggle('auth-loading',busy); root.querySelectorAll('button,input').forEach(node=>{node.disabled=busy;}); };
  const setup = () => {
    if(document.getElementById(ID)) return;
    const root=document.createElement('div'); root.id=ID;
    root.innerHTML=`<div class="auth-card"><h1>Sign in</h1><p>Use your TNPS account. Role and permissions are loaded from the secure profile.</p><form id="tnps-login-form"><div class="auth-field"><label for="tnps-email">Email</label><input id="tnps-email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" required placeholder="you@example.com"></div><div class="auth-field"><label for="tnps-password">Password</label><input id="tnps-password" type="password" enterkeyhint="go" autocomplete="current-password" required placeholder="••••••••"></div><button class="auth-btn" type="submit">Sign in</button><button class="auth-link" id="tnps-forgot" type="button">Forgot password?</button><div id="tnps-auth-msg"></div></form></div>`;
    document.body.appendChild(root);
    const email=root.querySelector('#tnps-email'),password=root.querySelector('#tnps-password');
    root.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!email.value.trim()||!password.value){message(root,'Enter your email and password.');(email.value.trim()?password:email).focus();return;}if(!supabaseConfigured){message(root,'TNPS authentication is not configured.');return;}setBusy(root,true);message(root,'Signing in…',true);const {error}=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error){setBusy(root,false);message(root,error.message);password.focus();return;}await unlock(root);};
    root.querySelector('#tnps-forgot').onclick=()=>showRecovery(root); requestAnimationFrame(()=>email.focus({preventScroll:true}));
  };
  const showRecovery = root => {
    root.querySelector('.auth-card').innerHTML=`<h1>Reset password</h1><p>We’ll send a secure password-reset link to your email. No password is stored here.</p><form id="tnps-reset-form"><div class="auth-field"><label for="tnps-reset-email">Email</label><input id="tnps-reset-email" type="email" autocomplete="email" required placeholder="you@example.com"></div><button class="auth-btn" type="submit">Send reset link</button><button class="auth-link" id="tnps-back-login" type="button">Back to sign in</button><div id="tnps-auth-msg"></div></form>`;
    const email=root.querySelector('#tnps-reset-email');
    root.querySelector('#tnps-reset-form').onsubmit=async event=>{event.preventDefault();if(!supabaseConfigured)return message(root,'TNPS authentication is not configured.');setBusy(root,true);const {error}=await supabase.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:window.location.origin+window.location.pathname});setBusy(root,false);if(error)return message(root,error.message);message(root,'Reset link sent. Check your email.',true);};
    root.querySelector('#tnps-back-login').onclick=()=>{root.remove();setup();}; requestAnimationFrame(()=>email.focus({preventScroll:true}));
  };
  const showNewPassword = () => {
    const root=document.getElementById(ID)||document.createElement('div'); root.id=ID;
    root.innerHTML=`<div class="auth-card"><h1>Create new password</h1><p>Use the secure recovery session to create a new password.</p><form id="tnps-new-password-form"><div class="auth-field"><label for="tnps-np1">New password</label><input id="tnps-np1" type="password" minlength="8" autocomplete="new-password" required></div><div class="auth-field"><label for="tnps-np2">Confirm new password</label><input id="tnps-np2" type="password" minlength="8" autocomplete="new-password" required></div><button class="auth-btn" type="submit">Update password</button><div id="tnps-auth-msg"></div></form></div>`;
    if(!root.parentNode)document.body.appendChild(root);
    root.querySelector('#tnps-new-password-form').onsubmit=async event=>{event.preventDefault();const a=root.querySelector('#tnps-np1').value,b=root.querySelector('#tnps-np2').value;if(a.length<8)return message(root,'Password must be at least 8 characters.');if(a!==b)return message(root,'Passwords do not match.');setBusy(root,true);const {error}=await supabase.auth.updateUser({password:a});if(error){setBusy(root,false);return message(root,error.message);}message(root,'Password updated. Returning to sign in…',true);setTimeout(async()=>{await supabase.auth.signOut();remove();setup();},700);};
    requestAnimationFrame(()=>root.querySelector('#tnps-np1')?.focus({preventScroll:true}));
  };
  const unlock = async root => {
    const result=await getCurrentProfile();
    if(result.error||!result.profile?.active){setBusy(root,false);message(root,result.error?.message||'No active TNPS profile was found.');let retry=root.querySelector('.auth-retry');if(!retry){retry=document.createElement('button');retry.type='button';retry.className='auth-link auth-retry';retry.textContent='Retry profile check';retry.onclick=()=>unlock(root);root.querySelector('.auth-card')?.appendChild(retry);}return;}
    const role=result.profile.role;
    if(!['developer','principal','teacher','parent'].includes(role)){await supabase.auth.signOut();setBusy(root,false);message(root,'Your TNPS role is not valid. Contact the Developer.');return;}
    localStorage.setItem('tnps-auth-role',role);cache(result.profile,result.user);window.dispatchEvent(new CustomEvent('tnps-auth-ready',{detail:{role}}));remove();
  };
  const boot = async () => {
    const recovery=location.hash.includes('type=recovery')||location.search.includes('type=recovery'); if(recovery){showNewPassword();return;}
    if(!supabaseConfigured){setup();return;}
    const {data,error}=await supabase.auth.getUser(); if(error||!data.user){setup();return;}
    const result=await getCurrentProfile();
    if(result.profile?.active&&['developer','principal','teacher','parent'].includes(result.profile.role)){localStorage.setItem('tnps-auth-role',result.profile.role);cache(result.profile,result.user);window.dispatchEvent(new CustomEvent('tnps-auth-ready',{detail:{role:result.profile.role}}));remove();}else setup();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
})();