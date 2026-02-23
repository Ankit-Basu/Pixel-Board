import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { aiApi } from "../api/axiosInstance.js";
import api from "../api/axiosInstance.js";
import LatexRenderer from "../components/LatexRenderer/LatexRenderer.jsx";
import BackgroundWrapper from "../components/UI/BackgroundWrapper.jsx";

const COLORS = [
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#CCCCCC",
  "#FFFFFF",
  "#FF0000",
  "#FF6600",
  "#FFCC00",
  "#33CC33",
  "#0099FF",
  "#0000FF",
  "#FF9999",
  "#FFCC99",
  "#FFFF99",
  "#99FF99",
  "#99FFFF",
  "#9999FF",
  "#990000",
  "#FF00FF",
  "#00FFFF",
  "#00CC66",
  "#6600CC",
  "#FF3399",
];

export default function WhiteboardRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Canvas state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState("pencil"); // pencil | eraser
  const [drawingActions, setDrawingActions] = useState([]);
  const [actionIndex, setActionIndex] = useState(-1);
  const [lastPos, setLastPos] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [dictOfVars, setDictOfVars] = useState({});
  const [remoteCursors, setRemoteCursors] = useState({});

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("chat"); // chat | ai
  const [isLoading, setIsLoading] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // AI state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);

  // User presence
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Room info
  const [roomInfo, setRoomInfo] = useState(null);

  // Screen sharing
  const [isSharing, setIsSharing] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Canvas setup & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(imageData, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      redrawCanvas();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [actionIndex, drawingActions]);

  // Join room via socket
  useEffect(() => {
    if (!socket || !user || !roomId) return;

    socket.emit("join-room", { roomId, userId: user._id, userName: user.name });

    socket.on("user-presence", (users) => setOnlineUsers(users));
    socket.on("user-joined", (data) => {
      setChatMessages((prev) => [
        ...prev,
        { type: "system", content: `${data.userName} joined the room` },
      ]);
    });
    socket.on("user-left", (data) => {
      setChatMessages((prev) => [
        ...prev,
        { type: "system", content: `${data.userName} left the room` },
      ]);
    });

    // Remote drawing events
    socket.on("draw", (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = data.line.brushSize || 4;
      ctx.strokeStyle = data.line.color;
      ctx.beginPath();
      ctx.moveTo(data.line.startX, data.line.startY);
      ctx.lineTo(data.line.endX, data.line.endY);
      ctx.stroke();
    });

    socket.on("undo", () => {
      setActionIndex((prev) => Math.max(-1, prev - 1));
    });

    socket.on("clear-canvas", () => {
      clearCanvas(false);
    });

    socket.on("cursor-move", (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.userId]: {
          x: data.x,
          y: data.y,
          color: data.color,
          userName: data.userName,
        },
      }));
    });

    socket.on("cursor-leave", (data) => {
      setRemoteCursors((prev) => {
        const nc = { ...prev };
        delete nc[data.userId];
        return nc;
      });
    });

    // Chat messages
    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Screen sharing signaling
    socket.on("screen-share-offer", async (data) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerRef.current = pc;
        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate,
            });
          }
        };
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("screen-share-answer", { answer, to: data.from });
      } catch (err) {
        console.error("Screen share answer error:", err);
      }
    });

    socket.on("screen-share-answer", async (data) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
        }
      } catch (err) {
        console.error("Set remote description error:", err);
      }
    });

    socket.on("ice-candidate", async (data) => {
      try {
        if (peerRef.current) {
          await peerRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate),
          );
        }
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    socket.on("screen-share-stop", () => {
      setRemoteStream(null);
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    });

    return () => {
      socket.off("user-presence");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("draw");
      socket.off("undo");
      socket.off("clear-canvas");
      socket.off("chat-message");
      socket.off("screen-share-offer");
      socket.off("screen-share-answer");
      socket.off("ice-candidate");
      socket.off("screen-share-stop");
      socket.off("cursor-move");
      socket.off("cursor-leave");
    };
  }, [socket, user, roomId]);

  // Fetch room info & chat history
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);
        setRoomInfo(data);
      } catch (err) {
        console.error("Room not found:", err);
        navigate("/dashboard");
      }
    };
    const fetchChat = async () => {
      try {
        const { data } = await api.get(`/chat/${roomId}`);
        setChatMessages(data);
      } catch {
        /* ignore */
      }
    };
    fetchRoom();
    fetchChat();
  }, [roomId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Remote video ref
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Redraw canvas
  useEffect(() => {
    redrawCanvas();
  }, [drawingActions, actionIndex, answers]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i <= actionIndex; i++) {
      const action = drawingActions[i];
      if (action) {
        action.lines.forEach((line) => {
          ctx.lineWidth = line.brushSize || 4;
          ctx.strokeStyle = line.color;
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();
        });
      }
    }

    // Draw answers on canvas
    answers.forEach((answer) => {
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.fillStyle = "#fd79a8"; // Neon Pink
      ctx.shadowColor = "rgba(253, 121, 168, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillText(answer.text, answer.x, answer.y);
      ctx.shadowBlur = 0; // reset shadow for drawn lines
    });
  };

  // Drawing handlers
  const startDrawing = (e) => {
    setIsDrawing(true);
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    setLastPos({ x, y });
    setDrawingActions((prev) => prev.slice(0, actionIndex + 1));
    setActionIndex((prev) => prev + 1);
    setDrawingActions((prev) => [...prev, { lines: [] }]);
  };

  const draw = (e) => {
    if (!isDrawing || !lastPos) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const drawColor =
      tool === "eraser" ? (theme === "dark" ? "#1a1a2e" : "#ffffff") : color;
    const drawSize = tool === "eraser" ? brushSize * 3 : brushSize;

    const newLine = {
      startX: lastPos.x,
      startY: lastPos.y,
      endX: x,
      endY: y,
      color: drawColor,
      brushSize: drawSize,
    };

    // Draw locally
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = drawSize;
    ctx.strokeStyle = drawColor;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Store action
    setDrawingActions((prev) => {
      const updated = [...prev];
      if (updated[actionIndex]) {
        updated[actionIndex] = {
          lines: [...updated[actionIndex].lines, newLine],
        };
      }
      return updated;
    });

    // Emit to room
    if (socket) {
      socket.emit("draw", { roomId, line: newLine });
    }

    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setIsDrawing(true);
    setLastPos({ x, y });
    setDrawingActions((prev) => prev.slice(0, actionIndex + 1));
    setActionIndex((prev) => prev + 1);
    setDrawingActions((prev) => [...prev, { lines: [] }]);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !lastPos) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const drawColor =
      tool === "eraser" ? (theme === "dark" ? "#1a1a2e" : "#ffffff") : color;
    const drawSize = tool === "eraser" ? brushSize * 3 : brushSize;

    const newLine = {
      startX: lastPos.x,
      startY: lastPos.y,
      endX: x,
      endY: y,
      color: drawColor,
      brushSize: drawSize,
    };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = drawSize;
    ctx.strokeStyle = drawColor;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setDrawingActions((prev) => {
      const updated = [...prev];
      if (updated[actionIndex]) {
        updated[actionIndex] = {
          lines: [...updated[actionIndex].lines, newLine],
        };
      }
      return updated;
    });

    if (socket) socket.emit("draw", { roomId, line: newLine });
    setLastPos({ x, y });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    setLastPos(null);
  };

  const handlePointerMove = (e) => {
    if (!socket || !user || !roomId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hash = [...(user._id || "1")].reduce(
      (a, b) => a + b.charCodeAt(0),
      0,
    );
    const cursorColor = `hsl(${hash % 360}, 100%, 65%)`; // dynamic neon color
    socket.emit("cursor-move", {
      roomId,
      userId: user._id,
      userName: user.name,
      x,
      y,
      color: cursorColor,
    });
  };

  const handlePointerLeave = () => {
    if (socket && user)
      socket.emit("cursor-leave", { roomId, userId: user._id });
  };

  // Undo / Redo
  const undo = () => {
    if (actionIndex >= 0) {
      setActionIndex((prev) => prev - 1);
      if (socket) socket.emit("undo", { roomId });
    }
  };

  const redo = () => {
    if (actionIndex < drawingActions.length - 1) {
      setActionIndex((prev) => prev + 1);
    }
  };

  // Clear canvas
  const clearCanvas = (emit = true) => {
    setDrawingActions([]);
    setActionIndex(-1);
    setAnswers([]);
    setDictOfVars({});
    if (emit && socket) socket.emit("clear-canvas", { roomId });
  };

  // Save snapshot
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // AI: Solve equations on canvas
  const solveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsLoading(true);
    try {
      const response = await aiApi.post("/calculate", {
        image: canvas.toDataURL("image/png"),
        dict_of_vars: dictOfVars,
      });
      const res = response.data;
      const newVars = {};
      res.data.forEach((d) => {
        if (d.assign) newVars[d.expr] = d.result;
      });
      setDictOfVars((prev) => ({ ...prev, ...newVars }));

      if (drawingActions.length > 0 && actionIndex >= 0) {
        const lastAction = drawingActions[actionIndex];
        if (lastAction && lastAction.lines.length > 0) {
          let maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
          lastAction.lines.forEach((line) => {
            maxX = Math.max(maxX, line.startX, line.endX);
            minY = Math.min(minY, line.startY, line.endY);
            maxY = Math.max(maxY, line.startY, line.endY);
          });
          setAnswers((prev) => [
            ...prev,
            ...res.data.map((d) => ({
              x: maxX + 40,
              y: (minY + maxY) / 2,
              text: String(d.result),
            })),
          ]);
        }
      }
    } catch (err) {
      console.error("AI solve error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // AI: Get explanation
  const getExplanation = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isLoading) return;
    setIsExplaining(true);
    setActiveTab("ai");
    setSidebarOpen(true);
    try {
      const response = await aiApi.post("/calculate/explain", {
        image: canvas.toDataURL("image/png"),
        question: "Explain the solution to this problem step by step",
        history: aiMessages,
      });
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.data },
      ]);
    } catch (err) {
      console.error("Explanation error:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  // AI: Ask followup
  const sendAiQuestion = async () => {
    if (!aiInput.trim()) return;
    const question = aiInput;
    setAiMessages((prev) => [...prev, { role: "user", content: question }]);
    setAiInput("");
    setIsExplaining(true);
    try {
      const canvas = canvasRef.current;
      const response = await aiApi.post("/calculate/explain", {
        image: canvas.toDataURL("image/png"),
        question,
        history: [...aiMessages, { role: "user", content: question }],
      });
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.data },
      ]);
    } catch (err) {
      console.error("AI chat error:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  // Chat: Send message
  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("chat-message", {
      roomId,
      userId: user._id,
      userName: user.name,
      content: chatInput,
      type: "text",
    });
    setChatInput("");
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    if (isSharing) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      setIsSharing(false);
      if (socket) socket.emit("screen-share-stop", { roomId });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      localStreamRef.current = stream;
      setIsSharing(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("ice-candidate", { roomId, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socket) socket.emit("screen-share-offer", { roomId, offer });

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        toggleScreenShare();
      });
    } catch (err) {
      console.error("Screen share error:", err);
      setIsSharing(false);
    }
  };

  return (
    <div className="whiteboard-room">
      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <p style={{ fontWeight: 600 }}>AI is solving...</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => navigate("/dashboard")}
          title="Back"
        >
          ← Back
        </button>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            className={`btn btn-sm ${tool === "pencil" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTool("pencil")}
            title="Pencil"
          >
            ✏️
          </button>
          <button
            className={`btn btn-sm ${tool === "eraser" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            🧹
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="color-picker-grid">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${color === c ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setTool("pencil");
              }}
              title={c}
            />
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="brush-size-slider">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Size
          </span>
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
          <div className="brush-preview">
            <div
              className="brush-preview-dot"
              style={{ width: brushSize, height: brushSize }}
            />
          </div>
        </div>

        <div className="toolbar-divider" />

        <button
          className="btn btn-sm btn-secondary"
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          ↩️ Undo
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >
          ↪️ Redo
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => clearCanvas()}
          title="Clear"
        >
          🗑️ Clear
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={saveSnapshot}
          title="Save as PNG"
        >
          💾 Save
        </button>

        <div className="toolbar-divider" />

        <button
          className="btn btn-sm btn-success"
          onClick={solveCanvas}
          disabled={isLoading}
          title="AI Solve"
        >
          🤖 {isLoading ? "Solving..." : "Solve"}
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={getExplanation}
          disabled={isExplaining}
          title="Explain"
        >
          📝 {isExplaining ? "Explaining..." : "Explain"}
        </button>

        <div className="toolbar-divider" />

        <button
          className={`btn btn-sm ${isSharing ? "btn-danger" : "btn-secondary"}`}
          onClick={toggleScreenShare}
          title="Screen Share"
        >
          📺 {isSharing ? "Stop Share" : "Share Screen"}
        </button>

        <div style={{ marginLeft: "auto" }} className="flex items-center gap-2">
          <div className="online-users">
            <span className="online-dot" />
            <span className="online-count">{onlineUsers.length} online</span>
          </div>

          <span className="room-id">{roomId}</span>

          <div
            className="theme-toggle"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            <span className="toggle-icon sun-icon">☀️</span>
            <span className="toggle-icon moon-icon">🌙</span>
          </div>

          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "⟫" : "⟪"} Panel
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="whiteboard-main">
        {/* Canvas */}
        <BackgroundWrapper>
          <div
            className="canvas-container"
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />

            {/* Remote Cursors */}
            {Object.values(remoteCursors).map((c) => (
              <div
                key={c.userName}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  pointerEvents: "none",
                  zIndex: 100,
                  transform: "translate(-2px, -2px)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 2 L4 22 L10 16 L14 24 L17 22 L13 15 L20 15 Z"
                    fill={c.color}
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 20,
                    background: c.color,
                    color: "#000",
                    padding: "2px 6px",
                    borderRadius: "2px",
                    fontSize: "10px",
                    fontFamily: "var(--pixel-font)",
                    border: "2px solid #000",
                    whiteSpace: "nowrap",
                    boxShadow: "2px 2px 0px rgba(0,0,0,1)",
                    textTransform: "uppercase",
                  }}
                >
                  {c.userName}
                </div>
              </div>
            ))}

            {/* Remote screen share */}
            {remoteStream && (
              <div className="screen-share-container">
                <div className="screen-share-label">🔴 LIVE</div>
                <video ref={remoteVideoRef} autoPlay playsInline />
              </div>
            )}
          </div>
        </BackgroundWrapper>

        {/* Sidebar */}
        <div className={`sidebar ${!sidebarOpen ? "collapsed" : ""}`}>
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 Chat
            </button>
            <button
              className={`sidebar-tab ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              🤖 AI Helper
            </button>
            <button
              className={`sidebar-tab ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              👥 Users
            </button>
          </div>

          <div className="sidebar-content">
            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="chat-messages">
                {chatMessages.map((msg, i) => {
                  if (msg.type === "system") {
                    return (
                      <div key={i} className="chat-system">
                        {msg.content}
                      </div>
                    );
                  }
                  const isOwn =
                    msg.sender?._id === user?._id ||
                    msg.senderName === user?.name;
                  return (
                    <div
                      key={i}
                      className={`chat-message ${isOwn ? "own" : ""}`}
                    >
                      {!isOwn && (
                        <span className="sender">
                          {msg.senderName || msg.sender?.name}
                        </span>
                      )}
                      <div className="bubble">{msg.content}</div>
                      {msg.createdAt && (
                        <span className="time">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* AI Tab */}
            {activeTab === "ai" && (
              <div className="chat-messages">
                {aiMessages.length === 0 && (
                  <div className="chat-system">
                    Click "Explain" to analyze what's on the canvas, or ask a
                    question below.
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-message ${msg.role === "user" ? "own" : ""}`}
                  >
                    <div className="bubble">
                      {msg.role === "assistant" ? (
                        <LatexRenderer content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isExplaining && (
                  <div className="chat-system">
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div>
                <h4 style={{ marginBottom: "12px", fontSize: "0.9rem" }}>
                  Online ({onlineUsers.length})
                </h4>
                <div className="users-list">
                  {onlineUsers.map((u, i) => (
                    <div key={i} className="user-tag">
                      <span className="dot" />
                      {u.userName}
                      {roomInfo?.host?._id === u.userId && " (Host)"}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar footer input */}
          <div className="sidebar-footer">
            {activeTab === "chat" && (
              <div className="chat-input">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={sendChatMessage}
                >
                  Send
                </button>
              </div>
            )}
            {activeTab === "ai" && (
              <div className="chat-input">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ask AI a question..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAiQuestion()}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={sendAiQuestion}
                  disabled={isExplaining}
                >
                  Ask
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
