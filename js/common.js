// js/common.js — utilidades UI compartidas entre páginas
export function initNav() {
  return fetch('nav.html')
    .then(res => res.text())
    .then(html => {
      const navContainer = document.getElementById('nav-container');
      if (navContainer) {
        navContainer.innerHTML = html;
        const path = window.location.pathname.split('/').pop() || 'index.html';
        navContainer.querySelectorAll('a[href]').forEach(link => {
          if (link.getAttribute('href') === path) link.classList.add('active');
        });
      }
    })
    .catch(() => { /* no-op on nav load error */ });
}

export function setYearFooter() {
  const yearFooter = document.getElementById('year-footer');
  if (yearFooter) yearFooter.textContent = new Date().getFullYear();
}

export function resumeOnUserGesture() {
  // No creamos AudioContext aquí; las páginas que necesiten audio deben manejarlo.
  document.addEventListener('click', () => { try { /* interaction placeholder */ } catch {} }, { once: true });
}
