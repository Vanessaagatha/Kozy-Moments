/* ─── KoMo ACCOUNTS ──────────────────────────────────────────
   A cozy, fully client-side account system. Everything is saved
   safely in the browser's localStorage so journal memories come
   back whenever you log in on this device. 💜
   (Note: this is a front-end demo — for real users you'd connect
   a server. Passwords are lightly obscured, not truly encrypted.)
──────────────────────────────────────────────────────────────── */

(function () {
  const USERS_KEY   = 'komo_users';
  const SESSION_KEY = 'komo_session';

  /* ─── tiny storage helpers ─────────────────────────────── */
  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const writeJSON = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  // not real security — just so passwords aren't sitting in plain sight
  const obscure = (str) => btoa(unescape(encodeURIComponent('komo🌸' + str)));

  /* ─── the KomoAuth API ─────────────────────────────────── */
  const KomoAuth = {
    getUsers()   { return readJSON(USERS_KEY, {}); },
    currentKey() { return localStorage.getItem(SESSION_KEY); },

    currentUser() {
      const key = this.currentKey();
      if (!key) return null;
      const u = this.getUsers()[key];
      return u || null;
    },

    isLoggedIn() { return !!this.currentUser(); },

    signup(name, email, password) {
      name  = (name || '').trim();
      email = (email || '').trim().toLowerCase();
      if (!name)  return { ok: false, msg: 'Please tell us your name 🌸' };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return { ok: false, msg: 'That email looks a little off 💭' };
      if ((password || '').length < 4)
        return { ok: false, msg: 'Password needs at least 4 characters 🔑' };

      const users = this.getUsers();
      if (users[email]) return { ok: false, msg: 'That email already has an account 💜 Try logging in!' };

      users[email] = {
        name, email,
        pass: obscure(password),
        plan: 'free',
        joined: new Date().toISOString()
      };
      writeJSON(USERS_KEY, users);

      // bring any guest memories + custom moods into the new account
      KomoStore.migrateGuestInto(email);

      localStorage.setItem(SESSION_KEY, email);
      this._broadcast();
      return { ok: true, user: users[email] };
    },

    login(email, password) {
      email = (email || '').trim().toLowerCase();
      const users = this.getUsers();
      const u = users[email];
      if (!u) return { ok: false, msg: "We couldn't find that account 💭" };
      if (u.pass !== obscure(password))
        return { ok: false, msg: 'Wrong password — try again 🌷' };
      localStorage.setItem(SESSION_KEY, email);
      this._broadcast();
      return { ok: true, user: u };
    },

    logout() {
      localStorage.removeItem(SESSION_KEY);
      this._broadcast();
    },

    getPlan() {
      const u = this.currentUser();
      return u ? (u.plan || 'free') : 'free';
    },

    setPlan(plan) {
      const key = this.currentKey();
      if (!key) return false;
      const users = this.getUsers();
      if (!users[key]) return false;
      users[key].plan = plan;
      writeJSON(USERS_KEY, users);
      this._broadcast();
      return true;
    },

    _broadcast() {
      document.dispatchEvent(new CustomEvent('komo:authchange', {
        detail: { user: this.currentUser() }
      }));
    }
  };

  /* ─── per-user storage (journal + custom moods) ────────── */
  const KomoStore = {
    _suffix() {
      const key = KomoAuth.currentKey();
      return key ? 'u_' + key : 'guest';
    },
    journalKey() { return 'komo_journal_' + this._suffix(); },
    moodsKey()   { return 'komo_moods_'   + this._suffix(); },

    getEntries()      { return readJSON(this.journalKey(), []); },
    saveEntries(arr)  { writeJSON(this.journalKey(), arr); },

    getCustomMoods()      { return readJSON(this.moodsKey(), []); },
    saveCustomMoods(arr)  { writeJSON(this.moodsKey(), arr); },

    // when a guest signs up, fold their guest data into the account
    migrateGuestInto(email) {
      const guestJournal = readJSON('komo_journal_guest', []);
      const guestMoods   = readJSON('komo_moods_guest', []);
      if (guestJournal.length) {
        const dest = readJSON('komo_journal_u_' + email, []);
        writeJSON('komo_journal_u_' + email, guestJournal.concat(dest));
        localStorage.removeItem('komo_journal_guest');
      }
      if (guestMoods.length) {
        const dest = readJSON('komo_moods_u_' + email, []);
        const merged = dest.concat(guestMoods.filter(g => !dest.some(d => d.emoji === g.emoji)));
        writeJSON('komo_moods_u_' + email, merged);
        localStorage.removeItem('komo_moods_guest');
      }
    }
  };

  window.KomoAuth  = KomoAuth;
  window.KomoStore = KomoStore;

  /* ─── plan → pretty label ──────────────────────────────── */
  const PLAN_LABEL = { free: '🌿 Free', plus: '🌸 Plus', pro: '💎 Pro' };

  /* ─── inject account control into the nav ──────────────── */
  function renderNav() {
    const nav = document.querySelector('header nav');
    if (!nav) return;

    let mount = nav.querySelector('.komo-account');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'komo-account';
      nav.appendChild(mount);
    }

    const user = KomoAuth.currentUser();

    if (!user) {
      mount.innerHTML = `
        <button class="komo-login-btn" type="button">🔑 Log In</button>
      `;
      mount.querySelector('.komo-login-btn').onclick = () => openAuthModal('login');
      return;
    }

    const initial = (user.name || '?').trim().charAt(0).toUpperCase();
    const plan = user.plan || 'free';
    mount.innerHTML = `
      <button class="komo-avatar-btn" type="button" aria-label="Account menu">
        <span class="komo-avatar">${initial}</span>
        <span class="komo-avatar-name">${escapeAttr(user.name.split(' ')[0])}</span>
        <span class="komo-avatar-caret">▾</span>
      </button>
      <div class="komo-account-menu">
        <div class="komo-account-head">
          <span class="komo-avatar lg">${initial}</span>
          <div>
            <strong>${escapeAttr(user.name)}</strong>
            <span class="komo-account-email">${escapeAttr(user.email)}</span>
          </div>
        </div>
        <div class="komo-account-plan">Your plan <span class="komo-plan-pill plan-${plan}">${PLAN_LABEL[plan] || plan}</span></div>
        <a class="komo-account-link" href="journal.html">📔 My Journal</a>
        <a class="komo-account-link" href="pricing.html">💎 Upgrade Plan</a>
        <button class="komo-account-link komo-logout" type="button">👋 Log Out</button>
      </div>
    `;

    const btn  = mount.querySelector('.komo-avatar-btn');
    btn.onclick = (e) => { e.stopPropagation(); mount.classList.toggle('open'); };
    mount.querySelector('.komo-logout').onclick = () => {
      KomoAuth.logout();
      toast('Logged out — see you soon 🌸');
    };
    document.addEventListener('click', () => mount.classList.remove('open'));
  }

  /* ─── the auth modal ───────────────────────────────────── */
  function buildModal() {
    if (document.getElementById('komoAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'komoAuthModal';
    wrap.className = 'komo-auth-overlay';
    wrap.innerHTML = `
      <div class="komo-auth-box" role="dialog" aria-modal="true">
        <button class="komo-auth-close" type="button" aria-label="Close">✕</button>
        <div class="komo-auth-logo">🌸</div>
        <h3 class="komo-auth-title">Welcome to KoMo</h3>
        <p class="komo-auth-sub">Make an account so your memories are saved forever 💜</p>

        <div class="komo-auth-tabs">
          <button class="komo-tab active" data-tab="login" type="button">Log In</button>
          <button class="komo-tab" data-tab="signup" type="button">Sign Up</button>
        </div>

        <form class="komo-auth-form" data-form="login" novalidate>
          <label>Email
            <input type="email" name="email" placeholder="you@email.com" autocomplete="email">
          </label>
          <label>Password
            <input type="password" name="password" placeholder="your secret word 🔑" autocomplete="current-password">
          </label>
          <p class="komo-auth-error"></p>
          <button class="komo-auth-submit" type="submit">Log In 💜</button>
        </form>

        <form class="komo-auth-form" data-form="signup" style="display:none;" novalidate>
          <label>Your Name
            <input type="text" name="name" placeholder="what should we call you? 🌷" autocomplete="name">
          </label>
          <label>Email
            <input type="email" name="email" placeholder="you@email.com" autocomplete="email">
          </label>
          <label>Password
            <input type="password" name="password" placeholder="at least 4 characters 🔑" autocomplete="new-password">
          </label>
          <p class="komo-auth-error"></p>
          <button class="komo-auth-submit" type="submit">Create My Space 🌸</button>
        </form>

        <p class="komo-auth-foot">🔒 Saved privately in your browser, just for you</p>
      </div>
    `;
    document.body.appendChild(wrap);

    const close = () => closeAuthModal();
    wrap.querySelector('.komo-auth-close').onclick = close;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });

    // tab switching
    wrap.querySelectorAll('.komo-tab').forEach(tab => {
      tab.onclick = () => switchTab(tab.dataset.tab);
    });

    // form submits
    wrap.querySelector('[data-form="login"]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const res = KomoAuth.login(f.email.value, f.password.value);
      handleResult(res, f, `Welcome back, ${res.ok ? res.user.name.split(' ')[0] : ''}! 🌸`);
    });
    wrap.querySelector('[data-form="signup"]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const res = KomoAuth.signup(f.name.value, f.email.value, f.password.value);
      handleResult(res, f, 'Your KoMo space is ready 💜✨');
    });
  }

  function handleResult(res, form, successMsg) {
    const errEl = form.querySelector('.komo-auth-error');
    if (!res.ok) { errEl.textContent = res.msg; return; }
    errEl.textContent = '';
    form.reset();
    closeAuthModal();
    toast(successMsg);
  }

  function switchTab(name) {
    const wrap = document.getElementById('komoAuthModal');
    wrap.querySelectorAll('.komo-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === name));
    wrap.querySelectorAll('.komo-auth-form').forEach(f =>
      f.style.display = (f.dataset.form === name) ? '' : 'none');
    wrap.querySelectorAll('.komo-auth-error').forEach(e => e.textContent = '');
  }

  function openAuthModal(tab) {
    buildModal();
    switchTab(tab || 'login');
    const wrap = document.getElementById('komoAuthModal');
    wrap.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const f = wrap.querySelector(`[data-form="${tab || 'login'}"] input`);
      if (f) f.focus();
    }, 250);
  }

  function closeAuthModal() {
    const wrap = document.getElementById('komoAuthModal');
    if (wrap) wrap.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openAuthModal = openAuthModal;

  /* ─── helpers ──────────────────────────────────────────── */
  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // reuse the global toast if script.js already defined one, else a fallback
  function toast(msg) {
    if (typeof window.showToast === 'function') return window.showToast(msg);
    alert(msg);
  }

  /* ─── boot ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    buildModal();
  });
  document.addEventListener('komo:authchange', renderNav);
})();
