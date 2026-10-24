// FALVIO — shared chrome (header, footer, cart, search) and page renderers.
(function () {
  'use strict';
  var C = window.FALVIO;
  var page = document.body.getAttribute('data-page');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = new Intl.NumberFormat(C.locale, { style: 'currency', currency: C.currency });
  var money = function (n) { return fmt.format(n); };
  var byId = function (id) { return C.products.filter(function (p) { return p.id === id; })[0]; };
  var MAX_QTY = 10;

  var ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 10V6.5a3 3 0 016 0V10"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var NAV = [['shop.html', 'Shop', 'shop'], ['story.html', 'Our Story', 'story'], ['fragrance.html', 'Fragrance', 'fragrance'], ['contact.html', 'Contact', 'contact']];
  var navLinks = NAV.map(function (n) { return '<a href="' + n[0] + '"' + (page === n[2] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');

  /* ---------- cart state (localStorage, with in-memory fallback for private modes) ---------- */
  var KEY = 'falvio-cart-v1';
  var memory = [];
  function readCart() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { raw = memory; }
    if (!Array.isArray(raw)) return [];
    // stored data is untrusted: keep only known products and sane quantities
    return raw.filter(function (i) { return i && byId(i.id) && Number.isInteger(i.qty) && i.qty > 0; })
      .map(function (i) { return { id: i.id, qty: Math.min(i.qty, MAX_QTY) }; });
  }
  function writeCart(items) {
    memory = items;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage blocked: memory copy still works this visit */ }
    renderCart();
    updateBadge(true);
    if (page === 'checkout') renderCheckout();
  }
  var cart = {
    items: readCart,
    count: function () { return readCart().reduce(function (s, i) { return s + i.qty; }, 0); },
    subtotal: function () { return readCart().reduce(function (s, i) { return s + byId(i.id).price * i.qty; }, 0); },
    set: function (id, qty) {
      qty = Math.max(0, Math.min(MAX_QTY, qty | 0));
      var items = readCart().filter(function (i) { return i.id !== id; });
      var at = readCart().map(function (i) { return i.id; }).indexOf(id);
      if (qty > 0) items.splice(at < 0 ? items.length : at, 0, { id: id, qty: qty });
      writeCart(items);
    },
    add: function (id, qty) {
      var cur = readCart().filter(function (i) { return i.id === id; })[0];
      cart.set(id, (cur ? cur.qty : 0) + (qty || 1));
    },
    clear: function () { writeCart([]); }
  };
  window.addEventListener('storage', function (e) { if (e.key === KEY) { renderCart(); updateBadge(); } });

  /* ---------- chrome ---------- */
  var top = '<a class="skip" href="#main">Skip to content</a>' +
    (C.announcement ? '<div class="announce">' + esc(C.announcement) + '</div>' : '') +
    '<header class="header" id="header">' +
    '<nav class="nav" aria-label="Main">' + navLinks + '</nav>' +
    '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav">' + ICON.menu + '</button>' +
    '<a class="brand" href="index.html" aria-label="FALVIO Perfume — home"><img src="assets/img/logo-word.webp" alt="FALVIO Perfume" width="760" height="238"></a>' +
    '<div class="tools">' +
    '<button class="icon-btn" id="searchBtn" aria-label="Search" aria-controls="search">' + ICON.search + '</button>' +
    '<button class="icon-btn" id="bagBtn" aria-label="Shopping bag" aria-controls="drawer">' + ICON.bag + '<span class="badge" id="badge" aria-hidden="true">0</span></button>' +
    '</div></header>' +
    '<div class="mobile-nav" id="mobileNav" role="dialog" aria-modal="true" aria-label="Menu" inert>' +
    '<button class="icon-btn close" data-close aria-label="Close menu">' + ICON.close + '</button>' +
    '<ul><li><a href="index.html">Home</a></li>' + NAV.map(function (n) { return '<li><a href="' + n[0] + '">' + n[1] + '</a></li>'; }).join('') + '</ul></div>' +
    '<div class="search" id="search" role="dialog" aria-modal="true" aria-label="Search" inert>' +
    '<button class="icon-btn close" data-close aria-label="Close search">' + ICON.close + '</button>' +
    '<div class="search-box"><label class="eyebrow" for="q">Search FALVIO</label><input id="q" type="search" placeholder="Eau de parfum, amber, 50 ml…" autocomplete="off"><ul class="search-results" id="results" aria-live="polite"></ul></div></div>' +
    '<div class="scrim" id="scrim"></div>' +
    '<aside class="drawer glass" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" inert>' +
    '<header><h2 class="silver" id="drawerTitle">Your Bag</h2><button class="icon-btn" data-close aria-label="Close bag">' + ICON.close + '</button></header>' +
    '<div class="items" id="cartItems"></div><footer id="cartFoot"></footer></aside>' +
    '<div class="toast glass" id="toast" role="status" aria-live="polite"></div>';
  document.body.insertAdjacentHTML('afterbegin', top);

  var contact = C.contact || {};
  var footer = '<footer class="footer"><div class="wrap"><div class="footer-top">' +
    '<div><img class="footer-logo" src="assets/img/logo-silver.webp" alt="FALVIO Perfume" width="900" height="896" loading="lazy"></div>' +
    '<div><h4>Explore</h4><ul>' + NAV.map(function (n) { return '<li><a href="' + n[0] + '">' + n[1] + '</a></li>'; }).join('') + '</ul></div>' +
    '<div><h4>Client Care</h4><ul>' +
    (contact.email ? '<li><a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a></li>' : '') +
    (contact.phone ? '<li><a href="tel:' + esc(contact.phone.replace(/\s/g, '')) + '">' + esc(contact.phone) + '</a></li>' : '') +
    (contact.hours ? '<li class="muted">' + esc(contact.hours) + '</li>' : '') + '</ul></div>' +
    '<div><h4>Follow</h4><ul>' + (contact.instagram ? '<li><a href="' + esc(contact.instagram) + '" target="_blank" rel="noopener">Instagram</a></li>' : '') +
    '<li><a href="contact.html">Write to us</a></li></ul></div>' +
    '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' FALVIO Perfume. All rights reserved.</span><span>Crafted in glass, wood and silver.</span></div></div></footer>';
  document.body.insertAdjacentHTML('beforeend', footer);

  var header = $('#header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- layers (drawer, menu, search): focus, Escape, scroll lock ---------- */
  var openLayer = null, lastFocus = null;
  function open(el, focusSel) {
    if (openLayer) close();
    lastFocus = document.activeElement;
    openLayer = el;
    el.removeAttribute('inert');
    el.classList.add('open');
    if (el.id === 'drawer') $('#scrim').classList.add('open');
    if (el.id === 'mobileNav') $('#menuBtn').setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var f = $(focusSel || '[data-close]', el); if (f) f.focus(); }, 60);
  }
  function close() {
    if (!openLayer) return;
    openLayer.classList.remove('open');
    openLayer.setAttribute('inert', '');
    $('#scrim').classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    openLayer = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (!openLayer) return;
    if (e.key === 'Escape') return close();
    if (e.key === 'Tab') { // keep focus inside the open layer
      var f = $$('a[href],button:not([disabled]),input,select,textarea', openLayer).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('#scrim').addEventListener('click', close);
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
  $('#bagBtn').addEventListener('click', function () { open($('#drawer')); });
  $('#menuBtn').addEventListener('click', function () { open($('#mobileNav'), 'a'); });
  $('#searchBtn').addEventListener('click', function () { open($('#search'), '#q'); renderSearch(''); });
  $$('#mobileNav a').forEach(function (a) { a.addEventListener('click', close); });

  /* ---------- search ---------- */
  function renderSearch(q) {
    q = q.trim().toLowerCase();
    var notes = [].concat(C.notes.top, C.notes.heart, C.notes.base).join(' ').toLowerCase();
    var hits = C.products.filter(function (p) {
      return !q || (p.name + ' ' + p.size + ' ' + p.summary + ' ' + notes + ' perfume parfum fragrance').toLowerCase().indexOf(q) > -1;
    });
    $('#results').innerHTML = hits.length ? hits.map(function (p) {
      return '<li><a href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.thumb) + '" alt="" width="52" height="64"><span><span class="display" style="font-size:22px;display:block">' + esc(p.name) + '</span><span class="muted">' + esc(p.size) + ' · ' + money(p.price) + '</span></span></a></li>';
    }).join('') : '<li class="muted" style="padding:14px 0">No results for “' + esc(q) + '”.</li>';
  }
  $('#q').addEventListener('input', function (e) { renderSearch(e.target.value); });

  /* ---------- cart UI ---------- */
  function qtyControl(id, qty) {
    return '<div class="qty" role="group" aria-label="Quantity"><button type="button" data-dec="' + esc(id) + '" aria-label="Decrease quantity">−</button><span aria-live="polite">' + qty + '</span><button type="button" data-inc="' + esc(id) + '" aria-label="Increase quantity"' + (qty >= MAX_QTY ? ' disabled' : '') + '>+</button></div>';
  }
  function renderCart() {
    var items = cart.items();
    var box = $('#cartItems'), foot = $('#cartFoot');
    if (!items.length) {
      box.innerHTML = '<div class="empty"><p class="lede">Your bag is empty.</p><a class="btn btn-dark" href="shop.html"><span>Discover the collection</span></a></div>';
      foot.innerHTML = '';
      return;
    }
    box.innerHTML = items.map(function (i) {
      var p = byId(i.id);
      return '<div class="line-item"><img src="' + esc(p.thumb) + '" alt="" width="78" height="96"><div><h3 class="silver">' + esc(p.name) + '</h3><span class="size">' + esc(p.size) + '</span>' + qtyControl(p.id, i.qty) + '</div>' +
        '<div><span class="price">' + money(p.price * i.qty) + '</span><button class="remove" data-remove="' + esc(p.id) + '">Remove</button></div></div>';
    }).join('');
    foot.innerHTML = '<div class="row"><span class="eyebrow" style="margin:0">Subtotal</span><span class="price">' + money(cart.subtotal()) + '</span></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Shipping and taxes are calculated at checkout.</p>' +
      '<a class="btn btn-dark" href="checkout.html"><span>Checkout</span></a>';
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-inc],[data-dec],[data-remove],[data-add]');
    if (!t) return;
    var cur = function (id) { var c = cart.items().filter(function (i) { return i.id === id; })[0]; return c ? c.qty : 0; };
    if (t.dataset.inc) cart.set(t.dataset.inc, cur(t.dataset.inc) + 1);
    if (t.dataset.dec) cart.set(t.dataset.dec, cur(t.dataset.dec) - 1);
    if (t.dataset.remove) cart.set(t.dataset.remove, 0);
    if (t.dataset.add) addToBag(t.dataset.add, 1);
  });
  function addToBag(id, qty) {
    var before = cart.items().filter(function (i) { return i.id === id; })[0];
    if (before && before.qty >= MAX_QTY) return toast('You can add up to ' + MAX_QTY + ' of each item.');
    cart.add(id, qty);
    open($('#drawer'));
  }
  function updateBadge(bump) {
    var n = cart.count(), b = $('#badge');
    b.textContent = n;
    b.classList.toggle('on', n > 0);
    $('#bagBtn').setAttribute('aria-label', 'Shopping bag, ' + n + (n === 1 ? ' item' : ' items'));
    if (bump && n) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- reveals ---------- */
  function watchReveals() {
    var els = $$('.reveal:not(.in), .cut:not(.in)');
    if (!('IntersectionObserver' in window)) return els.forEach(function (el) { el.classList.add('in'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- product cards ---------- */
  function card(p, i) {
    return '<article class="product-card glass reveal" style="--d:' + (i * 0.12) + 's">' +
      '<a class="media" href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.image) + '" alt="' + esc(p.name + ' ' + p.size) + '" loading="lazy"></a>' +
      '<div class="info"><div><h3 class="silver"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3><span class="size">' + esc(p.size) + ' · Eau de Parfum</span></div><span class="price">' + money(p.price) + '</span></div>' +
      '<div class="actions"><button class="btn btn-dark" data-add="' + esc(p.id) + '"><span>Add to bag</span></button><a class="btn btn-glass glass" href="product.html?id=' + encodeURIComponent(p.id) + '">Details</a></div></article>';
  }
  $$('[data-products]').forEach(function (el) { el.innerHTML = C.products.map(card).join(''); });
  $$('[data-notes-mini]').forEach(function (el) {
    el.innerHTML = [['Top', C.notes.top], ['Heart', C.notes.heart], ['Base', C.notes.base]].map(function (n) {
      return '<div><b>' + n[0] + '</b><span>' + esc(n[1].slice(0, 2).join(', ')) + '</span></div>';
    }).join('');
  });
  $$('[data-pyramid]').forEach(function (el) {
    el.innerHTML = [['I', 'Top Notes', 'The opening', C.notes.top], ['II', 'Heart Notes', 'The character', C.notes.heart], ['III', 'Base Notes', 'The signature', C.notes.base]].map(function (n, i) {
      return '<div class="glass reveal" style="--d:' + (i * 0.15) + 's"><span class="tier">' + n[0] + ' · ' + n[2] + '</span><h3 class="silver">' + n[1] + '</h3><ul>' + n[3].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  });

  /* ---------- product page ---------- */
  function renderProduct() {
    var id = new URLSearchParams(location.search).get('id');
    var p = byId(id) || C.products[0];
    document.title = p.name + ' ' + p.size + ' — FALVIO Perfume';
    var siblings = C.products.filter(function (x) { return x.name === p.name; });
    var qty = 1;
    $('#pdp').innerHTML =
      '<div class="pdp-media"><div class="pdp-main halo"><img id="mainImg" src="' + esc(p.gallery[0]) + '" alt="' + esc(p.name + ' ' + p.size) + '"></div>' +
      '<div class="thumbs" role="group" aria-label="Product images">' + p.gallery.map(function (g, i) {
        return '<button type="button" data-img="' + esc(g) + '" aria-label="View image ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '><img src="' + esc(g) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div></div>' +
      '<div class="pdp-info"><span class="eyebrow">Eau de Parfum</span><h1 class="silver h-lg">' + esc(p.name) + '</h1>' +
      '<p class="lede">' + esc(p.summary) + '</p><span class="price">' + money(p.price) + '</span>' +
      '<span class="eyebrow" style="margin-bottom:8px">Size</span><div class="sizes">' + siblings.map(function (s) {
        return '<a href="product.html?id=' + encodeURIComponent(s.id) + '"' + (s.id === p.id ? ' aria-current="true"' : '') + '>' + esc(s.size) + '</a>';
      }).join('') + '</div>' +
      '<div class="buy-row"><div class="qty" role="group" aria-label="Quantity"><button type="button" id="qMinus" aria-label="Decrease quantity">−</button><output id="qOut" aria-live="polite">1</output><button type="button" id="qPlus" aria-label="Increase quantity">+</button></div>' +
      '<button class="btn btn-dark" id="addBtn"><span>Add to bag</span></button></div>' +
      '<div class="details">' +
      '<details open><summary>The Composition</summary><div><div class="notes-mini" style="margin:0;border:0;padding:0">' +
      [['Top', C.notes.top], ['Heart', C.notes.heart], ['Base', C.notes.base]].map(function (n) { return '<div><b>' + n[0] + '</b><span>' + esc(n[1].join(', ')) + '</span></div>'; }).join('') + '</div></div></details>' +
      '<details><summary>The Bottle</summary><div>Heavy rectangular glass with softened edges, a natural walnut cap, and the FALVIO crown and monogram printed on the front.</div></details>' +
      '<details><summary>How to Wear</summary><div>Spray from a short distance onto pulse points — the neck, the inner wrists, behind the ears. Let it settle on the skin rather than rubbing it in.</div></details>' +
      '<details><summary>Delivery &amp; Returns</summary><div>Delivery options and costs are shown at checkout. For questions about an order, <a class="link-line" href="contact.html">contact client care</a>.</div></details>' +
      '</div></div>';
    $$('[data-img]').forEach(function (b) {
      b.addEventListener('click', function () {
        var img = $('#mainImg');
        img.src = b.dataset.img;
        img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
        $$('[data-img]').forEach(function (x) { x.setAttribute('aria-current', String(x === b)); });
      });
    });
    var out = $('#qOut');
    var sync = function () { out.textContent = qty; $('#qMinus').disabled = qty <= 1; $('#qPlus').disabled = qty >= MAX_QTY; };
    $('#qMinus').addEventListener('click', function () { qty = Math.max(1, qty - 1); sync(); });
    $('#qPlus').addEventListener('click', function () { qty = Math.min(MAX_QTY, qty + 1); sync(); });
    $('#addBtn').addEventListener('click', function () {
      var have = (cart.items().filter(function (i) { return i.id === p.id; })[0] || { qty: 0 }).qty;
      if (have + qty > MAX_QTY) return toast('You can add up to ' + MAX_QTY + ' of each item.');
      addToBag(p.id, qty);
    });
    sync();
  }

  /* ---------- forms (contact, newsletter, checkout) ---------- */
  function validate(form) {
    var ok = true;
    $$('input,textarea,select', form).forEach(function (f) {
      if (f.type === 'hidden' || f.name === '_gotcha') return;
      var bad = !f.checkValidity();
      f.setAttribute('aria-invalid', String(bad));
      var err = f.parentNode.querySelector('.err');
      if (err) err.textContent = bad ? (f.validity.valueMissing ? 'This field is required.' : f.type === 'email' ? 'Please enter a valid email address.' : 'Please check this field.') : '';
      if (bad && ok) { f.focus(); ok = false; }
    });
    return ok;
  }
  // Sends to C.formEndpoint (e.g. a Formspree URL) when configured; otherwise succeeds locally.
  function submitForm(form, extra) {
    if (form.querySelector('[name="_gotcha"]') && form.querySelector('[name="_gotcha"]').value) return Promise.resolve(); // bot trap
    if (!C.formEndpoint) return Promise.resolve();
    var data = new FormData(form);
    Object.keys(extra || {}).forEach(function (k) { data.append(k, extra[k]); });
    return fetch(C.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('Request failed'); });
  }
  $$('form[data-form]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var btn = $('button[type="submit"]', form), msg = $('.form-msg', form) || $('.form-msg', form.parentNode);
      var kind = form.dataset.form;
      var extra = kind === 'order' ? { order: cart.items().map(function (i) { var p = byId(i.id); return i.qty + ' × ' + p.name + ' ' + p.size; }).join('; '), total: money(cart.subtotal()) } : { form: kind };
      if (kind === 'order' && !cart.count()) return;
      btn.disabled = true;
      submitForm(form, extra).then(function () {
        if (kind === 'order') {
          var ref = 'FV-' + Date.now().toString(36).toUpperCase().slice(-6);
          cart.clear();
          $('#checkoutArea').innerHTML = '<div class="glass center" style="padding:clamp(36px,6vw,80px)"><span class="eyebrow">Order request received</span><h2 class="silver h-lg" style="margin-bottom:22px">Thank you.</h2><p class="lede">Your reference is <strong>' + ref + '</strong>. Our client care team will contact you by email to confirm payment and delivery.</p><p style="margin-top:34px"><a class="btn btn-dark" href="index.html"><span>Return home</span></a></p></div>';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        form.reset();
        $$('[aria-invalid]', form).forEach(function (f) { f.removeAttribute('aria-invalid'); });
        msg.textContent = kind === 'newsletter' ? 'Thank you — you are on the list.' : 'Thank you. Your message has been sent; we will reply by email.';
      }).catch(function () {
        msg.textContent = 'Sorry, something went wrong. Please try again or email us directly.';
      }).then(function () { if (btn) btn.disabled = false; });
    });
    $$('input,textarea', form).forEach(function (f) {
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true' && f.checkValidity()) { f.setAttribute('aria-invalid', 'false'); var err = f.parentNode.querySelector('.err'); if (err) err.textContent = ''; } });
    });
  });

  /* ---------- checkout ---------- */
  function renderCheckout() {
    var sum = $('#summary');
    if (!sum) return;
    var items = cart.items();
    if (!items.length && $('#orderForm')) {
      $('#checkoutArea').innerHTML = '<div class="glass empty"><p class="lede">Your bag is empty.</p><a class="btn btn-dark" href="shop.html"><span>Discover the collection</span></a></div>';
      return;
    }
    sum.innerHTML = '<h2 class="silver h-md" style="margin-bottom:18px">Summary</h2>' + items.map(function (i) {
      var p = byId(i.id);
      return '<div class="summary-line"><span>' + i.qty + ' × ' + esc(p.name) + ' <span class="muted">' + esc(p.size) + '</span></span><span>' + money(p.price * i.qty) + '</span></div>';
    }).join('') + '<div class="summary-line"><span>Shipping</span><span class="muted">Confirmed by email</span></div>' +
      '<div class="summary-line total"><span>Total</span><span>' + money(cart.subtotal()) + '</span></div>';
  }

  /* ---------- contact details ---------- */
  $$('[data-contact]').forEach(function (el) {
    el.innerHTML = (contact.email ? '<li><b>Email</b><a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a></li>' : '') +
      (contact.phone ? '<li><b>Telephone</b><a href="tel:' + esc(contact.phone.replace(/\s/g, '')) + '">' + esc(contact.phone) + '</a></li>' : '') +
      (contact.hours ? '<li><b>Hours</b>' + esc(contact.hours) + '</li>' : '');
  });

  /* ---------- film ---------- */
  $$('[data-film]').forEach(function (wrap) {
    var v = $('video', wrap), btn = $('button', wrap), label = $('span', btn);
    var userPaused = false;
    var set = function () { label.textContent = v.paused ? 'Play film' : 'Pause film'; };
    btn.addEventListener('click', function () { userPaused = !v.paused; if (v.paused) v.play(); else v.pause(); });
    v.addEventListener('play', set); v.addEventListener('pause', set);
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !userPaused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else if (!en[0].isIntersecting) v.pause();
      }, { threshold: 0.35 }).observe(wrap);
    }
    set();
  });

  if (page === 'product') renderProduct();
  if (page === 'checkout') renderCheckout();
  renderCart();
  updateBadge();
  watchReveals();
})();
