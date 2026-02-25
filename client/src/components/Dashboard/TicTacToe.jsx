import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diags
];

export default function TicTacToe({ onCoinsEarned, onBack }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState(null); // "X" or "O"
  const [turn, setTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [waiting, setWaiting] = useState(true);
  const [gameRoomId, setGameRoomId] = useState(null);
  const [draw, setDraw] = useState(false);
  const gameRoomIdRef = useRef(null);

  const checkWinner = useCallback((b) => {
    for (const [a, bIdx, c] of WINNING_COMBOS) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    return null;
  }, []);

  // Join TTT matchmaking
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("ttt-join", { userId: user._id, userName: user.name });

    socket.on("ttt-matched", (data) => {
      setGameRoomId(data.roomId);
      gameRoomIdRef.current = data.roomId;
      setMySymbol(data.symbol);
      setOpponentName(data.opponentName);
      setBoard(Array(9).fill(null));
      setTurn("X");
      setWinner(null);
      setDraw(false);
      setWaiting(false);
    });

    socket.on("ttt-move", (data) => {
      setBoard(data.board);
      setTurn(data.nextTurn);
      const w = checkWinner(data.board);
      if (w) {
        setWinner(w);
      } else if (data.board.every((c) => c !== null)) {
        setDraw(true);
      }
    });

    socket.on("ttt-opponent-left", () => {
      setWinner((prevWinner) => prevWinner || "opponent_left");
      setOpponentName((prev) => (prev ? prev + " (left)" : "Opponent (left)"));
    });

    return () => {
      socket.off("ttt-matched");
      socket.off("ttt-move");
      socket.off("ttt-opponent-left");
      if (gameRoomIdRef.current) {
        socket.emit("ttt-leave", { roomId: gameRoomIdRef.current });
      }
    };
  }, [socket, user, checkWinner]);

  useEffect(() => {
    if ((winner === mySymbol || winner === "opponent_left") && onCoinsEarned) {
      onCoinsEarned(10);
    }
  }, [winner, mySymbol, onCoinsEarned]);

  const handleCellClick = (idx) => {
    if (
      !socket ||
      waiting ||
      board[idx] !== null ||
      winner ||
      draw ||
      turn !== mySymbol
    )
      return;

    const newBoard = [...board];
    newBoard[idx] = mySymbol;
    setBoard(newBoard);
    setTurn(mySymbol === "X" ? "O" : "X");

    socket.emit("ttt-move", {
      roomId: gameRoomId,
      board: newBoard,
      nextTurn: mySymbol === "X" ? "O" : "X",
    });

    const w = checkWinner(newBoard);
    if (w) setWinner(w);
    else if (newBoard.every((c) => c !== null)) setDraw(true);
  };

  const handleRematch = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinner(null);
    setDraw(false);
    setWaiting(true);
    socket.emit("ttt-join", { userId: user._id, userName: user.name });
  };

  const isMyTurn = turn === mySymbol && !winner && !draw;

  return (
    <div className="mini-game-container">
      <div className="mini-game-header">
        <button className="btn btn-sm btn-secondary" onClick={onBack}>
          ← BACK
        </button>
        <h3>❌ TIC-TAC-TOE</h3>
        <div className="mini-game-stats">
          {mySymbol && <span>You: {mySymbol}</span>}
        </div>
      </div>

      {waiting ? (
        <div className="ttt-waiting">
          <div className="ttt-spinner"></div>
          <h3>SEARCHING FOR OPPONENT...</h3>
          <p style={{ color: "#aaa", fontSize: "0.7rem" }}>
            Ask a friend to open Arcade → Tic-Tac-Toe
          </p>
        </div>
      ) : (
        <>
          <div className="ttt-info-bar">
            <span style={{ color: "#00cec9" }}>You ({mySymbol})</span>
            <span style={{ color: isMyTurn ? "#fbbf24" : "#555" }}>
              {winner
                ? winner === mySymbol || winner === "opponent_left"
                  ? "🎉 YOU WIN!"
                  : "😔 YOU LOSE"
                : draw
                  ? "🤝 DRAW"
                  : isMyTurn
                    ? "YOUR TURN"
                    : "OPPONENT'S TURN"}
            </span>
            <span style={{ color: "#ff6b6b" }}>
              {opponentName} ({mySymbol === "X" ? "O" : "X"})
            </span>
          </div>

          <div className="ttt-board">
            {board.map((cell, i) => (
              <button
                key={i}
                className={`ttt-cell ${cell === "X" ? "ttt-x" : ""} ${cell === "O" ? "ttt-o" : ""} ${isMyTurn && !cell ? "ttt-clickable" : ""}`}
                onClick={() => handleCellClick(i)}
                disabled={!isMyTurn || cell !== null}
              >
                {cell}
              </button>
            ))}
          </div>

          {(winner || draw) && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              {(winner === mySymbol || winner === "opponent_left") && (
                <p style={{ color: "#fbbf24" }}>Earned 10 🪙!</p>
              )}
              <button
                className="hero-btn-retro btn-blue"
                onClick={handleRematch}
              >
                FIND NEW MATCH
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
