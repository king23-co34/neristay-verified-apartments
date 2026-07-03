/* ===========================================================
   Neristay AI Assistant — "Neri" (DEMO)
   -----------------------------------------------------------
   This is a self-contained, rule-based mock chatbot for the
   Neristay marketing site. It does NOT call any real AI API —
   every reply is generated locally from the sample data below.
   Swap NERI_RESPOND() for a real API call if this is ever
   connected to a live backend / LLM.
   =========================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     MOCK DATA — sample apartments, FAQs & availability.
     Replace with real data / API responses in production.
     --------------------------------------------------------- */
  var APARTMENTS = [
    {
      name: 'Presidential Suite — CBD',
      area: 'Central Business District',
      type: '2-Bedroom, Fully Furnished',
      night: 65000,
      month: 950000,
      tags: ['Gated & CCTV', '24hr power', 'Fitted kitchen', 'Free WiFi']
    },
    {
      name: 'Maitama Garden Apartment',
      area: 'Maitama',
      type: '1-Bedroom, Fully Furnished',
      night: 48000,
      month: 720000,
      tags: ['Quiet residential estate', '24hr power', 'Free WiFi', 'Parking']
    },
    {
      name: 'Wuse II Executive Flat',
      area: 'Wuse II',
      type: '1-Bedroom, Fully Furnished',
      night: 42000,
      month: 650000,
      tags: ['Close to shopping malls', 'Gated compound', 'Free WiFi']
    },
    {
      name: 'Asokoro Diplomatic Apartment',
      area: 'Asokoro',
      type: '3-Bedroom, Fully Furnished',
      night: 95000,
      month: 1350000,
      tags: ['Diplomatic zone', 'Backup generator', 'Housekeeping option']
    },
    {
      name: 'Garki Comfort Studio',
      area: 'Garki',
      type: 'Studio, Fully Furnished',
      night: 32000,
      month: 480000,
      tags: ['Budget-friendly', '24hr power', 'Free WiFi']
    }
  ];

  var NAIRA = new Intl.NumberFormat('en-NG');
  function money(n) { return '\u20A6' + NAIRA.format(n); }

  var QUICK_REPLIES_START = [
    'See apartments & prices',
    'Check availability',
    'What areas do you cover?',
    'Talk to a human'
  ];

  var HUMAN_HANDOFF =
    'I can connect you with our real booking team on WhatsApp — they will confirm live availability and pricing. ' +
    'Tap "Talk to a human" below or call 0706 435 6536.';

  /* ---------------------------------------------------------
     RESPONSE ENGINE — simple keyword matching over the mock
     data above. No network calls, no real AI model.
     --------------------------------------------------------- */
  function apartmentsListReply() {
    var lines = ['Here are a few sample listings from our Abuja portfolio:'];
    return { text: lines.join('\n'), apartments: APARTMENTS.slice(0, 3) };
  }

  function areaReply(query) {
    var found = APARTMENTS.filter(function (a) {
      return query.indexOf(a.area.toLowerCase().split(' ')[0]) !== -1;
    });
    if (found.length) {
      return { text: 'Yes — we have verified short lets in that area. Here\u2019s a sample:', apartments: found };
    }
    return {
      text: 'We currently cover short lets across Abuja CBD, Maitama, Wuse, Asokoro and Garki. ' +
        'Let me know which part of the city you\u2019re interested in and I\u2019ll pull up a sample apartment.'
    };
  }

  function priceReply() {
    var cheapest = APARTMENTS.reduce(function (a, b) { return a.night < b.night ? a : b; });
    var priciest = APARTMENTS.reduce(function (a, b) { return a.night > b.night ? a : b; });
    return {
      text: 'Nightly rates on our sample listings range from ' + money(cheapest.night) + ' (' + cheapest.name +
        ') to ' + money(priciest.night) + ' (' + priciest.name + '). Monthly stays get a discounted rate. ' +
        'Want to see the full sample list?'
    };
  }

  function availabilityReply() {
    return {
      text: 'For this demo, let\u2019s assume you\u2019re checking a few dates. Based on our sample calendar, ' +
        'the Maitama Garden Apartment and Wuse II Executive Flat show as available this week, while the ' +
        'Presidential Suite is fully booked until the 14th. For real-time availability, our booking team can ' +
        'confirm instantly on WhatsApp.'
    };
  }

  function amenitiesReply() {
    return {
      text: 'All Neristay apartments in our sample data include steady 24hr power, free WiFi, a fitted kitchen ' +
        'and gated security with CCTV. Some units also offer daily housekeeping and private parking — it varies ' +
        'by apartment.'
    };
  }

  function bookingReply() {
    return {
      text: 'Booking is simple:\n1. Share your dates and preferred area\n2. We confirm a verified apartment ' +
        'and send pricing\n3. You pay securely and check in with keys, WiFi details and support on standby.\n\n' +
        'Want me to start that with a sample enquiry, or would you rather use the booking form on this page?'
    };
  }

  function paymentReply() {
    return {
      text: 'In our standard process, payment is made securely once your booking is confirmed — bank transfer ' +
        'is the most common method for short lets in Abuja. Our real team will share account details directly, ' +
        'never through a third party.'
    };
  }

  function cancellationReply() {
    return {
      text: 'Sample policy: free rescheduling up to 48 hours before check-in, and a partial refund outside that ' +
        'window. Exact terms are confirmed by our booking team when you enquire, since they can vary by apartment.'
    };
  }

  function contactReply() {
    return {
      text: 'You can reach the real Neristay team directly:\n\u2600 Phone/WhatsApp: 0706 435 6536\n\u2709 Email: info@neri.com\n\uD83D\uDCCD Presidential Boulevard, CBD, Abuja'
    };
  }

  function greetingReply() {
    return { text: 'Hello! Ask me about apartments, prices, areas we cover, or how booking works.' };
  }

  function fallbackReply() {
    return {
      text: 'I\u2019m a demo assistant, so my answers are based on sample data rather than live listings. I can help ' +
        'with apartment options, pricing, locations, amenities or the booking process — or connect you with a ' +
        'real person.\n\n' + HUMAN_HANDOFF
    };
  }

  function NERI_RESPOND(rawInput) {
    var q = rawInput.toLowerCase();

    if (/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(q)) return greetingReply();
    if (/\b(human|agent|whatsapp|real person|speak to someone|call)\b/.test(q)) return { text: HUMAN_HANDOFF };
    if (/\b(price|cost|rate|how much|naira|₦)\b/.test(q)) return priceReply();
    if (/\b(apartment|listing|room|unit|available units|options)\b/.test(q) && !/available|availab/.test(q)) return apartmentsListReply();
    if (/\b(area|location|where|cbd|maitama|wuse|asokoro|garki)\b/.test(q)) return areaReply(q);
    if (/\b(available|availability|date|book.*date|check.?in|check.?out)\b/.test(q)) return availabilityReply();
    if (/\b(amenit|wifi|power|generator|kitchen|security|facilit)\b/.test(q)) return amenitiesReply();
    if (/\b(how.*book|booking process|reserve|reservation)\b/.test(q)) return bookingReply();
    if (/\b(pay|payment|transfer|card|deposit)\b/.test(q)) return paymentReply();
    if (/\b(cancel|refund|reschedul)\b/.test(q)) return cancellationReply();
    if (/\b(contact|phone|email|number|reach you)\b/.test(q)) return contactReply();
    if (/\b(thank|thanks|thank you)\b/.test(q)) return { text: 'You\u2019re welcome! Anything else you\u2019d like to know about our Abuja short lets?' };

    return fallbackReply();
  }

  /* ---------------------------------------------------------
     UI WIRING
     --------------------------------------------------------- */
  var launcher = document.getElementById('neriChatLauncher');
  var panel = document.getElementById('neriChatPanel');
  var closeBtn = document.getElementById('neriChatClose');
  var messagesEl = document.getElementById('neriChatMessages');
  var quickRepliesEl = document.getElementById('neriChatQuickReplies');
  var form = document.getElementById('neriChatForm');
  var input = document.getElementById('neriChatInput');
  var sendBtn = document.getElementById('neriChatSend');

  if (!launcher || !panel || !messagesEl || !form || !input) return;

  var hasGreeted = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, who) {
    var bubble = document.createElement('div');
    bubble.className = 'neri-msg ' + (who === 'user' ? 'neri-user' : 'neri-bot');
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function addApartmentCards(apartments) {
    apartments.forEach(function (apt) {
      var card = document.createElement('div');
      card.className = 'neri-apt-card';
      card.innerHTML =
        '<div class="neri-apt-name"></div>' +
        '<div class="neri-apt-meta"></div>' +
        '<div class="neri-apt-price"></div>';
      card.querySelector('.neri-apt-name').textContent = apt.name;
      card.querySelector('.neri-apt-meta').textContent = apt.area + ' \u2022 ' + apt.type;
      card.querySelector('.neri-apt-price').textContent =
        money(apt.night) + ' / night \u00B7 ' + money(apt.month) + ' / month';
      messagesEl.appendChild(card);
    });
    scrollToBottom();
  }

  function showTyping() {
    var typing = document.createElement('div');
    typing.className = 'neri-typing';
    typing.id = 'neriTyping';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function removeTyping() {
    var t = document.getElementById('neriTyping');
    if (t) t.remove();
  }

  function setQuickReplies(list) {
    quickRepliesEl.innerHTML = '';
    if (!list || !list.length) {
      quickRepliesEl.style.display = 'none';
      return;
    }
    quickRepliesEl.style.display = 'flex';
    list.forEach(function (label) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'neri-chip';
      chip.textContent = label;
      chip.addEventListener('click', function () {
        handleUserMessage(label);
      });
      quickRepliesEl.appendChild(chip);
    });
  }

  function handleUserMessage(text) {
    text = text.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    setQuickReplies([]);

    if (/talk to a human/i.test(text)) {
      var typingA = showTyping();
      window.setTimeout(function () {
        removeTyping();
        addMessage(HUMAN_HANDOFF, 'bot');
        var link = document.createElement('a');
        link.href = 'https://wa.me/2347064356536?text=' + encodeURIComponent('Hello Neristay, I have an enquiry about a short let apartment in Abuja.');
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'neri-chip';
        link.style.textDecoration = 'none';
        link.style.display = 'inline-block';
        link.style.marginTop = '4px';
        link.textContent = 'Open WhatsApp \u2192';
        var wrap = document.createElement('div');
        wrap.appendChild(link);
        messagesEl.appendChild(wrap);
        scrollToBottom();
      }, 700);
      return;
    }

    var typing = showTyping();
    var delay = 550 + Math.random() * 650;
    window.setTimeout(function () {
      removeTyping();
      var reply = NERI_RESPOND(text);
      addMessage(reply.text, 'bot');
      if (reply.apartments) addApartmentCards(reply.apartments);
      setQuickReplies(QUICK_REPLIES_START);
    }, delay);
  }

  function openPanel() {
    panel.classList.add('neri-open');
    launcher.setAttribute('aria-expanded', 'true');
    if (!hasGreeted) {
      hasGreeted = true;
      window.setTimeout(function () {
        addMessage(
          'Hi, I\u2019m Neri \u2014 Neristay\u2019s demo assistant. I answer using sample apartment data, not a live ' +
          'system, but I can walk you through what booking a short let in Abuja looks like. What would you like to know?',
          'bot'
        );
        setQuickReplies(QUICK_REPLIES_START);
      }, 350);
    }
    window.setTimeout(function () { input.focus(); }, 300);
  }

  function closePanel() {
    panel.classList.remove('neri-open');
    launcher.setAttribute('aria-expanded', 'false');
  }

  launcher.addEventListener('click', function () {
    if (panel.classList.contains('neri-open')) closePanel();
    else openPanel();
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('neri-open')) closePanel();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    handleUserMessage(input.value);
  });

  sendBtn && sendBtn.addEventListener('click', function (e) {
    e.preventDefault();
    handleUserMessage(input.value);
  });
})();
