import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axiosInstance.js";
import Navbar from "../components/Navbar/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const emojis = ["🎨", "📐", "🧮", "✏️", "🖌️", "📊", "🔬", "📝"];

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [joinId, setJoinId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError("");
      setCreating(true);
      const { data } = await api.post("/rooms/create", {
        name: roomName || "Untitled Whiteboard",
      });
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    try {
      setError("");
      await api.post("/rooms/join", { roomId: joinId.trim() });
      navigate(`/room/${joinId.trim()}`);
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard">
        {/* Welcome Banner */}
        <motion.div
          className="dashboard-welcome"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="welcome-text">
            <h1>
              <span className="welcome-wave">👋</span>
              Hello, {user?.name || "Creator"}!
            </h1>
            <p className="welcome-sub">
              Create a new whiteboard or join an existing room.
            </p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          className="dashboard-cards"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Create Room Card */}
          <div className="action-card card">
            <div className="card-body">
              <div className="action-card-header">
                <span className="action-emoji">✨</span>
                <h3>New Board</h3>
              </div>
              <div className="action-card-content">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Board name (optional)"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? "⏳ Creating..." : "✚ Create Room"}
                </button>
              </div>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="action-card card">
            <div className="card-body">
              <div className="action-card-header">
                <span className="action-emoji">🔗</span>
                <h3>Join Room</h3>
              </div>
              <form className="action-card-content" onSubmit={handleJoin}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste Room ID"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary w-full">
                  → Join
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rooms List */}
        <motion.div
          className="rooms-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="rooms-section-title">
            <span>⬡</span> Your Whiteboards
          </h2>

          {loading ? (
            <div className="flex justify-center p-4">
              <div className="loading-card">
                <div className="spinner" />
                <p>Loading boards...</p>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="empty-pixels">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="pixel-block"
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    style={{
                      background: [
                        "var(--neon-purple)",
                        "var(--neon-cyan)",
                        "var(--neon-pink)",
                        "var(--neon-yellow)",
                        "var(--accent)",
                        "var(--success)",
                      ][i],
                    }}
                  />
                ))}
              </div>
              <h3>No boards yet</h3>
              <p>Create your first whiteboard to start collaborating!</p>
            </motion.div>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room, i) => (
                <motion.div
                  key={room._id}
                  className="card room-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-body">
                    <div className="room-card-top">
                      <span className="room-emoji">
                        {emojis[i % emojis.length]}
                      </span>
                      <h3>{room.name}</h3>
                    </div>
                    <div className="room-meta">
                      <span className="room-id">{room.roomId}</span>
                      <span>👥 {room.participants?.length || 1}</span>
                      <span>{formatDate(room.updatedAt)}</span>
                    </div>
                    <div className="room-host">
                      Host: {room.host?.name || "You"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
