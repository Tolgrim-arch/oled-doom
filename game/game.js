const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = canvas.width;   // 128
const H = canvas.height;  // 64

const btnConnect = document.getElementById('btnConnect');
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('serialDebug');

const enemySprites = [
  Object.assign(new Image(), { src: 'enemy.png?v=20' }),
  Object.assign(new Image(), { src: 'enemy_caco.png?v=20' }),
  Object.assign(new Image(), { src: 'enemy_skull.png?v=20' })
];

// --- 4 ROGUELIKE FLOOR TEMPLATES (12x10) ---
const MAPS = [
  [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,2,0,0,0,3,0,2,0,1],
    [1,0,2,0,0,0,0,0,0,2,0,1],
    [1,0,0,0,0,3,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,2,2,0,1],
    [1,0,3,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,2,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,2,2,2,0,0,1],
    [1,0,2,0,0,0,0,0,2,0,0,1],
    [1,0,2,0,0,3,0,0,0,0,0,1],
    [1,0,0,0,0,3,0,0,0,2,0,1],
    [1,0,0,2,0,0,0,1,0,2,0,1],
    [1,0,0,2,2,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,3,0,3,0,0,3,0,3,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,0,0,2,2,0,0,1],
    [1,0,0,2,2,0,0,2,2,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,3,0,3,0,0,3,0,3,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,2,2,0,0,1,0,3,3,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,0,2,2,0,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,3,0,0,0,0,0,2,2,0,1],
    [1,0,3,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
  ]
];

// --- ENEMY ARCHETYPES (0=Imp, 1=Cacodemon, 2=Lost Soul) ---
const ARCHETYPES = [
  { speed: 1.10, hp: 2, dmg: 10, exp: 25 },
  { speed: 0.75, hp: 4, dmg: 18, exp: 45 },
  { speed: 1.75, hp: 1, dmg: 8,  exp: 20 }
];

// --- UPGRADE CARDS POOL ---
const UPGRADE_POOL = [
  { id: 'dmg',  l1: 'DMG',  l2: '+1',  apply: () => { player.damage += 1; } },
  { id: 'hp',   l1: 'HP',   l2: '+30', apply: () => { player.maxHp += 15; player.hp = Math.min(player.maxHp, player.hp + 30); } },
  { id: 'spd',  l1: 'SPD',  l2: '+15', apply: () => { player.speed *= 1.15; } },
  { id: 'mag',  l1: 'MAG',  l2: '+4',  apply: () => { player.maxMag += 4; player.mag = player.maxMag; player.reloadTime = Math.max(0.45, player.reloadTime * 0.85); } },
  { id: 'fire', l1: 'FIRE', l2: '+20', apply: () => { player.fireRate = Math.max(0.12, player.fireRate * 0.8); } }
];

// --- GAME STATE ---
let MAP = MAPS[0];
let gameState = 'PLAYING'; // 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER'
let floor = 1;
let score = 0;
let showMap = true;
let shootFlash = 0;
let shootCooldown = 0;
let damageFlash = 0;
let floorBannerTimer = 0;

const player = {
  x: 1.5, y: 1.5, dir: 0,
  speed: 2.8, rotSpeed: 2.4,
  hp: 100, maxHp: 100, invuln: 0,
  damage: 1, fireRate: 0.30,
  mag: 8, maxMag: 8, reloadTimer: 0, reloadTime: 1.2,
  level: 1, exp: 0, expToNext: 50
};

let enemies = [];
let levelUpCards = [];
let selectedCard = 0;
let menuMoveCooldown = 0;
let prevActionDown = false;

// --- INPUT STATE ---
const keysDown = {};
const arduinoInput = { move: 0, turn: 0, shoot: false };

window.addEventListener('keydown', e => {
  keysDown[e.code] = true;
  if (e.code === 'KeyM') showMap = !showMap;
  if (e.code === 'KeyR') {
    if (gameState === 'GAME_OVER') resetGame();
    else if (gameState === 'PLAYING' && player.mag < player.maxMag && player.reloadTimer <= 0) {
      player.reloadTimer = player.reloadTime;
    }
  }
});
window.addEventListener('keyup', e => { keysDown[e.code] = false; });

