import { useState, useEffect, useRef, useCallback } from "react";

const CANVAS_W = 500;
const CANVAS_H = 350;
const PADDLE_W = 12;
const PADDLE_H = 70;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const AI_SPEED = 3.5;

export default function PixelPong({ onCoinsEarned, onBack }) {
  const canvasRef = useRef(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({
    playerY: CANVAS_H / 2 - PADDLE_H / 2,
    aiY: CANVAS_H / 2 - PADDLE_H / 2,
    ballX: CANVAS_W / 2,
    ballY: CANVAS_H / 2,
    ballDX: 4,
    ballDY: 3,
    keys: {},
  });

  const resetBall = useCallback(() => {
    const s = stateRef.current;
    s.ballX = CANVAS_W / 2;
    s.ballY = CANVAS_H / 2;
    s.ballDX = (Math.random() > 0.5 ? 1 : -1) * 4;
    s.ballDY = (Math.random() - 0.5) * 6;
  }, []);

  const startGame = () => {
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    stateRef.current.playerY = CANVAS_H / 2 - PADDLE_H / 2;
    stateRef.current.aiY = CANVAS_H / 2 - PADDLE_H / 2;
    resetBall();
    setRunning(true);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
      stateRef.current.keys[e.key] = e.type === "keydown";
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const s = stateRef.current;

      // Player movement
      if (s.keys["ArrowUp"] && s.playerY > 0) s.playerY -= PADDLE_SPEED;
      if (s.keys["ArrowDown"] && s.playerY < CANVAS_H - PADDLE_H)
        s.playerY += PADDLE_SPEED;

      // AI movement
      const aiCenter = s.aiY + PADDLE_H / 2;
      if (aiCenter < s.ballY - 10) s.aiY += AI_SPEED;
      else if (aiCenter > s.ballY + 10) s.aiY -= AI_SPEED;
      s.aiY = Math.max(0, Math.min(CANVAS_H - PADDLE_H, s.aiY));

      // Ball movement
      s.ballX += s.ballDX;
      s.ballY += s.ballDY;

      // Top/bottom walls
      if (s.ballY <= 0 || s.ballY >= CANVAS_H - BALL_SIZE) s.ballDY *= -1;

      // Player paddle collision (left side)
      if (
        s.ballX <= 20 + PADDLE_W &&
        s.ballX >= 20 &&
        s.ballY + BALL_SIZE >= s.playerY &&
        s.ballY <= s.playerY + PADDLE_H
      ) {
        s.ballDX = Math.abs(s.ballDX) * 1.05;
        const hitPos = (s.ballY - s.playerY) / PADDLE_H - 0.5;
        s.ballDY = hitPos * 8;
      }

      // AI paddle collision (right side)
      if (
        s.ballX + BALL_SIZE >= CANVAS_W - 20 - PADDLE_W &&
        s.ballX <= CANVAS_W - 20 &&
        s.ballY + BALL_SIZE >= s.aiY &&
        s.ballY <= s.aiY + PADDLE_H
      ) {
        s.ballDX = -Math.abs(s.ballDX) * 1.05;
        const hitPos = (s.ballY - s.aiY) / PADDLE_H - 0.5;
        s.ballDY = hitPos * 8;
      }

      // Scoring
      if (s.ballX < 0) {
        setAiScore((p) => {
          const newScore = p + 1;
          if (newScore >= 5) {
            setGameOver(true);
            setRunning(false);
          }
          return newScore;
        });
        resetBall();
      }
      if (s.ballX > CANVAS_W) {
        setPlayerScore((p) => {
          const newScore = p + 1;
          if (newScore >= 5) {
            setGameOver(true);
            setRunning(false);
            if (onCoinsEarned) onCoinsEarned(15);
          }
          return newScore;
        });
        resetBall();
      }

      // Draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Center line
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = "#00cec9";
      ctx.fillRect(20, s.playerY, PADDLE_W, PADDLE_H);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(CANVAS_W - 20 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

      // Ball
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(s.ballX, s.ballY, BALL_SIZE, BALL_SIZE);
    };

    const interval = setInterval(loop, 1000 / 60);
    return () => clearInterval(interval);
  }, [running, gameOver, resetBall, onCoinsEarned]);

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>🏓 PIXEL PONG</h3>
        <div className="mini-game-stats">
          <span style={{ color: "#00cec9" }}>YOU: {playerScore}</span>
          <span style={{ color: "#ff6b6b" }}>AI: {aiScore}</span>
        </div>
      </div>
      <div
        className="arcade-canvas-wrap"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="arcade-canvas"
        />
        {gameOver && (
          <div className="arcade-overlay">
            <h3>{playerScore >= 5 ? "YOU WIN! 🎉" : "AI WINS 🤖"}</h3>
            <p>
              {playerScore} - {aiScore}
              {playerScore >= 5 ? " — earned 15 🪙" : ""}
            </p>
            <button className="hero-btn-retro btn-blue" onClick={startGame}>
              PLAY AGAIN
            </button>
          </div>
        )}
        {!running && !gameOver && (
          <div className="arcade-overlay">
            <h3>PIXEL PONG</h3>
            <p style={{ fontSize: "0.7rem", color: "#aaa" }}>
              First to 5 wins. Arrow keys to move.
            </p>
            <button className="hero-btn-retro btn-green" onClick={startGame}>
              START
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
