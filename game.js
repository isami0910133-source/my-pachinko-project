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

const balls = [];
const pins = [];
const dividers = [];

let score = 0;
let ballsRemaining = MAX_BALLS;
let gameOver = false;
let lastShotAt = 0;
let launcherX = BOARD_WIDTH / 2;

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
    y: BOARD_HEIGHT - 62,
    vx: (x - BOARD_WIDTH / 2) * 0.03,
    vy: -10.8,
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
    const restitution = 0.72;
    ball.vx -= (1 + restitution) * normalVelocity * nx;
    ball.vy -= (1 + restitution) * normalVelocity * ny;
  }
}

function collideDivider(ball, divider) {
  if (
    ball.x + ball.r < divider.x - divider.w / 2 ||
    ball.x - ball.r > divider.x + divider.w / 2 ||
    ball.y + ball.r < divider.y ||
    ball.y - ball.r > divider.y + divider.h
  ) {
    return;
  }

  const left = divider.x - divider.w / 2;
  const right = divider.x + divider.w / 2;

  if (ball.x < divider.x) {
    ball.x = left - ball.r;
    ball.vx = -Math.abs(ball.vx) * 0.65;
  } else {
    ball.x = right + ball.r;
    ball.vx = Math.abs(ball.vx) * 0.65;
  }
}

function updateBall(ball) {
  ball.vy += 0.27;
  ball.vx *= 0.998;
  ball.vy *= 0.998;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx) * 0.72;
  } else if (ball.x + ball.r > BOARD_WIDTH) {
    ball.x = BOARD_WIDTH - ball.r;
    ball.vx = -Math.abs(ball.vx) * 0.72;
  }

  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy) * 0.55;
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
  ctx.arc(launcherX, BOARD_HEIGHT - 32, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#d99e4e';
  ctx.fill();
}

function tick() {
  if (!gameOver) {
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
  }

  drawBoard();
  requestAnimationFrame(tick);
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
requestAnimationFrame(tick);
