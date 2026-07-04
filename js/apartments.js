/* ===========================================================
   Neristay — Live Apartments grid (index.html)
   -----------------------------------------------------------
   Fetches real, current listings from the backend and renders
   them into #liveApartmentsGrid, with a branded loading state
   and a graceful empty/error fallback.
   =========================================================== */
(function () {
  'use strict';

  var grid = document.getElementById('liveApartmentsGrid');
  if (!grid || !window.NeriAPI) return;

  var NAIRA = new Intl.NumberFormat('en-NG');
  function money(n) { return '\u20A6' + NAIRA.format(n); }

  var FALLBACK_IMG =
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?fm=jpg&q=80&w=800&auto=format&fit=crop';

  function renderSkeleton() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html +=
        '<div class="neri-skel-card">' +
        '<div class="neri-skel" style="height:200px;"></div>' +
        '<div class="neri-skel-body">' +
        '<div class="neri-skel" style="height:12px;width:40%;margin-bottom:10px;"></div>' +
        '<div class="neri-skel" style="height:18px;width:80%;margin-bottom:8px;"></div>' +
        '<div class="neri-skel" style="height:14px;width:60%;"></div>' +
        '</div></div>';
    }
    grid.innerHTML = html;
  }

  function fillBookingForm(property) {
    var messageField = document.getElementById('message');
    if (messageField && !messageField.value) {
      messageField.value =
        'I\u2019m interested in ' + property.name + ' (' + property.area + '). Please confirm availability and pricing.';
    }
  }

  function renderApartments(properties) {
    if (!properties.length) {
      grid.innerHTML =
        '<div class="col-span-full neri-error-note">New verified listings are being added — enquire directly below and our team will match you with an available apartment.</div>';
      return;
    }

    grid.innerHTML = '';
    properties.slice(0, 6).forEach(function (property, idx) {
      var img = property.coverImage || (property.images && property.images[0]) || FALLBACK_IMG;
      var card = document.createElement('a');
      card.href = '#booking';
      card.className = 'reveal is-visible block bg-white rounded-xl border border-black/5 overflow-hidden hover:shadow-lg transition-shadow';
      card.innerHTML =
        '<div class="relative">' +
        '<img src="' + img + '" alt="' + property.name.replace(/"/g, '&quot;') + ' — verified short let apartment in ' + (property.area || 'Abuja') + '" ' +
        'class="w-full h-[200px] object-cover" loading="lazy" width="800" height="200">' +
        (property.isVerified !== false
          ? '<div class="absolute top-3 left-3 seal bg-ink/85 text-brass px-3 py-1 rounded-full font-eyebrow text-[9px] uppercase">Verified by Neri</div>'
          : '') +
        '</div>' +
        '<div class="p-6">' +
        '<p class="font-eyebrow text-brass text-[10px] uppercase mb-2">' + (property.area || '') + '</p>' +
        '<h3 class="font-display text-lg font-semibold text-ink mb-1">' + property.name + '</h3>' +
        '<p class="text-sm text-slate/60 mb-3">' + (property.type || '') + '</p>' +
        '<p class="text-clay-dark font-semibold text-sm">' + money(property.pricePerNight) + ' / night</p>' +
        '</div>';
      card.addEventListener('click', function () { fillBookingForm(property); });
      grid.appendChild(card);
    });
  }

  function renderError() {
    grid.innerHTML =
      '<div class="col-span-full neri-error-note">We could not load live listings right now. ' +
      '<a href="tel:+2347064356536" class="text-clay underline">Call 0706 435 6536</a> or use the booking form and our team will confirm a verified apartment for you.</div>';
  }

  renderSkeleton();

  window.NeriAPI
    .getProperties({ limit: 6, sort: '-isFeatured -createdAt' }, function onSlowRetry() {
      grid.innerHTML =
        '<div class="col-span-full neri-loading-panel"><div class="neri-loader-brand"></div><p>Waking up live listings\u2026</p></div>';
    })
    .then(function (res) {
      renderApartments((res && res.data) || []);
    })
    .catch(function () {
      renderError();
    });
})();
