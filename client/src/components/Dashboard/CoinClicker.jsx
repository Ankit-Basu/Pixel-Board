import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function CoinClicker({ onCoinsEarned, onBack }) {
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [coinPos, setCoinPos] = useState({ top: "50%", left: "50%" });

  useEffect(() => {
    let timer;
    if (playing && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setPlaying(false);
    }
    return () => clearInterval(timer);
  }, [playing, timeLeft]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(15);
    setPlaying(true);
    moveCoin();
  };

  const moveCoin = () => {
    const top = Math.random() * 80 + 10;
    const left = Math.random() * 80 + 10;
    setCoinPos({ top: `${top}%`, left: `${left}%` });
  };

  const handleClick = () => {
    if (!playing) return;
    setScore((s) => s + 1);
    if (onCoinsEarned) onCoinsEarned(1);
    moveCoin();
  };

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>🪙 COIN RUSH</h3>
        <div className="mini-game-stats">
          <span style={{ color: "var(--neon-yellow)" }}>Score: {score}</span>
          <span style={{ color: timeLeft <= 5 ? "#ff6b6b" : "#4ecdc4" }}>
            Time: {timeLeft}s
          </span>
        </div>
      </div>

      <div
        className="arcade-canvas-wrap"
        style={{
          position: "relative",
          width: 400,
          height: 400,
          background: "#0a0a1a",
          margin: "0 auto",
          overflow: "hidden",
          border: "4px solid #444",
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {playing ? (
          <motion.div
            style={{
              position: "absolute",
              top: coinPos.top,
              left: coinPos.left,
              fontSize: "3.5rem",
              cursor: "crosshair",
              userSelect: "none",
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(2px 2px 0px #000)",
            }}
            onClick={handleClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            key={score} // Forces re-render/animation on click
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            🪙
          </motion.div>
        ) : (
          <div className="arcade-overlay">
            <h3
              style={{
                fontSize: "2rem",
                marginBottom: "10px",
                color: "var(--neon-yellow)",
              }}
            >
              COIN RUSH
            </h3>
            <p style={{ marginBottom: "20px" }}>
              {timeLeft === 0
                ? `Final Score: ${score} 🪙`
                : "Click the coin fast to earn real Pixel Coins before time runs out!"}
            </p>
            <button
              className={`hero-btn-retro ${timeLeft === 0 ? "btn-blue" : "btn-green"}`}
              onClick={startGame}
            >
              {timeLeft === 0 ? "PLAY AGAIN" : "START GAME"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