function spawnFloor(floorNum) {
  floor = floorNum;
  MAP = MAPS[(floor - 1) % MAPS.length];
  player.x = 1.5;
  player.y = 1.5;
  player.dir = 0;
  floorBannerTimer = 1.6;

  // Collect valid open spawn tiles far from player
  const openTiles = [];
  for (let y = 1; y < MAP.length - 1; y++) {
    for (let x = 1; x < MAP[0].length - 1; x++) {
      if (MAP[y][x] === 0 && Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) > 3.2) {
        openTiles.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
  }

  enemies = [];
  const count = Math.min(openTiles.length, 3 + floor);
  const hpBonus = Math.floor((floor - 1) / 2);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * openTiles.length);
    const pos = openTiles.splice(idx, 1)[0];
    const type = Math.floor(Math.random() * ARCHETYPES.length);
    const arch = ARCHETYPES[type];
    enemies.push({
      x: pos.x,
      y: pos.y,
      type,
      hp: arch.hp + hpBonus,
      maxHp: arch.hp + hpBonus,
      alive: true,
      hitFlash: 0
    });
  }
}

function resetGame() {
  gameState = 'PLAYING';
  score = 0;
  shootFlash = 0;
  shootCooldown = 0;
  damageFlash = 0;

  player.speed = 2.8;
  player.hp = 100;
  player.maxHp = 100;
  player.invuln = 0;
  player.damage = 1;
  player.fireRate = 0.30;
  player.mag = 8;
  player.maxMag = 8;
  player.reloadTimer = 0;
  player.reloadTime = 1.2;
  player.level = 1;
  player.exp = 0;
  player.expToNext = 50;

  spawnFloor(1);
}

function triggerLevelUp() {
  gameState = 'LEVEL_UP';
  player.level++;
  player.exp -= player.expToNext;
  player.expToNext = 50 + (player.level - 1) * 35;

  // Pick 3 unique random cards
  const pool = [...UPGRADE_POOL];
  levelUpCards = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    levelUpCards.push(pool.splice(idx, 1)[0]);
  }
  selectedCard = 1; // Center card by default
  menuMoveCooldown = 0.25;
  prevActionDown = true; // Require fresh press to confirm
}

// --- WEB SERIAL API ---
let port = null;

btnConnect.addEventListener('click', async () => {
  if (!('serial' in navigator)) {
    alert('Web Serial API no soportada. Usa Chrome o Edge en localhost.');
    return;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    statusEl.textContent = 'Estado: Conectado (115200 baud)';
    btnConnect.disabled = true;

    readSerialLoop();
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  }
});

async function readSerialLoop() {
  try {
    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const clean = line.trim();
          if (clean) parseArduinoLine(clean);
        }
      }
    }
  } catch (err) {
    debugEl.textContent = `ERR: ${err.message}`;
  }
}

function parseArduinoLine(line) {
  const parts = line.split(',');
  if (parts.length !== 3) return;

  const rawX = parseInt(parts[0], 10);
  const rawY = parseInt(parts[1], 10);
  const sw   = parseInt(parts[2], 10);
  if (Number.isNaN(rawX) || Number.isNaN(rawY) || Number.isNaN(sw)) return;

  const dx = Math.abs(rawX - 512) > 90 ? (rawX - 512) / 512 : 0;
  const dy = Math.abs(rawY - 512) > 90 ? (rawY - 512) / 512 : 0;

  arduinoInput.turn = dx;
  arduinoInput.move = -dy;
  arduinoInput.shoot = (sw === 0);

  debugEl.textContent = `RX: X=${rawX} Y=${rawY} SW=${sw}`;
}

// --- GAME LOGIC ---
function tryShoot() {
  if (shootCooldown > 0 || player.reloadTimer > 0) return;
  if (player.mag <= 0) {
    player.reloadTimer = player.reloadTime;
    return;
  }

  player.mag--;
  shootFlash = 0.10;
  shootCooldown = player.fireRate;

  if (player.mag === 0) {
    player.reloadTimer = player.reloadTime;
  }

  let closestDist = Infinity;
  let hitEnemy = null;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy);
    let diff = Math.atan2(dy, dx) - player.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < 0.16 && dist < closestDist) {
      // Check line of sight against zBuffer center
      if (dist <= zBuffer[(W / 2) | 0] + 0.25) {
        closestDist = dist;
        hitEnemy = e;
      }
    }
  }

  if (hitEnemy) {
    hitEnemy.hp -= player.damage;
    hitEnemy.hitFlash = 0.12;
    if (hitEnemy.hp <= 0) {
      hitEnemy.alive = false;
      const arch = ARCHETYPES[hitEnemy.type];
      score += arch.exp * 4;
      player.exp += arch.exp;
      if (player.exp >= player.expToNext) {
        triggerLevelUp();
      }
    }
  }
}

