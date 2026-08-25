const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let ballCount = 10;
let balls = [];
let pegs = [];
let pockets = [];
const gravity = 0.2;
const friction = 0.99;
const ballRadius = 5;

class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = 0;
        this.radius = ballRadius;
    }

    update() {
        this.vy += gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= friction;
        this.vy *= friction;

        // 壁との衝突
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.8;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -0.8;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -0.8;
        }
    }

    draw() {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Peg {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 6;
    }

    draw() {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    checkCollision(ball) {
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + this.radius) {
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
            ball.vx = Math.cos(angle) * speed * 1.2;
            ball.vy = Math.sin(angle) * speed * 1.2;
            ball.x = this.x + Math.cos(angle) * (ball.radius + this.radius);
            ball.y = this.y + Math.sin(angle) * (ball.radius + this.radius);
            return true;
        }
        return false;
    }
}

class Pocket {
    constructor(x, y, width, height, points) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.points = points;
    }

    draw() {
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.points, this.x + this.width / 2, this.y + this.height / 2 + 4);
    }

    checkCollision(ball) {
        if (ball.x > this.x && ball.x < this.x + this.width &&
            ball.y > this.y && ball.y < this.y + this.height) {
            return true;
        }
        return false;
    }
}

function initGame() {
    balls = [];
    score = 0;
    ballCount = 10;
    pegs = [];
    pockets = [];

    // ペグの配置
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 5; col++) {
            const x = 60 + col * 70 + (row % 2) * 35;
            const y = 80 + row * 40;
            if (x < canvas.width - 40) {
                pegs.push(new Peg(x, y));
            }
        }
    }

    // ポケットの配置
    pockets.push(new Pocket(20, 540, 50, 50, 100));
    pockets.push(new Pocket(100, 540, 50, 50, 50));
    pockets.push(new Pocket(175, 540, 50, 50, 200));
    pockets.push(new Pocket(250, 540, 50, 50, 50));
    pockets.push(new Pocket(330, 540, 50, 50, 100));

    updateUI();
}

function launchBall() {
    if (ballCount > 0) {
        const ball = new Ball(canvas.width / 2, 20);
        balls.push(ball);
        ballCount--;
        updateUI();
    }
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('ballCount').textContent = ballCount;
}

function restartGame() {
    initGame();
    gameLoop();
}

function gameLoop() {
    // 背景を描画
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ペグを描画・衝突判定
    pegs.forEach(peg => {
        peg.draw();
        balls.forEach(ball => peg.checkCollision(ball));
    });

    // ポケットを描画・衝突判定
    pockets.forEach(pocket => {
        pocket.draw();
        balls = balls.filter(ball => {
            if (pocket.checkCollision(ball)) {
                score += pocket.points;
                updateUI();
                return false;
            }
            return true;
        });
    });

    // ボールを更新・描画
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    // 画面外のボールを削除
    balls = balls.filter(ball => ball.y < canvas.height + 50);

    // ゲーム継続
    if (balls.length > 0 || ballCount > 0) {
        requestAnimationFrame(gameLoop);
    } else {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ゲーム終了', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText('最終スコア: ' + score, canvas.width / 2, canvas.height / 2 + 30);
    }
}

// キャンバスをクリックしてボール発射
canvas.addEventListener('click', launchBall);

// ゲーム開始
initGame();
gameLoop();