/* ===========================================================
   Neristay — API client
   -----------------------------------------------------------
   Thin wrapper around fetch() for talking to the live Neristay
   backend (Express/MongoDB, deployed on Render).

   Notes:
   - The backend is hosted on Render's free tier, which spins
     down when idle and can take 20-50s to "wake up" on the
     first request. Every call here is tried once with a normal
     timeout, then retried once with a much longer timeout so a
     cold start doesn't look like a broken site.
   - All responses follow { success, data, meta? } from the API;
     helpers below unwrap that and throw a normal Error on
     failure so callers can use plain try/catch or .catch().
   =========================================================== */
(function () {
  'use strict';

  var BASE_URL = (window.NERISTAY_CONFIG && window.NERISTAY_CONFIG.API_BASE_URL) || '';

  function timeoutSignal(ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return {
      signal: controller.signal,
      clear: function () { clearTimeout(timer); }
    };
  }

  function attempt(url, options, timeoutMs) {
    var t = timeoutSignal(timeoutMs);
    var opts = {};
    for (var k in options) { if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k]; }
    opts.signal = t.signal;

    return fetch(url, opts)
      .then(function (res) {
        t.clear();
        return res
          .json()
          .catch(function () { return {}; })
          .then(function (payload) {
            if (!res.ok || payload.success === false) {
              var message =
                (payload && payload.message) ||
                (payload && payload.errors && payload.errors[0] && payload.errors[0].msg) ||
                'Something went wrong (' + res.status + ').';
              var err = new Error(message);
              err.status = res.status;
              err.payload = payload;
              throw err;
            }
            return payload;
          });
      })
      .catch(function (err) {
        t.clear();
        throw err;
      });
  }

  function request(path, options, onSlowRetry) {
    options = options || {};
    var url = BASE_URL + path;

    var opts = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    if (options.body !== undefined) {
      opts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      opts.headers['Content-Type'] = 'application/json';
    }

    return attempt(url, opts, 12000).catch(function (err) {
      var isAbort = err.name === 'AbortError';
      var isNetwork = err instanceof TypeError;
      if (isAbort || isNetwork) {
        if (typeof onSlowRetry === 'function') onSlowRetry();
        return attempt(url, opts, 45000);
      }
      throw err;
    });
  }

  function get(path, onSlowRetry) {
    return request(path, { method: 'GET' }, onSlowRetry);
  }

  function post(path, body, onSlowRetry) {
    return request(path, { method: 'POST', body: body }, onSlowRetry);
  }

  function toQueryString(query) {
    if (!query) return '';
    var params = new URLSearchParams();
    Object.keys(query).forEach(function (key) {
      if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
        params.append(key, query[key]);
      }
    });
    var str = params.toString();
    return str ? '?' + str : '';
  }

  window.NeriAPI = {
    /* Properties */
    getProperties: function (query, onSlowRetry) {
      return get('/api/properties' + toQueryString(query), onSlowRetry);
    },
    getProperty: function (idOrSlug, onSlowRetry) {
      return get('/api/properties/' + encodeURIComponent(idOrSlug), onSlowRetry);
    },

    /* Blog */
    getBlogPosts: function (query, onSlowRetry) {
      return get('/api/blog' + toQueryString(query), onSlowRetry);
    },
    getBlogPost: function (idOrSlug, onSlowRetry) {
      return get('/api/blog/' + encodeURIComponent(idOrSlug), onSlowRetry);
    },

    /* Bookings */
    createBooking: function (payload, onSlowRetry) {
      return post('/api/bookings', payload, onSlowRetry);
    },

    /* Chat */
    sendChatMessage: function (payload, onSlowRetry) {
      return post('/api/chat', payload, onSlowRetry);
    },

    /* Health (used to gently "warm up" the server on page load) */
    ping: function () {
      return get('/api/health');
    }
  };
})();