function updateEnemies(dt) {
  let aliveCount = 0;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    aliveCount++;

    if (e.hitFlash > 0) e.hitFlash -= dt;

    const arch = ARCHETYPES[e.type];
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);

    // Attack player if close
    if (dist < 0.65) {
      if (player.invuln <= 0) {
        player.hp = Math.max(0, player.hp - arch.dmg);
        player.invuln = 0.6;
        damageFlash = 0.22;
        if (player.hp <= 0) {
          gameState = 'GAME_OVER';
          prevActionDown = true;
          return;
        }
      }
    } else if (dist < 7.0) {
      // Move toward player with basic separation
      let vx = (dx / dist) * arch.speed;
      let vy = (dy / dist) * arch.speed;

      for (let j = 0; j < enemies.length; j++) {
        if (i === j || !enemies[j].alive) continue;
        const ox = e.x - enemies[j].x;
        const oy = e.y - enemies[j].y;
        const od = Math.hypot(ox, oy);
        if (od > 0.01 && od < 0.6) {
          vx += (ox / od) * 1.2;
          vy += (oy / od) * 1.2;
        }
      }

      const nx = e.x + vx * dt;
      const ny = e.y + vy * dt;
      if (MAP[Math.floor(e.y)][Math.floor(nx)] === 0) e.x = nx;
      if (MAP[Math.floor(ny)][Math.floor(e.x)] === 0) e.y = ny;
    }
  }

  if (aliveCount === 0 && gameState === 'PLAYING') {
    spawnFloor(floor + 1);
  }
}

function update(dt) {
  const actionDown = Boolean(keysDown['Space'] || arduinoInput.shoot);
  const actionPressed = actionDown && !prevActionDown;
  prevActionDown = actionDown;

  let turn = arduinoInput.turn;
  if (keysDown['KeyA'] || keysDown['ArrowLeft']) turn -= 1;
  if (keysDown['KeyD'] || keysDown['ArrowRight']) turn += 1;

  if (gameState === 'LEVEL_UP') {
    if (menuMoveCooldown > 0) menuMoveCooldown -= dt;
    if (menuMoveCooldown <= 0) {
      if (turn < -0.45) {
        selectedCard = (selectedCard + 2) % 3;
        menuMoveCooldown = 0.22;
      } else if (turn > 0.45) {
        selectedCard = (selectedCard + 1) % 3;
        menuMoveCooldown = 0.22;
      }
    }
    if (actionPressed) {
      levelUpCards[selectedCard].apply();
      gameState = 'PLAYING';
    }
    return;
  }

  if (gameState === 'GAME_OVER') {
    if (actionPressed) resetGame();
    return;
  }

  // PLAYING state
  if (shootFlash > 0) shootFlash -= dt;
  if (shootCooldown > 0) shootCooldown -= dt;
  if (damageFlash > 0) damageFlash -= dt;
  if (floorBannerTimer > 0) floorBannerTimer -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  if (player.reloadTimer > 0) {
    player.reloadTimer -= dt;
    if (player.reloadTimer <= 0) {
      player.reloadTimer = 0;
      player.mag = player.maxMag;
    }
  }

  let move = arduinoInput.move;
  if (keysDown['KeyW'] || keysDown['ArrowUp']) move += 1;
  if (keysDown['KeyS'] || keysDown['ArrowDown']) move -= 1;

  if (actionDown) tryShoot();

  player.dir += turn * player.rotSpeed * dt;

  const nx = player.x + Math.cos(player.dir) * move * player.speed * dt;
  const ny = player.y + Math.sin(player.dir) * move * player.speed * dt;

  if (MAP[Math.floor(player.y)][Math.floor(nx)] === 0) player.x = nx;
  if (MAP[Math.floor(ny)][Math.floor(player.x)] === 0) player.y = ny;

  updateEnemies(dt);
}

// --- 1-BIT DITHER PATTERNS FOR DEPTH ---
function makeDitherPattern(matrix) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 4;
  const pctx = c.getContext('2d');
  pctx.fillStyle = '#fff';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (matrix[y][x]) pctx.fillRect(x, y, 1, 1);
    }
  }
  return ctx.createPattern(c, 'repeat');
}

const PAT_50 = makeDitherPattern([[1,0,1,0],[0,1,0,1],[1,0,1,0],[0,1,0,1]]);
const PAT_25 = makeDitherPattern([[1,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,1,0]]);
const PAT_12 = makeDitherPattern([[1,0,0,0],[0,0,0,0],[0,0,1,0],[0,0,0,0]]);

