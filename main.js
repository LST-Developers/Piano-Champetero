// --- Piano Champetero: Código compacto y limpio ---

// Utilidades
const normalizarRutaAudio = ruta => {
  if (!ruta) return '';
  ruta = ruta.replace(/\\+/g, '/').replace(/\/+/g, '/').replace(/(sounds\/)+/i, 'sounds/');
  return ruta.startsWith('sounds/') ? ruta : 'sounds/' + ruta;
};

// Estado global
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const tomAudioMap = {
  tom1: 'sounds/pitico medio.wav', tom2: 'sounds/perro bajo.WAV', tom3: 'sounds/PON1.wav',
  tom4: 'sounds/SKTAC.WAV', tom5: 'sounds/Y.wav', tom6: 'sounds/F4.wav',
  tom7: 'sounds/Pitico.wav', tom8: 'sounds/SK2.WAV', tom9: 'sounds/WARA2.wav'
};
const keyToTomId = { q: 'tom1', w: 'tom2', e: 'tom3', a: 'tom4', s: 'tom5', d: 'tom6', z: 'tom7', x: 'tom8', c: 'tom9' };
const tomBuffers = {};
let currentVolume = 0.5;
let samplersDisponibles = [];
let tomEditando = null, tomSamplerEditando = null, samplerSeleccionado = null;
let _modoEdicionActivo = false, _modoEdicionSamplers = false;
Object.defineProperty(window, 'modoEdicionActivo', { get: () => _modoEdicionActivo, set: v => { _modoEdicionActivo = v; } });
Object.defineProperty(window, 'modoEdicionSamplers', { get: () => _modoEdicionSamplers, set: v => { _modoEdicionSamplers = v; } });

// Persistencia
const guardarMapeoLocal = () => localStorage.setItem('pianoChampeteroKeyMap', JSON.stringify(keyToTomId));
const cargarMapeoLocal = () => {
  const data = localStorage.getItem('pianoChampeteroKeyMap');
  if (data) {
    Object.keys(keyToTomId).forEach(k => delete keyToTomId[k]);
    Object.entries(JSON.parse(data)).forEach(([k, v]) => keyToTomId[k] = v);
  }
};
const guardarSamplersLocal = () => localStorage.setItem('pianoChampeteroSamplers', JSON.stringify(tomAudioMap));
const cargarSamplersLocal = () => {
  const data = localStorage.getItem('pianoChampeteroSamplers');
  if (data) Object.keys(tomAudioMap).forEach(k => { if (JSON.parse(data)[k]) tomAudioMap[k] = normalizarRutaAudio(JSON.parse(data)[k]); });
};

// Carga dinámica de samplers
async function cargarSamplersDisponibles() {
  try {
    const res = await fetch('sounds/');
    const text = await res.text();
    samplersDisponibles = Array.from(text.matchAll(/href="([^"]+\.(?:wav|mp3|WAV|MP3))"/gi)).map(m => m[1].startsWith('sounds/') ? m[1].slice(7) : m[1]);
  } catch {
    samplersDisponibles = [
      'pitico medio.wav','perro bajo.WAV','PON1.wav','SKTAC.WAV','Y.wav','F4.wav','Pitico.wav','SK2.WAV','WARA2.wav','Golpe SK5.wav','Lazer.wav','Leon.wav','SK1.WAV','SKTUN.WAV'
    ];
  }
  const archivosDisponibles = new Set(samplersDisponibles.map(f => f.toLowerCase()));
  Object.keys(tomAudioMap).forEach(tomId => {
    const ruta = tomAudioMap[tomId];
    if (ruta && !archivosDisponibles.has(ruta.split('/').pop().toLowerCase())) tomAudioMap[tomId] = null;
  });
  Object.keys(tomAudioMap).forEach((tomId, idx) => {
    if (!tomAudioMap[tomId] && samplersDisponibles[idx]) tomAudioMap[tomId] = normalizarRutaAudio(samplersDisponibles[idx]);
  });
}

// Precarga de buffers
async function precargarTodosLosToms() {
  await cargarSamplersDisponibles();
  await Promise.all(Object.entries(tomAudioMap).map(async ([tomId, audioUrl]) => {
    if (audioUrl) {
      try {
        tomBuffers[tomId] = await cargarBufferAudio(normalizarRutaAudio(audioUrl));
      } catch { tomBuffers[tomId] = null; }
    } else tomBuffers[tomId] = null;
  }));
}

