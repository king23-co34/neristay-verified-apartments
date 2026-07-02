(function () {
  'use strict';

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Mobile nav toggle */
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('flex');
      mobileMenu.classList.toggle('hidden');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Sticky header shadow on scroll */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 12) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Back to top */
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    var toggleBackToTop = function () {
      if (window.scrollY > 600) {
        backToTop.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
      } else {
        backToTop.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
      }
    };
    document.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* FAQ accordion (works on faq.html and hero mini-FAQ if present) */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      var wasOpen = item.classList.contains('open');
      item.closest('[data-faq-group]') &&
        item.closest('[data-faq-group]').querySelectorAll('.faq-item.open').forEach(function (openItem) {
          if (openItem !== item) openItem.classList.remove('open');
        });
      item.classList.toggle('open', !wasOpen);
      trigger.setAttribute('aria-expanded', String(!wasOpen));
    });
  });

  /* Contact / booking form */
  var form = document.getElementById('bookingForm');
  if (form) {
    var statusEl = document.getElementById('formStatus');
    var submitBtn = document.getElementById('formSubmit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.elements['name'].value.trim();
      var phone = form.elements['phone'].value.trim();
      var checkin = form.elements['checkin'] ? form.elements['checkin'].value : '';
      var message = form.elements['message'] ? form.elements['message'].value.trim() : '';

      if (!name || !phone) {
        statusEl.textContent = 'Please enter your name and phone number so we can reach you.';
        statusEl.className = 'text-sm mt-3 text-red-600';
        return;
      }

      var phonePattern = /^[0-9+()\-\s]{7,20}$/;
      if (!phonePattern.test(phone)) {
        statusEl.textContent = 'Please enter a valid phone number.';
        statusEl.className = 'text-sm mt-3 text-red-600';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      statusEl.textContent = '';

      var payload = new FormData(form);
      payload.append('_subject', 'New short let enquiry — Neristay website');
      payload.append('_captcha', 'false');

      fetch('https://formsubmit.co/ajax/info@neri.com', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload
      })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function () {
          statusEl.textContent =
            'Thank you, ' + name.split(' ')[0] + '. Our team will contact you shortly on ' + phone + '.';
          statusEl.className = 'text-sm mt-3 text-verified font-semibold';
          form.reset();
        })
        .catch(function () {
          /* Fallback: open WhatsApp with prefilled enquiry so no lead is lost */
          var waMessage = encodeURIComponent(
            'Hello Neristay, my name is ' + name + '. I would like to check availability' +
            (checkin ? ' from ' + checkin : '') + '. ' + (message || '')
          );
          statusEl.innerHTML =
            'We could not reach our booking desk automatically — ' +
            '<a class="underline text-clay font-semibold" href="https://wa.me/2347064356536?text=' +
            waMessage + '" target="_blank" rel="noopener">tap here to send us your request on WhatsApp</a>.';
          statusEl.className = 'text-sm mt-3 text-slate';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Check Availability';
        });
    });
  }
})();
