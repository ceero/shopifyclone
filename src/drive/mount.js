import './drive.css';

document.title = 'Drive';
document.querySelectorAll('[data-edition-style]').forEach(link => link.remove());

const container = document.getElementById('root');
container.innerHTML = `
  <div class="loader" id="loader"><div class="spinner"></div></div>
  <div class="carousel-3d__joystick" aria-label="Drive car joystick">
    <div class="carousel-3d__joystick-base"><div class="carousel-3d__joystick-knob"></div></div>
  </div>`;

import('../vendor/spring26/drive-scene.js');
