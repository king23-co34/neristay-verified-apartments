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

  /* ---------- Auth token helpers ----------
     The signed-in user's token/profile are cached in localStorage
     under 'neri_auth' by js/auth.js. Reading it here (rather than
     importing auth.js) keeps api.js dependency-free and loadable
     on its own. */
  function getStoredAuth() {
    try {
      var raw = window.localStorage.getItem('neri_auth');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function authHeaders() {
    var auth = getStoredAuth();
    return auth && auth.token ? { Authorization: 'Bearer ' + auth.token } : {};
  }

  function request(path, options, onSlowRetry) {
    options = options || {};
    var url = BASE_URL + path;

    var headers = options.headers || {};
    if (options.auth) {
      var ah = authHeaders();
      for (var hk in ah) { if (Object.prototype.hasOwnProperty.call(ah, hk)) headers[hk] = ah[hk]; }
    }

    var opts = {
      method: options.method || 'GET',
      headers: headers
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

  function get(path, onSlowRetry, auth) {
    return request(path, { method: 'GET', auth: auth }, onSlowRetry);
  }

  function post(path, body, onSlowRetry, auth) {
    return request(path, { method: 'POST', body: body, auth: auth }, onSlowRetry);
  }

  function put(path, body, onSlowRetry, auth) {
    return request(path, { method: 'PUT', body: body, auth: auth }, onSlowRetry);
  }

  function patch(path, body, onSlowRetry, auth) {
    return request(path, { method: 'PATCH', body: body, auth: auth }, onSlowRetry);
  }

  function del(path, onSlowRetry, auth) {
    return request(path, { method: 'DELETE', auth: auth }, onSlowRetry);
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
    /* Properties (public) */
    getProperties: function (query, onSlowRetry) {
      return get('/api/properties' + toQueryString(query), onSlowRetry);
    },
    getProperty: function (idOrSlug, onSlowRetry) {
      return get('/api/properties/' + encodeURIComponent(idOrSlug), onSlowRetry);
    },

    /* Properties (admin, requires auth) */
    createProperty: function (payload, onSlowRetry) {
      return post('/api/properties', payload, onSlowRetry, true);
    },
    updateProperty: function (id, payload, onSlowRetry) {
      return put('/api/properties/' + encodeURIComponent(id), payload, onSlowRetry, true);
    },
    deleteProperty: function (id, onSlowRetry) {
      return del('/api/properties/' + encodeURIComponent(id), onSlowRetry, true);
    },

    /* Blog (public) */
    getBlogPosts: function (query, onSlowRetry) {
      return get('/api/blog' + toQueryString(query), onSlowRetry);
    },
    getBlogPost: function (idOrSlug, onSlowRetry) {
      return get('/api/blog/' + encodeURIComponent(idOrSlug), onSlowRetry);
    },

    /* Blog (admin, requires auth) */
    createBlogPost: function (payload, onSlowRetry) {
      return post('/api/blog', payload, onSlowRetry, true);
    },
    updateBlogPost: function (id, payload, onSlowRetry) {
      return put('/api/blog/' + encodeURIComponent(id), payload, onSlowRetry, true);
    },
    deleteBlogPost: function (id, onSlowRetry) {
      return del('/api/blog/' + encodeURIComponent(id), onSlowRetry, true);
    },

    /* Bookings (public create) */
    createBooking: function (payload, onSlowRetry) {
      return post('/api/bookings', payload, onSlowRetry);
    },

    /* Bookings (admin, requires auth) */
    getBookings: function (query, onSlowRetry) {
      return get('/api/bookings' + toQueryString(query), onSlowRetry, true);
    },
    updateBookingStatus: function (id, status, onSlowRetry) {
      return patch('/api/bookings/' + encodeURIComponent(id), { status: status }, onSlowRetry, true);
    },

    /* Auth */
    signup: function (payload, onSlowRetry) {
      return post('/api/auth/register', payload, onSlowRetry);
    },
    login: function (payload, onSlowRetry) {
      return post('/api/auth/login', payload, onSlowRetry);
    },
    getMe: function (onSlowRetry) {
      return get('/api/auth/me', onSlowRetry, true);
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
