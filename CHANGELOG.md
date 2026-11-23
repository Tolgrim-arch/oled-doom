# Changelog

## [1.0.0] - 2026-11-23
### Added
- **OLED-DOOM:** Motor raycaster DDA en resolución nativa `128x64` 1-bit monocromo con patrones de dithering para profundidad.
- **Firmware Arduino (`doom_controller.ino`):** Lectura del joystick analógico KY-023 (`A0`, `A1`, `D10`) a `115200 baud` vía Web Serial API.
- **Sprites 1-bit (`pixelai`):** 3 criaturas distintas (`enemy.png`, `enemy_caco.png`, `enemy_skull.png`) con contorno negro de 1 px.
- **Modo Roguelite:**
  - IA de enemigos con 3 arquetipos y colisión con paredes.
  - Sistema de `HP`, daño, invulnerabilidad breve y pantalla `GAME OVER`.
  - Cargador de arma (`8` balas) con recarga automática y manual (`R`).
  - Pisos rotativos (`4` mapas) con escalado progresivo.
  - Barra de `EXP` y selección de **3 cartas de mejora** al subir de nivel (`DMG`, `HP`, `SPD`, `MAG`, `FIRE`).
- **Fuente Bitmap 3×5:** Renderizado de texto 1-bit sin antialiasing.
