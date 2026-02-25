import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import CollabZone from "../components/Dashboard/CollabZone.jsx";
import ArcadeZone from "../components/Dashboard/ArcadeZone.jsx";
import VideoCall from "../components/Dashboard/VideoCall.jsx";
import CoinShop from "../components/Dashboard/CoinShop.jsx";

const ZONES = [
  { id: "collab", label: "⚔️ COLLAB REALM", icon: "⚔️" },
  { id: "arcade", label: "🕹️ ARCADE", icon: "🕹️" },
  { id: "videocall", label: "📹 VIDEO CALL", icon: "📹" },
  { id: "shop", label: "🏪 COIN SHOP", icon: "🏪" },
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

// DiceBear avatar customization options
const HAIR_STYLES = [
  "short01",
  "short02",
  "short03",
  "short04",
  "short05",
  "long01",
  "long02",
  "long03",
  "long04",
];
const SKIN_COLORS = ["ecad80", "f2d3b1", "d08b5b", "ae5d29", "614335"];
const HAIR_COLORS = [
  "000000",
  "6a4e35",
  "b55239",
  "d6b370",
  "cb6820",
  "a484b0",
  "dc4b50",
  "2570dc",
];
const GLASSES = ["", "light01", "light02", "dark01", "dark02"];
const MOUTHS = [
  "happy01",
  "happy02",
  "happy03",
  "happy04",
  "happy05",
  "sad01",
  "sad02",
];

export default function Dashboard() {
  const [activeZone, setActiveZone] = useState("collab");
  const [direction, setDirection] = useState(0);
  const [pixelCoins, setPixelCoins] = useState(0);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const { user, updateProfileAvatar } = useAuth();
  const lastCoinTime = useRef(0);

  // Avatar customization state
  const [avatarHair, setAvatarHair] = useState("short01");
  const [avatarSkin, setAvatarSkin] = useState("ecad80");
  const [avatarHairColor, setAvatarHairColor] = useState("000000");
  const [avatarGlasses, setAvatarGlasses] = useState("");
  const [avatarMouth, setAvatarMouth] = useState("happy01");

  const buildAvatarUrl = (hair, skin, hairColor, glasses, mouth) => {
    let url = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(user?.name || "Hero")}`;
    url += `&hair=${hair}`;
    url += `&skinColor=${skin}`;
    url += `&hairColor=${hairColor}`;
    url += `&mouth=${mouth}`;
    if (glasses) url += `&glasses=${glasses}&glassesProbability=100`;
    else url += `&glassesProbability=0`;
    return url;
  };

  const previewAvatarUrl = buildAvatarUrl(
    avatarHair,
    avatarSkin,
    avatarHairColor,
    avatarGlasses,
    avatarMouth,
  );

  const switchZone = (zoneId) => {
    const currentIdx = ZONES.findIndex((z) => z.id === activeZone);
    const nextIdx = ZONES.findIndex((z) => z.id === zoneId);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    setActiveZone(zoneId);
  };

  const handleCoinsEarned = (amount) => {
    const now = Date.now();
    if (now - lastCoinTime.current < 100) return;
    lastCoinTime.current = now;
    setPixelCoins((prev) => prev + amount);
  };

  const handleSaveAvatar = async () => {
    try {
      setUpdatingAvatar(true);
      await updateProfileAvatar(previewAvatarUrl);
      setShowCustomizer(false);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="command-center retro-background-wrapper">
        {/* Retro Sidebar */}
        <div className="zone-sidebar">
          {/* Avatar + Coins */}
          <div className="sidebar-avatar-block">
            <div className="avatar-preview-large">
              <img
                src={
                  user?.avatar
                    ? user.avatar
                    : `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(user?.name || "Hero")}`
                }
                alt="Avatar"
              />
            </div>
            <p className="avatar-name-display">{user?.name}</p>
            <div className="pixel-coin-counter">🪙 {pixelCoins} COINS</div>
          </div>

          {/* Zone Tabs */}
          <div className="zone-tabs">
            {ZONES.map((zone) => (
              <button
                key={zone.id}
                className={`zone-tab ${activeZone === zone.id ? "active" : ""}`}
                onClick={() => switchZone(zone.id)}
              >
                {zone.label}
              </button>
            ))}
          </div>

          {/* Update Profile Button */}
          <div className="sidebar-avatar-picker">
            <button
              className="hero-btn-retro btn-blue"
              style={{ width: "100%", fontSize: "0.55rem" }}
              onClick={() => setShowCustomizer(true)}
            >
              ✏️ UPDATE AVATAR
            </button>
          </div>
        </div>

        {/* Zone Content */}
        <div className="zone-content">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeZone}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.3 }}
              className="zone-panel"
            >
              {activeZone === "collab" && <CollabZone />}
              {activeZone === "arcade" && (
                <ArcadeZone onCoinsEarned={handleCoinsEarned} />
              )}
              {activeZone === "videocall" && <VideoCall />}
              {activeZone === "shop" && (
                <CoinShop
                  pixelCoins={pixelCoins}
                  setPixelCoins={setPixelCoins}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Avatar Customizer Modal with Blur Backdrop */}
      <AnimatePresence>
        {showCustomizer && (
          <motion.div
            className="avatar-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCustomizer(false)}
          >
            <motion.div
              className="avatar-modal-box"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="avatar-modal-close"
                onClick={() => setShowCustomizer(false)}
              >
                ✕
              </button>
              <h2 className="avatar-modal-title">UPDATE AVATAR</h2>
              <p className="avatar-modal-subtitle">
                Customize your pixel avatar
              </p>

              {/* Large Preview */}
              <div className="avatar-modal-preview">
                <img src={previewAvatarUrl} alt="Preview" />
              </div>

              {/* Customizer Grid */}
              <div className="avatar-modal-options">
                <div className="customizer-section">
                  <label>HAIR STYLE</label>
                  <div className="customizer-row">
                    {HAIR_STYLES.map((h) => (
                      <button
                        key={h}
                        className={`customizer-btn ${avatarHair === h ? "active" : ""}`}
                        onClick={() => setAvatarHair(h)}
                      >
                        {h.replace("short0", "S").replace("long0", "L")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="customizer-section">
                  <label>HAIR COLOR</label>
                  <div className="customizer-row">
                    {HAIR_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`customizer-color-btn ${avatarHairColor === c ? "active" : ""}`}
                        onClick={() => setAvatarHairColor(c)}
                        style={{ background: `#${c}` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="customizer-section">
                  <label>SKIN TONE</label>
                  <div className="customizer-row">
                    {SKIN_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`customizer-color-btn ${avatarSkin === c ? "active" : ""}`}
                        onClick={() => setAvatarSkin(c)}
                        style={{ background: `#${c}` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="customizer-section">
                  <label>EXPRESSION</label>
                  <div className="customizer-row">
                    {MOUTHS.map((m) => (
                      <button
                        key={m}
                        className={`customizer-btn ${avatarMouth === m ? "active" : ""}`}
                        onClick={() => setAvatarMouth(m)}
                      >
                        {m.replace("happy0", "😊").replace("sad0", "😢")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="customizer-section">
                  <label>GLASSES</label>
                  <div className="customizer-row">
                    <button
                      className={`customizer-btn ${avatarGlasses === "" ? "active" : ""}`}
                      onClick={() => setAvatarGlasses("")}
                    >
                      None
                    </button>
                    {GLASSES.filter((g) => g).map((g) => (
                      <button
                        key={g}
                        className={`customizer-btn ${avatarGlasses === g ? "active" : ""}`}
                        onClick={() => setAvatarGlasses(g)}
                      >
                        {g.replace("light0", "L").replace("dark0", "D")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                className="hero-btn-retro btn-green avatar-modal-save"
                onClick={handleSaveAvatar}
                disabled={updatingAvatar}
              >
                {updatingAvatar ? "SAVING..." : "💾 SAVE AVATAR"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
