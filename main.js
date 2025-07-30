// Cargar barra de navegación desde nav.html en todas las páginas
window.addEventListener('DOMContentLoaded', function () {
  const navContainer = document.getElementById('nav-container');
  if (navContainer) {
    fetch('nav.html')
      .then(response => response.text())
      .then(data => {
        navContainer.innerHTML = data;
        // Activar el enlace actual
        const path = window.location.pathname;
        if (path.endsWith('index.html') || path === '/' || path === '/Piano-Champetero/' ) {
          document.getElementById('nav-inicio')?.classList.add('active');
        } else if (path.endsWith('sobre-nosotros.html')) {
          document.getElementById('nav-sobre')?.classList.add('active');
        }
      });
  }
});
// --- Estado global de edición ---

// --- Edición de letras de los toms ---
document.addEventListener('DOMContentLoaded', () => {
  const modalSampler = document.getElementById('modalEditarSampler');
  const listaSamplers = document.getElementById('listaSamplers');
  const guardarSamplerBtn = document.getElementById('guardarSamplerBtn');
  const cancelarSamplerBtn = document.getElementById('cancelarSamplerBtn');
  let tomSamplerEditando = null;
  let samplerSeleccionado = null;
  // Eliminar variables locales, usar solo window.modoEdicionActivo y window.modoEdicionSamplers

  // Lista de samplers disponibles (se genera dinámicamente)
  let samplersDisponibles = [];
  async function cargarSamplersDisponibles() {
    try {
      const res = await fetch('sounds/');
      const text = await res.text();
      samplersDisponibles = Array.from(text.matchAll(/href="([^"]+\.(?:wav|mp3|WAV|MP3))"/gi)).map(m => decodeURIComponent(m[1]));
    } catch (e) {
      console.error('Error cargando samplers:', e);
      samplersDisponibles = [
        'pitico medio.wav',
        'perro bajo.WAV',
        'PON1.wav',
        'SKTAC.WAV',
        'Y.wav',
        'F4.wav',
        'Pitico.wav',
        'SK2.WAV',
        'WARA2.wav',
        'Golpe SK5.wav',
        'Lazer.wav',
        'Leon.wav',
        'PISTA PERREO.MP3',
        'SK1.WAV',
        'SKTUN.WAV'
      ];
    }
  }

  // Referencias a botones de edición
  const editarBtn = document.getElementById('editarLetrasBtn');
  const editarSamplersBtn = document.getElementById('editarSamplersBtn');
  const editIcons = document.querySelectorAll('.edit-icon');
  const modal = document.getElementById('modalEditarTecla');
  const input = document.getElementById('nuevaTeclaInput');
  const guardarBtn = document.getElementById('guardarTeclaBtn');
  const cancelarBtn = document.getElementById('cancelarTeclaBtn');
  let tomEditando = null;

  // Oculta los íconos de editar al inicio
  editIcons.forEach(icon => icon.style.display = 'none');

  // Actualiza visibilidad de íconos según modo
  function actualizarVisibilidadIconosEdicion() {
    editIcons.forEach(icon => icon.style.display = (window.modoEdicionActivo || window.modoEdicionSamplers) ? 'inline-block' : 'none');
  }
  actualizarVisibilidadIconosEdicion();

  // Botón editar letras
  function actualizarTextoBotonEdicion() {
    editarBtn.textContent = window.modoEdicionActivo ? 'Desactivar edición de teclas' : 'Editar letras';
    if (window.modoEdicionActivo) {
      editarBtn.classList.add('modo-edicion-activa');
    } else {
      editarBtn.classList.remove('modo-edicion-activa');
    }
  }
  actualizarTextoBotonEdicion();
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
  function actualizarTextoBotonEdicionSamplers() {
    editarSamplersBtn.textContent = window.modoEdicionSamplers ? 'Desactivar edición de samplers' : 'Editar samplers';
    if (window.modoEdicionSamplers) {
      editarSamplersBtn.classList.add('modo-edicion-activa');
    } else {
      editarSamplersBtn.classList.remove('modo-edicion-activa');
    }
  }
  actualizarTextoBotonEdicionSamplers();
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

  // Al hacer click en el ícono, abre el modal correspondiente
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
            // Previsualizar sonido
            try {
              const buffer = await cargarBufferAudio('sounds/' + fileName);
              const source = audioCtx.createBufferSource();
              const gainNode = audioCtx.createGain();
              source.buffer = buffer;
              gainNode.gain.value = currentVolume;
              source.connect(gainNode).connect(audioCtx.destination);
              source.start();
            } catch (e) {
              console.error('No se pudo previsualizar el sampler:', e);
            }
            listaSamplers.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            samplerSeleccionado = fileName; // Solo el nombre, nunca la ruta
          });
          li.addEventListener('keydown', e => {
            if (e.key === 'Enter') li.click();
          });
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
    tomAudioMap[tomId] = 'sounds/' + samplerSeleccionado;
    tomBuffers[tomId] = await cargarBufferAudio('sounds/' + samplerSeleccionado);
    guardarSamplersLocal(); // Guardar configuración de samplers
    modalSampler.style.display = 'none';
    tomSamplerEditando = null;
    samplerSeleccionado = null;
  });
  cancelarSamplerBtn.addEventListener('click', () => {
    modalSampler.style.display = 'none';
    tomSamplerEditando = null;
    samplerSeleccionado = null;
  });
  modalSampler.addEventListener('keydown', e => {
    if (e.key === 'Escape') cancelarSamplerBtn.click();
  });

  // --- Utilidades para guardar y cargar mapeo de teclas ---
  function guardarMapeoLocal() {
    localStorage.setItem('pianoChampeteroKeyMap', JSON.stringify(keyToTomId));
  }
  function cargarMapeoLocal() {
    const data = localStorage.getItem('pianoChampeteroKeyMap');
    if (data) {
      const obj = JSON.parse(data);
      // Limpiar y copiar claves al objeto global
      Object.keys(keyToTomId).forEach(k => delete keyToTomId[k]);
      Object.entries(obj).forEach(([k, v]) => keyToTomId[k] = v);
    }
  }
  // --- Guardar y cargar configuración de samplers ---
  // (Definidas globalmente al final del archivo)

  // Cargar mapeo guardado al iniciar
  cargarMapeoLocal();

  // Guardar nueva letra y persistir
  guardarBtn.addEventListener('click', () => {
    const letra = input.value.trim().toUpperCase();
    if (!letra || letra.length !== 1) return input.focus();
    const spanKey = tomEditando.querySelector('.battery__tom-key');
    spanKey.textContent = letra;
    // Actualiza el mapeo en JS
    const tomId = tomEditando.id;
    for (const [key, id] of Object.entries(keyToTomId)) {
      if (id === tomId) {
        delete keyToTomId[key];
        keyToTomId[letra.toLowerCase()] = tomId;
        break;
      }
    }
    guardarMapeoLocal(); // <-- Guarda en localStorage
    modal.style.display = 'none';
    tomEditando = null;
    editarBtn.disabled = false;
    // No desactiva modo edición aquí
    window.modoEdicionActivo = modoEdicionActivo; // <-- Sincroniza el estado global
    document.body.classList.toggle('modo-edicion', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
  });

  // Cancelar edición
  cancelarBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    tomEditando = null;
    editarBtn.disabled = false;
    // No desactiva modo edición aquí
    window.modoEdicionActivo = modoEdicionActivo; // <-- Sincroniza el estado global
    document.body.classList.toggle('modo-edicion', modoEdicionActivo);
    editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
  });

  // Permite cerrar el modal con Escape
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') cancelarBtn.click();
    if (e.key === 'Enter') guardarBtn.click();
  });
});
// --- Batería Champetera: Audio instantáneo, código claro y documentado ---

