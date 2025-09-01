// js/sobre-nosotros.js — lógica mínima para about page
import { loadHeader, setYearFooter, resumeOnUserGesture } from './common.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setYearFooter();
  resumeOnUserGesture();
});
