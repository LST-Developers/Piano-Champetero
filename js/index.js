// js/index.js — lógica de la batería (antes en main.js)
import { initNav, setYearFooter, resumeOnUserGesture } from './common.js';

// Audio + samplers (migrado desde main.js)
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const tomSamplersDefaults = {
  'tom-1': 'D (2).wav',
  'tom-2': 'F4.wav',
  'tom-3': 'Pitico.wav',
  'tom-4': 'SKTAC.WAV',
  'tom-5': 'Y.wav',
  'tom-6': 'Lazer.wav',
  'tom-7': 'perro bajo.WAV',
  'tom-8': 'SK2.WAV',
  'tom-9': 'Smar 1.wav'
};

export const samplerList = [
  'D (2).wav','F4.wav','Golpe SK5.wav','Lazer.wav','Leon.wav','PON1.wav',
  'Pitico.wav','SK1.WAV','SK2.WAV','SKTAC.WAV','SKTUN.WAV','Smar 1.wav',
  'WARA2.wav','Y.wav','perro bajo.WAV','pitico medio.wav'
];

// Estado
export const tomAudioMap = (function init() {
  const map = { ...tomSamplersDefaults };
  const dataSamplers = localStorage.getItem('pianoChampeteroSamplers');
  if (dataSamplers) {
    try {
      const parsed = JSON.parse(dataSamplers);
      Object.keys(map).forEach(k => { if (parsed[k]) map[k] = parsed[k]; });
    } catch (e) { /* ignore */ }
  }
  return map;
})();

export const keyToTomIdDefaults = { q: 'tom-1', w: 'tom-2', e: 'tom-3', a: 'tom-4', s: 'tom-5', d: 'tom-6', z: 'tom-7', x: 'tom-8', c: 'tom-9' };

export const tomSamplerBuffers = {};
export let currentVolume = 0.5;
export let samplersDisponibles = [];

// Estado de mapeo de teclas usado por la UI
let keyToTomId = { ...keyToTomIdDefaults };
// volumen interno usado en algunas previsualizaciones
let _currentVolume = currentVolume;

// Persistence helpers (migradas desde main.js)
export function saveKeyMapping(map) { try { localStorage.setItem('pianoChampeteroKeyMap', JSON.stringify(map)); } catch (e) {} }
export function loadKeyMapping() {
  const data = localStorage.getItem('pianoChampeteroKeyMap');
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}
export function saveSamplers() {
  const onlyName = {};
  Object.keys(tomAudioMap).forEach(k => {
    const name = tomAudioMap[k] ? tomAudioMap[k].split('/').pop() : '';
    onlyName[k] = name;
  });
  try { localStorage.setItem('pianoChampeteroSamplers', JSON.stringify(onlyName)); } catch {}
}
export function resetSettings() {
  localStorage.removeItem('pianoChampeteroSamplers');
  localStorage.removeItem('pianoChampeteroKeyMap');
  Object.keys(tomAudioMap).forEach(k => tomAudioMap[k] = tomSamplersDefaults[k]);
}

export async function loadAvailableSamplers() {
  samplersDisponibles = samplerList;
  const availableFiles = new Map(samplersDisponibles.map(f => [f.toLowerCase(), f]));
  Object.keys(tomAudioMap).forEach(tomId => {
    let name = tomAudioMap[tomId] ? tomAudioMap[tomId].split('/').pop() : '';
    if (!name) { tomAudioMap[tomId] = tomSamplersDefaults[tomId]; return; }
    const realName = availableFiles.get(name.toLowerCase());
    if (realName) tomAudioMap[tomId] = realName;
  });
}

export async function loadSamplerBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

export async function preloadAllSamplers() {
  await loadAvailableSamplers();
  await Promise.all(Object.entries(tomAudioMap).map(async ([tomId, fileName]) => {
    if (fileName) {
      try { tomSamplerBuffers[tomId] = await loadSamplerBuffer('samplers/' + fileName); } catch { tomSamplerBuffers[tomId] = null; }
    } else tomSamplerBuffers[tomId] = null;
  }));
}

export function playTomSampler(tomId) {
  const buffer = tomSamplerBuffers[tomId];
  if (!buffer) return;
  const slider = document.getElementById('volume-slider');
  let volume = currentVolume;
  if (slider) volume = +slider.value;
  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;
  source.buffer = buffer;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
}

