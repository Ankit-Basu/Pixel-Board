import { useState, useRef, useEffect } from "react";

export default function TerminalConsole({ onCommand, logs }) {
  const [input, setInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!minimized) {
      logEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [logs, minimized]);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    if (!trimmed.startsWith("/")) return;
    const [cmd, ...args] = trimmed.slice(1).split(" ");
    onCommand(cmd.toLowerCase(), args);
  };

  return (
    <div className={`terminal-console ${minimized ? "minimized" : ""}`}>
      {/* Title bar with minimize */}
      <div className="terminal-titlebar">
        <span className="terminal-title">⌨ PIXEL-NEXUS TERMINAL</span>
        <button
          className="terminal-minimize-btn"
          onClick={() => setMinimized((v) => !v)}
          title={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? "▲" : "▼"}
        </button>
      </div>

      {!minimized && (
        <>
          <div className="terminal-log">
            {logs.map((line, i) => (
              <div key={i} className="terminal-line">
                <span className="terminal-prompt">{">"}</span> {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="terminal-input-row">
            <span className="terminal-prompt">{">"}</span>
            <input
              className="terminal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                e.stopPropagation();
              }}
              placeholder="/rect red 50 | /circle blue 30 | /gravity | /clear"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
