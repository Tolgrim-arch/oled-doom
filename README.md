# OLED-DOOM (1-Bit Roguelite)

**Jugar ahora (GitHub Pages):** https://tolgrim-arch.github.io/oled-doom/

Roguelite ligero estilo DOOM en **128×64 píxeles monocromo (1-bit)** diseñado para simular una pantalla OLED 0.96" y controlarse mediante un **Arduino Mega 2560 / UNO** con módulo joystick **KY-023** vía **Web Serial API**.

## Características
- **Motor Raycaster DDA 1-bit (128×64):** Sombreado por dithering ordenado (`PAT_50`, `PAT_25`, `PAT_12`) y bordes de 1 px para máxima legibilidad.
- **3 Arquetipos de Enemigos:** Imp, Cacodemon y Lost Soul con IA de persecución, separación y sprites 1-bit creados con `pixelai`.
- **Progresión Roguelite:**
  - Pisos/salas rotativas (`FLOOR 1, 2, 3...`) con escalado de enemigos.
  - Sistema de **EXP** y **3 cartas de mejora** al subir de nivel (`DMG +1`, `HP +30`, `SPD +15`, `MAG +4`, `FIRE +20`), navegables con el joystick.
  - Cargador de arma con recarga automática/manual y pantalla de `GAME OVER`.
- **Control Dual:** Joystick KY-023 por USB (`115200 baud`) o teclado (`W/A/S/D`, `Espacio`, `M`, `R`).

## Hardware (Arduino Mega 2560 / UNO)
| Pin KY-023 | Pin Arduino |
| :--- | :--- |
| `GND` | `GND` |
| `+5V` | `5V` |
| `VRx` | `A0` |
| `VRy` | `A1` |
| `SW` | `D10` |

## Cómo Ejecutar
1. Sube `arduino/doom_controller/doom_controller.ino` a tu Arduino desde Arduino IDE (cierra el Monitor Serie al terminar).
2. Levanta un servidor local en la carpeta `game/`:
   ```bash
   python -m http.server 8000 --directory game
   ```
3. Abre `http://localhost:8000` en **Chrome o Edge** y pulsa **Conectar Arduino (USB)**.
