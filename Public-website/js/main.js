// Safe public-site interactions.
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('navLinks');
  const button = document.getElementById('hamburger');
  if (button && menu) button.addEventListener('click', () => menu.classList.toggle('open'));
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
});
