import { supabase } from './lib/supabase.js';

(() => {
  const ID = 'tnps-login-id-only';
  const temp = () => `TNPS@${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const close = () => document.getElementById(ID)?.remove();

  const open = async (person, type, notify) => {
    close();
    const password = temp();
    const role = type === 'teacher' ? 'teacher' : 'parent';
    const label = type === 'teacher' ? 'Teacher ID' : 'Student ID';
    const root = document.createElement('div');
    root.id = ID;
    root.innerHTML = `<style>
      #${ID}{position:fixed;inset:0;z-index:22000;background:rgba(20,24,38,.45);display:grid;place-items:center;padding:16px}
      #${ID} .box{width:min(460px,100%);background:#fff;border-radius:20px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.2);font-family:inherit}
      #${ID} h2{margin:0 0 5px;color:#253047}#${ID} p{color:#7d8799;font-size:13px}
      #${ID} label{display:block;font-size:12px;font-weight:800;margin:12px 0 5px;color:#667085}
      #${ID} input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #e0e4ec;border-radius:10px;font:inherit}
      #${ID} .note{margin-top:12px;padding:11px;border-radius:10px;background:#effaf3;color:#247a45;font-size:12px;line-height:1.5}
      #${ID} .error{margin-top:12px;padding:11px;border-radius:10px;background:#fff1f1;color:#b33a3a;font-size:12px}
      #${ID} .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
      #${ID} button{border:0;border-radius:10px;padding:11px 14px;font-weight:800;cursor:pointer}
      #${ID} .cancel{background:#eef0f5;color:#394258}#${ID} .ok{background:#6d62e8;color:#fff}
    </style><div class="box">
      <h2>Create ${type === 'teacher' ? 'Teacher' : 'Parent'} Login</h2>
      <p>${esc(person.name)} · ${esc(person.id)}</p>
      <label>${label}</label><input value="${esc(person.id)}" readonly>
      <label>Temporary password</label><input value="${esc(password)}" readonly>
      <div class="note">${type === 'teacher' ? 'Teacher login uses Teacher ID only. No email is used for authentication.' : 'Parent login uses Student ID only. No email is required.'} The user must set a new password on first login.</div>
      <div id="${ID}-msg"></div>
      <div class="actions"><button class="cancel" id="${ID}-close">Close</button><button class="ok" id="${ID}-create">Create Login</button></div>
    </div>`;
    document.body.appendChild(root);
    root.querySelector(`#${ID}-close`).onclick = close;
    root.querySelector(`#${ID}-create`).onclick = async () => {
      const button = root.querySelector(`#${ID}-create`);
      const msg = root.querySelector(`#${ID}-msg`);
      button.disabled = true; button.textContent = 'Creating…';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('manage-user', {
          body: { action:'create', role, display_name:person.name, password, ...(type === 'teacher' ? { teacher_code:person.id } : { student_code:person.id }) },
          headers: { Authorization: `Bearer ${session?.access_token || ''}` }
        });
        if (error || data?.error) throw new Error(error?.message || data.error);
        msg.className = 'note';
        msg.textContent = `Login created. ${label}: ${person.id} · Temporary password: ${password}. First login requires a new password.`;
        button.textContent = 'Created';
        if (notify) notify('Login created successfully.');
      } catch (e) {
        msg.className = 'error';
        msg.textContent = e?.message || 'Unable to create login.';
        button.disabled = false; button.textContent = 'Create Login';
      }
    };
  };

  const getPersonFromRow = (button) => {
    const row = button.closest('tr');
    if (!row) return null;
    const cells = [...row.children];
    const id = cells[1]?.innerText.trim();
    const name = cells[0]?.innerText.split('\n')[0]?.trim();
    if (!id || !name) return null;
    return { id, name };
  };

  const install = () => {
    if (window.__tnpsLoginIdOnlyInstalled) return;
    window.__tnpsLoginIdOnlyInstalled = true;
    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('.login-action');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const person = getPersonFromRow(button);
      if (!person) return;
      const row = button.closest('tr');
      const type = (row?.innerText || '').toLowerCase().includes('student') ? 'student' : 'teacher';
      void open(person, type, () => window.dispatchEvent(new CustomEvent('tnps-login-created')));
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
