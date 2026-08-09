import { supabase } from './lib/supabase.js';

(() => {
  const run = async () => {
    if (!supabase || document.getElementById('tnps-force-password')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('id,role,must_change_password').eq('id', user.id).maybeSingle();
    if (!profile?.must_change_password) return;

    const o = document.createElement('div');
    o.id = 'tnps-force-password';
    o.innerHTML = `<style>#tnps-force-password{position:fixed;inset:0;z-index:25000;background:rgba(245,247,252,.98);display:grid;place-items:center;padding:16px;font-family:DM Sans,system-ui,sans-serif;color:#253047}#tnps-force-password .fp{width:min(430px,100%);background:#fff;border:1px solid #e8eaf0;border-radius:22px;padding:26px;box-shadow:0 25px 80px rgba(30,35,55,.14)}#tnps-force-password h2{margin:0 0 7px}#tnps-force-password p{font-size:12px;color:#7b8495;line-height:1.5}#tnps-force-password label{display:block;font-size:11px;font-weight:800;margin:12px 0 5px}#tnps-force-password input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #dfe3eb;border-radius:10px;font:inherit}#tnps-force-password button{width:100%;border:0;border-radius:11px;padding:12px;background:#6d62e8;color:#fff;font-weight:800;margin-top:15px;cursor:pointer}#tnps-force-password .msg{margin-top:10px;font-size:12px;padding:9px;border-radius:9px}.bad{background:#fff1f1;color:#b33a3a}.good{background:#effaf3;color:#247a45}</style><div class="fp"><h2>Set your new password</h2><p>This temporary password must be replaced before entering the ${profile.role || 'TNPS'} portal.</p><label>New password</label><input id="fp1" type="password" minlength="8" autocomplete="new-password" placeholder="Minimum 8 characters"><label>Confirm new password</label><input id="fp2" type="password" minlength="8" autocomplete="new-password" placeholder="Repeat your new password"><button id="fp-save">Save new password</button><div id="fp-msg"></div></div>`;
    document.body.appendChild(o);
    const msg = o.querySelector('#fp-msg');
    o.querySelector('#fp-save').onclick = async () => {
      const a = o.querySelector('#fp1').value, b = o.querySelector('#fp2').value;
      if (a.length < 8) { msg.className='msg bad'; msg.textContent='Password must be at least 8 characters.'; return; }
      if (a !== b) { msg.className='msg bad'; msg.textContent='Passwords do not match.'; return; }
      const { error } = await supabase.auth.updateUser({ password:a });
      if (error) { msg.className='msg bad'; msg.textContent=error.message; return; }
      const { error: profileError } = await supabase.from('profiles').update({ must_change_password:false, updated_at:new Date().toISOString() }).eq('id', user.id);
      if (profileError) { msg.className='msg bad'; msg.textContent='Password changed, but profile update failed. Contact Developer.'; return; }
      msg.className='msg good'; msg.textContent='Password updated. Opening your portal…';
      setTimeout(() => o.remove(), 700);
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true }); else setTimeout(run, 700);
})();
