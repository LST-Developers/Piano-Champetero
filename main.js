// Configuración de audio para la batería champetera
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

// Mapeo de sonidos para cada tom
const soundMap = {
  'tom1': 'sounds/SK1.WAV',
  'tom2': 'sounds/SK2.WAV', 
  'tom3': 'sounds/SKTAC.WAV',
  'tom4': 'sounds/SKTUN.WAV',
  'tom5': 'sounds/Golpe SK5.wav',
  'tom6': 'sounds/Pitico.wav',
  'tom7': 'sounds/Leon.wav',
  'tom8': 'sounds/Lazer.wav',
  'tom9': 'sounds/pitico medio.wav'
};

// Función para cargar y decodificar audio
async function loadSound(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    console.error('Error cargando el sonido:', url, error);
    return null;
  }
}

// Función para reproducir sonido
function playSound(soundBuffer, volume = 0.5) {
  if (!soundBuffer) return;
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = soundBuffer;
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start(0);
}

// Cargar todos los sonidos al iniciar
async function loadAllSounds() {
  for (const [tomId, soundPath] of Object.entries(soundMap)) {
    sounds[tomId] = await loadSound(soundPath);
  }
  console.log('Todos los sonidos cargados');
}

// Activar los tombos con el teclado
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar sonidos
  await loadAllSounds();
  
  const keyMap = {
    'q': 'tom1',
    'w': 'tom2',
    'e': 'tom3',
    'a': 'tom4',
    's': 'tom5',
    'd': 'tom6',
    'z': 'tom7',
    'x': 'tom8',
    'c': 'tom9'
  };

  // Control de volumen
  const volumeSlider = document.getElementById('volumenSlider');
  let currentVolume = 0.5;
  
  volumeSlider.addEventListener('input', (e) => {
    currentVolume = parseFloat(e.target.value);
  });

  // Función para activar un tom
  function activateTom(tomId) {
    const btn = document.getElementById(tomId);
    if (btn && sounds[tomId]) {
      btn.classList.add('active');
      playSound(sounds[tomId], currentVolume);
      setTimeout(() => btn.classList.remove('active'), 120);
    }
  }

  // Event listeners para teclado
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
      e.preventDefault();
      activateTom(keyMap[key]);
    }
  });

  // Event listeners para clicks en los botones
  Object.keys(soundMap).forEach(tomId => {
    const btn = document.getElementById(tomId);
    if (btn) {
      btn.addEventListener('click', () => {
        activateTom(tomId);
      });
    }
  });

  // Reanudar contexto de audio en la primera interacción del usuario
  document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, { once: true });
});