// --- Guardar y cargar configuración de samplers (definición global) ---
function guardarSamplersLocal() {
  localStorage.setItem('pianoChampeteroSamplers', JSON.stringify(tomAudioMap));
}
function cargarSamplersLocal() {
  const data = localStorage.getItem('pianoChampeteroSamplers');
  if (data) {
    const obj = JSON.parse(data);
    Object.keys(tomAudioMap).forEach(k => {
      if (obj[k]) tomAudioMap[k] = obj[k];
    });
  }
}

// Contexto de audio global para reproducir sonidos
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Mapeo de IDs de toms a rutas de archivos de audio
const tomAudioMap = {
  tom1: 'sounds/pitico medio.wav',
  tom2: 'sounds/perro bajo.WAV',
  tom3: 'sounds/PON1.wav',
  tom4: 'sounds/SKTAC.WAV',
  tom5: 'sounds/Y.wav',
  tom6: 'sounds/F4.wav',
  tom7: 'sounds/Pitico.wav',
  tom8: 'sounds/SK2.WAV',
  tom9: 'sounds/WARA2.wav'
};

// Mapeo de teclas a IDs de toms
const keyToTomId = {
  q: 'tom1', w: 'tom2', e: 'tom3',
  a: 'tom4', s: 'tom5', d: 'tom6',
  z: 'tom7', x: 'tom8', c: 'tom9'
};

// Buffer de audio precargado para cada tom
const tomBuffers = {};

// Volumen global (0.0 a 1.0)
let currentVolume = 0.5;

/**
 * Descarga y decodifica un archivo de audio a un AudioBuffer
 * @param {string} url - Ruta del archivo de audio
 * @returns {Promise<AudioBuffer>}
 */
async function cargarBufferAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Precarga todos los sonidos de los toms en memoria
 */
async function precargarTodosLosToms() {
  await Promise.all(Object.entries(tomAudioMap).map(async ([tomId, audioUrl]) => {
    tomBuffers[tomId] = await cargarBufferAudio(audioUrl);
  }));
}

/**
 * Reproduce el sonido de un tom específico
 * @param {string} tomId - ID del tom a reproducir
 */
function reproducirTom(tomId) {
  // Refuerzo: bloquear absolutamente en ambos modos de edición
  if (window.modoEdicionActivo || window.modoEdicionSamplers || modoEdicionActivo || modoEdicionSamplers) return;
  const buffer = tomBuffers[tomId];
  if (!buffer) return;
  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  source.buffer = buffer;
  gainNode.gain.value = currentVolume;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
}

