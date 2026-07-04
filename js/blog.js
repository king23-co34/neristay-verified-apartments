/* ===========================================================
   Neristay — Live Blog (blog.html)
   -----------------------------------------------------------
   Renders the post index and individual posts from the live
   backend. A post is opened via blog.html?slug=<slug>.
   =========================================================== */
(function () {
  'use strict';

  var listSection = document.getElementById('blogListSection');
  var listGrid = document.getElementById('blogListGrid');
  var postSection = document.getElementById('blogPostSection');
  var postContent = document.getElementById('blogPostContent');

  if (!window.NeriAPI) return;

  function paramSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function renderParagraphs(container, text) {
    var parts = String(text || '').split(/\n{2,}|\r?\n/).filter(function (p) { return p.trim(); });
    if (!parts.length) parts = [text || ''];
    parts.forEach(function (part) {
      var p = document.createElement('p');
      p.textContent = part;
      container.appendChild(p);
    });
  }

  function showList() {
    postSection.classList.add('hidden');
    listSection.classList.remove('hidden');
  }

  function showPost() {
    listSection.classList.add('hidden');
    postSection.classList.remove('hidden');
  }

  function renderListSkeletonError() {
    listGrid.innerHTML =
      '<div class="col-span-full neri-error-note">We could not load the blog right now. ' +
      '<a href="tel:+2347064356536" class="text-clay underline">Call 0706 435 6536</a> or check back shortly.</div>';
  }

  function loadList() {
    window.NeriAPI
      .getBlogPosts({ limit: 20 }, function onSlowRetry() {
        listGrid.innerHTML =
          '<div class="col-span-full neri-loading-panel"><div class="neri-loader-brand"></div><p>Waking up the blog\u2026</p></div>';
      })
      .then(function (res) {
        var posts = (res && res.data) || [];
        if (!posts.length) {
          listGrid.innerHTML = '<div class="col-span-full neri-error-note">New guides are on the way — check back soon.</div>';
          return;
        }
        listGrid.innerHTML = '';
        posts.forEach(function (post, idx) {
          var card = document.createElement('a');
          card.href = 'blog.html?slug=' + encodeURIComponent(post.slug);
          card.className = 'reveal is-visible block bg-white rounded-xl border border-black/5 p-7 hover:shadow-lg transition-shadow';
          var eyebrow = document.createElement('p');
          eyebrow.className = 'font-eyebrow text-brass text-[10px] uppercase mb-3';
          eyebrow.textContent = post.category || 'Guides';
          var h2 = document.createElement('h2');
          h2.className = 'font-display text-lg font-semibold text-ink mb-2';
          h2.textContent = post.title;
          var p = document.createElement('p');
          p.className = 'text-sm text-slate/70 leading-relaxed';
          p.textContent = post.excerpt;
          card.appendChild(eyebrow);
          card.appendChild(h2);
          card.appendChild(p);
          listGrid.appendChild(card);
        });
      })
      .catch(function () {
        renderListSkeletonError();
      });
  }

  function loadPost(slug) {
    window.NeriAPI
      .getBlogPost(slug, function onSlowRetry() {
        postContent.innerHTML =
          '<div class="neri-loading-panel"><div class="neri-loader-brand"></div><p>Waking up the blog\u2026</p></div>';
      })
      .then(function (res) {
        var post = res && res.data;
        if (!post) throw new Error('Not found');

        document.title = post.seoTitle || post.title + ' | Neristay Blog';
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', post.seoDescription || post.excerpt || '');

        postContent.innerHTML = '';

        var eyebrow = document.createElement('p');
        eyebrow.className = 'font-eyebrow text-clay text-xs uppercase mb-3 mt-6';
        eyebrow.textContent = post.category || 'Guides';

        var h1 = document.createElement('h1');
        h1.className = 'font-display text-3xl sm:text-4xl font-semibold text-ink mb-3';
        h1.textContent = post.title;

        var meta = document.createElement('p');
        meta.className = 'text-xs text-slate/50 mb-8 font-mono uppercase tracking-wide';
        meta.textContent = formatDate(post.publishedAt || post.createdAt);

        var body = document.createElement('div');
        body.className = 'prose-custom text-slate/80 leading-relaxed space-y-4 text-[15px]';
        renderParagraphs(body, post.content);

        var cta = document.createElement('p');
        cta.className = 'mt-10';
        cta.innerHTML = 'Ready to book? <a href="index.html#booking" class="text-clay underline">Check availability</a> for your dates.';

        postContent.appendChild(eyebrow);
        postContent.appendChild(h1);
        if (meta.textContent) postContent.appendChild(meta);
        postContent.appendChild(body);
        postContent.appendChild(cta);
      })
      .catch(function () {
        postContent.innerHTML =
          '<div class="neri-error-note">We could not load this article. ' +
          '<a href="blog.html" class="text-clay underline">Back to all articles</a>.</div>';
      });
  }

  var slug = paramSlug();
  if (listGrid && postContent) {
    if (slug) {
      showPost();
      loadPost(slug);
    } else {
      showList();
      loadList();
    }
  }

  /* ---------------------------------------------------------
     Homepage "From The Blog" teaser (3 latest posts)
     --------------------------------------------------------- */
  var teaserGrid = document.getElementById('blogTeaserGrid');
  if (teaserGrid) {
    window.NeriAPI
      .getBlogPosts({ limit: 3 })
      .then(function (res) {
        var posts = (res && res.data) || [];
        if (!posts.length) {
          teaserGrid.innerHTML =
            '<div class="col-span-full neri-error-note">New guides are on the way — check back soon.</div>';
          return;
        }
        teaserGrid.innerHTML = '';
        posts.forEach(function (post) {
          var card = document.createElement('a');
          card.href = 'blog.html?slug=' + encodeURIComponent(post.slug);
          card.className = 'reveal is-visible block bg-white rounded-xl border border-black/5 p-7 hover:shadow-lg transition-shadow';
          var eyebrow = document.createElement('p');
          eyebrow.className = 'font-eyebrow text-brass text-[10px] uppercase mb-3';
          eyebrow.textContent = post.category || 'Guides';
          var h3 = document.createElement('h3');
          h3.className = 'font-display text-lg font-semibold text-ink mb-2';
          h3.textContent = post.title;
          var p = document.createElement('p');
          p.className = 'text-sm text-slate/70 leading-relaxed';
          p.textContent = post.excerpt;
          card.appendChild(eyebrow);
          card.appendChild(h3);
          card.appendChild(p);
          teaserGrid.appendChild(card);
        });
      })
      .catch(function () {
        teaserGrid.innerHTML =
          '<div class="col-span-full neri-error-note">Visit the <a href="blog.html" class="text-clay underline">blog</a> for our latest guides.</div>';
      });
  }
})();
