const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');

const startBtn = document.getElementById('startBtn');
const leftBtn = document.getElementById('leftBtn');
const fireBtn = document.getElementById('fireBtn');
const rightBtn = document.getElementById('rightBtn');

const W = canvas.width;
const H = canvas.height;

const keys = new Set();

let animationId = null;
let running = false;
let lastTime = 0;

let score = 0;
let lives = 3;
let level = 1;

let player;

let bullets = [];
let enemyBullets = [];
let enemies = [];
let stars = [];

let formationDir = 1;
let formationOffsetX = 0;
let formationOffsetY = 0;

let diveTimer = 0;
let enemyShotTimer = 0;
let fireCooldown = 0;
let invulnerable = 0;


function resetPlayer() {
  player = {
    x: W / 2,
    y: H - 55,
    w: 30,
    h: 24,
    speed: 260
  };
}


function makeStars() {
  stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.3,
    s: Math.random() * 18 + 8
  }));
}


function makeEnemies() {

  enemies = [];

  const rows = 4;
  const cols = 8;

  const gapX = 48;
  const gapY = 42;

  const startX =
    W / 2 - ((cols - 1) * gapX) / 2;

  const startY = 95;

  for (let row = 0; row < rows; row++) {

    for (let col = 0; col < cols; col++) {

      const baseX = startX + col * gapX;
      const baseY = startY + row * gapY;

      enemies.push({

        baseX,
        baseY,

        x: baseX,
        y: baseY,

        w: 26,
        h: 22,

        row,

        alive: true,

        diving: false,
        diveT: 0,

        diveStartX: 0,
        diveStartY: 0,

        phase:
          Math.random() * Math.PI * 2
      });
    }
  }

  formationDir = 1;
  formationOffsetX = 0;
  formationOffsetY = 0;
}


function startGame() {

  score = 0;
  lives = 3;
  level = 1;

  bullets = [];
  enemyBullets = [];

  makeStars();
  makeEnemies();
  resetPlayer();

  invulnerable = 1.5;

  running = true;

  lastTime = performance.now();

  messageEl.textContent = '';

  startBtn.textContent = 'Restart';

  updateHud();

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  animationId =
    requestAnimationFrame(loop);
}


function nextLevel() {

  level++;

  bullets = [];
  enemyBullets = [];

  makeEnemies();
  resetPlayer();

  invulnerable = 1.5;

  updateHud();
}


function updateHud() {

  scoreEl.textContent =
    String(score).padStart(6, '0');

  livesEl.textContent = lives;

  levelEl.textContent = level;
}


function fire() {

  if (!running || fireCooldown > 0) {
    return;
  }

  bullets.push({

    x: player.x,
    y: player.y - 18,

    w: 4,
    h: 12,

    speed: 430
  });

  fireCooldown = 0.22;
}


function enemyFire() {

  const candidates =
    enemies.filter(e => e.alive);

  if (!candidates.length) {
    return;
  }

  const enemy =
    candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];

  enemyBullets.push({

    x: enemy.x,
    y: enemy.y + 12,

    w: 4,
    h: 10,

    speed:
      180 + level * 12
  });
}


function startDive() {

  const candidates =
    enemies.filter(
      e => e.alive && !e.diving
    );

  if (!candidates.length) {
    return;
  }

  const enemy =
    candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];

  enemy.diving = true;

  enemy.diveT = 0;

  enemy.diveStartX = enemy.x;
  enemy.diveStartY = enemy.y;
}


function rectsOverlap(a, b) {

  return (

    a.x - a.w / 2 <
    b.x + b.w / 2 &&

    a.x + a.w / 2 >
    b.x - b.w / 2 &&

    a.y - a.h / 2 <
    b.y + b.h / 2 &&

    a.y + a.h / 2 >
    b.y - b.h / 2
  );
}


function hitPlayer() {

  if (invulnerable > 0) {
    return;
  }

  lives--;

  updateHud();

  if (lives <= 0) {

    running = false;

    messageEl.textContent =
      `GAME OVER — SCORE ${String(score).padStart(6, '0')}`;

    startBtn.textContent =
      'Play Again';

    return;
  }

  resetPlayer();

  bullets = [];
  enemyBullets = [];

  invulnerable = 2;
}


