// Utilidades

// Estado global
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const TOM_AUDIO_DEFAULTS = {
  tom1: 'D (2).wav',
  tom2: 'F4.wav',
  tom3: 'Pitico.wav',
  tom4: 'SKTAC.WAV',
  tom5: 'Y.wav',
  tom6: 'F2.wma',
  tom7: 'perro bajo.WAV',
  tom8: 'SK2.WAV',
  tom9: 'Smar 1.wav'
};
// Inicializar tomAudioMap con los datos de localStorage si existen, si no con los defaults
let tomAudioMap;
(() => {
  tomAudioMap = { ...TOM_AUDIO_DEFAULTS };
  const dataSamplers = localStorage.getItem('pianoChampeteroSamplers');
  if (dataSamplers) {
    try {
      const parsed = JSON.parse(dataSamplers);
      Object.keys(tomAudioMap).forEach(k => {
        if (parsed[k]) {
          tomAudioMap[k] = parsed[k];
        }
      });
    } catch (e) {
      // Si hay error, ignorar y usar defaults
    }
  }
})();
const keyToTomIdDefaults = { q: 'tom1', w: 'tom2', e: 'tom3', a: 'tom4', s: 'tom5', d: 'tom6', z: 'tom7', x: 'tom8', c: 'tom9' };
// Restablecer ajustes
function restablecerAjustes() {
  // Borrar configuraciones del usuario en localStorage
  localStorage.removeItem('pianoChampeteroSamplers');
  localStorage.removeItem('pianoChampeteroKeyMap');
  // Restaurar sonidos por defecto
  Object.keys(tomAudioMap).forEach(k => tomAudioMap[k] = TOM_AUDIO_DEFAULTS[k]);
  // Restaurar mapeo de teclas por defecto
  Object.keys(keyToTomId).forEach(k => delete keyToTomId[k]);
  Object.entries(keyToTomIdDefaults).forEach(([k, v]) => keyToTomId[k] = v);
  precargarTodosLosToms().then(() => {
    // Actualizar letras en los botones
    Object.entries(keyToTomId).forEach(([key, tomId]) => {
      const boton = document.getElementById(tomId);
      if (boton) {
        const span = boton.querySelector('.battery__tom-key');
        if (span) span.textContent = key.toUpperCase();
      }
    });
  });
}
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
const guardarSamplersLocal = () => {
  // Guardar solo el nombre del archivo (sin carpeta)
  const soloNombre = {};
  Object.keys(tomAudioMap).forEach(k => {
    const nombre = tomAudioMap[k] ? tomAudioMap[k].split('/').pop() : '';
    soloNombre[k] = nombre;
  });
  try {
    localStorage.setItem('pianoChampeteroSamplers', JSON.stringify(soloNombre));
  } catch (e) {
    // En producción, ignorar errores de almacenamiento
  }
};

// Guardar samplers automáticamente al salir o recargar la página
window.addEventListener('beforeunload', guardarSamplersLocal);

// Carga dinámica de samplers
async function cargarSamplersDisponibles() {
  // Siempre obtener la lista dinámica de archivos en sounds/ (funciona en servidores que permiten listar directorios)
  let listaArchivos = [];
  try {
    const res = await fetch('sounds/');
    const text = await res.text();
    listaArchivos = Array.from(text.matchAll(/href="([^"]+\.(?:wav|mp3|WAV|MP3|wma|WMA))"/gi)).map(m => m[1].startsWith('sounds/') ? m[1].slice(7) : m[1]);
  } catch (e) {
    // Si falla, dejar la lista vacía (no mostrar nada)
    listaArchivos = [];
  }
  samplersDisponibles = listaArchivos;
  // Solo volver al default si el archivo realmente no existe (ignorando mayúsculas/minúsculas)
  const archivosDisponibles = new Map(samplersDisponibles.map(f => [f.toLowerCase(), f]));
  Object.keys(tomAudioMap).forEach(tomId => {
    let nombre = tomAudioMap[tomId] ? tomAudioMap[tomId].split('/').pop() : '';
    if (!nombre) {
      tomAudioMap[tomId] = TOM_AUDIO_DEFAULTS[tomId];
      return;
    }
    // Si el nombre existe (ignorando mayúsculas/minúsculas), usar el nombre real del archivo
    const nombreReal = archivosDisponibles.get(nombre.toLowerCase());
    if (nombreReal) {
      tomAudioMap[tomId] = nombreReal;
    }
  });
}

