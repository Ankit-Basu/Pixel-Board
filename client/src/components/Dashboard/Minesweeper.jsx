import { useState, useCallback } from "react";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

function createBoard() {
  const board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );
  // Place mines
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
  // Count adjacents
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr,
            nc = c + dc;
          if (
            nr >= 0 &&
            nr < ROWS &&
            nc >= 0 &&
            nc < COLS &&
            board[nr][nc].mine
          )
            count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

const COLORS = [
  "",
  "#00cec9",
  "#00b894",
  "#fbbf24",
  "#e17055",
  "#ff6b6b",
  "#a29bfe",
  "#fd79a8",
  "#fff",
];

export default function Minesweeper({ onCoinsEarned, onBack }) {
  const [board, setBoard] = useState(() => createBoard());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [firstClick, setFirstClick] = useState(true);

  const reveal = useCallback((b, r, c) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (b[r][c].revealed || b[r][c].flagged) return;
    b[r][c].revealed = true;
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          reveal(b, r + dr, c + dc);
        }
      }
    }
  }, []);

  const checkWin = (b) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!b[r][c].mine && !b[r][c].revealed) return false;
      }
    }
    return true;
  };

  const handleClick = (r, c) => {
    if (gameOver || won || board[r][c].flagged || board[r][c].revealed) return;

    // First click safety — move mine if needed
    if (firstClick && board[r][c].mine) {
      const nb = createBoard();
      nb[r][c].mine = false;
      setBoard(nb);
      setFirstClick(false);
      handleClickOnBoard(nb, r, c);
      return;
    }
    setFirstClick(false);
    handleClickOnBoard(
      [...board.map((row) => row.map((cell) => ({ ...cell })))],
      r,
      c,
    );
  };

  const handleClickOnBoard = (b, r, c) => {
    if (b[r][c].mine) {
      // Reveal all mines
      b.forEach((row) =>
        row.forEach((cell) => {
          if (cell.mine) cell.revealed = true;
        }),
      );
      setBoard(b);
      setGameOver(true);
      return;
    }
    reveal(b, r, c);
    if (checkWin(b)) {
      setWon(true);
      if (onCoinsEarned) onCoinsEarned(20);
    }
    setBoard([...b]);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || won || board[r][c].revealed) return;
    const nb = board.map((row) => row.map((cell) => ({ ...cell })));
    nb[r][c].flagged = !nb[r][c].flagged;
    setBoard(nb);
  };

  const restart = () => {
    setBoard(createBoard());
    setGameOver(false);
    setWon(false);
    setFirstClick(true);
  };

  const flagCount = board.flat().filter((c) => c.flagged).length;

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>⬛ MINESWEEPER</h3>
        <div className="mini-game-stats">
          <span>💣 {MINES - flagCount}</span>
          <span>🚩 {flagCount}</span>
        </div>
      </div>

      {(gameOver || won) && (
        <div className="mini-game-win">
          <h3>{won ? "🎉 CLEARED!" : "💥 BOOM!"}</h3>
          <p>
            {won ? `You cleared the field! Earned 20 🪙` : "You hit a mine!"}
          </p>
          <button className="hero-btn-retro btn-green" onClick={restart}>
            PLAY AGAIN
          </button>
        </div>
      )}

      <div className="minesweeper-grid">
        {board.map((row, r) => (
          <div key={r} className="minesweeper-row">
            {row.map((cell, c) => (
              <button
                key={c}
                className={`mine-cell ${cell.revealed ? "revealed" : ""} ${cell.revealed && cell.mine ? "mine-hit" : ""}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}
              >
                {cell.revealed ? (
                  cell.mine ? (
                    "💣"
                  ) : cell.adjacent > 0 ? (
                    <span style={{ color: COLORS[cell.adjacent] }}>
                      {cell.adjacent}
                    </span>
                  ) : (
                    ""
                  )
                ) : cell.flagged ? (
                  "🚩"
                ) : (
                  ""
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: "0.6rem",
          color: "#777",
          marginTop: "8px",
          textAlign: "center",
        }}
      >
        Left-click to reveal · Right-click to flag
      </p>
    </div>
  );
}
