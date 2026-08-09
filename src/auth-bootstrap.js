import { supabase, supabaseConfigured, getCurrentProfile } from './lib/supabase.js';

(() => {
  const ID = 'tnps-auth-overlay';
  const css = `
    body.tnps-auth-pending .app-shell { display:none !important; }
    #${ID}{position:fixed;inset:0;z-index:20000;background:rgba(245,247,252,.98);display:grid;place-items:center;font-family:DM Sans,system-ui,sans-serif;color:#253047}
    #${ID} *{box-sizing:border-box}
    .auth-card{width:min(420px,calc(100% - 32px));background:#fff;border:1px solid #e8eaf0;border-radius:24px;padding:30px;box-shadow:0 24px 70px rgba(30,35,55,.14)}
    .auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.auth-mark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#6d62e8,#8b82f3);color:#fff;font-weight:800;font-size:18px}
    .auth-card h1{margin:0 0 6px;font-size:25px}.auth-card p{margin:0 0 22px;color:#7b8495;font-size:13px;line-height:1.5}
    .auth-field{margin:12px 0}.auth-field label{display:block;font-size:12px;font-weight:700;margin-bottom:6px}
    .auth-input-wrap{position:relative}.auth-field input{width:100%;padding:12px 46px 12px 13px;border:1px solid #e1e4eb;border-radius:11px;outline:none;font:inherit}
    .auth-field input:focus{border-color:#6d62e8;box-shadow:0 0 0 3px rgba(109,98,233,.10)}
    .password-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#6f7788;padding:7px;cursor:pointer;border-radius:8px}
    .auth-btn{width:100%;border:0;border-radius:11px;padding:12px;background:#6d62e8;color:#fff;font-weight:800;cursor:pointer;margin-top:8px}
    .auth-error{background:#fff1f1;color:#b33a3a;border-radius:10px;padding:10px;font-size:12px;margin-top:12px}.auth-ok{background:#effaf3;color:#247a45;border-radius:10px;padding:10px;font-size:12px;margin-top:12px}
    .db-badge{position:fixed;right:16px;top:16px;padding:7px 10px;border-radius:999px;background:#effaf3;color:#247a45;border:1px solid #d4f0df;font-size:11px;font-weight:800;z-index:20001}
    .db-badge.off{background:#fff1f1;color:#b33a3a;border-color:#f3d3d3}.tnps-footer{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);font:600 10px/1.2 DM Sans,system-ui,sans-serif;color:#9aa2b1;letter-spacing:.02em;z-index:15000;pointer-events:none}
    .role-switcher{display:none!important}
  `;
  document.body.classList.add('tnps-auth-pending');
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  document.title = 'Tanish National Public School | TNPS';

  const badge = document.createElement('div');
  badge.className = 'db-badge';
  badge.textContent = supabaseConfigured ? '● TNPS Database Connected' : '● Database not configured';
  if (!supabaseConfigured) badge.classList.add('off');
  document.body.appendChild(badge);

  const footer = document.createElement('div');
  footer.className = 'tnps-footer'; footer.textContent = 'Created By Ahad Khan'; document.body.appendChild(footer);

  const removeOverlay = () => { document.getElementById(ID)?.remove(); document.body.classList.remove('tnps-auth-pending'); };

  const setRoleInReact = (role) => {
    localStorage.setItem('tnps-auth-role', role);
    window.dispatchEvent(new CustomEvent('tnps-auth-ready', { detail: { role } }));
    const select = document.querySelector('.role-switcher select');
    if (select && select.value !== role) { select.value = role; select.dispatchEvent(new Event('change', { bubbles: true })); }
  };

  const mount = () => {
    if (document.getElementById(ID)) return;
    const o = document.createElement('div'); o.id = ID;
    o.innerHTML = `<div class="auth-card"><div class="auth-brand"><div class="auth-mark">TN</div><div><strong>Tanish National Public School</strong><div style="font-size:11px;color:#8b93a2">Secure school portal</div></div></div><h1>Sign in</h1><p>Use your TNPS account. Your role and permissions come from the secure database profile.</p><form id="tnps-login-form"><div class="auth-field"><label>Email</label><input id="tnps-email" type="email" autocomplete="username" required placeholder="you@example.com"></div><div class="auth-field"><label>Password</label><div class="auth-input-wrap"><input id="tnps-password" type="password" autocomplete="current-password" required placeholder="••••••••"><button class="password-toggle" id="tnps-toggle-password" type="button" aria-label="Show password">◉</button></div></div><button class="auth-btn" id="tnps-login-btn" type="submit">Sign in</button><div id="tnps-auth-msg"></div></form></div>`;
    document.body.appendChild(o);
    const msg = o.querySelector('#tnps-auth-msg');
    const setMsg = (t, ok=false) => { msg.className = ok ? 'auth-ok' : 'auth-error'; msg.textContent = t; };
    const password = o.querySelector('#tnps-password');
    o.querySelector('#tnps-toggle-password').onclick = () => { password.type = password.type === 'text' ? 'password' : 'text'; };
    o.querySelector('#tnps-login-form').onsubmit = async e => {
      e.preventDefault(); setMsg('Signing in…', true);
      if (!supabaseConfigured) { setMsg('TNPS database is not configured.'); return; }
      const { error } = await supabase.auth.signInWithPassword({ email:o.querySelector('#tnps-email').value.trim(), password:password.value });
      if (error) { setMsg(error.message); return; }
      await unlock();
    };
  };

  const showReset = () => {
    document.getElementById(ID)?.remove();
    const o = document.createElement('div'); o.id = ID;
    o.innerHTML = `<div class="auth-card"><div class="auth-brand"><div class="auth-mark">TN</div><div><strong>Tanish National Public School</strong><div style="font-size:11px;color:#8b93a2">Secure school portal</div></div></div><h1>Set new password</h1><p>Choose a new password for your TNPS account.</p><form id="tnps-reset-form"><div class="auth-field"><label>New password</label><div class="auth-input-wrap"><input id="tnps-new-password" type="password" minlength="8" required placeholder="Minimum 8 characters"><button class="password-toggle" id="tnps-toggle-new" type="button">◉</button></div></div><div class="auth-field"><label>Confirm new password</label><input id="tnps-confirm-password" type="password" minlength="8" required placeholder="Repeat new password"></div><button class="auth-btn" type="submit">Update password</button><div id="tnps-reset-msg"></div></form></div>`;
    document.body.appendChild(o);
    const p=o.querySelector('#tnps-new-password'), cp=o.querySelector('#tnps-confirm-password');
    o.querySelector('#tnps-toggle-new').onclick=()=>{p.type=p.type==='password'?'text':'password'};
    o.querySelector('#tnps-reset-form').onsubmit=async e=>{e.preventDefault();const m=o.querySelector('#tnps-reset-msg');if(p.value!==cp.value){m.className='auth-error';m.textContent='Passwords do not match.';return}m.className='auth-ok';m.textContent='Updating password…';const {error}=await supabase.auth.updateUser({password:p.value});if(error){m.className='auth-error';m.textContent=error.message;return}m.textContent='Password updated. You can now sign in.';setTimeout(async()=>{await supabase.auth.signOut();removeOverlay();mount()},1200)};
  };

  const unlock = async () => {
    const { profile, error } = await getCurrentProfile();
    if (error || !profile?.active) { await supabase.auth.signOut(); mount(); const m=document.querySelector('#tnps-auth-msg'); if(m){m.className='auth-error';m.textContent='No active TNPS profile was found for this account.'} return; }
    localStorage.setItem('tnps-auth-name', profile.display_name || '');
    setRoleInReact(profile.role);
    removeOverlay();
  };

  const boot = async () => {
    if (window.location.hash.includes('type=recovery')) { showReset(); return; }
    if (!supabaseConfigured) { mount(); return; }
    const { data:{ user } } = await supabase.auth.getUser();
    if (user) { await unlock(); return; }
    mount();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else void boot();
})();