/**
 * Activa la animación y el sonido de un tom de forma optimizada
 * @param {string} tomId - ID del tom a activar
 */
function activarTom(tomId) {
  // Refuerzo: bloquear absolutamente en ambos modos de edición
  if (window.modoEdicionActivo || window.modoEdicionSamplers || modoEdicionActivo || modoEdicionSamplers) return;
  const boton = document.getElementById(tomId);
  if (!boton) return;
  boton.classList.add('active');
  // Asegura que el contexto de audio esté activo antes de reproducir
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      requestAnimationFrame(() => reproducirTom(tomId));
    });
  } else {
    requestAnimationFrame(() => reproducirTom(tomId));
  }
  // Animación optimizada
  setTimeout(() => boton.classList.remove('active'), 60);
}

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar configuración de samplers guardada (si existe)
  cargarSamplersLocal();
  // Precarga todos los sonidos
  await precargarTodosLosToms();

  // Al asignar letras a los botones, usa el mapeo actual
  Object.entries(keyToTomId).forEach(([key, tomId]) => {
    const boton = document.getElementById(tomId);
    if (boton) {
      const span = boton.querySelector('.battery__tom-key');
      if (span) span.textContent = key.toUpperCase();
    }
  });

  // Referencias a los controles de volumen
  const sliderVolumen = document.getElementById('volumenSlider');
  const labelPorcentaje = document.getElementById('volumenPorcentaje');

  // Actualiza el porcentaje de volumen en pantalla
  if (sliderVolumen && labelPorcentaje) {
    const actualizarLabel = v => labelPorcentaje.textContent = Math.round(v * 100) + '%';
    actualizarLabel(sliderVolumen.value);
    sliderVolumen.addEventListener('input', e => {
      currentVolume = +e.target.value;
      actualizarLabel(currentVolume);
    });
    // Permite ajustar el volumen con la rueda del mouse
    sliderVolumen.addEventListener('wheel', e => {
      e.preventDefault();
      const step = parseFloat(sliderVolumen.step) || 0.01;
      let nuevoValor = parseFloat(sliderVolumen.value) + (e.deltaY < 0 ? step : -step);
      nuevoValor = Math.max(parseFloat(sliderVolumen.min), Math.min(parseFloat(sliderVolumen.max), nuevoValor));
      sliderVolumen.value = nuevoValor;
      sliderVolumen.dispatchEvent(new Event('input', { bubbles: true }));
    });
  } else if (sliderVolumen) {
    sliderVolumen.addEventListener('input', e => currentVolume = +e.target.value);
    sliderVolumen.addEventListener('wheel', e => {
      e.preventDefault();
      const step = parseFloat(sliderVolumen.step) || 0.01;
      let nuevoValor = parseFloat(sliderVolumen.value) + (e.deltaY < 0 ? step : -step);
      nuevoValor = Math.max(parseFloat(sliderVolumen.min), Math.min(parseFloat(sliderVolumen.max), nuevoValor));
      sliderVolumen.value = nuevoValor;
      sliderVolumen.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Evento para activar toms con el teclado
  document.addEventListener('keydown', e => {
    // Si el modal de edición está visible o cualquier modo edición está activo, no activar el tom
    const modal = document.getElementById('modalEditarTecla');
    if ((modal && modal.style.display === 'flex') || window.modoEdicionActivo || window.modoEdicionSamplers || modoEdicionActivo || modoEdicionSamplers) return;
    const tomId = keyToTomId[e.key.toLowerCase()];
    if (tomId) {
      e.preventDefault();
      activarTom(tomId);
    }
  });

  // Evento para activar toms con click
  Object.keys(tomAudioMap).forEach(tomId => {
    const boton = document.getElementById(tomId);
    if (boton) boton.addEventListener('click', e => {
      // Si cualquier modo de edición está activo, no hacer nada (ni animación ni sonido)
      if (window.modoEdicionActivo || window.modoEdicionSamplers || modoEdicionActivo || modoEdicionSamplers) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      activarTom(tomId);
    });
  });

  // Reanuda el contexto de audio en la primera interacción del usuario
  document.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }, { once: true });

  // Actualiza solo el año automáticamente en el footer
  const year = new Date().getFullYear();
  const footerYear = document.getElementById('footerYear');
  if (footerYear) {
    // Mantiene la versión fija y actualiza solo el año
    footerYear.textContent = `© ${year} Piano Champetero. Todos los derechos reservados. v.1.0`;
  }
});


// Variables internas para evitar recursión infinita
let _modoEdicionActivo = false;
let _modoEdicionSamplers = false;
Object.defineProperty(window, 'modoEdicionActivo', {
  get: function() { return _modoEdicionActivo; },
  set: function(val) { _modoEdicionActivo = val; }
});
Object.defineProperty(window, 'modoEdicionSamplers', {
  get: function() { return _modoEdicionSamplers; },
  set: function(val) { _modoEdicionSamplers = val; }
});
