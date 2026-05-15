/* ================================================================
   Space Vault — app.js
================================================================ */

'use strict';

const CAT_META = {
  book:        { label: 'Books',         icon: '📚' },
  textbook:    { label: 'Textbooks',     icon: '📐' },
  electronics: { label: 'Electronics',   icon: '⚡' },
  telescope:   { label: 'Telescopes',    icon: '🔭' },
  lego:        { label: 'LEGO',          icon: '🧱' },
  movie:       { label: 'Movies',        icon: '🎬' },
  gadget:      { label: 'Gadgets',       icon: '✨' },
  diy:         { label: 'DIY',           icon: '🚀' },
  food:        { label: 'Food & Drinks', icon: '🌌' },
  travel:      { label: 'Travel',        icon: '🌍' },
};

let products  = [];
let activeCat = 'all';
let searchQ   = '';


/* ================================================================
   STARFIELD
================================================================ */

function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: Math.floor(canvas.width * canvas.height / 5500) }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.3 + 0.2,
      o:  Math.random(),
      v:  (Math.random() - 0.5) * 0.007,
    }));
  };

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.o += s.v;
      if (s.o > 1 || s.o < 0.04) s.v *= -1;
      s.o = Math.max(0.04, Math.min(1, s.o));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.o})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };

  window.addEventListener('resize', resize);
  resize();
  tick();
}


/* ================================================================
   VAULT ANIMATION
================================================================ */

function playVault() {
  const overlay  = document.getElementById('vault-overlay');
  const site     = document.getElementById('site');
  const wheel    = document.getElementById('v-wheel');
  const statusEl = document.getElementById('v-status');
  const progress = document.getElementById('v-progress');
  const skipBtn  = document.getElementById('v-skip');

  // Site starts invisible but rendered — visible through doors as they open
  site.style.opacity = '0';

  const steps = [
    [0,    'INITIALISING SYSTEMS...',  0],
    [500,  'SCANNING CREDENTIALS...',  28],
    [1000, 'BIOMETRIC VERIFIED ✓',     58],
    [1500, 'UNLOCKING MECHANISMS...',  82],
    [1900, 'ACCESS GRANTED',           100],
  ];

  steps.forEach(([delay, msg, pct]) => {
    setTimeout(() => {
      statusEl.textContent = msg;
      progress.style.width = pct + '%';
    }, delay);
  });

  // Spin wheel
  setTimeout(() => wheel.classList.add('spinning'), 350);

  // Open doors + fade site in
  setTimeout(() => {
    overlay.classList.add('open');
    site.style.transition = 'opacity 0.9s ease';
    site.style.opacity    = '1';
  }, 2100);

  // Fade out overlay
  setTimeout(() => overlay.classList.add('gone'), 3000);

  // Remove from DOM
  setTimeout(() => overlay.remove(), 3600);

  // Skip handler
  skipBtn.addEventListener('click', () => {
    overlay.remove();
    site.style.opacity = '1';
  });
}


/* ================================================================
   WEEKLY PICKS (deterministic by ISO week)
================================================================ */

function getISOWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function getWeeklyPicks(items, count = 5) {
  const now  = new Date();
  const seed = now.getFullYear() * 1000 + getISOWeek(now);
  const rng  = seededRng(seed);

  // Ensure diversity: at most 2 per category
  const shuffled  = [...items].sort(() => rng() - 0.5);
  const catCounts = {};
  const picks     = [];

  for (const item of shuffled) {
    if (picks.length >= count) break;
    const c = catCounts[item.category] || 0;
    if (c < 2) {
      picks.push(item);
      catCounts[item.category] = c + 1;
    }
  }

  // Fill up if needed
  if (picks.length < count) {
    for (const item of shuffled) {
      if (picks.length >= count) break;
      if (!picks.includes(item)) picks.push(item);
    }
  }

  return picks;
}

function getWeekDateRange() {
  const now     = new Date();
  const day     = now.getDay() || 7;
  const monday  = new Date(now); monday.setDate(now.getDate() - day + 1);
  const sunday  = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const fmt     = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `Week ${getISOWeek(now)} · ${fmt(monday)} – ${fmt(sunday)}`;
}