// Audio
async function cargarBufferAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}
function reproducirTom(tomId) {
  if (window.modoEdicionActivo || window.modoEdicionSamplers) return;
  const buffer = tomBuffers[tomId];
  if (!buffer) return;
  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  source.buffer = buffer;
  gainNode.gain.value = currentVolume;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
}
function activarTom(tomId) {
  if (window.modoEdicionActivo || window.modoEdicionSamplers) return;
  const boton = document.getElementById(tomId);
  if (!boton) return;
  boton.classList.add('active');
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => requestAnimationFrame(() => reproducirTom(tomId)));
  } else {
    requestAnimationFrame(() => reproducirTom(tomId));
  }
  setTimeout(() => boton.classList.remove('active'), 60);
}

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar barra de navegación y resaltar enlace actual
  fetch('nav.html').then(res => res.text()).then(html => {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
      navContainer.innerHTML = html;
      const path = window.location.pathname.split('/').pop() || 'index.html';
      navContainer.querySelectorAll('a[href]').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
      });
    }
  });

  // Cargar configuración local
  cargarSamplersLocal();
  cargarMapeoLocal();
  await precargarTodosLosToms();

  // Asignar letras a los botones
  Object.entries(keyToTomId).forEach(([key, tomId]) => {
    const boton = document.getElementById(tomId);
    if (boton) {
      const span = boton.querySelector('.battery__tom-key');
      if (span) span.textContent = key.toUpperCase();
    }
  });

  // Volumen
  const sliderVolumen = document.getElementById('volumenSlider');
  const labelPorcentaje = document.getElementById('volumenPorcentaje');
  if (sliderVolumen) {
    const actualizarLabel = v => labelPorcentaje && (labelPorcentaje.textContent = Math.round(v * 100) + '%');
    if (labelPorcentaje) actualizarLabel(sliderVolumen.value);
    sliderVolumen.addEventListener('input', e => {
      currentVolume = +e.target.value;
      actualizarLabel(currentVolume);
    });
    sliderVolumen.addEventListener('wheel', e => {
      e.preventDefault();
      const step = parseFloat(sliderVolumen.step) || 0.01;
      let nuevoValor = parseFloat(sliderVolumen.value) + (e.deltaY < 0 ? step : -step);
      nuevoValor = Math.max(parseFloat(sliderVolumen.min), Math.min(parseFloat(sliderVolumen.max), nuevoValor));
      sliderVolumen.value = nuevoValor;
      sliderVolumen.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Edición
  const editarBtn = document.getElementById('editarLetrasBtn');
  const editarSamplersBtn = document.getElementById('editarSamplersBtn');
  const editIcons = document.querySelectorAll('.edit-icon');
  const modal = document.getElementById('modalEditarTecla');
  const input = document.getElementById('nuevaTeclaInput');
  const guardarBtn = document.getElementById('guardarTeclaBtn');
  const cancelarBtn = document.getElementById('cancelarTeclaBtn');
  const modalSampler = document.getElementById('modalEditarSampler');
  const listaSamplers = document.getElementById('listaSamplers');
  const guardarSamplerBtn = document.getElementById('guardarSamplerBtn');
  const cancelarSamplerBtn = document.getElementById('cancelarSamplerBtn');

  // Ocultar íconos de edición al inicio
  editIcons.forEach(icon => icon.style.display = 'none');
  const actualizarVisibilidadIconosEdicion = () => editIcons.forEach(icon => icon.style.display = (window.modoEdicionActivo || window.modoEdicionSamplers) ? 'inline-block' : 'none');

  // Botones de edición
  const actualizarTextoBotonEdicion = () => {
    editarBtn.textContent = window.modoEdicionActivo ? 'Desactivar edición de teclas' : 'Editar letras';
    editarBtn.classList.toggle('modo-edicion-activa', window.modoEdicionActivo);
  };
  const actualizarTextoBotonEdicionSamplers = () => {
    editarSamplersBtn.textContent = window.modoEdicionSamplers ? 'Desactivar edición de samplers' : 'Editar samplers';
    editarSamplersBtn.classList.toggle('modo-edicion-activa', window.modoEdicionSamplers);
  };
  actualizarTextoBotonEdicion();
  actualizarTextoBotonEdicionSamplers();

  editarBtn.addEventListener('click', () => {
    window.modoEdicionActivo = !window.modoEdicionActivo;
    if (window.modoEdicionActivo) {
      window.modoEdicionSamplers = false;
      editarSamplersBtn.classList.remove('modo-edicion-activa');
    }
    document.body.classList.toggle('modo-edicion', window.modoEdicionActivo);
    actualizarVisibilidadIconosEdicion();
    editarBtn.disabled = false;
    editarSamplersBtn.disabled = false;
    actualizarTextoBotonEdicion();
    actualizarTextoBotonEdicionSamplers();
    editarSamplersBtn.textContent = 'Editar samplers';
    if (!window.modoEdicionActivo && modal.style.display === 'flex') {
      modal.style.display = 'none';
      tomEditando = null;
    }
    if (window.modoEdicionActivo && modalSampler.style.display === 'flex') {
      modalSampler.style.display = 'none';
      tomSamplerEditando = null;
    }
  });
  editarSamplersBtn.addEventListener('click', () => {
    window.modoEdicionSamplers = !window.modoEdicionSamplers;
    if (window.modoEdicionSamplers) {
      window.modoEdicionActivo = false;
      editarBtn.classList.remove('modo-edicion-activa');
    }
    document.body.classList.toggle('modo-edicion', window.modoEdicionSamplers);
    actualizarVisibilidadIconosEdicion();
    editarSamplersBtn.disabled = false;
    editarBtn.disabled = false;
    actualizarTextoBotonEdicionSamplers();
    actualizarTextoBotonEdicion();
    editarBtn.textContent = 'Editar letras';
    if (!window.modoEdicionSamplers && modalSampler.style.display === 'flex') {
      modalSampler.style.display = 'none';
      tomSamplerEditando = null;
    }
    if (window.modoEdicionSamplers && modal.style.display === 'flex') {
      modal.style.display = 'none';
      tomEditando = null;
    }
  });

  // Íconos de edición
  editIcons.forEach(icon => {
    icon.addEventListener('click', async e => {
      e.stopPropagation();
      const botonPad = icon.closest('button');
      if (window.modoEdicionActivo) {
        tomEditando = botonPad;
        modal.style.display = 'flex';
        input.value = '';
        input.focus();
      } else if (window.modoEdicionSamplers) {
        tomSamplerEditando = botonPad;
        samplerSeleccionado = null;
        await cargarSamplersDisponibles();
        listaSamplers.innerHTML = '';
        samplersDisponibles.forEach(sampler => {
          const fileName = sampler.split('/').pop();
          const li = document.createElement('li');
          li.textContent = fileName;
          li.tabIndex = 0;
          li.className = 'sampler-item';
          li.addEventListener('click', async () => {
            try {
              const buffer = await cargarBufferAudio(normalizarRutaAudio(fileName));
              const source = audioCtx.createBufferSource();
              const gainNode = audioCtx.createGain();
              source.buffer = buffer;
              gainNode.gain.value = currentVolume;
              source.connect(gainNode).connect(audioCtx.destination);
              source.start();
            } catch {}
            listaSamplers.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            samplerSeleccionado = fileName;
          });
          li.addEventListener('keydown', e => { if (e.key === 'Enter') li.click(); });
          listaSamplers.appendChild(li);
        });
        modalSampler.style.display = 'flex';
      }
    });
  });

  // Guardar selección de sampler
  guardarSamplerBtn.addEventListener('click', async () => {
    if (!samplerSeleccionado || !tomSamplerEditando) return;
    const tomId = tomSamplerEditando.id;
    const ruta = normalizarRutaAudio(samplerSeleccionado);
    tomAudioMap[tomId] = ruta;
    tomBuffers[tomId] = await cargarBufferAudio(ruta);
    guardarSamplersLocal();
    modalSampler.style.display = 'none';
    tomSamplerEditando = null;
    samplerSeleccionado = null;
  });
  cancelarSamplerBtn.addEventListener('click', () => {
    modalSampler.style.display = 'none';
    tomSamplerEditando = null;
    samplerSeleccionado = null;
  });
  modalSampler.addEventListener('keydown', e => { if (e.key === 'Escape') cancelarSamplerBtn.click(); });

  // Guardar nueva letra
  guardarBtn.addEventListener('click', () => {
    const letra = input.value.trim().toUpperCase();
    if (!letra || letra.length !== 1) return input.focus();
    const spanKey = tomEditando.querySelector('.battery__tom-key');
    spanKey.textContent = letra;
    const tomId = tomEditando.id;
    for (const [key, id] of Object.entries(keyToTomId)) {
      if (id === tomId) {
        delete keyToTomId[key];
        keyToTomId[letra.toLowerCase()] = tomId;
        break;
      }
    }
    guardarMapeoLocal();
    modal.style.display = 'none';
    tomEditando = null;
    editarBtn.disabled = false;
    window.modoEdicionActivo = modoEdicionActivo;
    document.body.classList.toggle('modo-edicion', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
  });
  cancelarBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    tomEditando = null;
    editarBtn.disabled = false;
    window.modoEdicionActivo = modoEdicionActivo;
    document.body.classList.toggle('modo-edicion', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') cancelarBtn.click();
    if (e.key === 'Enter') guardarBtn.click();
  });

  // Eventos de activación
  document.addEventListener('keydown', e => {
    const modal = document.getElementById('modalEditarTecla');
    if ((modal && modal.style.display === 'flex') || window.modoEdicionActivo || window.modoEdicionSamplers) return;
    const tomId = keyToTomId[e.key.toLowerCase()];
    if (tomId) {
      e.preventDefault();
      activarTom(tomId);
    }
  });
  Object.keys(tomAudioMap).forEach(tomId => {
    const boton = document.getElementById(tomId);
    if (boton) boton.addEventListener('click', e => {
      if (window.modoEdicionActivo || window.modoEdicionSamplers) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      activarTom(tomId);
    });
  });
  document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

  // Footer: actualiza solo el año en el span correspondiente
  const anioFooter = document.getElementById('anioFooter');
  if (anioFooter) anioFooter.textContent = new Date().getFullYear();
});
