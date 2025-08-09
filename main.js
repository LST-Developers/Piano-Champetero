// Estado global
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const tomSamplersDefaults = {
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

const samplerList = [
  'D (2).wav',
  'F4.wav',
  'Golpe SK5.wav',
  'Lazer.wav',
  'Leon.wav',
  'PON1.wav',
  'Pitico.wav',
  'SK1.WAV',
  'SK2.WAV',
  'SKTAC.WAV',
  'SKTUN.WAV',
  'Smar 1.wav',
  'WARA2.wav',
  'Y.wav',
  'perro bajo.WAV',
  'pitico medio.wav'
];
// Inicializar tomAudioMap con los datos de localStorage si existen, si no con los defaults
let tomAudioMap;
(function initTomAudioMap() {
  tomAudioMap = { ...tomSamplersDefaults };
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
      // Ignore and use defaults
    }
  }
})();
const keyToTomIdDefaults = { q: 'tom-1', w: 'tom-2', e: 'tom-3', a: 'tom-4', s: 'tom-5', d: 'tom-6', z: 'tom-7', x: 'tom-8', c: 'tom-9' };
// Reset user settings and restore defaults
function resetSettings() {
  localStorage.removeItem('pianoChampeteroSamplers');
  localStorage.removeItem('pianoChampeteroKeyMap');
  Object.keys(tomAudioMap).forEach(k => tomAudioMap[k] = tomSamplersDefaults[k]);
  Object.keys(keyToTomId).forEach(k => delete keyToTomId[k]);
  Object.entries(keyToTomIdDefaults).forEach(([k, v]) => keyToTomId[k] = v);
  preloadAllSamplers().then(() => {
    Object.entries(keyToTomId).forEach(([key, tomId]) => {
      const button = document.getElementById(tomId);
      if (button) {
        const span = button.querySelector('.battery-tom-key');
        if (span) span.textContent = key.toUpperCase();
      }
    });
  });
}
const keyToTomId = { q: 'tom-1', w: 'tom-2', e: 'tom-3', a: 'tom-4', s: 'tom-5', d: 'tom-6', z: 'tom-7', x: 'tom-8', c: 'tom-9' };
const tomSamplerBuffers = {};
let currentVolume = 0.5;
let samplersDisponibles = [];
let tomEditando = null, tomSamplerEditando = null, samplerSeleccionado = null;
let _modoEdicionActivo = false, _modoEdicionSamplers = false;
Object.defineProperty(window, 'modoEdicionActivo', { get: () => _modoEdicionActivo, set: v => { _modoEdicionActivo = v; } });
Object.defineProperty(window, 'modoEdicionSamplers', { get: () => _modoEdicionSamplers, set: v => { _modoEdicionSamplers = v; } });

// Persistence
const saveKeyMapping = () => localStorage.setItem('pianoChampeteroKeyMap', JSON.stringify(keyToTomId));
const loadKeyMapping = () => {
  const data = localStorage.getItem('pianoChampeteroKeyMap');
  if (data) {
    Object.keys(keyToTomId).forEach(k => delete keyToTomId[k]);
    Object.entries(JSON.parse(data)).forEach(([k, v]) => keyToTomId[k] = v);
  }
};
const saveSamplers = () => {
  const onlyName = {};
  Object.keys(tomAudioMap).forEach(k => {
    const name = tomAudioMap[k] ? tomAudioMap[k].split('/').pop() : '';
    onlyName[k] = name;
  });
  try {
    localStorage.setItem('pianoChampeteroSamplers', JSON.stringify(onlyName));
  } catch (e) {
    // Ignore storage errors in production
  }
};

// Save samplers automatically on page unload
window.addEventListener('beforeunload', saveSamplers);