function renderWeekly(items) {
  const grid = document.getElementById('weekly-grid');
  const meta = document.getElementById('weekly-meta');
  if (!grid) return;

  meta.textContent = getWeekDateRange();

  const picks = getWeeklyPicks(items);
  grid.innerHTML = '';

  picks.forEach((p, i) => {
    const m    = CAT_META[p.category] || { label: p.category, icon: '🛸' };
    const card = document.createElement('div');
    card.className = 'weekly-card vi cat-' + p.category;
    card.dataset.id = p.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', p.title);

    card.innerHTML = `
      <span class="weekly-badge">Pick #${i + 1}</span>
      <div class="vi-top tc-${p.category}">
        ${p.image ? `<img src="${p.image}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <span class="vi-icon">${m.icon}</span>
      </div>
      <div class="vi-body">
        <span class="vi-cat">${m.label}</span>
        <div class="vi-title">${esc(p.title)}</div>
        <div class="vi-author">${esc(p.author)}</div>
        <div class="vi-price">${esc(p.price_approx)}</div>
      </div>
    `;

    card.addEventListener('click', () => openModal(p));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); } });
    grid.appendChild(card);
  });
}


/* ================================================================
   SHELF ROWS
================================================================ */

function renderShelves(items) {
  const container = document.getElementById('shelves');
  if (!container) return;
  container.innerHTML = '';

  const catOrder = Object.keys(CAT_META);

  for (const cat of catOrder) {
    const catItems = items.filter(p => p.category === cat);
    if (!catItems.length) continue;

    const m   = CAT_META[cat];
    const row = document.createElement('div');
    row.className  = `shelf-row`;
    row.dataset.cat = cat;

    row.innerHTML = `
      <div class="shelf-header">
        <span class="shelf-icon">${m.icon}</span>
        <span class="shelf-name">${m.label}</span>
        <span class="shelf-count">${catItems.length} item${catItems.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="shelf-track">
        <div class="shelf-items" id="shelf-${cat}"></div>
        <div class="shelf-ledge"></div>
      </div>
    `;

    container.appendChild(row);

    const track = row.querySelector(`#shelf-${cat}`);
    catItems.forEach(p => {
      track.appendChild(makeVaultItem(p, false));
    });
  }
}


/* ================================================================
   SEARCH / FILTER GRID
================================================================ */

function renderGrid(items) {
  const grid = document.getElementById('search-grid');
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(p => {
    const el = makeVaultItem(p, true);
    el.classList.add('gc');
    grid.appendChild(el);
  });
}


/* ================================================================
   VAULT ITEM ELEMENT (shared by shelf + grid)
================================================================ */

function makeVaultItem(p, isGrid) {
  const m  = CAT_META[p.category] || { label: p.category, icon: '🛸' };
  const el = document.createElement('div');
  el.className   = `vi cat-${p.category}`;
  el.dataset.id  = p.id;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', p.title);

  el.innerHTML = `
    ${p.sven_pick ? '<span class="vi-pick">Sven picks</span>' : ''}
    <div class="vi-top tc-${p.category}">
      ${p.image ? `<img src="${p.image}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <span class="vi-icon">${m.icon}</span>
    </div>
    <div class="vi-body">
      <span class="vi-cat">${m.label}</span>
      <div class="vi-title">${esc(p.title)}</div>
      <div class="vi-author">${esc(p.author)}</div>
      <div class="vi-price">${esc(p.price_approx)}</div>
    </div>
  `;

  el.addEventListener('click', () => openModal(p));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); } });

  if (!isGrid) attachTilt(el);

  return el;
}

function attachTilt(el) {
  const MAX = 7;
  el.addEventListener('mousemove', e => {
    const r  = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * -MAX;
    const ry = ((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) *  MAX;
    el.style.transform    = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-12px) scale(1.03)`;
    el.style.transition   = 'transform 0.06s ease-out, border-color .2s, box-shadow .2s';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform  = '';
    el.style.transition = 'transform 0.35s ease-out, border-color .2s, box-shadow .2s';
  });
}


/* ================================================================
   DETAIL MODAL
================================================================ */

function openModal(p) {
  const bg   = document.getElementById('modal-bg');
  const body = document.getElementById('modal-body');
  if (!bg || !body) return;

  const m       = CAT_META[p.category] || { label: p.category, icon: '🛸' };
  const hasLink = p.affiliate_url && p.affiliate_url !== '#TODO';
  const stars   = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  body.innerHTML = `
    <div class="modal-hero tc-${p.category}">
      ${p.image ? `<img src="${p.image}" alt="" onerror="this.remove()">` : ''}
      <span class="modal-hero-icon">${m.icon}</span>
    </div>
    <div class="modal-content">
      <div class="modal-top-row">
        <span class="modal-cat-badge vi-cat cat-${p.category}">${m.label}</span>
        <span class="modal-rating" title="${p.rating}/5 stars">${stars(p.rating)}</span>
      </div>
      <h2 id="modal-title">${esc(p.title)}</h2>
      <p class="modal-author">${esc(p.author)}</p>
      ${p.difficulty ? `<span class="modal-difficulty">${esc(p.difficulty)}</span>` : ''}
      <p class="modal-desc">${esc(p.description)}</p>
      ${p.tags && p.tags.length ? `
        <div class="modal-tags">
          ${p.tags.map(t => `<span class="modal-tag">#${esc(t)}</span>`).join('')}
        </div>
      ` : ''}
      <hr class="modal-divider">
      <div class="modal-footer">
        <div class="modal-price-wrap">
          <div class="modal-price-label">Approx. price</div>
          <div class="modal-price">${esc(p.price_approx)}</div>
        </div>
        ${hasLink
          ? `<a class="modal-buy" href="${p.affiliate_url}" target="_blank" rel="noopener noreferrer">
               Get it now →
             </a>`
          : `<span class="modal-buy no-link" title="Affiliate link coming soon">Link coming soon</span>`
        }
      </div>
      <p class="modal-affiliate-note">
        Affiliate link — a small commission may be earned at no extra cost to you.
      </p>
    </div>
  `;

  bg.classList.remove('hidden');
  bg.classList.remove('closing');
  document.body.style.overflow = 'hidden';

  document.getElementById('modal-title')?.focus();
}