// --- RAYCASTER RENDER ---
const FOV = Math.PI / 3;
const zBuffer = new Float32Array(W);

function renderWorld() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Walls (Fast DDA + N/S vs E/W shading + crisp 1px borders)
  let prevMapKey = -1;
  for (let col = 0; col < W; col++) {
    const rayAngle = player.dir - FOV / 2 + (col / W) * FOV;
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX, stepY, sideDistX, sideDistY;
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
    }

    let hit = 0;
    let side = 0;
    let steps = 0;
    while (hit === 0 && steps < 24) {
      steps++;
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapY >= MAP.length || mapX >= MAP[0].length) {
        hit = 1;
        break;
      }
      hit = MAP[mapY][mapX];
    }

    const rawDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    const perpDist = Math.max(0.1, rawDist * Math.cos(rayAngle - player.dir));
    zBuffer[col] = perpDist;

    const wh = Math.min(H * 2, H / perpDist) | 0;
    const wy = ((H - wh) / 2) | 0;

    const mapKey = (mapY << 8) | (mapX << 1) | side;
    const isCorner = mapKey !== prevMapKey;
    prevMapKey = mapKey;

    const shade = Math.max(0, 1 - perpDist / 10) - (side === 1 ? 0.22 : 0);

    if (isCorner) {
      ctx.fillStyle = '#000';
      ctx.fillRect(col, wy, 1, wh);
    } else {
      ctx.fillStyle = shade > 0.52 ? PAT_50 : (shade > 0.25 ? PAT_25 : PAT_12);
      ctx.fillRect(col, wy, 1, wh);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(col, wy, 1, 1);
    ctx.fillRect(col, wy + wh - 1, 1, 1);
  }

  // Sort enemies back-to-front by distance
  const visible = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    visible.push({ e, dx, dy, dist: Math.hypot(dx, dy) });
  }
  visible.sort((a, b) => b.dist - a.dist);

  for (const { e, dx, dy, dist } of visible) {
    let angle = Math.atan2(dy, dx) - player.dir;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;

    if (Math.abs(angle) < FOV * 0.6 && dist > 0.3) {
      const screenX = (0.5 + angle / FOV) * W;
      const size = Math.min(H, (H / dist) * 0.7);
      const col = Math.floor(screenX);
      if (col >= 0 && col < W && dist < zBuffer[col]) {
        const sprite = enemySprites[e.type % enemySprites.length];
        if (sprite.complete && sprite.naturalWidth > 0) {
          const aspect = sprite.naturalWidth / sprite.naturalHeight;
          const eh = Math.max(5, size | 0);
          const ew = Math.max(4, (eh * aspect) | 0);
          const ex = (screenX - ew / 2) | 0;
          const ey = (H / 2 - eh / 2) | 0;

          ctx.save();
          ctx.filter = 'brightness(0)';
          ctx.drawImage(sprite, ex - 1, ey, ew, eh);
          ctx.drawImage(sprite, ex + 1, ey, ew, eh);
          ctx.drawImage(sprite, ex, ey - 1, ew, eh);
          ctx.drawImage(sprite, ex, ey + 1, ew, eh);
          ctx.restore();

          if (e.hitFlash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'difference';
            ctx.drawImage(sprite, ex, ey, ew, eh);
            ctx.restore();
          } else {
            ctx.drawImage(sprite, ex, ey, ew, eh);
          }
        }
      }
    }
  }

  // Crosshair (+) with negative/invert filter
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#fff';
  ctx.fillRect(W / 2 - 2, H / 2, 5, 1);
  ctx.fillRect(W / 2, H / 2 - 2, 1, 2);
  ctx.fillRect(W / 2, H / 2 + 1, 1, 2);
  ctx.restore();

  // Weapon (dips down while reloading) with 1px black outline
  const gunOffsetY = player.reloadTimer > 0 ? 5 : 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(W / 2 - 5, H - 19 + gunOffsetY, 10, 11);
  ctx.fillStyle = '#fff';
  ctx.fillRect(W / 2 - 4, H - 18 + gunOffsetY, 8, 9);
  if (shootFlash > 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(W / 2 - 3, H - 23, 6, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(W / 2 - 2, H - 22, 4, 4);
  }

  // Minimap
  if (showMap) {
    const ms = 2;
    const ox = 2, oy = 2;
    for (let y = 0; y < MAP.length; y++) {
      for (let x = 0; x < MAP[y].length; x++) {
        ctx.fillStyle = MAP[y][x] > 0 ? '#fff' : '#000';
        ctx.fillRect(ox + x * ms, oy + y * ms, ms, ms);
      }
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect((ox + player.x * ms - 1) | 0, (oy + player.y * ms - 1) | 0, 2, 2);
  }

  // Damage border flash
  if (damageFlash > 0) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 11);
  }

  // Floor banner
  if (floorBannerTimer > 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(42, 4, 44, 9);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(42.5, 4.5, 43, 8);
    drawPixelText(`FLOOR ${floor}`, 49, 6, '#fff');
  }

  // 1px EXP progress bar above HUD
  ctx.fillStyle = '#000';
  ctx.fillRect(0, H - 10, W, 1);
  const expW = Math.min(W, Math.floor((player.exp / player.expToNext) * W));
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, H - 10, expW, 1);

  // HUD (HP, Floor, Ammo/Reload)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, H - 9, W, 9);
  const ammoText = player.reloadTimer > 0 ? 'RLD' : `${player.mag}/${player.maxMag}`;
  drawPixelText(`HP:${player.hp} F:${floor} A:${ammoText}`, 3, H - 7, '#fff');
}