function update(dt) {

  fireCooldown =
    Math.max(
      0,
      fireCooldown - dt
    );

  invulnerable =
    Math.max(
      0,
      invulnerable - dt
    );


  /*
   * Star field
   */

  for (const star of stars) {

    star.y +=
      star.s * dt;

    if (star.y > H) {

      star.y = 0;

      star.x =
        Math.random() * W;
    }
  }


  /*
   * Player movement
   */

  let dx = 0;

  if (
    keys.has('ArrowLeft') ||
    keys.has('KeyA')
  ) {
    dx -= 1;
  }

  if (
    keys.has('ArrowRight') ||
    keys.has('KeyD')
  ) {
    dx += 1;
  }

  player.x +=
    dx *
    player.speed *
    dt;

  player.x =
    Math.max(
      22,
      Math.min(
        W - 22,
        player.x
      )
    );


  if (keys.has('Space')) {
    fire();
  }


  /*
   * Enemy formation
   */

  const formationSpeed =
    34 + level * 5;

  formationOffsetX +=
    formationDir *
    formationSpeed *
    dt;

  if (
    Math.abs(
      formationOffsetX
    ) > 42
  ) {

    formationDir *= -1;

    formationOffsetY += 8;
  }


  /*
   * Diving attacks
   */

  diveTimer -= dt;

  if (diveTimer <= 0) {

    startDive();

    diveTimer =
      Math.max(
        0.55,
        1.8 - level * 0.08
      )
      +
      Math.random() * 1.2;
  }


  /*
   * Enemy weapons
   */

  enemyShotTimer -= dt;

  if (enemyShotTimer <= 0) {

    enemyFire();

    enemyShotTimer =
      Math.max(
        0.45,
        1.4 - level * 0.07
      )
      +
      Math.random() * 0.8;
  }


  /*
   * Enemy movement
   */

  for (const enemy of enemies) {

    if (!enemy.alive) {
      continue;
    }

    if (enemy.diving) {

      enemy.diveT += dt;

      const t =
        enemy.diveT;

      enemy.y =
        enemy.diveStartY +
        t *
        (130 + level * 8);

      enemy.x =
        enemy.diveStartX +
        Math.sin(
          t * 3.2 +
          enemy.phase
        )
        *
        (90 + t * 22);


      if (
        enemy.y >
        H + 30
      ) {

        enemy.diving = false;
        enemy.diveT = 0;
      }

    } else {

      enemy.x =
        enemy.baseX +
        formationOffsetX;

      enemy.y =
        enemy.baseY +
        formationOffsetY +
        Math.sin(
          performance.now() /
          650 +
          enemy.phase
        ) * 3;
    }
  }


  /*
   * Player bullets
   */

  for (const bullet of bullets) {

    bullet.y -=
      bullet.speed * dt;
  }


  /*
   * Enemy bullets
   */

  for (
    const bullet
    of enemyBullets
  ) {

    bullet.y +=
      bullet.speed * dt;
  }


  bullets =
    bullets.filter(
      bullet =>
        bullet.y > -20
    );


  enemyBullets =
    enemyBullets.filter(
      bullet =>
        bullet.y < H + 20
    );


  /*
   * Player shots hit enemies
   */

  for (const bullet of bullets) {

    if (bullet.dead) {
      continue;
    }

    for (
      const enemy
      of enemies
    ) {

      if (!enemy.alive) {
        continue;
      }

      if (
        rectsOverlap(
          bullet,
          enemy
        )
      ) {

        bullet.dead = true;

        enemy.alive = false;

        score +=
          100 +
          enemy.row * 25;

        updateHud();

        break;
      }
    }
  }


  bullets =
    bullets.filter(
      bullet => !bullet.dead
    );


  /*
   * Enemy shots hit player
   */

  for (
    const bullet
    of enemyBullets
  ) {

    if (
      rectsOverlap(
        bullet,
        player
      )
    ) {

      bullet.dead = true;

      hitPlayer();
    }
  }


  enemyBullets =
    enemyBullets.filter(
      bullet => !bullet.dead
    );


  /*
   * Diving enemy hits player
   */

  for (
    const enemy
    of enemies
  ) {

    if (
      enemy.alive &&
      enemy.diving &&
      rectsOverlap(
        enemy,
        player
      )
    ) {

      enemy.alive = false;

      hitPlayer();
    }
  }


  /*
   * Level complete
   */

  if (
    enemies.every(
      enemy => !enemy.alive
    )
    &&
    running
  ) {

    nextLevel();
  }
}


function drawShip(
  x,
  y,
  blink = false
) {

  if (
    blink &&
    Math.floor(
      performance.now() /
      100
    ) % 2 === 0
  ) {
    return;
  }

  ctx.save();

  ctx.translate(x, y);

  ctx.fillStyle =
    '#7df9ff';

  ctx.beginPath();

  ctx.moveTo(
    0,
    -16
  );

  ctx.lineTo(
    15,
    12
  );

  ctx.lineTo(
    6,
    9
  );

  ctx.lineTo(
    0,
    14
  );

  ctx.lineTo(
    -6,
    9
  );

  ctx.lineTo(
    -15,
    12
  );

  ctx.closePath();

  ctx.fill();

  ctx.fillStyle =
    '#ffffff';

  ctx.fillRect(
    -2,
    -7,
    4,
    10
  );

  ctx.restore();
}


