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

  /* Contact / booking form — wired to the live Neristay API */
  var form = document.getElementById('bookingForm');
  if (form) {
    var statusEl = document.getElementById('formStatus');
    var submitBtn = document.getElementById('formSubmit');
    var submitBtnDefaultHTML = submitBtn.innerHTML;

    function setSubmitLoading(isLoading, label) {
      if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<span class="neri-btn-loading"><span class="neri-spin" style="border-color:rgba(255,255,255,.6);' +
          'color:#fff;"></span>' + (label || 'Sending…') + '</span>';
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtnDefaultHTML;
      }
    }

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

      statusEl.textContent = '';
      setSubmitLoading(true, 'Sending…');

      var waMessage = encodeURIComponent(
        'Hello Neristay, my name is ' + name + '. I would like to check availability' +
        (checkin ? ' from ' + checkin : '') + '. ' + (message || '')
      );

      function showWhatsAppFallback(note) {
        statusEl.innerHTML =
          (note ? note + ' ' : '') +
          '<a class="underline text-clay font-semibold" href="https://wa.me/2347064356536?text=' +
          waMessage + '" target="_blank" rel="noopener">Tap here to send your request on WhatsApp</a>.';
        statusEl.className = 'text-sm mt-3 text-slate';
      }

      if (!window.NeriAPI) {
        showWhatsAppFallback('Our booking desk is temporarily unreachable —');
        setSubmitLoading(false);
        return;
      }

      window.NeriAPI
        .createBooking(
          {
            name: name,
            phone: phone,
            checkin: checkin || undefined,
            message: message || undefined,
            source: 'website_form'
          },
          function onSlowRetry() {
            setSubmitLoading(true, 'Still connecting…');
          }
        )
        .then(function (res) {
          var thankYouName = name.split(' ')[0];
          var serverMessage = res && res.data && res.data.message;
          statusEl.textContent =
            serverMessage || 'Thank you, ' + thankYouName + '. Our team will contact you shortly on ' + phone + '.';
          statusEl.className = 'text-sm mt-3 text-verified font-semibold';
          form.reset();
        })
        .catch(function () {
          /* Fallback: open WhatsApp with prefilled enquiry so no lead is lost */
          showWhatsAppFallback('We could not reach our booking desk automatically —');
        })
        .finally(function () {
          setSubmitLoading(false);
        });
    });
  }
})();