// Load samplers from fixed variable
async function loadAvailableSamplers() {
  samplersDisponibles = samplerList;
  const availableFiles = new Map(samplersDisponibles.map(f => [f.toLowerCase(), f]));
  Object.keys(tomAudioMap).forEach(tomId => {
    let name = tomAudioMap[tomId] ? tomAudioMap[tomId].split('/').pop() : '';
    if (!name) {
      tomAudioMap[tomId] = tomSamplersDefaults[tomId];
      return;
    }
    const realName = availableFiles.get(name.toLowerCase());
    if (realName) {
      tomAudioMap[tomId] = realName;
    }
  });
}

// Preload all tom sampler buffers
async function preloadAllSamplers() {
  await loadAvailableSamplers();
  await Promise.all(Object.entries(tomAudioMap).map(async ([tomId, fileName]) => {
    if (fileName) {
      try {
        tomSamplerBuffers[tomId] = await loadSamplerBuffer('samplers/' + fileName);
      } catch { tomSamplerBuffers[tomId] = null; }
    } else tomSamplerBuffers[tomId] = null;
  }));
}

// Sampler audio
async function loadSamplerBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}
function playTomSampler(tomId) {
  if (window.modoEdicionActivo || window.modoEdicionSamplers) return;
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
async function activateTomSampler(tomId) {
  if (window.modoEdicionActivo || window.modoEdicionSamplers) return;
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

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', async () => {
  // Determinar la página actual
  const isMainPage = document.getElementById('tom-1') !== null;
  const isContactPage = document.getElementById('contact-form') !== null;
  
  // Funciones comunes para todas las páginas
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

  // Footer: actualiza solo el año en el span correspondiente
  const yearFooter = document.getElementById('year-footer');
  if (yearFooter) yearFooter.textContent = new Date().getFullYear();

  // Reanudar AudioContext con interacción del usuario
  document.addEventListener('click', () => { 
    if (audioCtx.state === 'suspended') audioCtx.resume(); 
  }, { once: true });

  // ========== PÁGINA PRINCIPAL (Piano) ==========
  if (isMainPage) {
    // Cargar mapeo de teclas personalizado si existe
    loadKeyMapping();
    
    // Cargar configuración local
    await preloadAllSamplers();

    // Asignar letras a los botones
    Object.entries(keyToTomId).forEach(([key, tomId]) => {
      const boton = document.getElementById(tomId);
      if (boton) {
        const span = boton.querySelector('.battery-tom-key');
        if (span) span.textContent = key.toUpperCase();
      }
    });

    // Volumen
    const sliderVolumen = document.getElementById('volume-slider');
    const labelPorcentaje = document.getElementById('volume-percent');
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

    // Elementos de edición
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

    // Ocultar íconos de edición al inicio
    editIcons.forEach(icon => icon.style.display = 'none');
    const actualizarVisibilidadIconosEdicion = () => editIcons.forEach(icon => icon.style.display = (window.modoEdicionActivo || window.modoEdicionSamplers) ? 'inline-block' : 'none');

    // Funciones de actualización de botones
    const actualizarTextoBotonEdicion = () => {
      editarBtn.textContent = window.modoEdicionActivo ? 'Desactivar edición de teclas' : 'Editar letras';
      editarBtn.classList.toggle('edit-mode-active', window.modoEdicionActivo);
    };
    const actualizarTextoBotonEdicionSamplers = () => {
      editarSamplersBtn.textContent = window.modoEdicionSamplers ? 'Desactivar edición de samplers' : 'Editar samplers';
      editarSamplersBtn.classList.toggle('edit-mode-active', window.modoEdicionSamplers);
    };
    
    actualizarTextoBotonEdicion();
    actualizarTextoBotonEdicionSamplers();

    // Event listeners para botones de edición
    editarBtn.addEventListener('click', () => {
      window.modoEdicionActivo = !window.modoEdicionActivo;
      if (window.modoEdicionActivo) {
        window.modoEdicionSamplers = false;
        editarSamplersBtn.classList.remove('edit-mode-active');
      }
      document.body.classList.toggle('edit-mode', window.modoEdicionActivo);
      actualizarVisibilidadIconosEdicion();
      editarBtn.disabled = false;
      editarSamplersBtn.disabled = false;
      actualizarTextoBotonEdicion();
      actualizarTextoBotonEdicionSamplers();
      editarSamplersBtn.textContent = 'Editar samplers';
      if (!window.modoEdicionActivo && modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
        tomEditando = null;
      }
      if (window.modoEdicionActivo && modalSampler && modalSampler.style.display === 'flex') {
        modalSampler.style.display = 'none';
        tomSamplerEditando = null;
      }
    });
    
    editarSamplersBtn.addEventListener('click', () => {
      window.modoEdicionSamplers = !window.modoEdicionSamplers;
      if (window.modoEdicionSamplers) {
        window.modoEdicionActivo = false;
        editarBtn.classList.remove('edit-mode-active');
      }
      document.body.classList.toggle('edit-mode', window.modoEdicionSamplers);
      actualizarVisibilidadIconosEdicion();
      editarSamplersBtn.disabled = false;
      editarBtn.disabled = false;
      actualizarTextoBotonEdicionSamplers();
      actualizarTextoBotonEdicion();
      editarBtn.textContent = 'Editar letras';
      if (!window.modoEdicionSamplers && modalSampler && modalSampler.style.display === 'flex') {
        modalSampler.style.display = 'none';
        tomSamplerEditando = null;
      }
      if (window.modoEdicionSamplers && modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
        tomEditando = null;
      }
    });

    // Mostrar modal de edición de letra al hacer clic en el ícono de editar
    document.querySelectorAll('.edit-icon').forEach(icon => {
      icon.addEventListener('click', e => {
        if (!window.modoEdicionActivo) return;
        e.stopPropagation();
        const boton = icon.closest('.battery-tom');
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
        const boton = icon.closest('.battery-tom');
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
                // Preview using the correct sampler path
                  const path = 'samplers/' + nombreArchivo;
                  if (audioCtx.state !== 'running') {
                    await audioCtx.resume();
                  }
                  const buffer = await loadSamplerBuffer(path);
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
    const btnReset = document.getElementById('reset-settings-btn');
    const modalReset = document.getElementById('modal-confirm-reset');
    const confirmarResetBtn = document.getElementById('confirm-reset-btn');
    const cancelarResetBtn = document.getElementById('cancel-reset-btn');
    if (btnReset && modalReset && confirmarResetBtn && cancelarResetBtn) {
      btnReset.addEventListener('click', () => {
        modalReset.style.display = 'flex';
        confirmarResetBtn.focus();
      });
      confirmarResetBtn.addEventListener('click', () => {
        resetSettings();
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

    // Guardar selección de sampler
    if (guardarSamplerBtn) {
      guardarSamplerBtn.addEventListener('click', async () => {
        if (!samplerSeleccionado || !tomSamplerEditando) return;
        const tomId = tomSamplerEditando.id;
        const nombre = samplerSeleccionado;
        tomAudioMap[tomId] = nombre;
        tomSamplerBuffers[tomId] = await loadSamplerBuffer('samplers/' + nombre);
        saveSamplers();
        modalSampler.style.display = 'none';
        tomSamplerEditando = null;
        samplerSeleccionado = null;
      });
    }
    
    if (cancelarSamplerBtn) {
      cancelarSamplerBtn.addEventListener('click', () => {
        modalSampler.style.display = 'none';
        tomSamplerEditando = null;
        samplerSeleccionado = null;
      });
    }
    
    if (modalSampler) {
      modalSampler.addEventListener('keydown', e => { if (e.key === 'Escape' && cancelarSamplerBtn) cancelarSamplerBtn.click(); });
    }

    // Guardar nueva letra
    if (guardarBtn) {
      guardarBtn.addEventListener('click', () => {
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
        saveKeyMapping();
        if (modal) modal.style.display = 'none';
        tomEditando = null;
        if (editarBtn) editarBtn.disabled = false;
        document.body.classList.toggle('edit-mode', window.modoEdicionActivo);
        editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
      });
    }
    
    if (cancelarBtn) {
      cancelarBtn.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
        tomEditando = null;
        if (editarBtn) editarBtn.disabled = false;
        document.body.classList.toggle('edit-mode', window.modoEdicionActivo);
        editIcons.forEach(icon => icon.style.display = window.modoEdicionActivo ? 'inline-block' : 'none');
      });
    }
    
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Escape' && cancelarBtn) cancelarBtn.click();
        if (e.key === 'Enter' && guardarBtn) guardarBtn.click();
      });
    }

    // Eventos de teclado para activar los toms
    document.addEventListener('keydown', async e => {
      const modal = document.getElementById('modal-edit-key');
      if ((modal && modal.style.display === 'flex') || window.modoEdicionActivo || window.modoEdicionSamplers) return;
      
      // Verificar que e.key existe antes de usar toLowerCase
      if (!e.key) return;
      
      const tomId = keyToTomId[e.key.toLowerCase()];
      if (tomId) {
        e.preventDefault();
        await activateTomSampler(tomId);
      }
    });

    // Eventos de click en los toms
    Object.keys(tomAudioMap).forEach(tomId => {
      const boton = document.getElementById(tomId);
      if (boton) boton.addEventListener('click', async e => {
        if (window.modoEdicionActivo || window.modoEdicionSamplers) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        await activateTomSampler(tomId);
      });
    });

    // Reanudar AudioContext y recargar buffer tras volver al navegador
    window.addEventListener('focus', async () => {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      // Recargar buffers para evitar bug de volumen bajo
      await preloadAllSamplers();
    });

    // Botón de guardar sonidos
    const saveSamplersBtn = document.getElementById('save-sampler-btn');
    if (saveSamplersBtn) {
      saveSamplersBtn.addEventListener('click', () => {
        saveSamplers();
      });
    }
  }

  // ========== PÁGINA DE CONTACTO ==========
  if (isContactPage) {
    // Verificar si hay parámetro de confirmación en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('enviado') === 'true') {
      const confirmationMessage = document.getElementById('confirmation-message');
      const contactForm = document.getElementById('contact-form');
      
      if (confirmationMessage && contactForm) {
        confirmationMessage.style.display = 'block';
        contactForm.style.display = 'none';
        
        // Limpiar la URL después de 5 segundos
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          confirmationMessage.style.display = 'none';
          contactForm.style.display = 'block';
        }, 5000);
      }
    }

    // Manejar envío del formulario con AJAX
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevenir el envío normal del formulario
        
        const submitBtn = contactForm.querySelector('.send-button');
        const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
          submitBtn.disabled = true;
        }

        const formData = new FormData(contactForm);
        
        try {
          const response = await fetch('https://formspree.io/f/xqalyldq', {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            // Mostrar mensaje de confirmación y ocultar formulario
            const confirmationMessage = document.getElementById('confirmation-message');
            if (confirmationMessage) {
              confirmationMessage.style.display = 'block';
              contactForm.style.display = 'none';
              // Limpiar formulario
              contactForm.reset();
            }
          } else {
            alert('Hubo un error al enviar el mensaje. Intenta nuevamente.');
          }
        } catch (error) {
          alert('Hubo un error de conexión. Intenta nuevamente.');
        } finally {
          if (submitBtn) {
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.disabled = false;
          }
        }
      });
    }

    // Botón para volver al formulario
    const backToFormBtn = document.getElementById('back-to-form');
    if (backToFormBtn) {
      backToFormBtn.addEventListener('click', function() {
        const confirmationMessage = document.getElementById('confirmation-message');
        const contactForm = document.getElementById('contact-form');
        if (confirmationMessage && contactForm) {
          confirmationMessage.style.display = 'none';
          contactForm.style.display = 'block';
        }
      });
    }
  }
});
