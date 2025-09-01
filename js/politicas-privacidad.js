// js/politicas-privacidad.js — lógica para la página de políticas
import { loadHeader, setYearFooter } from './common.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setYearFooter();
});