export async function activateTomSampler(tomId) {
  const button = document.getElementById(tomId);
  if (!button) return;
  button.classList.add('active');
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
    requestAnimationFrame(() => playTomSampler(tomId));
  } else {
    requestAnimationFrame(() => playTomSampler(tomId));
  }
  setTimeout(() => button.classList.remove('active'), 60);
}

document.addEventListener('DOMContentLoaded', async () => {
  const isMainPage = document.getElementById('tom-1') !== null;
  await initNav();
  setYearFooter();
  resumeOnUserGesture();

  if (!isMainPage) return;

  const savedKeys = loadKeyMapping();
  if (savedKeys) keyToTomId = { ...savedKeys };

  await preloadAllSamplers();

  Object.entries(keyToTomId).forEach(([key, tomId]) => {
    const boton = document.getElementById(tomId);
    if (boton) {
      const span = boton.querySelector('.battery-tom-key');
      if (span) span.textContent = key.toUpperCase();
    }
  });

  const sliderVolumen = document.getElementById('volume-slider');
  const labelPorcentaje = document.getElementById('volume-percent');
  if (sliderVolumen) {
    const actualizarLabel = v => labelPorcentaje && (labelPorcentaje.textContent = Math.round(v * 100) + '%');
    if (labelPorcentaje) actualizarLabel(sliderVolumen.value);
    sliderVolumen.addEventListener('input', e => { _currentVolume = +e.target.value; if (labelPorcentaje) actualizarLabel(_currentVolume); });
    sliderVolumen.addEventListener('wheel', e => {
      e.preventDefault();
      const step = parseFloat(sliderVolumen.step) || 0.01;
      let nuevoValor = parseFloat(sliderVolumen.value) + (e.deltaY < 0 ? step : -step);
      nuevoValor = Math.max(parseFloat(sliderVolumen.min), Math.min(parseFloat(sliderVolumen.max), nuevoValor));
      sliderVolumen.value = nuevoValor;
      sliderVolumen.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Variables de edición locales
  let tomEditando = null, tomSamplerEditando = null, samplerSeleccionado = null;
  let modoEdicionActivo = false, modoEdicionSamplers = false;

  const editarBtn = document.getElementById('edit-keys-btn');
  const editarSamplersBtn = document.getElementById('edit-samplers-btn');
  const editIcons = document.querySelectorAll('.edit-icon');
  const modal = document.getElementById('modal-edit-key');
  const input = document.getElementById('new-key-input');
  const guardarBtn = document.getElementById('save-key-btn');
  const cancelarBtn = document.getElementById('cancel-key-btn');
  const modalSampler = document.getElementById('modal-edit-sampler');
  const listaSamplers = document.getElementById('sampler-list');
  const guardarSamplerBtn = document.getElementById('save-sampler-btn');
  const cancelarSamplerBtn = document.getElementById('cancel-sampler-btn');

  const actualizarVisibilidadIconosEdicion = () => editIcons.forEach(icon => icon.style.display = (modoEdicionActivo || modoEdicionSamplers) ? 'inline-block' : 'none');
  const actualizarTextoBotonEdicion = () => {
    if (!editarBtn) return;
    editarBtn.textContent = modoEdicionActivo ? 'Desactivar edición de teclas' : 'Editar letras';
    editarBtn.classList.toggle('edit-mode-active', modoEdicionActivo);
  };
  const actualizarTextoBotonEdicionSamplers = () => {
    if (!editarSamplersBtn) return;
    editarSamplersBtn.textContent = modoEdicionSamplers ? 'Desactivar edición de samplers' : 'Editar samplers';
    editarSamplersBtn.classList.toggle('edit-mode-active', modoEdicionSamplers);
  };

  actualizarTextoBotonEdicion();
  actualizarTextoBotonEdicionSamplers();
  editIcons.forEach(icon => icon.style.display = 'none');

  if (editarBtn) editarBtn.addEventListener('click', () => {
    modoEdicionActivo = !modoEdicionActivo;
    if (modoEdicionActivo) { modoEdicionSamplers = false; editarSamplersBtn && editarSamplersBtn.classList.remove('edit-mode-active'); }
    document.body.classList.toggle('edit-mode', modoEdicionActivo);
    actualizarVisibilidadIconosEdicion();
    actualizarTextoBotonEdicion();
    actualizarTextoBotonEdicionSamplers();
    if (!modoEdicionActivo && modal && modal.style.display === 'flex') { modal.style.display = 'none'; tomEditando = null; }
    if (modoEdicionActivo && modalSampler && modalSampler.style.display === 'flex') { modalSampler.style.display = 'none'; tomSamplerEditando = null; }
  });

  if (editarSamplersBtn) editarSamplersBtn.addEventListener('click', () => {
    modoEdicionSamplers = !modoEdicionSamplers;
    if (modoEdicionSamplers) { modoEdicionActivo = false; editarBtn && editarBtn.classList.remove('edit-mode-active'); }
    document.body.classList.toggle('edit-mode', modoEdicionSamplers);
    actualizarVisibilidadIconosEdicion();
    actualizarTextoBotonEdicionSamplers();
    actualizarTextoBotonEdicion();
    if (!modoEdicionSamplers && modalSampler && modalSampler.style.display === 'flex') { modalSampler.style.display = 'none'; tomSamplerEditando = null; }
    if (modoEdicionSamplers && modal && modal.style.display === 'flex') { modal.style.display = 'none'; tomEditando = null; }
  });

  // Edit icons: letter edit (only when modoEdicionActivo)
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', e => {
      if (!modoEdicionActivo) return;
      e.stopPropagation();
      const boton = icon.closest('.battery-tom');
      if (!boton) return;
      tomEditando = boton;
      if (modal) { modal.style.display = 'flex'; input.value = ''; input.focus(); }
    });
  });

  // Edit icons: sampler edit (when modoEdicionSamplers) — builds list from common.samplersDisponibles via tomAudioMap
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', async e => {
      if (!modoEdicionSamplers) return;
      e.stopPropagation();
      const boton = icon.closest('.battery-tom');
      if (!boton) return;
      tomSamplerEditando = boton;
      if (modalSampler) {
        // cargar lista
        listaSamplers && (listaSamplers.innerHTML = '');
        const posibles = Array.from(new Set(Object.values(tomAudioMap).map(v => v && v.split('/').pop()).filter(Boolean)));
        posibles.forEach(nombreArchivo => {
          const li = document.createElement('li');
          li.textContent = nombreArchivo;
          li.className = 'sampler-item';
          li.tabIndex = 0;
          li.addEventListener('click', async () => {
            document.querySelectorAll('.sampler-item').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            samplerSeleccionado = nombreArchivo;
            if (window._previewSource && typeof window._previewSource.stop === 'function') {
              try { window._previewSource.stop(); } catch {}
            }
            try {
              const path = 'samplers/' + nombreArchivo;
              if (audioCtx.state !== 'running') await audioCtx.resume();
              const buffer = await loadSamplerBuffer(path);
              const source = audioCtx.createBufferSource();
              const gainNode = audioCtx.createGain();
              gainNode.gain.value = _currentVolume;
              source.buffer = buffer;
              source.connect(gainNode).connect(audioCtx.destination);
              source.start();
              window._previewSource = source;
            } catch (e) { /* ignore preview errors */ }
          });
          li.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') li.click(); });
          if (tomAudioMap[boton.id] && tomAudioMap[boton.id].toLowerCase().includes(nombreArchivo.toLowerCase())) {
            li.classList.add('selected'); samplerSeleccionado = nombreArchivo;
          }
          listaSamplers && listaSamplers.appendChild(li);
        });
        modalSampler.style.display = 'flex';
      }
    });
  });

  // Guardar sampler seleccionado
  if (guardarSamplerBtn) {
    guardarSamplerBtn.addEventListener('click', async () => {
      if (!samplerSeleccionado || !tomSamplerEditando) return;
      const tomId = tomSamplerEditando.id;
      const nombre = samplerSeleccionado;
      // actualizar mapa y buffer
      tomAudioMap[tomId] = nombre;
      try { tomSamplerBuffers[tomId] = await loadSamplerBuffer('samplers/' + nombre); } catch { tomSamplerBuffers[tomId] = null; }
      saveSamplers();
      modalSampler.style.display = 'none';
      tomSamplerEditando = null; samplerSeleccionado = null;
    });
  }

  if (cancelarSamplerBtn) cancelarSamplerBtn.addEventListener('click', () => {
    modalSampler && (modalSampler.style.display = 'none');
    tomSamplerEditando = null; samplerSeleccionado = null;
  });
  if (modalSampler) modalSampler.addEventListener('keydown', e => { if (e.key === 'Escape' && cancelarSamplerBtn) cancelarSamplerBtn.click(); });

  // Guardar nueva letra
  if (guardarBtn) guardarBtn.addEventListener('click', () => {
    if (!input || !tomEditando) return;
    const letra = input.value.trim().toUpperCase();
    if (!letra || letra.length !== 1) return input.focus();
    const spanKey = tomEditando.querySelector('.battery-tom-key');
    if (spanKey) spanKey.textContent = letra;
    const tomId = tomEditando.id;
    for (const [key, id] of Object.entries(keyToTomId)) {
      if (id === tomId) {
        delete keyToTomId[key];
        keyToTomId[letra.toLowerCase()] = tomId;
        break;
      }
    }
    saveKeyMapping(keyToTomId);
    modal && (modal.style.display = 'none');
    tomEditando = null;
    document.body.classList.toggle('edit-mode', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = modoEdicionActivo ? 'inline-block' : 'none');
  });

  if (cancelarBtn) cancelarBtn.addEventListener('click', () => {
    modal && (modal.style.display = 'none');
    tomEditando = null;
    document.body.classList.toggle('edit-mode', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = modoEdicionActivo ? 'inline-block' : 'none');
  });

  if (input) input.addEventListener('keydown', e => { if (e.key === 'Escape' && cancelarBtn) cancelarBtn.click(); if (e.key === 'Enter' && guardarBtn) guardarBtn.click(); });

  // Keydown to play
  document.addEventListener('keydown', async e => {
    const modalOpen = document.getElementById('modal-edit-key') && document.getElementById('modal-edit-key').style.display === 'flex';
    if (modalOpen || modoEdicionActivo || modoEdicionSamplers) return;
    if (!e.key) return;
    const tomId = keyToTomId[e.key.toLowerCase()];
    if (tomId) { e.preventDefault(); await activateTomSampler(tomId); }
  });

  // Click on toms
  Object.keys(tomAudioMap).forEach(tomId => {
    const boton = document.getElementById(tomId);
    if (boton) boton.addEventListener('click', async e => {
      if (modoEdicionActivo || modoEdicionSamplers) { e.stopPropagation(); e.preventDefault(); return; }
      await activateTomSampler(tomId);
    });
  });

  // Focus event: resume and reload buffers
  window.addEventListener('focus', async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    await preloadAllSamplers();
  });

  // Reset settings modal buttons
  const btnReset = document.getElementById('reset-settings-btn');
  const modalReset = document.getElementById('modal-confirm-reset');
  const confirmarResetBtn = document.getElementById('confirm-reset-btn');
  const cancelarResetBtn = document.getElementById('cancel-reset-btn');
  if (btnReset && modalReset && confirmarResetBtn && cancelarResetBtn) {
    btnReset.addEventListener('click', () => { modalReset.style.display = 'flex'; confirmarResetBtn.focus(); });
    confirmarResetBtn.addEventListener('click', async () => {
      resetSettings();
      // recargar samplers y UI
      await preloadAllSamplers();
      Object.entries(keyToTomIdDefaults).forEach(([k, v]) => keyToTomId[k] = v);
      Object.entries(keyToTomId).forEach(([key, tomId]) => {
        const button = document.getElementById(tomId);
        if (button) {
          const span = button.querySelector('.battery-tom-key');
          if (span) span.textContent = key.toUpperCase();
        }
      });
      modalReset.style.display = 'none';
    });
    cancelarResetBtn.addEventListener('click', () => { modalReset.style.display = 'none'; });
    modalReset.addEventListener('keydown', e => { if (e.key === 'Escape') modalReset.style.display = 'none'; });
  }

  // Save samplers button (if present)
  const saveSamplersBtn = document.getElementById('save-sampler-btn');
  if (saveSamplersBtn) saveSamplersBtn.addEventListener('click', () => saveSamplers());
});
