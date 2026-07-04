/* ===========================================================
   Neristay — Auth (login / signup modal + session state)
   -----------------------------------------------------------
   - Injects a single login/signup modal into the page (so it
     only needs to be maintained in one place, the same way the
     chatbot widget is loaded on every page).
   - Persists { token, user } in localStorage under 'neri_auth'.
   - Exposes window.NeriAuth for other scripts (e.g. admin.js)
     to read the session and guard admin-only pages.
   - Populates any #authAreaDesktop / #authAreaMobile containers
     in the header with a Login button (signed out) or an
     account menu (signed in).
   =========================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'neri_auth';

  /* ---------------- Session helpers ---------------- */
  function getSession() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable — session just won't persist */ }
  }

  function clearSession() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function isAdmin() {
    var s = getSession();
    return !!(s && s.user && s.user.role === 'admin');
  }

  /* ---------------- Modal markup ---------------- */
  var MODAL_HTML =
    '<div id="authModalOverlay" class="neri-auth-overlay" hidden>' +
      '<div id="authModal" class="neri-auth-modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">' +
        '<button type="button" id="authModalClose" class="neri-auth-close" aria-label="Close">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +

        '<div class="neri-auth-head">' +
          '<span class="seal w-10 h-10 rounded-full text-brass font-display text-lg" aria-hidden="true">N</span>' +
          '<h2 id="authModalTitle" class="font-display text-xl font-semibold text-ink mt-3">Welcome to Neristay</h2>' +
          '<p class="text-sm text-slate/60 mt-1">Sign in to manage your bookings, or create an account.</p>' +
        '</div>' +

        '<div class="neri-auth-tabs" role="tablist">' +
          '<button type="button" class="neri-auth-tab is-active" data-auth-tab="login" role="tab" aria-selected="true">Log In</button>' +
          '<button type="button" class="neri-auth-tab" data-auth-tab="signup" role="tab" aria-selected="false">Sign Up</button>' +
        '</div>' +

        /* ---- Login form ---- */
        '<form id="loginForm" class="neri-auth-form" novalidate>' +
          '<div>' +
            '<label for="loginEmail" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Email</label>' +
            '<input id="loginEmail" name="email" type="email" required autocomplete="email" class="field w-full rounded px-4 py-3 text-sm" placeholder="you@example.com">' +
          '</div>' +
          '<div>' +
            '<label for="loginPassword" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Password</label>' +
            '<input id="loginPassword" name="password" type="password" required autocomplete="current-password" class="field w-full rounded px-4 py-3 text-sm" placeholder="••••••••">' +
          '</div>' +
          '<button id="loginSubmit" type="submit" class="btn-clay w-full rounded py-3.5 font-semibold text-sm mt-1">Log In</button>' +
          '<p id="loginStatus" role="status" class="text-sm mt-1 min-h-[1.25rem]"></p>' +
        '</form>' +

        /* ---- Signup form ---- */
        '<form id="signupForm" class="neri-auth-form hidden" novalidate>' +
          '<div>' +
            '<label for="signupName" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Full name</label>' +
            '<input id="signupName" name="name" type="text" required autocomplete="name" class="field w-full rounded px-4 py-3 text-sm" placeholder="Your full name">' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-4">' +
            '<div>' +
              '<label for="signupEmail" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Email</label>' +
              '<input id="signupEmail" name="email" type="email" required autocomplete="email" class="field w-full rounded px-4 py-3 text-sm" placeholder="you@example.com">' +
            '</div>' +
            '<div>' +
              '<label for="signupPhone" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Phone</label>' +
              '<input id="signupPhone" name="phone" type="tel" required autocomplete="tel" class="field w-full rounded px-4 py-3 text-sm" placeholder="0803 000 0000">' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label for="signupPassword" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Password</label>' +
            '<input id="signupPassword" name="password" type="password" required autocomplete="new-password" minlength="6" class="field w-full rounded px-4 py-3 text-sm" placeholder="At least 6 characters">' +
          '</div>' +
          '<div>' +
            '<label for="signupPassword2" class="block text-xs font-semibold uppercase tracking-wide text-slate/60 mb-1.5">Confirm password</label>' +
            '<input id="signupPassword2" name="password2" type="password" required autocomplete="new-password" class="field w-full rounded px-4 py-3 text-sm" placeholder="Re-enter your password">' +
          '</div>' +
          '<button id="signupSubmit" type="submit" class="btn-clay w-full rounded py-3.5 font-semibold text-sm mt-1">Create Account</button>' +
          '<p id="signupStatus" role="status" class="text-sm mt-1 min-h-[1.25rem]"></p>' +
        '</form>' +

        '<p class="text-[11px] text-slate/50 text-center pt-1">Prefer to talk? Call <a href="tel:+2347064356536" class="underline">0706 435 6536</a></p>' +
      '</div>' +
    '</div>';

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('authModalOverlay')) {
      document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
    }
    initModal();
    renderAuthAreas();
  });

  /* ---------------- Modal behaviour ---------------- */
  function initModal() {
    var overlay = document.getElementById('authModalOverlay');
    var closeBtn = document.getElementById('authModalClose');
    var tabs = document.querySelectorAll('.neri-auth-tab');
    var loginForm = document.getElementById('loginForm');
    var signupForm = document.getElementById('signupForm');
    if (!overlay) return;

    var lastFocused = null;

    function openModal(mode) {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
      switchTab(mode || 'login');
      document.body.style.overflow = 'hidden';
      var firstField = overlay.querySelector('.neri-auth-form:not(.hidden) input');
      if (firstField) firstField.focus();
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { overlay.hidden = true; }, 200);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    function switchTab(mode) {
      tabs.forEach(function (t) {
        var active = t.getAttribute('data-auth-tab') === mode;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      loginForm.classList.toggle('hidden', mode !== 'login');
      signupForm.classList.toggle('hidden', mode !== 'signup');
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.getAttribute('data-auth-tab')); });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });

    /* Trigger buttons anywhere on the page: data-auth-open="login|signup" */
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-auth-open]');
      if (trigger) {
        e.preventDefault();
        openModal(trigger.getAttribute('data-auth-open') || 'login');
      }
      if (e.target.closest('[data-auth-logout]')) {
        e.preventDefault();
        logout();
      }
    });

    function setLoading(btn, isLoading, label) {
      if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
      if (isLoading) {
        btn.disabled = true;
        btn.innerHTML =
          '<span class="neri-btn-loading"><span class="neri-spin" style="border-color:rgba(255,255,255,.6);' +
          'color:#fff;"></span>' + (label || 'Please wait…') + '</span>';
      } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.defaultHtml;
      }
    }

    /* ---- Login submit ---- */
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var statusEl = document.getElementById('loginStatus');
      var submitBtn = document.getElementById('loginSubmit');
      var email = loginForm.elements['email'].value.trim();
      var password = loginForm.elements['password'].value;

      statusEl.textContent = '';
      statusEl.className = 'text-sm mt-1 min-h-[1.25rem]';

      if (!email || !password) {
        statusEl.textContent = 'Please enter your email and password.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }
      if (!window.NeriAPI) {
        statusEl.textContent = 'Sign-in is temporarily unavailable. Please try again shortly.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }

      setLoading(submitBtn, true, 'Logging in…');
      window.NeriAPI
        .login({ email: email, password: password }, function () { setLoading(submitBtn, true, 'Still connecting…'); })
        .then(function (res) {
          var data = res && res.data ? res.data : res;
          if (!data || !data.token) throw new Error('Unexpected response from server.');
          setSession({ token: data.token, user: data.user || {} });
          statusEl.textContent = 'Welcome back' + (data.user && data.user.name ? ', ' + data.user.name.split(' ')[0] : '') + '!';
          statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-verified font-semibold';
          renderAuthAreas();
          loginForm.reset();
          setTimeout(function () {
            closeModal();
            if (isAdmin()) window.location.href = 'admin.html';
          }, 600);
        })
        .catch(function (err) {
          statusEl.textContent = (err && err.message) || 'We could not log you in. Please check your details and try again.';
          statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        })
        .finally(function () { setLoading(submitBtn, false); });
    });

    /* ---- Signup submit ---- */
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var statusEl = document.getElementById('signupStatus');
      var submitBtn = document.getElementById('signupSubmit');
      var name = signupForm.elements['name'].value.trim();
      var email = signupForm.elements['email'].value.trim();
      var phone = signupForm.elements['phone'].value.trim();
      var password = signupForm.elements['password'].value;
      var password2 = signupForm.elements['password2'].value;

      statusEl.textContent = '';
      statusEl.className = 'text-sm mt-1 min-h-[1.25rem]';

      if (!name || !email || !phone || !password) {
        statusEl.textContent = 'Please fill in every field.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }
      if (password.length < 6) {
        statusEl.textContent = 'Password should be at least 6 characters.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }
      if (password !== password2) {
        statusEl.textContent = 'Passwords do not match.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }
      if (!window.NeriAPI) {
        statusEl.textContent = 'Sign-up is temporarily unavailable. Please try again shortly.';
        statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        return;
      }

      setLoading(submitBtn, true, 'Creating account…');
      window.NeriAPI
        .signup({ name: name, email: email, phone: phone, password: password }, function () { setLoading(submitBtn, true, 'Still connecting…'); })
        .then(function (res) {
          var data = res && res.data ? res.data : res;
          if (data && data.token) {
            setSession({ token: data.token, user: data.user || {} });
            renderAuthAreas();
          }
          statusEl.textContent = 'Account created! You can now log in.';
          statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-verified font-semibold';
          signupForm.reset();
          setTimeout(function () {
            if (data && data.token) { closeModal(); }
            else { switchTab('login'); }
          }, 700);
        })
        .catch(function (err) {
          statusEl.textContent = (err && err.message) || 'We could not create your account. Please try again.';
          statusEl.className = 'text-sm mt-1 min-h-[1.25rem] text-red-600';
        })
        .finally(function () { setLoading(submitBtn, false); });
    });

    window.NeriAuth._openModal = openModal;
    window.NeriAuth._closeModal = closeModal;
  }

  /* ---------------- Header nav rendering ---------------- */
  function renderAuthAreas() {
    var session = getSession();
    var containers = document.querySelectorAll('[data-auth-area]');
    containers.forEach(function (el) {
      var isMobile = el.getAttribute('data-auth-area') === 'mobile';
      if (session && session.user) {
        var firstName = (session.user.name || 'Account').split(' ')[0];
        var dashLink = session.user.role === 'admin'
          ? '<a href="admin.html" class="' + (isMobile ? 'py-1.5 block' : 'hover:text-brass transition-colors') + '">Dashboard</a>'
          : '';
        if (isMobile) {
          el.innerHTML =
            '<span class="py-1.5 block text-brass">Hi, ' + escapeHtml(firstName) + '</span>' +
            dashLink +
            '<a href="#" data-auth-logout class="py-1.5 block">Log Out</a>';
        } else {
          el.innerHTML =
            '<div class="neri-account-menu">' +
              '<button type="button" class="text-paper text-sm font-semibold hover:text-brass transition-colors flex items-center gap-1.5">' +
                'Hi, ' + escapeHtml(firstName) +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
              '</button>' +
              '<div class="neri-account-dropdown">' +
                dashLink +
                '<a href="#" data-auth-logout>Log Out</a>' +
              '</div>' +
            '</div>';
        }
      } else {
        if (isMobile) {
          el.innerHTML = '<a href="#" data-auth-open="login" class="py-1.5 block">Login / Sign Up</a>';
        } else {
          el.innerHTML = '<a href="#" data-auth-open="login" class="text-paper text-sm font-semibold hover:text-brass transition-colors">Login</a>';
        }
      }
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function logout() {
    clearSession();
    renderAuthAreas();
    if (/admin\.html$/.test(window.location.pathname)) {
      window.location.href = 'index.html';
    }
  }

  window.NeriAuth = {
    getSession: getSession,
    getToken: function () { var s = getSession(); return s ? s.token : null; },
    getUser: function () { var s = getSession(); return s ? s.user : null; },
    isLoggedIn: function () { return !!getSession(); },
    isAdmin: isAdmin,
    logout: logout,
    openModal: function (mode) { if (window.NeriAuth._openModal) window.NeriAuth._openModal(mode); },
    /* Guard for admin.html: redirects non-admins back to the homepage. */
    requireAdmin: function () {
      if (!isAdmin()) {
        window.location.href = 'index.html';
        return false;
      }
      return true;
    }
  };
})();