function renderLevelUp() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawPixelText(`LVL ${player.level} - PICK 1`, 32, 3, '#fff');

  const cardW = 38;
  const cardH = 42;
  const gap = 4;
  const startX = 3;
  const y = 13;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (cardW + gap);
    const card = levelUpCards[i];
    const sel = i === selectedCard;

    ctx.fillStyle = sel ? '#fff' : '#000';
    ctx.fillRect(x, y, cardW, cardH);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1);

    const fg = sel ? '#000' : '#fff';
    drawPixelText(card.l1, x + ((cardW - card.l1.length * 4) / 2) | 0, y + 12, fg);
    drawPixelText(card.l2, x + ((cardW - card.l2.length * 4) / 2) | 0, y + 24, fg);
  }

  drawPixelText('X:MOVE  SW:OK', 36, 58, '#fff');
}

function renderGameOver() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawPixelText('GAME OVER', 46, 12, '#fff');
  drawPixelText(`FLOOR: ${floor}`, 44, 24, '#fff');
  drawPixelText(`SCORE: ${score}`, 44, 34, '#fff');
  drawPixelText('PRESS SW OR R', 38, 50, '#fff');
}

// --- 1-BIT 3x5 PIXEL FONT ---
const FONT_3X5 = {
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','001','001','001'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  'A': ['010','101','111','101','101'], 'B': ['110','101','110','101','110'],
  'C': ['111','100','100','100','111'], 'D': ['110','101','101','101','110'],
  'E': ['111','100','110','100','111'], 'F': ['111','100','110','100','100'],
  'G': ['111','100','101','101','111'], 'H': ['101','101','111','101','101'],
  'I': ['111','010','010','010','111'], 'J': ['001','001','001','101','111'],
  'K': ['101','101','110','101','101'], 'L': ['100','100','100','100','111'],
  'M': ['101','111','101','101','101'], 'N': ['111','101','101','101','101'],
  'O': ['111','101','101','101','111'], 'P': ['111','101','111','100','100'],
  'Q': ['111','101','101','111','001'], 'R': ['111','101','110','101','101'],
  'S': ['111','100','111','001','111'], 'T': ['111','010','010','010','010'],
  'U': ['101','101','101','101','111'], 'V': ['101','101','101','101','010'],
  'W': ['101','101','101','111','101'], 'X': ['101','101','010','101','101'],
  'Y': ['101','101','010','010','010'], 'Z': ['111','001','010','100','111'],
  ':': ['000','010','000','010','000'], '/': ['001','001','010','100','100'],
  '+': ['000','010','111','010','000'], '-': ['000','000','111','000','000'],
  ' ': ['000','000','000','000','000']
};

function drawPixelText(text, x, y, color = '#fff') {
  ctx.fillStyle = color;
  let cx = x | 0;
  const cy = y | 0;
  for (const ch of text) {
    const glyph = FONT_3X5[ch] || FONT_3X5[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (glyph[r][c] === '1') ctx.fillRect(cx + c, cy + r, 1, 1);
      }
    }
    cx += 4;
  }
}

// --- MAIN LOOP ---
resetGame();
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  if (gameState === 'PLAYING') renderWorld();
  else if (gameState === 'LEVEL_UP') renderLevelUp();
  else renderGameOver();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
