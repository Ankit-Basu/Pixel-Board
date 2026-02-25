import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/axiosInstance.js";
import { useAuth } from "../../context/AuthContext.jsx";

const emojis = ["🎨", "📐", "🧮", "✏️", "🖌️", "📊", "🔬", "📝"];

export default function CollabZone() {
  const [rooms, setRooms] = useState([]);
  const [joinId, setJoinId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
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

  const handleCopyId = (e, roomId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomId);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this quest from your log?")) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
    } catch (err) {
      console.error("Failed to delete room:", err);
      setError(err.response?.data?.message || "Failed to delete quest");
    }
  };

  return (
    <div className="collab-zone">
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

      <div className="collab-actions-row">
        <div className="lobby-action-card">
          <h3>CREATE NEW WORLD</h3>
          <input
            type="text"
            className="retro-input"
            placeholder="World Name (Optional)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            className="hero-btn-retro btn-blue"
            onClick={handleCreate}
            disabled={creating}
            style={{ width: "100%", padding: "15px" }}
          >
            {creating ? "FORGING..." : "GENERATE REALM"}
          </button>
        </div>

        <div className="lobby-action-card">
          <h3>JOIN WORLD</h3>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              className="retro-input"
              placeholder="Enter Invite Code"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <button
              type="submit"
              className="hero-btn-retro btn-green"
              style={{ width: "100%", padding: "15px" }}
            >
              ENTER REALM
            </button>
          </form>
        </div>
      </div>

      <div className="lobby-panel" style={{ marginTop: "20px" }}>
        <h2 className="panel-title">QUEST LOG</h2>
        <div className="quest-list">
          {loading ? (
            <p className="loading-text">Loading archives...</p>
          ) : rooms.length === 0 ? (
            <div className="empty-quest-log">
              <p>Your quest log is empty.</p>
              <p>Forge a new realm to begin!</p>
            </div>
          ) : (
            rooms.map((room, i) => (
              <div
                key={room._id}
                className="quest-card"
                onClick={() => navigate(`/room/${room.roomId}`)}
              >
                <div className="quest-icon">{emojis[i % emojis.length]}</div>
                <div className="quest-info">
                  <h4>{room.name}</h4>
                  <span className="quest-meta">
                    ID: {room.roomId}
                    <button
                      className="quest-copy-btn"
                      onClick={(e) => handleCopyId(e, room.roomId)}
                      title="Copy Room ID"
                    >
                      {copiedId === room.roomId ? "✅" : "📋"}
                    </button>
                    | Party: {room.participants?.length || 1}
                  </span>
                </div>
                <button
                  className="quest-delete-btn"
                  onClick={(e) => handleDeleteRoom(e, room.roomId)}
                  title="Delete Quest"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
