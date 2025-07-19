// Activa los tombos con el teclado

document.addEventListener('DOMContentLoaded', () => {
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

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
      const btn = document.getElementById(keyMap[key]);
      if (btn) {
        btn.classList.add('active');
        // Simula el click visual y de evento
        btn.dispatchEvent(new Event('mousedown'));
        btn.dispatchEvent(new Event('mouseup'));
        setTimeout(() => btn.classList.remove('active'), 120);
      }
    }
  });
});
