// ===== AUM TECHNOLOGY — main.js =====
document.addEventListener('DOMContentLoaded', () => {

  // Sticky navbar
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 40));

  // Mobile menu
  const burger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => { burger.classList.remove('open'); navLinks.classList.remove('open'); }));

  // Scroll reveal
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Typing effect
  const typedEl = document.getElementById('typed');
  if (typedEl) {
    const words = ['Web Applications','Mobile Apps','AI Solutions','Software Systems','Cloud Platforms','E-Commerce Stores'];
    let wi = 0, ci = 0, deleting = false;
    (function type() {
      const word = words[wi];
      typedEl.textContent = word.slice(0, ci);
      if (!deleting && ci < word.length) { ci++; setTimeout(type, 70); }
      else if (deleting && ci > 0) { ci--; setTimeout(type, 40); }
      else { deleting = !deleting; if (!deleting) wi = (wi + 1) % words.length; setTimeout(type, deleting ? 60 : 1400); }
    })();
  }

  // Counters
  const counters = document.querySelectorAll('.count');
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.target, dur = 1800, t0 = performance.now();
      (function tick(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.floor(p * target) + (el.dataset.suffix || '');
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => cio.observe(c));

  // Portfolio filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.pf-card').forEach(card =>
      card.classList.toggle('hide', f !== 'all' && card.dataset.cat !== f));
  }));

  // Testimonials
  const slides = document.querySelectorAll('.testi-slide');
  const dots = document.querySelectorAll('.testi-dots button');
  if (slides.length) {
    let cur = 0;
    const show = i => {
      slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
      cur = (i + slides.length) % slides.length;
      slides[cur].classList.add('active'); dots[cur].classList.add('active');
    };
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    setInterval(() => show(cur + 1), 5500);
  }

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(q => q.addEventListener('click', () => {
    const item = q.parentElement, open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  }));

  // Contact form → Firebase (falls back to success demo if not configured)
  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (window.AUM_DB) {
        await window.AUM_DB.collection('leads').add({ ...data, source: 'website', status: 'New', createdAt: new Date() });
      }
      msg.className = 'form-msg success';
      msg.textContent = '✓ Thank you! Your message has been received. Our team will contact you within 24 hours.';
      form.reset();
    } catch (err) {
      msg.className = 'form-msg error';
      msg.textContent = '✗ Something went wrong. Please try again or reach us via WhatsApp.';
    }
  });

  // Newsletter
  document.querySelectorAll('.newsletter').forEach(nl => nl.addEventListener('submit', async e => {
    e.preventDefault();
    const input = nl.querySelector('input');
    try {
      if (window.AUM_DB) await window.AUM_DB.collection('newsletter').add({ email: input.value, subscribedAt: new Date() });
      input.value = ''; input.placeholder = '✓ Subscribed!';
    } catch { input.placeholder = 'Try again'; }
  }));

  // Footer year
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  /* ===== Dynamic Blog from Firestore (admin CMS) ===== */
  const blogGrid = document.getElementById('blogGridDynamic');
  if (blogGrid && window.AUM_DB) {
    window.__BLOG_POSTS = {};
    AUM_DB.collection('blog').orderBy('createdAt', 'desc').limit(12).get().then(snap => {
      const posts = snap.docs.filter(d => d.data().published).map(d => ({ id: d.id, ...d.data() }));
      if (!posts.length) return; // keep static fallback content
      blogGrid.innerHTML = posts.map(p => {
        window.__BLOG_POSTS[p.id] = p;
        const t = p.createdAt ? new Date(p.createdAt.toDate()) : null;
        return `<div class="blog-card reveal visible" data-post="${p.id}" style="cursor:pointer">
          <div class="blog-thumb" style="background:linear-gradient(135deg,#101a30,#1a1030)">${p.emoji || '📝'}</div>
          <div class="blog-body">
            <div class="blog-meta"><span style="color:var(--primary)">${esc(p.category || 'News')}</span><span>${t ? t.toLocaleDateString() : ''}</span></div>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.excerpt || String(p.content || '').slice(0, 120) + '…')}</p>
            <span class="svc-link">Read Article →</span>
          </div>
        </div>`;
      }).join('');
      blogGrid.querySelectorAll('[data-post]').forEach(card => card.addEventListener('click', () => {
        const p = window.__BLOG_POSTS[card.dataset.post];
        if (!p) return;
        document.getElementById('bmTitle').textContent = p.title || '';
        const t = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : '';
        document.getElementById('bmMeta').innerHTML = `<span style="color:var(--primary)">${esc(p.category || '')}</span> · ${t}`;
        document.getElementById('bmBody').textContent = p.content || '';
        document.getElementById('blogModal').classList.add('show');
      }));
    }).catch(err => console.warn('blog:', err.code || err));
    document.getElementById('blogModalClose')?.addEventListener('click', () =>
      document.getElementById('blogModal').classList.remove('show'));
    document.getElementById('blogModal')?.addEventListener('click', e => {
      if (e.target.id === 'blogModal') e.target.classList.remove('show');
    });
  }

});
