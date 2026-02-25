import { useState, useEffect, useRef, useCallback } from "react";
import MemoryMatch from "./MemoryMatch.jsx";
import PixelPong from "./PixelPong.jsx";
import Minesweeper from "./Minesweeper.jsx";
import TicTacToe from "./TicTacToe.jsx";
import CoinClicker from "./CoinClicker.jsx";

const GRID = 20;
const CANVAS_SIZE = 400;
const CELLS = CANVAS_SIZE / GRID;

const GAMES = [
  { id: "menu", label: "GAME SELECT", icon: "🕹️" },
  {
    id: "snake",
    label: "SNAKE",
    icon: "🐍",
    desc: "Classic snake. Eat food, grow longer.",
    color: "#00cec9",
  },
  {
    id: "memory",
    label: "MEMORY MATCH",
    icon: "🧩",
    desc: "Flip cards to find matching pairs.",
    color: "#a29bfe",
  },
  {
    id: "pong",
    label: "PIXEL PONG",
    icon: "🏓",
    desc: "Beat the AI. First to 5 wins.",
    color: "#fbbf24",
  },
  {
    id: "minesweeper",
    label: "MINESWEEPER",
    icon: "⬛",
    desc: "Clear the field without hitting mines.",
    color: "#ff6b6b",
  },
  {
    id: "ttt",
    label: "TIC-TAC-TOE",
    icon: "❌",
    desc: "Multiplayer! Play against another user.",
    color: "#00b894",
    multiplayer: true,
  },
  {
    id: "clicker",
    label: "COIN RUSH",
    icon: "🪙",
    desc: "15 seconds. Click the coin fast. Earn coins.",
    color: "#e84393",
  },
];

/* ── Snake sub-component (inlined) ── */
function SnakeGame({ onCoinsEarned, onBack }) {
  const canvasRef = useRef(null);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const dirRef = useRef(dir);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  dirRef.current = dir;
  snakeRef.current = snake;
  foodRef.current = food;

  const spawnFood = useCallback(() => {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS),
      };
    } while (snakeRef.current.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }, []);

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDir({ x: 1, y: 0 });
    setFood(spawnFood());
    setGameOver(false);
    setScore(0);
    setRunning(true);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (!running) return;
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrowKeys.includes(e.key)) e.preventDefault();
      const d = dirRef.current;
      switch (e.key) {
        case "ArrowUp":
          if (d.y !== 1) setDir({ x: 0, y: -1 });
          break;
        case "ArrowDown":
          if (d.y !== -1) setDir({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
          if (d.x !== 1) setDir({ x: -1, y: 0 });
          break;
        case "ArrowRight":
          if (d.x !== -1) setDir({ x: 1, y: 0 });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [running]);

  useEffect(() => {
    if (!running || gameOver) return;
    const interval = setInterval(() => {
      const s = [...snakeRef.current];
      const d = dirRef.current;
      const head = { x: s[0].x + d.x, y: s[0].y + d.y };
      if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS) {
        setGameOver(true);
        setRunning(false);
        return;
      }
      if (s.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        setRunning(false);
        return;
      }
      s.unshift(head);
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((prev) => prev + 5);
        if (onCoinsEarned) onCoinsEarned(5);
        setFood(spawnFood());
      } else {
        s.pop();
      }
      setSnake(s);
    }, 120);
    return () => clearInterval(interval);
  }, [running, gameOver, spawnFood, onCoinsEarned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < CELLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID, 0);
      ctx.lineTo(i * GRID, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * GRID);
      ctx.lineTo(CANVAS_SIZE, i * GRID);
      ctx.stroke();
    }
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4);
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#00cec9" : "#a29bfe";
      ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);
    });
  }, [snake, food]);

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>🐍 SNAKE</h3>
        <div className="mini-game-stats">
          <span>Score: {score}</span>
          <span>Length: {snake.length}</span>
        </div>
      </div>
      <div className="arcade-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="arcade-canvas"
        />
        {gameOver && (
          <div className="arcade-overlay">
            <h3>GAME OVER</h3>
            <p>Score: {score} 🪙</p>
            <button className="hero-btn-retro btn-blue" onClick={startGame}>
              PLAY AGAIN
            </button>
          </div>
        )}
        {!running && !gameOver && (
          <div className="arcade-overlay">
            <h3>SNAKE</h3>
            <button className="hero-btn-retro btn-green" onClick={startGame}>
              START GAME
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ArcadeZone Hub ── */
export default function ArcadeZone({ onCoinsEarned }) {
  const [activeGame, setActiveGame] = useState("menu");

  const goBack = () => setActiveGame("menu");

  if (activeGame === "snake")
    return <SnakeGame onCoinsEarned={onCoinsEarned} onBack={goBack} />;
  if (activeGame === "memory")
    return <MemoryMatch onCoinsEarned={onCoinsEarned} onBack={goBack} />;
  if (activeGame === "pong")
    return <PixelPong onCoinsEarned={onCoinsEarned} onBack={goBack} />;
  if (activeGame === "minesweeper")
    return <Minesweeper onCoinsEarned={onCoinsEarned} onBack={goBack} />;
  if (activeGame === "ttt")
    return <TicTacToe onCoinsEarned={onCoinsEarned} onBack={goBack} />;
  if (activeGame === "clicker")
    return <CoinClicker onCoinsEarned={onCoinsEarned} onBack={goBack} />;

  return (
    <div className="arcade-zone">
      <div className="logic-lab-header">
        <h2 className="panel-title">THE ARCADE</h2>
        <p style={{ color: "#aaa", fontSize: "0.75rem", marginBottom: "16px" }}>
          Choose a game to play. Earn 🪙 Pixel Coins!
        </p>
      </div>
      <div className="game-select-grid">
        {GAMES.filter((g) => g.id !== "menu").map((game) => (
          <button
            key={game.id}
            className="game-select-card"
            onClick={() => setActiveGame(game.id)}
            style={{ "--card-accent": game.color }}
          >
            <div className="game-select-icon">{game.icon}</div>
            <h4>{game.label}</h4>
            <p>{game.desc}</p>
            {game.multiplayer && (
              <span className="multiplayer-badge">MULTIPLAYER</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
