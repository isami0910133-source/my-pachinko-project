const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const ballsEl = document.getElementById('balls');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const BOARD_WIDTH = canvas.width;
const BOARD_HEIGHT = canvas.height;
const MAX_BALLS = 15;
const BALL_RADIUS = 8;
const POCKET_HEIGHT = 92;
const POCKET_SCORES = [10, 30, 50, 100, 50, 30];
const POCKET_WIDTH = BOARD_WIDTH / POCKET_SCORES.length;
const SHOT_COOLDOWN = 160;
const LAUNCH_OFFSET_FROM_BOTTOM = 62;
const LAUNCH_Y = BOARD_HEIGHT - LAUNCH_OFFSET_FROM_BOTTOM;
const INITIAL_VY = -10.8;
const INITIAL_VX_FACTOR = 0.03;
const GRAVITY = 0.27;
const AIR_DAMPING = 0.998;
const WALL_BOUNCE = 0.72;
const TOP_BOUNCE = 0.55;
const PIN_RESTITUTION = 0.72;
const DIVIDER_BOUNCE = 0.65;

const balls = [];
const pins = [];
const dividers = [];

let score = 0;
let ballsRemaining = MAX_BALLS;
let gameOver = false;
let lastShotAt = 0;
let launcherX = BOARD_WIDTH / 2;
let animationFrameId = null;

function setupPins() {
  pins.length = 0;
  const startY = 110;
  const rows = 9;
  const spacingX = 48;
  const spacingY = 54;

  for (let row = 0; row < rows; row += 1) {
    const cols = row % 2 === 0 ? 7 : 6;
    const offsetX = row % 2 === 0 ? 42 : 66;
    for (let col = 0; col < cols; col += 1) {
      pins.push({
        x: offsetX + col * spacingX,
        y: startY + row * spacingY,
        r: 7,
      });
    }
  }

  pins.push({ x: 95, y: 610, r: 8 });
  pins.push({ x: 210, y: 620, r: 8 });
  pins.push({ x: 325, y: 610, r: 8 });
}

function setupDividers() {
  dividers.length = 0;
  for (let i = 1; i < POCKET_SCORES.length; i += 1) {
    dividers.push({ x: i * POCKET_WIDTH, y: BOARD_HEIGHT - POCKET_HEIGHT, w: 4, h: POCKET_HEIGHT });
  }
}

function resetGame() {
  balls.length = 0;
  score = 0;
  ballsRemaining = MAX_BALLS;
  gameOver = false;
  updateHud();
  gameOverEl.classList.add('hidden');
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  tick();
}

function updateHud() {
  scoreEl.textContent = score;
  ballsEl.textContent = ballsRemaining;
}

function launchBall(screenX) {
  if (gameOver || ballsRemaining <= 0) {
    return;
  }

  const now = performance.now();
  if (now - lastShotAt < SHOT_COOLDOWN) {
    return;
  }

  lastShotAt = now;
  const x = Math.max(30, Math.min(BOARD_WIDTH - 30, screenX));
  launcherX = x;

  balls.push({
    x,
    y: LAUNCH_Y,
    vx: (x - BOARD_WIDTH / 2) * INITIAL_VX_FACTOR,
    vy: INITIAL_VY,
    r: BALL_RADIUS,
    settled: false,
  });

  ballsRemaining -= 1;
  updateHud();
}

function collideCircle(ball, pin) {
  const dx = ball.x - pin.x;
  const dy = ball.y - pin.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.r + pin.r;

  if (dist >= minDist || dist === 0) {
    return;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const normalVelocity = ball.vx * nx + ball.vy * ny;
  if (normalVelocity < 0) {
    ball.vx -= (1 + PIN_RESTITUTION) * normalVelocity * nx;
    ball.vy -= (1 + PIN_RESTITUTION) * normalVelocity * ny;
  }
}

function collideDivider(ball, divider) {
  const left = divider.x - divider.w / 2;
  const right = divider.x + divider.w / 2;
  const top = divider.y;
  const bottom = divider.y + divider.h;
  const closestX = Math.max(left, Math.min(ball.x, right));
  const closestY = Math.max(top, Math.min(ball.y, bottom));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;

  if (dx * dx + dy * dy > ball.r * ball.r) {
    return;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (ball.x > divider.x) {
      ball.x = right + ball.r;
      ball.vx = Math.abs(ball.vx) * DIVIDER_BOUNCE;
      return;
    }
    ball.x = left - ball.r;
    ball.vx = -Math.abs(ball.vx) * DIVIDER_BOUNCE;
  } else {
    if (ball.y < top + divider.h / 2) {
      ball.y = top - ball.r;
      ball.vy = -Math.abs(ball.vy) * DIVIDER_BOUNCE;
    } else {
      ball.y = bottom + ball.r;
      ball.vy = Math.abs(ball.vy) * DIVIDER_BOUNCE;
    }
  }
}

function updateBall(ball) {
  ball.vy += GRAVITY;
  ball.vx *= AIR_DAMPING;
  ball.vy *= AIR_DAMPING;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
  } else if (ball.x + ball.r > BOARD_WIDTH) {
    ball.x = BOARD_WIDTH - ball.r;
    ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
  }

  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy) * TOP_BOUNCE;
  }

  for (const pin of pins) {
    collideCircle(ball, pin);
  }

  for (const divider of dividers) {
    collideDivider(ball, divider);
  }

  if (ball.y + ball.r >= BOARD_HEIGHT) {
    const pocket = Math.min(POCKET_SCORES.length - 1, Math.max(0, Math.floor(ball.x / POCKET_WIDTH)));
    score += POCKET_SCORES[pocket];
    updateHud();
    ball.settled = true;
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
  gradient.addColorStop(0, '#27405f');
  gradient.addColorStop(0.45, '#1d2d45');
  gradient.addColorStop(1, '#111725');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  ctx.fillStyle = '#131a2b';
  ctx.fillRect(0, BOARD_HEIGHT - POCKET_HEIGHT, BOARD_WIDTH, POCKET_HEIGHT);

  for (let i = 1; i < POCKET_SCORES.length; i += 1) {
    const x = i * POCKET_WIDTH;
    ctx.fillStyle = '#6076a6';
    ctx.fillRect(x - 2, BOARD_HEIGHT - POCKET_HEIGHT, 4, POCKET_HEIGHT);
  }

  for (let i = 0; i < POCKET_SCORES.length; i += 1) {
    ctx.fillStyle = '#97b5ed';
    ctx.font = '700 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${POCKET_SCORES[i]}`, i * POCKET_WIDTH + POCKET_WIDTH / 2, BOARD_HEIGHT - 22);
  }

  for (const pin of pins) {
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2);
    ctx.fillStyle = '#b9cdf0';
    ctx.fill();
  }

  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe29a';
    ctx.fill();
    ctx.strokeStyle = '#ffc552';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(launcherX, LAUNCH_Y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#d99e4e';
  ctx.fill();
}

function tick() {
  for (const ball of balls) {
    updateBall(ball);
  }

  for (let i = balls.length - 1; i >= 0; i -= 1) {
    if (balls[i].settled) {
      balls.splice(i, 1);
    }
  }

  if (ballsRemaining === 0 && balls.length === 0) {
    gameOver = true;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
  }

  drawBoard();
  if (gameOver) {
    animationFrameId = null;
    return;
  }
  animationFrameId = requestAnimationFrame(tick);
}

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH;
  launchBall(x);
});

restartBtn.addEventListener('click', resetGame);

setupPins();
setupDividers();
resetGame();
