// ===== AUM UI — standalone menu & tabs (works even if Firebase CDN fails) =====
document.addEventListener('DOMContentLoaded', () => {
  if (window.__AUM_UI_BOUND__) return;
  window.__AUM_UI_BOUND__ = true;

  /* Tabs */
  document.querySelectorAll('.side-link[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.side-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tb = document.getElementById('tab-' + btn.dataset.tab);
    if (tb) tb.classList.add('active');
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = btn.dataset.title || '';
    closeMenu();
  }));

  /* Mobile sidebar */
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideOverlay');
  function closeMenu() {
    sideMenu?.classList.remove('open');
    overlay?.classList.remove('show');
    document.body.style.overflow = '';
  }
  window.__AUM_CLOSE_MENU = closeMenu;

  document.getElementById('mobBurger')?.addEventListener('click', () => {
    if (!sideMenu) return;
    const open = sideMenu.classList.toggle('open');
    overlay?.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  overlay?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
});