function drawEnemy(enemy) {

  ctx.save();

  ctx.translate(
    enemy.x,
    enemy.y
  );

  ctx.fillStyle =
    enemy.row < 2
      ? '#ff5fa2'
      : '#ffd84d';

  ctx.fillRect(
    -9,
    -7,
    18,
    14
  );

  ctx.fillRect(
    -13,
    -3,
    4,
    8
  );

  ctx.fillRect(
    9,
    -3,
    4,
    8
  );

  ctx.fillStyle =
    '#111827';

  ctx.fillRect(
    -5,
    -2,
    3,
    3
  );

  ctx.fillRect(
    2,
    -2,
    3,
    3
  );

  ctx.fillStyle =
    '#ffffff';

  ctx.fillRect(
    -8,
    7,
    4,
    4
  );

  ctx.fillRect(
    4,
    7,
    4,
    4
  );

  ctx.restore();
}


function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  gradient.addColorStop(
    0,
    '#050816'
  );

  gradient.addColorStop(
    1,
    '#000000'
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /*
   * Stars
   */

  ctx.fillStyle =
    '#ffffff';

  for (const star of stars) {

    ctx.globalAlpha =
      Math.min(
        1,
        star.r / 1.3
      );

    ctx.beginPath();

    ctx.arc(
      star.x,
      star.y,
      star.r,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;


  /*
   * Enemies
   */

  for (
    const enemy
    of enemies
  ) {

    if (enemy.alive) {
      drawEnemy(enemy);
    }
  }


  /*
   * Player lasers
   */

  ctx.fillStyle =
    '#7df9ff';

  for (
    const bullet
    of bullets
  ) {

    ctx.fillRect(
      bullet.x - 2,
      bullet.y - 6,
      4,
      12
    );
  }


  /*
   * Enemy lasers
   */

  ctx.fillStyle =
    '#ff5f5f';

  for (
    const bullet
    of enemyBullets
  ) {

    ctx.fillRect(
      bullet.x - 2,
      bullet.y - 5,
      4,
      10
    );
  }


  /*
   * Player ship
   */

  drawShip(
    player.x,
    player.y,
    invulnerable > 0
  );


  /*
   * Screen border
   */

  ctx.strokeStyle =
    'rgba(125,249,255,.18)';

  ctx.strokeRect(
    0.5,
    0.5,
    W - 1,
    H - 1
  );
}


function loop(now) {

  const dt =
    Math.min(
      0.033,
      (
        now -
        lastTime
      ) /
      1000 || 0
    );

  lastTime = now;

  if (running) {
    update(dt);
  }

  draw();

  if (running) {

    animationId =
      requestAnimationFrame(
        loop
      );
  }
}


function setHeld(
  key,
  held
) {

  if (held) {

    keys.add(key);

  } else {

    keys.delete(key);
  }
}


/*
 * Keyboard controls
 */

window.addEventListener(
  'keydown',
  event => {

    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'Space'
      ].includes(event.code)
    ) {

      event.preventDefault();
    }

    keys.add(event.code);

    if (
      event.code ===
      'Space'
    ) {

      fire();
    }
  }
);


window.addEventListener(
  'keyup',
  event => {

    keys.delete(
      event.code
    );
  }
);


/*
 * Touch / mouse controls
 */

for (
  const [button, key]
  of [
    [leftBtn, 'ArrowLeft'],
    [rightBtn, 'ArrowRight']
  ]
) {

  button.addEventListener(
    'pointerdown',
    event => {

      event.preventDefault();

      setHeld(
        key,
        true
      );
    }
  );


  button.addEventListener(
    'pointerup',
    () => {

      setHeld(
        key,
        false
      );
    }
  );


  button.addEventListener(
    'pointercancel',
    () => {

      setHeld(
        key,
        false
      );
    }
  );


  button.addEventListener(
    'pointerleave',
    () => {

      setHeld(
        key,
        false
      );
    }
  );
}


fireBtn.addEventListener(
  'pointerdown',
  event => {

    event.preventDefault();

    fire();
  }
);


startBtn.addEventListener(
  'click',
  startGame
);


/*
 * Initial screen
 */

makeStars();

resetPlayer();

makeEnemies();

updateHud();

draw();