function closeModal() {
  const bg = document.getElementById('modal-bg');
  if (!bg || bg.classList.contains('hidden')) return;

  bg.classList.add('closing');
  setTimeout(() => {
    bg.classList.add('hidden');
    bg.classList.remove('closing');
    document.body.style.overflow = '';
  }, 220);
}

function initModal() {
  const bg    = document.getElementById('modal-bg');
  const close = document.getElementById('modal-close');

  close?.addEventListener('click', closeModal);

  bg?.addEventListener('click', e => {
    if (e.target === bg) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}


/* ================================================================
   FILTER TABS + SEARCH
================================================================ */

function buildFilterTabs(items) {
  const container = document.getElementById('filter-tabs');
  if (!container) return;
  container.innerHTML = '';

  const cats = ['all', ...Object.keys(CAT_META).filter(c => items.some(p => p.category === c))];

  for (const cat of cats) {
    const btn = document.createElement('button');
    btn.className  = `ft-btn${cat === activeCat ? ' active' : ''}`;
    btn.dataset.cat = cat;

    if (cat === 'all') {
      btn.textContent = `All (${items.length})`;
    } else {
      const count = items.filter(p => p.category === cat).length;
      btn.textContent = `${CAT_META[cat].icon} ${CAT_META[cat].label} (${count})`;
    }

    btn.addEventListener('click', () => {
      activeCat = cat;
      container.querySelectorAll('.ft-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
      applyFilters();

      // Scroll to shelf row when clicking a specific category (shelf view)
      if (cat !== 'all' && !searchQ) {
        const row = document.querySelector(`.shelf-row[data-cat="${cat}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    container.appendChild(btn);
  }
}

function initSearch() {
  const input = document.getElementById('search');
  const clear = document.getElementById('search-clear');

  input?.addEventListener('input', () => {
    searchQ = input.value.trim();
    clear?.classList.toggle('hidden', !searchQ);
    applyFilters();
  });

  clear?.addEventListener('click', () => {
    if (input) input.value = '';
    searchQ = '';
    clear.classList.add('hidden');
    input?.focus();
    applyFilters();
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (input) input.value = '';
    searchQ   = '';
    activeCat = 'all';
    clear?.classList.add('hidden');
    document.querySelectorAll('.ft-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
    applyFilters();
  });
}

function applyFilters() {
  const shelves   = document.getElementById('shelves');
  const grid      = document.getElementById('search-grid');
  const emptyEl   = document.getElementById('empty');

  let filtered = products;

  if (activeCat !== 'all') filtered = filtered.filter(p => p.category === activeCat);

  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q)       ||
      p.author.toLowerCase().includes(q)      ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  const useGrid = searchQ || activeCat !== 'all';

  shelves?.classList.toggle('hidden', useGrid);
  grid?.classList.toggle('hidden', !useGrid);
  emptyEl?.classList.toggle('hidden', !!filtered.length);

  if (useGrid) {
    renderGrid(filtered);
  }
}


/* ================================================================
   STICKY CONTROLS SHADOW
================================================================ */

function initScrollEffects() {
  const bar = document.getElementById('controls-bar');
  if (!bar) return;
  const obs = new IntersectionObserver(
    ([e]) => bar.classList.toggle('scrolled', e.intersectionRatio < 1),
    { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
  );
  obs.observe(bar);
}


/* ================================================================
   HELPERS
================================================================ */

function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ================================================================
   BOOT
================================================================ */

async function init() {
  // Start starfield immediately (visible through vault doors as they open)
  initStarfield();

  // Play vault animation
  playVault();

  // Load products
  try {
    const res = await fetch('data/products.json');
    products  = await res.json();
  } catch (e) {
    console.error('[Space Vault] Could not load products.json', e);
    products = [];
  }

  // Init UI
  buildFilterTabs(products);
  renderWeekly(products);
  renderShelves(products);
  initSearch();
  initModal();
  initScrollEffects();
}

document.addEventListener('DOMContentLoaded', init);
