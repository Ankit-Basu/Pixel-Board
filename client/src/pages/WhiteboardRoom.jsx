import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { aiApi } from "../api/axiosInstance.js";
import api from "../api/axiosInstance.js";
import LatexRenderer from "../components/LatexRenderer/LatexRenderer.jsx";
import TerminalConsole from "../components/WhiteboardRoom/TerminalConsole.jsx";
import Matter from "matter-js";
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

  // Object layer state
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [activeObjId, setActiveObjId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasObjectsRef = useRef([]);
  const activeObjIdRef = useRef(null);

  // Physics
  const [gravityOn, setGravityOn] = useState(false);
  const gravityOnRef = useRef(false);
  const engineRef = useRef(null);
  const physBodiesRef = useRef({}); // id -> Matter.Body
  const rafRef = useRef(null);
  const mouseConstraintRef = useRef(null);

  // Terminal
  const [terminalLogs, setTerminalLogs] = useState([
    "PIXEL-NEXUS TERMINAL v1.0",
    "Commands: /rect [color] [size] | /circle [color] [radius] | /gravity | /clear",
  ]);

  // Keep refs in sync with state (needed inside rAF loops)
  useEffect(() => {
    canvasObjectsRef.current = canvasObjects;
  }, [canvasObjects]);
  useEffect(() => {
    activeObjIdRef.current = activeObjId;
  }, [activeObjId]);
  useEffect(() => {
    gravityOnRef.current = gravityOn;
  }, [gravityOn]);

  // Lock body scroll while whiteboard is mounted
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Canvas setup & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let resizeTimer = null;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      // Save existing pixel data before resizing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.imageSmoothingEnabled = false;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Put old data back immediately so canvas isn't blank
      ctx.putImageData(imageData, 0, 0);
      // Debounce the full redraw so it picks up latest React state
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => redrawCanvas(), 50);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(resizeTimer);
    };
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

    // Remote drawing events — store lines in drawingActions so they survive redraws
    const remoteActionRef = { current: null, timer: null };

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

      // Also store in drawingActions for persistence across redraws
      if (!remoteActionRef.current) {
        remoteActionRef.current = { lines: [] };
      }
      remoteActionRef.current.lines.push(data.line);

      // Flush the remote action after a short gap (batch lines into one action)
      clearTimeout(remoteActionRef.timer);
      remoteActionRef.timer = setTimeout(() => {
        if (
          remoteActionRef.current &&
          remoteActionRef.current.lines.length > 0
        ) {
          const action = remoteActionRef.current;
          remoteActionRef.current = null;
          setDrawingActions((prev) => {
            const newActions = [...prev, action];
            setActionIndex(newActions.length - 1);
            return newActions;
          });
        }
      }, 300);
    });

    socket.on("undo", () => {
      setActionIndex((prev) => Math.max(-1, prev - 1));
    });

    socket.on("clear-canvas", () => {
      clearCanvas(false);
    });

    // Listen for solve results from other users
    socket.on("solve-result", (data) => {
      if (data.answers && Array.isArray(data.answers)) {
        setAnswers((prev) => [...prev, ...data.answers]);
      }
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
      socket.off("solve-result");
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
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
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

    // — Pixel path layer —
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

    // — Answer popups —
    answers.forEach((answer) => {
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.fillStyle = "#fd79a8";
      ctx.shadowColor = "rgba(253, 121, 168, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillText(answer.text, answer.x, answer.y);
      ctx.shadowBlur = 0;
    });

    // — Object layer (drawn on top) —
    if (!gravityOnRef.current) {
      drawObjects(ctx, canvasObjectsRef.current, activeObjIdRef.current);
    }
  };

  // Draw objects helper (also used by physics rAF)
  const drawObjects = (ctx, objects, selectedId) => {
    objects.forEach((obj) => {
      ctx.save();
      if (obj.angle) {
        const cx = obj.x + (obj.type === "rect" ? obj.width / 2 : 0);
        const cy = obj.y + (obj.type === "rect" ? obj.height / 2 : 0);
        ctx.translate(cx, cy);
        ctx.rotate(obj.angle);
        ctx.translate(-cx, -cy);
      }
      ctx.fillStyle = obj.color;
      ctx.globalAlpha = 0.88;
      if (obj.type === "rect") {
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        if (obj.id === selectedId) {
          ctx.strokeStyle = "#00cec9";
          ctx.lineWidth = 2;
          ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
        }
      } else {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        if (obj.id === selectedId) {
          ctx.strokeStyle = "#00cec9";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  };

  // ── Object Layer helpers ──────────────────────────────────────────────
  const RAND_COLORS = [
    "#fd79a8",
    "#00cec9",
    "#fdcb6e",
    "#6c5ce7",
    "#55efc4",
    "#e17055",
    "#0984e3",
    "#fab1a0",
  ];
  const randColor = () =>
    RAND_COLORS[Math.floor(Math.random() * RAND_COLORS.length)];

  const addRect = (color = randColor(), size = 60, startX, startY) => {
    const canvas = canvasRef.current;
    const cx = startX !== undefined ? startX : canvas ? canvas.width / 2 : 400;
    const cy = startY !== undefined ? startY : canvas ? canvas.height / 2 : 300;
    const obj = {
      id: Date.now() + Math.random(),
      type: "rect",
      x: cx - size / 2,
      y: cy - size / 2,
      width: size,
      height: size,
      color,
      angle: 0,
    };
    setCanvasObjects((prev) => [...prev, obj]);
    if (startY === undefined)
      addLog(`Spawning Entity: ${color} Rectangle (${size}px)`);

    if (gravityOnRef.current && engineRef.current) {
      const body = Matter.Bodies.rectangle(cx, cy, size, size, {
        restitution: 0.5,
        friction: 0.3,
      });
      body._objId = obj.id;
      physBodiesRef.current[obj.id] = body;
      Matter.World.add(engineRef.current.world, body);
    }
    return obj;
  };

  const addCircle = (color = randColor(), radius = 35, startX, startY) => {
    const canvas = canvasRef.current;
    const cx = startX !== undefined ? startX : canvas ? canvas.width / 2 : 400;
    const cy = startY !== undefined ? startY : canvas ? canvas.height / 2 : 300;
    const obj = {
      id: Date.now() + Math.random(),
      type: "circle",
      x: cx,
      y: cy,
      radius: Number(radius),
      color,
      angle: 0,
    };
    setCanvasObjects((prev) => [...prev, obj]);
    if (startY === undefined)
      addLog(`Spawning Entity: ${color} Circle (r=${radius})`);

    if (gravityOnRef.current && engineRef.current) {
      const body = Matter.Bodies.circle(cx, cy, Number(radius), {
        restitution: 0.6,
        friction: 0.2,
      });
      body._objId = obj.id;
      physBodiesRef.current[obj.id] = body;
      Matter.World.add(engineRef.current.world, body);
    }
    return obj;
  };

  const addLog = (msg) => setTerminalLogs((prev) => [...prev, msg]);

  // ── Select/Move mouse handlers ────────────────────────────────────────
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (pos, obj) => {
    if (obj.type === "rect") {
      return (
        pos.x >= obj.x &&
        pos.x <= obj.x + obj.width &&
        pos.y >= obj.y &&
        pos.y <= obj.y + obj.height
      );
    }
    const dx = pos.x - obj.x,
      dy = pos.y - obj.y;
    return Math.sqrt(dx * dx + dy * dy) <= obj.radius;
  };

  const startSelect = (e) => {
    if (gravityOnRef.current) return; // matter.js mouse constraint handles it
    const pos = getCanvasPos(e);
    const objs = canvasObjectsRef.current;
    // Check in reverse order (top-most first)
    for (let i = objs.length - 1; i >= 0; i--) {
      if (hitTest(pos, objs[i])) {
        setActiveObjId(objs[i].id);
        const ox =
          objs[i].type === "rect" ? pos.x - objs[i].x : pos.x - objs[i].x;
        const oy =
          objs[i].type === "rect" ? pos.y - objs[i].y : pos.y - objs[i].y;
        setDragOffset({ x: ox, y: oy });
        return;
      }
    }
    setActiveObjId(null);
  };

  const moveSelect = (e) => {
    if (!activeObjIdRef.current || gravityOnRef.current) return;
    const pos = getCanvasPos(e);
    setCanvasObjects((prev) =>
      prev.map((o) => {
        if (o.id !== activeObjIdRef.current) return o;
        return o.type === "rect"
          ? { ...o, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : { ...o, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
      }),
    );
  };

  const endSelect = () => setActiveObjId(null);

  // Redraw whenever objects or selection change (non-physics)
  useEffect(() => {
    if (!gravityOn) redrawCanvas();
  }, [canvasObjects, activeObjId]);

  // ── Gravity / Matter.js ───────────────────────────────────────────────
  useEffect(() => {
    if (!gravityOn) {
      // Tear down physics
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      physBodiesRef.current = {};
      redrawCanvas();
      return;
    }

    // Set up engine
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;
    const canvas = canvasRef.current;
    const W = canvas.width,
      H = canvas.height;

    // Boundary walls (invisible static bodies)
    const walls = [
      Matter.Bodies.rectangle(W / 2, H + 25, W, 50, {
        isStatic: true,
        label: "ground",
      }),
      Matter.Bodies.rectangle(W / 2, -25, W, 50, {
        isStatic: true,
        label: "ceil",
      }),
      Matter.Bodies.rectangle(-25, H / 2, 50, H, {
        isStatic: true,
        label: "wallL",
      }),
      Matter.Bodies.rectangle(W + 25, H / 2, 50, H, {
        isStatic: true,
        label: "wallR",
      }),
    ];
    Matter.World.add(engine.world, walls);

    // Convert existing canvasObjects → Matter bodies
    const bodies = {};
    canvasObjectsRef.current.forEach((obj) => {
      let body;
      if (obj.type === "rect") {
        body = Matter.Bodies.rectangle(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height,
          {
            restitution: 0.5,
            friction: 0.3,
          },
        );
      } else {
        body = Matter.Bodies.circle(obj.x, obj.y, obj.radius, {
          restitution: 0.6,
          friction: 0.2,
        });
      }
      body._objId = obj.id;
      bodies[obj.id] = body;
      Matter.World.add(engine.world, body);
    });
    physBodiesRef.current = bodies;

    // Mouse constraint for dragging in physics mode
    const mConstraint = Matter.MouseConstraint.create(engine, {
      mouse: Matter.Mouse.create(canvas),
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.World.add(engine.world, mConstraint);
    mouseConstraintRef.current = mConstraint;

    // rAF loop: update engine + sync positions back to React state
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      // Redraw pixel paths
      // (get current state via a direct call – works because it closes over actionIndex / drawingActions)
      ctx.imageSmoothingEnabled = false;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Map body positions → objects and draw
      const updated = canvasObjectsRef.current.map((obj) => {
        const body = physBodiesRef.current[obj.id];
        if (!body) return obj;
        const p = body.position;
        return obj.type === "rect"
          ? {
              ...obj,
              x: p.x - obj.width / 2,
              y: p.y - obj.height / 2,
              angle: body.angle,
            }
          : { ...obj, x: p.x, y: p.y, angle: body.angle };
      });

      // Batch-update state (once per frame)
      setCanvasObjects(updated);
      canvasObjectsRef.current = updated;

      // Draw pixel paths inline (no react state, read from closures)
      for (let i = 0; i <= actionIndex; i++) {
        const action = drawingActions[i];
        if (action)
          action.lines.forEach((line) => {
            ctx.lineWidth = line.brushSize || 4;
            ctx.strokeStyle = line.color;
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
          });
      }

      drawObjects(ctx, updated, null);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    addLog(gravityOn ? "Gravity ENGINE activated ⚡" : "");

    return () => {
      cancelAnimationFrame(rafRef.current);
      Matter.Engine.clear(engine);
    };
  }, [gravityOn]);

  // ── Terminal command handler ───────────────────────────────────────────
  const handleTerminalCommand = (cmd, args) => {
    switch (cmd) {
      case "rect": {
        const color = args[0] || randColor();
        const size = parseInt(args[1]) || 60;
        addRect(color, size);
        break;
      }
      case "circle": {
        const color = args[0] || randColor();
        const radius = parseInt(args[1]) || 35;
        addCircle(color, radius);
        break;
      }
      case "gravity":
        setGravityOn((prev) => {
          const next = !prev;
          addLog(
            next ? "Gravity ENGINE activated ⚡" : "Gravity ENGINE disabled",
          );
          return next;
        });
        break;
      case "clear":
        setCanvasObjects([]);
        clearCanvas();
        addLog("World cleared.");
        break;
      case "demo": {
        let count = parseInt(args[0]) || 20;
        addLog(`Initiating physics demo with ${count} objects...`);
        if (!gravityOnRef.current) {
          setGravityOn(true);
        }
        let i = 0;
        const interval = setInterval(() => {
          if (i >= count) {
            clearInterval(interval);
            return;
          }
          const canvas = canvasRef.current;
          const x = canvas ? Math.random() * (canvas.width - 100) + 50 : 400;
          const y = canvas ? Math.random() * 100 + 20 : 50;
          if (Math.random() > 0.5)
            addRect(randColor(), 30 + Math.random() * 30, x, y);
          else addCircle(randColor(), 15 + Math.random() * 20, x, y);
          i++;
        }, 80);
        break;
      }
      default:
        addLog(`Unknown command: /${cmd}`);
    }
  }; // end handleTerminalCommand

  // ── Drawing handlers (pencil / eraser only) ─────────────────────────
  const startDrawing = (e) => {
    if (tool === "select" || gravityOnRef.current) return;
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
          const newAnswers = res.data.map((d) => ({
            x: maxX + 40,
            y: (minY + maxY) / 2,
            text: String(d.result),
          }));
          setAnswers((prev) => [...prev, ...newAnswers]);

          // Broadcast solve results to other users in the room
          if (socket) {
            socket.emit("solve-result", {
              roomId,
              answers: newAnswers,
            });
          }
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

      {/* Full Screen Main Area */}
      <div className="whiteboard-main retro-background-wrapper">
        <div
          className="canvas-container"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
        >
          <canvas
            ref={canvasRef}
            style={{ cursor: tool === "select" ? "grab" : "crosshair" }}
            onMouseDown={(e) => {
              if (tool === "select") startSelect(e);
              else startDrawing(e);
            }}
            onMouseMove={(e) => {
              if (tool === "select") moveSelect(e);
              else draw(e);
            }}
            onMouseUp={(e) => {
              if (tool === "select") endSelect();
              else stopDrawing();
            }}
            onMouseOut={(e) => {
              if (tool === "select") endSelect();
              else stopDrawing();
            }}
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

        {/* 1. Floating Top Toolbar */}
        <div className="floating-toolbar">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate("/dashboard")}
            title="Leave Party"
          >
            ← Leave
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
            <button
              className={`btn btn-sm ${tool === "select" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTool("select")}
              title="Select / Move Objects"
            >
              🖱️
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Object Controls */}
          <div className="toolbar-group">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => addRect()}
              title="Add Square"
            >
              🟥 Square
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => addCircle()}
              title="Add Circle"
            >
              🔵 Circle
            </button>
            <button
              className={`btn btn-sm ${gravityOn ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setGravityOn((v) => !v)}
              title="Toggle Gravity"
            >
              {gravityOn ? "⚡ Gravity ON" : "🌍 Gravity"}
            </button>
          </div>

          <div className="toolbar-divider" />

          <div className="color-picker-grid">
            {COLORS.slice(0, 12).map((c) => (
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

          <button
            className="btn btn-sm btn-secondary"
            onClick={undo}
            title="Undo"
          >
            ↩️
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={redo}
            title="Redo"
          >
            ↪️
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
              setCanvasObjects([]);
              setGravityOn(false);
              clearCanvas();
              addLog("World cleared.");
            }}
            title="Clear All"
          >
            🗑️ CLEAR ALL
          </button>

          <div className="toolbar-divider" />

          <button
            className="btn btn-sm btn-success"
            onClick={solveCanvas}
            disabled={isLoading}
            title="AI Solve"
          >
            🤖 {isLoading ? "..." : "Solve"}
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={getExplanation}
            disabled={isExplaining}
            title="Explain"
          >
            📝 {isExplaining ? "..." : "Explain"}
          </button>

          <div className="toolbar-divider" />

          <button
            className="btn btn-sm btn-secondary"
            onClick={saveSnapshot}
            title="Export Canvas"
          >
            💾 Save Game
          </button>

          <div className="toolbar-divider" />

          <div
            className="theme-toggle"
            onClick={toggleTheme}
            style={{ marginLeft: 5 }}
          >
            <span className="toggle-icon sun-icon">☀️</span>
            <span className="toggle-icon moon-icon">🌙</span>
          </div>
        </div>

        {/* 2. Floating Party List (Top Right) */}
        <div className="floating-party-list">
          <div
            style={{
              fontFamily: "var(--pixel-font)",
              fontSize: "0.6rem",
              color: "var(--neon-yellow)",
              marginBottom: "8px",
              borderBottom: "2px solid #555",
              paddingBottom: "4px",
            }}
          >
            PARTY ({onlineUsers.length})
          </div>
          {onlineUsers.map((u, i) => (
            <div key={i} className="party-member">
              <img
                src={
                  u.avatar ||
                  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${u.userName}`
                }
                alt={u.userName}
              />
              <span>
                {u.userName} {roomInfo?.host?._id === u.userId && "👑"}
              </span>
              <span className="online-dot" title="Online"></span>
            </div>
          ))}
          <div
            style={{
              marginTop: "8px",
              fontSize: "0.5rem",
              color: "#888",
              textAlign: "center",
            }}
          >
            Room: {roomId}
          </div>
        </div>

        {/* 3. Floating RPG Chat Box (Bottom Right) */}
        <div className={`gamified-chat-box ${!sidebarOpen ? "collapsed" : ""}`}>
          <div className="chat-tabs-rpg">
            <button
              className={`chat-tab-rpg ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              PARTY CHAT
            </button>
            <button
              className={`chat-tab-rpg ${activeTab === "ai" ? "active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              AI GUIDE
            </button>
            <button
              className="chat-tab-rpg"
              onClick={() => setSidebarOpen(false)}
              style={{ flex: 0.3 }}
              title="Minimize"
            >
              _
            </button>
          </div>

          <div className="chat-log-rpg">
            {activeTab === "chat" && (
              <>
                {chatMessages.map((msg, i) => {
                  if (msg.type === "system") {
                    return (
                      <div
                        key={i}
                        style={{
                          color: "#aaa",
                          fontSize: "0.6rem",
                          fontStyle: "italic",
                          textAlign: "center",
                          margin: "4px 0",
                        }}
                      >
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
                      style={{
                        textAlign: isOwn ? "right" : "left",
                        marginBottom: "8px",
                      }}
                    >
                      {!isOwn && (
                        <div
                          style={{
                            fontSize: "0.5rem",
                            color: "var(--neon-cyan)",
                            marginBottom: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {msg.senderName || msg.sender?.name}
                          {onlineUsers.some(
                            (u) =>
                              u.userName ===
                                (msg.senderName || msg.sender?.name) ||
                              u.userId === msg.sender?._id,
                          ) && (
                            <span className="online-dot" title="Online"></span>
                          )}
                        </div>
                      )}
                      <div
                        className={`chat-bubble ${isOwn ? "own" : "other"}`}
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          fontSize: "0.65rem",
                          maxWidth: "85%",
                          wordBreak: "break-word",
                          textAlign: "left",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </>
            )}

            {activeTab === "ai" && (
              <>
                {aiMessages.length === 0 && (
                  <div
                    style={{
                      color: "#aaa",
                      fontSize: "0.6rem",
                      fontStyle: "italic",
                      textAlign: "center",
                      margin: "4px 0",
                    }}
                  >
                    Ask the AI Guide for help or click Explain.
                  </div>
                )}
                {aiMessages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      style={{
                        textAlign: isUser ? "right" : "left",
                        marginBottom: "8px",
                      }}
                    >
                      {!isUser && (
                        <div
                          style={{
                            fontSize: "0.5rem",
                            color: "var(--neon-pink)",
                            marginBottom: "2px",
                          }}
                        >
                          AI GUIDE
                        </div>
                      )}
                      <div
                        style={{
                          display: "inline-block",
                          background: isUser
                            ? "var(--bg-tertiary)"
                            : "rgba(253, 121, 168, 0.1)",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          border: `1px solid ${isUser ? "#444" : "var(--neon-pink)"}`,
                          fontSize: "0.65rem",
                          color: "#fff",
                          maxWidth: "90%",
                          wordBreak: "break-word",
                          overflowX: "auto",
                        }}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
                          <LatexRenderer content={msg.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
                {isExplaining && (
                  <div
                    style={{
                      color: "var(--neon-pink)",
                      fontSize: "0.6rem",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    Analyzing realm...
                  </div>
                )}
              </>
            )}
          </div>

          <div className="chat-input-rpg">
            {activeTab === "chat" ? (
              <>
                <input
                  type="text"
                  placeholder="Message party..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                />
                <button onClick={sendChatMessage}>SEND</button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Ask guide..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAiQuestion()}
                  disabled={isExplaining}
                />
                <button onClick={sendAiQuestion} disabled={isExplaining}>
                  ASK
                </button>
              </>
            )}
          </div>
        </div>

        {/* Terminal Console — bottom-left */}
        <TerminalConsole
          onCommand={handleTerminalCommand}
          logs={terminalLogs}
        />

        {/* Toggle Chat Button if collapsed */}
        {!sidebarOpen && (
          <button
            className="btn btn-primary"
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              zIndex: 1000,
              boxShadow: "4px 4px 0 #000",
              border: "2px solid #fff",
            }}
            onClick={() => setSidebarOpen(true)}
          >
            💬 OPEN CHAT
          </button>
        )}
      </div>
    </div>
  );
}