// Precarga de buffers
async function precargarTodosLosToms() {
  await cargarSamplersDisponibles();
  await Promise.all(Object.entries(tomAudioMap).map(async ([tomId, nombreArchivo]) => {
    if (nombreArchivo) {
      try {
        tomBuffers[tomId] = await cargarBufferAudio('sounds/' + nombreArchivo);
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
  // Refuerza la lectura del volumen actual del slider si existe
  const sliderVolumen = document.getElementById('volumenSlider');
  let volumenActual = currentVolume;
  if (sliderVolumen) volumenActual = +sliderVolumen.value;
  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volumenActual;
  source.buffer = buffer;
  source.connect(gainNode).connect(audioCtx.destination);
  source.start();
}
async function activarTom(tomId) {
  if (window.modoEdicionActivo || window.modoEdicionSamplers) return;
  const boton = document.getElementById(tomId);
  if (!boton) return;
  boton.classList.add('active');
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
    requestAnimationFrame(() => reproducirTom(tomId));
  } else {
    requestAnimationFrame(() => reproducirTom(tomId));
  }
  setTimeout(() => boton.classList.remove('active'), 60);
}

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar modal de edición de letra al hacer clic en el ícono de editar
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', e => {
      if (!window.modoEdicionActivo) return;
      e.stopPropagation();
      const boton = icon.closest('.battery__tom');
      if (!boton) return;
      tomEditando = boton;
      if (modal) {
        modal.style.display = 'flex';
        input.value = '';
        input.focus();
      }
    });
  });

  // Mostrar modal de edición de sampler al hacer clic en el ícono de editar (cuando está activo modo samplers)
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', async e => {
      if (!window.modoEdicionSamplers) return;
      e.stopPropagation();
      const boton = icon.closest('.battery__tom');
      if (!boton) return;
      tomSamplerEditando = boton;
      if (modalSampler) {
        // Cargar la lista de samplers disponibles
        if (typeof cargarSamplersDisponibles === 'function') {
          await cargarSamplersDisponibles();
        }
        if (listaSamplers) {
          listaSamplers.innerHTML = '';
          samplersDisponibles.forEach(sampler => {
            const li = document.createElement('li');
            // Mostrar solo el nombre del archivo
            const nombreArchivo = sampler.split('/').pop();
            li.textContent = nombreArchivo;
            li.className = 'sampler-item';
            li.tabIndex = 0;
            li.addEventListener('click', async () => {
              document.querySelectorAll('.sampler-item').forEach(el => el.classList.remove('selected'));
              li.classList.add('selected');
              samplerSeleccionado = nombreArchivo;
              // Previsualizar sonido, deteniendo el anterior si existe
              if (window._previewSource && typeof window._previewSource.stop === 'function') {
                try { window._previewSource.stop(); } catch { }
              }
              try {
                // Previsualizar usando la ruta correcta
                const ruta = 'sounds/' + nombreArchivo;
                // Reanudar contexto si está suspendido (algunos navegadores requieren interacción)
                if (audioCtx.state !== 'running') {
                  await audioCtx.resume();
                }
                // Cargar y reproducir el buffer
                const buffer = await cargarBufferAudio(ruta);
                const source = audioCtx.createBufferSource();
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = currentVolume;
                source.buffer = buffer;
                source.connect(gainNode).connect(audioCtx.destination);
                source.start();
                window._previewSource = source;
              } catch (e) {
                // Si falla, no hacer nada (puede ser error de carga o contexto)
              }
            });
            li.addEventListener('keydown', e => {
              if (e.key === 'Enter' || e.key === ' ') {
                li.click();
              }
            });
            // Selecciona el actual
            if (tomAudioMap[boton.id] && tomAudioMap[boton.id].toLowerCase().includes(nombreArchivo.toLowerCase())) {
              li.classList.add('selected');
              samplerSeleccionado = nombreArchivo;
            }
            listaSamplers.appendChild(li);
          });
        }
        modalSampler.style.display = 'flex';
      }
    });
  });
  // Modal de confirmación para restablecer ajustes
  const btnReset = document.getElementById('btnResetAjustes');
  const modalReset = document.getElementById('modalConfirmarReset');
  const confirmarResetBtn = document.getElementById('confirmarResetBtn');
  const cancelarResetBtn = document.getElementById('cancelarResetBtn');
  if (btnReset && modalReset && confirmarResetBtn && cancelarResetBtn) {
    btnReset.addEventListener('click', () => {
      modalReset.style.display = 'flex';
      confirmarResetBtn.focus();
    });
    confirmarResetBtn.addEventListener('click', () => {
      restablecerAjustes();
      modalReset.style.display = 'none';
    });
    cancelarResetBtn.addEventListener('click', () => {
      modalReset.style.display = 'none';
    });
    modalReset.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        modalReset.style.display = 'none';
      }
    });
  }
  // No reanudar el contexto de audio automáticamente, solo tras interacción del usuario
  // Cargar barra de navegación y resaltar enlace actual
  fetch('nav.html')
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
    });

  // Cargar configuración local
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
  // Guardar selección de sampler
  guardarSamplerBtn.addEventListener('click', async () => {
    if (!samplerSeleccionado || !tomSamplerEditando) return;
    const tomId = tomSamplerEditando.id;
    const nombre = samplerSeleccionado;
    tomAudioMap[tomId] = nombre;
    tomBuffers[tomId] = await cargarBufferAudio('sounds/' + nombre);
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

  /// ...

  // Eventos de activación
  document.addEventListener('keydown', async e => {
    const modal = document.getElementById('modalEditarTecla');
    if ((modal && modal.style.display === 'flex') || window.modoEdicionActivo || window.modoEdicionSamplers) return;
    const tomId = keyToTomId[e.key.toLowerCase()];
    if (tomId) {
      e.preventDefault();
      await activarTom(tomId);
    }
  });

  Object.keys(tomAudioMap).forEach(tomId => {
    const boton = document.getElementById(tomId);
    if (boton) boton.addEventListener('click', async e => {
      if (window.modoEdicionActivo || window.modoEdicionSamplers) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      await activarTom(tomId);
    });
  });

  // Reanudar AudioContext y recargar buffer tras volver al navegador
  window.addEventListener('focus', async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    // Recargar buffers para evitar bug de volumen bajo
    await precargarTodosLosToms();
  });

  document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

  // Footer: actualiza solo el año en el span correspondiente
  const anioFooter = document.getElementById('anioFooter');
  if (anioFooter) anioFooter.textContent = new Date().getFullYear();

  // Botón de guardar sonidos
  const guardarSonidosBtn = document.getElementById('guardarSamplerBtn');
  guardarSonidosBtn.addEventListener('click', () => {
    guardarSamplersLocal();
  });
});
