import { useState, useEffect, useCallback } from "react";

const EMOJIS = ["🗡️", "🛡️", "⚡", "🔮", "🏰", "🐉", "👑", "💎"];
const PAIRS = [...EMOJIS, ...EMOJIS];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryMatch({ onCoinsEarned, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);

  const startGame = useCallback(() => {
    setCards(shuffle(PAIRS));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setTimer(0);
    setRunning(true);
    setWon(false);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTimer((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (matched.size === PAIRS.length && PAIRS.length > 0 && running) {
      setRunning(false);
      setWon(true);
      const coins = Math.max(5, 30 - moves);
      if (onCoinsEarned) onCoinsEarned(coins);
    }
  }, [matched, running, moves, onCoinsEarned]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      setMoves((p) => p + 1);
      if (cards[a] === cards[b]) {
        setMatched((prev) => new Set([...prev, a, b]));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 600);
      }
    }
  }, [flipped, cards]);

  const handleClick = (idx) => {
    if (
      !running ||
      flipped.length >= 2 ||
      flipped.includes(idx) ||
      matched.has(idx)
    )
      return;
    setFlipped((prev) => [...prev, idx]);
  };

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>🧩 MEMORY MATCH</h3>
        <div className="mini-game-stats">
          <span>⏱️ {timer}s</span>
          <span>🔄 {moves} moves</span>
        </div>
      </div>

      {won ? (
        <div className="mini-game-win">
          <h3>🎉 YOU WIN!</h3>
          <p>
            {moves} moves in {timer}s — earned {Math.max(5, 30 - moves)} 🪙
          </p>
          <button className="hero-btn-retro btn-green" onClick={startGame}>
            PLAY AGAIN
          </button>
        </div>
      ) : (
        <div className="memory-grid">
          {cards.map((emoji, i) => (
            <button
              key={i}
              className={`memory-card ${flipped.includes(i) || matched.has(i) ? "flipped" : ""} ${matched.has(i) ? "matched" : ""}`}
              onClick={() => handleClick(i)}
            >
              <span className="memory-card-front">?</span>
              <span className="memory-card-back">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
