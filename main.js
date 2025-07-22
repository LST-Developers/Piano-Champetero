

// --- Batería Champetera: Audio instantáneo, código claro y documentado ---

// Contexto de audio global para reproducir sonidos
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Mapeo de IDs de toms a rutas de archivos de audio
const tomAudioMap = {
  tom1: 'sounds/SK1.WAV',
  tom2: 'sounds/SK2.WAV',
  tom3: 'sounds/SKTAC.WAV',
  tom4: 'sounds/SKTUN.WAV',
  tom5: 'sounds/Golpe SK5.wav',
  tom6: 'sounds/Pitico.wav',
  tom7: 'sounds/Leon.wav',
  tom8: 'sounds/Lazer.wav',
  tom9: 'sounds/pitico medio.wav'
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
 * Activa la animación y el sonido de un tom
 * @param {string} tomId - ID del tom a activar
 */
function activarTom(tomId) {
  const boton = document.getElementById(tomId);
  if (!boton) return;
  boton.classList.add('active');
  reproducirTom(tomId);
  setTimeout(() => boton.classList.remove('active'), 60);
}

// --- Inicialización y eventos ---
document.addEventListener('DOMContentLoaded', async () => {
  // Precarga todos los sonidos
  await precargarTodosLosToms();

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
    const tomId = keyToTomId[e.key.toLowerCase()];
    if (tomId) {
      e.preventDefault();
      activarTom(tomId);
    }
  });

  // Evento para activar toms con click
  Object.keys(tomAudioMap).forEach(tomId => {
    const boton = document.getElementById(tomId);
    if (boton) boton.addEventListener('click', () => activarTom(tomId));
  });

  // Reanuda el contexto de audio en la primera interacción del usuario
  document.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }, { once: true });
});
