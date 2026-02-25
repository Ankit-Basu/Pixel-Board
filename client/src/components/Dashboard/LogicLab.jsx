import { useState, useRef, useEffect } from "react";

export default function LogicLab({ onCoinsEarned }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [expression, setExpression] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#13132b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff";
  }, []);

  const startDraw = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPos({ x, y });
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#13132b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setResult(null);
    setExpression("");
  };

  const handleSolve = () => {
    if (!expression.trim()) return;
    setScanning(true);
    setResult(null);

    // Simulate OCR scan animation
    setTimeout(() => {
      try {
        // Safely evaluate simple arithmetic
        const sanitized = expression.replace(/[^0-9+\-*/().% ]/g, "");
        if (!sanitized.trim()) throw new Error("Invalid");
        // eslint-disable-next-line no-eval
        const answer = Function(`"use strict"; return (${sanitized})`)();
        setResult(`= ${answer}`);
        if (onCoinsEarned) onCoinsEarned(10);
      } catch {
        setResult("ERROR: Cannot parse expression");
      }
      setScanning(false);
    }, 1500);
  };

  return (
    <div className="logic-lab">
      <div className="logic-lab-header">
        <h2 className="panel-title">THE LOGIC LAB</h2>
        <p style={{ color: "#aaa", fontSize: "0.75rem", marginBottom: "16px" }}>
          Write a math expression below, type the expression in the input, then
          click SOLVE.
        </p>
      </div>

      <div className="logic-lab-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="logic-lab-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseOut={stopDraw}
        />
        {scanning && (
          <div className="scan-overlay">
            <div className="scan-line" />
            <p>SCANNING...</p>
          </div>
        )}
      </div>

      <div className="logic-lab-controls">
        <input
          type="text"
          className="retro-input"
          placeholder="Type expression (e.g. 5 + 10)"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSolve()}
          style={{ flex: 1 }}
        />
        <button
          className="hero-btn-retro btn-blue"
          onClick={handleSolve}
          disabled={scanning}
        >
          {scanning ? "SCANNING..." : "SOLVE"}
        </button>
        <button
          className="hero-btn-retro btn-green"
          onClick={clearCanvas}
          style={{ fontSize: "0.6rem" }}
        >
          CLEAR
        </button>
      </div>

      {result && (
        <div
          className={`solve-result ${result.startsWith("ERROR") ? "error" : "success"}`}
        >
          <span className="result-text">{result}</span>
          {!result.startsWith("ERROR") && (
            <span className="coin-badge">+10 🪙</span>
          )}
        </div>
      )}
    </div>
  );
}
