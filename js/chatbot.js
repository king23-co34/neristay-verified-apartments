/* ===========================================================
   Neristay AI Assistant — "Neri"
   -----------------------------------------------------------
   Talks to the live Neristay backend's Gemini-powered /api/chat
   endpoint (see js/api.js / js/config.js), grounded on real,
   current property listings. Falls back to a human WhatsApp
   handoff if the API is unreachable.
   =========================================================== */
(function () {
  'use strict';

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

  var FALLBACK_REPLY =
    'I\u2019m having trouble reaching our live system right now, but I don\u2019t want to leave you hanging. ' +
    'You can reach the real Neristay team directly:\n\u2600 Phone/WhatsApp: 0706 435 6536\n\u2709 Email: info@neri.com';

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
  var statusEl = document.querySelector('.neri-status');
  var bannerEl = document.querySelector('.neri-demo-banner');

  if (!launcher || !panel || !messagesEl || !form || !input) return;

  /* Reflect that this is a live assistant, not a mock demo */
  if (statusEl) statusEl.textContent = 'AI Assistant \u2022 Online';
  if (bannerEl) {
    bannerEl.textContent = 'Ask about apartments, pricing, areas or booking \u2014 answers are grounded in our live listings.';
  }

  var hasGreeted = false;
  var sessionId = null;
  var conversationHistory = []; // [{ role: 'user'|'model', text }]

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

  function addApartmentCards(properties) {
    properties.forEach(function (apt) {
      var card = document.createElement('div');
      card.className = 'neri-apt-card';
      var priceBits = [];
      if (apt.pricePerNight) priceBits.push(money(apt.pricePerNight) + ' / night');
      if (apt.pricePerMonth) priceBits.push(money(apt.pricePerMonth) + ' / month');
      card.innerHTML =
        '<div class="neri-apt-name"></div>' +
        '<div class="neri-apt-meta"></div>' +
        '<div class="neri-apt-price"></div>';
      card.querySelector('.neri-apt-name').textContent = apt.name;
      card.querySelector('.neri-apt-meta').textContent = (apt.area || '') + (apt.type ? ' \u2022 ' + apt.type : '');
      card.querySelector('.neri-apt-price').textContent = priceBits.join(' \u00B7 ');
      messagesEl.appendChild(card);
    });
    scrollToBottom();
  }

  /* Opay-style brand spinner, used in place of plain typing dots */
  function showTyping() {
    var typing = document.createElement('div');
    typing.className = 'neri-typing';
    typing.id = 'neriTyping';
    typing.innerHTML = '<span class="neri-spin" style="width:14px;height:14px;border-width:2px;"></span>' +
      '<span style="font-size:12px;color:var(--slate);opacity:.7;">Neri is thinking\u2026</span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function updateTyping(text) {
    var typing = document.getElementById('neriTyping');
    if (typing) {
      var label = typing.querySelector('span:last-child');
      if (label) label.textContent = text;
    }
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

  function openWhatsAppHandoff() {
    var link = document.createElement('a');
    link.href = 'https://wa.me/2347064356536?text=' +
      encodeURIComponent('Hello Neristay, I have an enquiry about a short let apartment in Abuja.');
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
  }

  function handleUserMessage(text) {
    text = text.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';
    setQuickReplies([]);

    if (/talk to a human/i.test(text)) {
      showTyping();
      window.setTimeout(function () {
        removeTyping();
        addMessage(HUMAN_HANDOFF, 'bot');
        openWhatsAppHandoff();
      }, 500);
      return;
    }

    if (!window.NeriAPI) {
      addMessage(FALLBACK_REPLY, 'bot');
      openWhatsAppHandoff();
      setQuickReplies(QUICK_REPLIES_START);
      return;
    }

    showTyping();

    window.NeriAPI
      .sendChatMessage(
        { message: text, history: conversationHistory, sessionId: sessionId || undefined },
        function onSlowRetry() {
          updateTyping('Waking up Neri\u2019s server, one moment\u2026');
        }
      )
      .then(function (res) {
        removeTyping();
        var data = res && res.data;
        if (!data || !data.reply) throw new Error('Empty reply');

        sessionId = data.sessionId || sessionId;
        conversationHistory.push({ role: 'user', text: text });
        conversationHistory.push({ role: 'model', text: data.reply });

        addMessage(data.reply, 'bot');
        if (data.suggestedProperties && data.suggestedProperties.length) {
          addApartmentCards(data.suggestedProperties);
        }
        setQuickReplies(QUICK_REPLIES_START);
      })
      .catch(function () {
        removeTyping();
        addMessage(FALLBACK_REPLY, 'bot');
        openWhatsAppHandoff();
        setQuickReplies(QUICK_REPLIES_START);
      });
  }

  function openPanel() {
    panel.classList.add('neri-open');
    launcher.setAttribute('aria-expanded', 'true');
    if (!hasGreeted) {
      hasGreeted = true;
      window.setTimeout(function () {
        addMessage(
          'Hi, I\u2019m Neri \u2014 Neristay\u2019s AI assistant. I can help with apartment options, pricing, areas ' +
          'we cover, or how booking works. What would you like to know?',
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
