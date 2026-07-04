/* ===========================================================
   Neristay — Admin Dashboard
   -----------------------------------------------------------
   Requires the visitor to be logged in with role: 'admin'
   (enforced by the inline guard in admin.html + NeriAuth.requireAdmin
   below). Talks to the same backend as the public site via
   window.NeriAPI, using the admin-only endpoints added there:
     GET/POST/PUT/DELETE /api/properties (auth)
     GET/PATCH           /api/bookings   (auth)
     GET/POST/PUT/DELETE /api/blog       (auth)
   =========================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.NeriAuth || !window.NeriAuth.requireAdmin()) return;
    if (!window.NeriAPI) return;

    var user = window.NeriAuth.getUser() || {};
    var nameEl = document.getElementById('adminUserName');
    var initialEl = document.getElementById('adminUserInitial');
    if (nameEl) nameEl.textContent = user.name || 'Admin';
    if (initialEl) initialEl.textContent = ((user.name || 'A').trim()[0] || 'A').toUpperCase();

    var NAIRA = new Intl.NumberFormat('en-NG');
    function money(n) { return '\u20A6' + NAIRA.format(n || 0); }
    function formatDate(d) {
      if (!d) return '\u2014';
      try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
      catch (e) { return '\u2014'; }
    }
    function escapeHtml(str) {
      return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function getId(item) { return item && (item._id || item.id); }

    /* ---------------- Sidebar / section routing ---------------- */
    var sections = ['overview', 'properties', 'bookings', 'blog'];
    var pageTitle = document.getElementById('adminPageTitle');
    var navLinks = document.querySelectorAll('.admin-nav-link[data-section]');
    var loaded = {};

    function showSection(name) {
      if (sections.indexOf(name) === -1) name = 'overview';
      sections.forEach(function (s) {
        var el = document.getElementById('section-' + s);
        if (el) el.classList.toggle('hidden', s !== name);
      });
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('data-section') === name);
      });
      var titles = { overview: 'Overview', properties: 'Properties', bookings: 'Bookings', blog: 'Blog Posts' };
      if (pageTitle) pageTitle.textContent = titles[name] || 'Overview';
      closeMobileSidebar();

      if (!loaded[name]) {
        loaded[name] = true;
        if (name === 'overview') loadOverview();
        if (name === 'properties') loadProperties();
        if (name === 'bookings') loadBookings();
        if (name === 'blog') loadBlogPosts();
      }
    }

    function routeFromHash() {
      var name = (window.location.hash || '#overview').replace('#', '');
      showSection(name);
    }
    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();

    /* ---------------- Mobile sidebar ---------------- */
    var sidebar = document.getElementById('adminSidebar');
    var sidebarOverlay = document.getElementById('adminSidebarOverlay');
    var sidebarToggle = document.getElementById('adminSidebarToggle');

    function openMobileSidebar() {
      sidebar.classList.remove('-translate-x-full');
      sidebarOverlay.classList.remove('hidden');
    }
    function closeMobileSidebar() {
      sidebar.classList.add('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
    }
    if (sidebarToggle) sidebarToggle.addEventListener('click', openMobileSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

    /* ---------------- Overview ---------------- */
    function loadOverview() {
      var statProperties = document.getElementById('statProperties');
      var statBookings = document.getElementById('statBookings');
      var statPending = document.getElementById('statPending');
      var statBlog = document.getElementById('statBlog');
      var bookingsBody = document.getElementById('overviewBookingsBody');

      Promise.all([
        window.NeriAPI.getProperties({ limit: 200 }).catch(function () { return { data: [] }; }),
        window.NeriAPI.getBookings({ limit: 200 }).catch(function () { return { data: [] }; }),
        window.NeriAPI.getBlogPosts({ limit: 200 }).catch(function () { return { data: [] }; })
      ]).then(function (results) {
        var properties = results[0].data || [];
        var bookings = results[1].data || [];
        var posts = results[2].data || [];
        var pending = bookings.filter(function (b) { return (b.status || 'pending') === 'pending'; });

        statProperties.textContent = properties.length;
        statBookings.textContent = bookings.length;
        statPending.textContent = pending.length;
        statBlog.textContent = posts.length;

        var recent = bookings.slice(0, 5);
        if (!recent.length) {
          bookingsBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate/50 py-8">No bookings yet.</td></tr>';
          return;
        }
        bookingsBody.innerHTML = recent.map(function (b) {
          return '<tr>' +
            '<td class="font-semibold text-ink">' + escapeHtml(b.name) + '</td>' +
            '<td>' + escapeHtml(b.phone) + '</td>' +
            '<td>' + formatDate(b.checkin) + '</td>' +
            '<td>' + statusBadge(b.status) + '</td>' +
            '<td>' + formatDate(b.createdAt) + '</td>' +
            '</tr>';
        }).join('');
      }).catch(function () {
        bookingsBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate/50 py-8">Could not load dashboard data.</td></tr>';
      });
    }

    function statusBadge(status) {
      var s = status || 'pending';
      var cls = s === 'confirmed' ? 'admin-badge-confirmed' : s === 'cancelled' ? 'admin-badge-cancelled' : 'admin-badge-pending';
      return '<span class="admin-badge ' + cls + '">' + escapeHtml(s) + '</span>';
    }

    /* ---------------- Properties ---------------- */
    var propertiesBody = document.getElementById('propertiesBody');
    var propertyDrawerOverlay = document.getElementById('propertyDrawerOverlay');
    var propertyForm = document.getElementById('propertyForm');
    var propertyDrawerTitle = document.getElementById('propertyDrawerTitle');
    var propertiesCache = [];

    function openPropertyDrawer(property) {
      propertyForm.reset();
      propertyForm.elements['_id'].value = property ? getId(property) : '';
      propertyDrawerTitle.textContent = property ? 'Edit Property' : 'Add Property';
      if (property) {
        propertyForm.elements['name'].value = property.name || '';
        propertyForm.elements['area'].value = property.area || '';
        propertyForm.elements['type'].value = property.type || '';
        propertyForm.elements['pricePerNight'].value = property.pricePerNight || '';
        propertyForm.elements['bedrooms'].value = property.bedrooms || '';
        propertyForm.elements['coverImage'].value = property.coverImage || '';
        propertyForm.elements['description'].value = property.description || '';
        propertyForm.elements['isVerified'].checked = property.isVerified !== false;
        propertyForm.elements['isFeatured'].checked = !!property.isFeatured;
      } else {
        propertyForm.elements['isVerified'].checked = true;
      }
      document.getElementById('propertyFormStatus').textContent = '';
      propertyDrawerOverlay.classList.add('is-open');
    }
    function closePropertyDrawer() { propertyDrawerOverlay.classList.remove('is-open'); }

    document.getElementById('addPropertyBtn').addEventListener('click', function () { openPropertyDrawer(null); });
    propertyDrawerOverlay.addEventListener('click', function (e) { if (e.target === propertyDrawerOverlay) closePropertyDrawer(); });
    propertyDrawerOverlay.querySelectorAll('[data-drawer-close]').forEach(function (btn) {
      btn.addEventListener('click', closePropertyDrawer);
    });

    function renderProperties(list) {
      if (!list.length) {
        propertiesBody.innerHTML = '<tr><td colspan="7" class="text-center text-slate/50 py-8">No properties yet — add your first listing.</td></tr>';
        return;
      }
      propertiesBody.innerHTML = list.map(function (p) {
        var id = getId(p);
        return '<tr>' +
          '<td class="font-semibold text-ink">' + escapeHtml(p.name) + '</td>' +
          '<td>' + escapeHtml(p.area || '\u2014') + '</td>' +
          '<td>' + escapeHtml(p.type || '\u2014') + '</td>' +
          '<td>' + money(p.pricePerNight) + '</td>' +
          '<td>' + (p.isVerified !== false ? '<span class="admin-badge admin-badge-confirmed">Yes</span>' : '<span class="admin-badge admin-badge-pending">No</span>') + '</td>' +
          '<td>' + (p.isFeatured ? '<span class="admin-badge admin-badge-confirmed">Yes</span>' : '\u2014') + '</td>' +
          '<td class="text-right whitespace-nowrap">' +
            '<button class="admin-icon-btn" data-edit-property="' + escapeHtml(id) + '" aria-label="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
            '<button class="admin-icon-btn danger" data-delete-property="' + escapeHtml(id) + '" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    function loadProperties() {
      propertiesBody.innerHTML = '<tr><td colspan="7" class="text-center text-slate/50 py-8"><span class="neri-btn-loading"><span class="neri-spin"></span>Loading\u2026</span></td></tr>';
      window.NeriAPI.getProperties({ limit: 200 })
        .then(function (res) { propertiesCache = res.data || []; renderProperties(propertiesCache); })
        .catch(function () {
          propertiesBody.innerHTML = '<tr><td colspan="7" class="text-center text-slate/50 py-8">Could not load properties.</td></tr>';
        });
    }

    propertiesBody.addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-edit-property]');
      var delBtn = e.target.closest('[data-delete-property]');
      if (editBtn) {
        var id = editBtn.getAttribute('data-edit-property');
        var property = propertiesCache.filter(function (p) { return String(getId(p)) === id; })[0];
        openPropertyDrawer(property);
      }
      if (delBtn) {
        var delId = delBtn.getAttribute('data-delete-property');
        if (window.confirm('Delete this property? This cannot be undone.')) {
          window.NeriAPI.deleteProperty(delId)
            .then(loadProperties)
            .catch(function (err) { window.alert((err && err.message) || 'Could not delete property.'); });
        }
      }
    });

    propertyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var statusEl = document.getElementById('propertyFormStatus');
      var submitBtn = document.getElementById('propertySubmit');
      var id = propertyForm.elements['_id'].value;

      var payload = {
        name: propertyForm.elements['name'].value.trim(),
        area: propertyForm.elements['area'].value.trim(),
        type: propertyForm.elements['type'].value.trim(),
        pricePerNight: Number(propertyForm.elements['pricePerNight'].value) || 0,
        bedrooms: propertyForm.elements['bedrooms'].value ? Number(propertyForm.elements['bedrooms'].value) : undefined,
        coverImage: propertyForm.elements['coverImage'].value.trim() || undefined,
        description: propertyForm.elements['description'].value.trim() || undefined,
        isVerified: propertyForm.elements['isVerified'].checked,
        isFeatured: propertyForm.elements['isFeatured'].checked
      };

      if (!payload.name || !payload.area) {
        statusEl.textContent = 'Name and area are required.';
        statusEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = '';
      statusEl.className = 'text-sm min-h-[1.25rem]';

      var request = id ? window.NeriAPI.updateProperty(id, payload) : window.NeriAPI.createProperty(payload);
      request
        .then(function () {
          statusEl.textContent = 'Saved.';
          statusEl.className = 'text-sm min-h-[1.25rem] text-verified font-semibold';
          loadProperties();
          setTimeout(closePropertyDrawer, 500);
        })
        .catch(function (err) {
          statusEl.textContent = (err && err.message) || 'Could not save this property.';
          statusEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        })
        .finally(function () { submitBtn.disabled = false; });
    });

    /* ---------------- Bookings ---------------- */
    var bookingsBodyMain = document.getElementById('bookingsBody');
    var bookingsCache = [];

    function renderBookings(list) {
      if (!list.length) {
        bookingsBodyMain.innerHTML = '<tr><td colspan="6" class="text-center text-slate/50 py-8">No bookings yet.</td></tr>';
        return;
      }
      bookingsBodyMain.innerHTML = list.map(function (b) {
        var id = getId(b);
        var status = b.status || 'pending';
        return '<tr>' +
          '<td class="font-semibold text-ink">' + escapeHtml(b.name) + '</td>' +
          '<td>' + escapeHtml(b.phone) + '</td>' +
          '<td>' + formatDate(b.checkin) + '</td>' +
          '<td class="max-w-[240px] truncate" title="' + escapeHtml(b.message || '') + '">' + escapeHtml(b.message || '\u2014') + '</td>' +
          '<td>' +
            '<select class="field rounded px-2.5 py-1.5 text-xs" data-booking-status="' + escapeHtml(id) + '">' +
              ['pending', 'confirmed', 'cancelled'].map(function (s) {
                return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
              }).join('') +
            '</select>' +
          '</td>' +
          '<td>' + formatDate(b.createdAt) + '</td>' +
          '</tr>';
      }).join('');
    }

    function loadBookings() {
      bookingsBodyMain.innerHTML = '<tr><td colspan="6" class="text-center text-slate/50 py-8"><span class="neri-btn-loading"><span class="neri-spin"></span>Loading\u2026</span></td></tr>';
      window.NeriAPI.getBookings({ limit: 200 })
        .then(function (res) { bookingsCache = res.data || []; renderBookings(bookingsCache); })
        .catch(function () {
          bookingsBodyMain.innerHTML = '<tr><td colspan="6" class="text-center text-slate/50 py-8">Could not load bookings.</td></tr>';
        });
    }

    var refreshBookingsBtn = document.getElementById('refreshBookingsBtn');
    if (refreshBookingsBtn) refreshBookingsBtn.addEventListener('click', loadBookings);

    bookingsBodyMain.addEventListener('change', function (e) {
      var select = e.target.closest('[data-booking-status]');
      if (!select) return;
      var id = select.getAttribute('data-booking-status');
      var newStatus = select.value;
      select.disabled = true;
      window.NeriAPI.updateBookingStatus(id, newStatus)
        .catch(function (err) { window.alert((err && err.message) || 'Could not update booking status.'); })
        .finally(function () { select.disabled = false; });
    });

    /* ---------------- Blog ---------------- */
    var blogBody = document.getElementById('blogBody');
    var postDrawerOverlay = document.getElementById('postDrawerOverlay');
    var postForm = document.getElementById('postForm');
    var postDrawerTitle = document.getElementById('postDrawerTitle');
    var postsCache = [];

    function openPostDrawer(post) {
      postForm.reset();
      postForm.elements['_id'].value = post ? getId(post) : '';
      postDrawerTitle.textContent = post ? 'Edit Post' : 'New Post';
      if (post) {
        postForm.elements['title'].value = post.title || '';
        postForm.elements['slug'].value = post.slug || '';
        postForm.elements['category'].value = post.category || '';
        postForm.elements['excerpt'].value = post.excerpt || '';
        postForm.elements['content'].value = post.content || '';
        postForm.elements['published'].checked = post.published !== false;
      } else {
        postForm.elements['published'].checked = true;
      }
      document.getElementById('postFormStatus').textContent = '';
      postDrawerOverlay.classList.add('is-open');
    }
    function closePostDrawer() { postDrawerOverlay.classList.remove('is-open'); }

    document.getElementById('addPostBtn').addEventListener('click', function () { openPostDrawer(null); });
    postDrawerOverlay.addEventListener('click', function (e) { if (e.target === postDrawerOverlay) closePostDrawer(); });
    postDrawerOverlay.querySelectorAll('[data-drawer-close]').forEach(function (btn) {
      btn.addEventListener('click', closePostDrawer);
    });

    function renderBlogPosts(list) {
      if (!list.length) {
        blogBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate/50 py-8">No posts yet — publish your first guide.</td></tr>';
        return;
      }
      blogBody.innerHTML = list.map(function (p) {
        var id = getId(p);
        return '<tr>' +
          '<td class="font-semibold text-ink">' + escapeHtml(p.title) + '</td>' +
          '<td>' + escapeHtml(p.category || '\u2014') + '</td>' +
          '<td class="font-mono text-xs text-slate/60">' + escapeHtml(p.slug || '\u2014') + '</td>' +
          '<td>' + (p.published !== false ? '<span class="admin-badge admin-badge-confirmed">Yes</span>' : '<span class="admin-badge admin-badge-pending">Draft</span>') + '</td>' +
          '<td class="text-right whitespace-nowrap">' +
            '<button class="admin-icon-btn" data-edit-post="' + escapeHtml(id) + '" aria-label="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
            '<button class="admin-icon-btn danger" data-delete-post="' + escapeHtml(id) + '" aria-label="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    function loadBlogPosts() {
      blogBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate/50 py-8"><span class="neri-btn-loading"><span class="neri-spin"></span>Loading\u2026</span></td></tr>';
      window.NeriAPI.getBlogPosts({ limit: 200 })
        .then(function (res) { postsCache = res.data || []; renderBlogPosts(postsCache); })
        .catch(function () {
          blogBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate/50 py-8">Could not load blog posts.</td></tr>';
        });
    }

    blogBody.addEventListener('click', function (e) {
      var editBtn = e.target.closest('[data-edit-post]');
      var delBtn = e.target.closest('[data-delete-post]');
      if (editBtn) {
        var id = editBtn.getAttribute('data-edit-post');
        var post = postsCache.filter(function (p) { return String(getId(p)) === id; })[0];
        openPostDrawer(post);
      }
      if (delBtn) {
        var delId = delBtn.getAttribute('data-delete-post');
        if (window.confirm('Delete this post? This cannot be undone.')) {
          window.NeriAPI.deleteBlogPost(delId)
            .then(loadBlogPosts)
            .catch(function (err) { window.alert((err && err.message) || 'Could not delete post.'); });
        }
      }
    });

    postForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var statusEl = document.getElementById('postFormStatus');
      var submitBtn = document.getElementById('postSubmit');
      var id = postForm.elements['_id'].value;

      var payload = {
        title: postForm.elements['title'].value.trim(),
        slug: postForm.elements['slug'].value.trim() || undefined,
        category: postForm.elements['category'].value.trim() || undefined,
        excerpt: postForm.elements['excerpt'].value.trim(),
        content: postForm.elements['content'].value.trim(),
        published: postForm.elements['published'].checked
      };

      if (!payload.title || !payload.content) {
        statusEl.textContent = 'Title and content are required.';
        statusEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = '';
      statusEl.className = 'text-sm min-h-[1.25rem]';

      var request = id ? window.NeriAPI.updateBlogPost(id, payload) : window.NeriAPI.createBlogPost(payload);
      request
        .then(function () {
          statusEl.textContent = 'Saved.';
          statusEl.className = 'text-sm min-h-[1.25rem] text-verified font-semibold';
          loadBlogPosts();
          setTimeout(closePostDrawer, 500);
        })
        .catch(function (err) {
          statusEl.textContent = (err && err.message) || 'Could not save this post.';
          statusEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        })
        .finally(function () { submitBtn.disabled = false; });
    });
  });
})();
