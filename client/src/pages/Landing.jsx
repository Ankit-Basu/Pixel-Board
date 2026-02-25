import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/* Animated counter hook */
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

export default function Landing() {
  const { user } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [previewAvatar, setPreviewAvatar] = useState("Hero");

  const AVATAR_SEEDS = ["Hero", "Mage", "Knight", "Rogue", "Cleric", "Goblin"];

  const [usersCount, usersRef] = useCounter(1200);
  const [roomsCount, roomsRef] = useCounter(850);
  const [drawingsCount, drawingsRef] = useCounter(5400);

  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewAvatar((prev) => {
        const idx = AVATAR_SEEDS.indexOf(prev);
        return AVATAR_SEEDS[(idx + 1) % AVATAR_SEEDS.length];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 25;
    const y = (window.innerHeight / 2 - e.pageY) / 25;
    setMousePos({ x, y });
  };

  const staticSprites = [
    { id: 2, icon: "🛡️", className: "floating-sprite sprite-br" },
    { id: 3, icon: "🧪", className: "floating-sprite sprite-bl" },
    { id: 4, icon: "💎", className: "floating-sprite sprite-tr" },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div
      className="landing-page retro-background-wrapper"
      onMouseMove={handleMouseMove}
      style={{ minHeight: "100vh", overflow: "hidden", position: "relative" }}
    >
      {/* Floating pixel particles */}
      <div className="pixel-particles" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="pixel-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* CRT Scanline Overlay */}
      <div className="crt-scanlines" aria-hidden="true"></div>

      {/* Floating RPG Sprites */}
      {/* Floating RPG Sprites (Static CSS only to prevent lag) */}
      {staticSprites.map((sprite) => (
        <div key={sprite.id} className={sprite.className}>
          {sprite.icon}
        </div>
      ))}

      {/* ===== HERO ===== */}
      <section className="landing-hero-retro">
        <motion.div
          className="HeroBox"
          animate={{ x: -mousePos.x, y: -mousePos.y }}
          transition={{ type: "spring", stiffness: 100, damping: 25 }}
        >
          <div className="hero-badge">✨ OPEN-SOURCE RPG WHITEBOARD</div>
          <h1 className="hero-title-retro">
            PIXEL-BOARD: THE REALM OF COLLABORATION
          </h1>
          <p className="hero-subtitle-retro">
            Join a lobby, equip your pixel pencil, and conquer quests together
            instantly using WebSockets.
          </p>
          <div className="hero-buttons-retro">
            {user ? (
              <Link to="/dashboard" className="hero-btn-retro btn-blue">
                ⚔️ ENTER LOBBY
              </Link>
            ) : (
              <>
                <Link to="/register" className="hero-btn-retro btn-blue">
                  🎮 START QUEST
                </Link>
                <Link to="/login" className="hero-btn-retro btn-green">
                  🔑 RESUME GAME
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ===== LIVE STATS BAR (STATIC PIXEL STYLE) ===== */}
      <section className="stats-bar-section">
        <div className="stats-bar" ref={usersRef}>
          <div className="stat-item">
            <span className="stat-number">{usersCount}+</span>
            <span className="stat-label">PLAYERS JOINED</span>
          </div>
          <div className="stat-divider">◆</div>
          <div className="stat-item" ref={roomsRef}>
            <span className="stat-number">{roomsCount}+</span>
            <span className="stat-label">REALMS CREATED</span>
          </div>
          <div className="stat-divider">◆</div>
          <div className="stat-item" ref={drawingsRef}>
            <span className="stat-number">{drawingsCount}+</span>
            <span className="stat-label">DRAWINGS MADE</span>
          </div>
        </div>
      </section>

      {/* ===== PIXEL DIVIDER ===== */}
      <div className="pixel-divider" aria-hidden="true" />

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-it-works-section" id="how-it-works">
        <h2 className="features-title-retro">
          <span className="decor-star">⚙️</span> HOW IT WORKS{" "}
          <span className="decor-star">⚙️</span>
        </h2>
        <div className="steps-row">
          <motion.div
            className="step-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="step-number">1</div>
            <div className="step-icon">🏰</div>
            <h3>CREATE A REALM</h3>
            <p>Spin up a private or public whiteboard room in one click.</p>
          </motion.div>
          <div className="step-arrow">▶</div>
          <motion.div
            className="step-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="step-number">2</div>
            <div className="step-icon">🤝</div>
            <h3>INVITE YOUR PARTY</h3>
            <p>
              Share the invite code. Friends join instantly — no sign-up needed
              to view.
            </p>
          </motion.div>
          <div className="step-arrow">▶</div>
          <motion.div
            className="step-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="step-number">3</div>
            <div className="step-icon">🎨</div>
            <h3>DRAW TOGETHER</h3>
            <p>
              Collaborate in real-time with pixel tools, chat, and AI
              assistance.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="pixel-divider" aria-hidden="true" />

      {/* ===== INVENTORY (FEATURES) ===== */}
      <section className="features-section-retro" id="inventory">
        <h2 className="features-title-retro">
          <span className="decor-star">✦</span> INVENTORY{" "}
          <span className="decor-star">✦</span>
        </h2>

        <div className="features-grid-rpg">
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">⚡</div>
            <h3>Instant Sync</h3>
            <p>Draw simultaneously with 0 lag.</p>
          </motion.div>
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">🗡️</div>
            <h3>Pixel Tools</h3>
            <p>Pencil, Eraser, and Color Picker.</p>
          </motion.div>
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">🛡️</div>
            <h3>Private Rooms</h3>
            <p>Secure instances for your party.</p>
          </motion.div>
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">📜</div>
            <h3>Global Chat</h3>
            <p>Communicate with allies in real-time.</p>
          </motion.div>
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">⏳</div>
            <h3>Time Travel</h3>
            <p>Undo or Redo your actions.</p>
          </motion.div>
          <motion.div
            className="rpg-item-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="item-icon">📸</div>
            <h3>Snapshot Save</h3>
            <p>Export the realm as a PNG scroll.</p>
          </motion.div>
        </div>
      </section>

      <div className="pixel-divider" aria-hidden="true" />

      {/* ===== GUEST PREVIEW ===== */}
      <section className="avatar-creator-section" id="guest-preview">
        <h2 className="features-title-retro">
          <span className="decor-star">👾</span> GUEST PREVIEW{" "}
          <span className="decor-star">👾</span>
        </h2>
        <div className="avatar-split-layout">
          <div className="avatar-preview-column">
            <motion.div
              className="avatar-anim-placeholder"
              style={{ border: "none", background: "transparent" }}
              key={previewAvatar}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${previewAvatar}`}
                alt="Preview Avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "pixelated",
                }}
              />
            </motion.div>
            <p className="avatar-caption">
              Previewing: <strong>{previewAvatar}</strong> class
            </p>
          </div>
          <div className="avatar-text-column">
            <h3>Choose Your Class</h3>
            <p className="avatar-desc">
              Get an exclusive 8-bit identity when you register. Displayed to
              all players in your party list!
            </p>
            <div className="avatar-seed-row">
              {AVATAR_SEEDS.map((seed) => (
                <button
                  key={seed}
                  className={`avatar-seed-btn ${previewAvatar === seed ? "active" : ""}`}
                  onClick={() => setPreviewAvatar(seed)}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`}
                    alt={seed}
                  />
                </button>
              ))}
            </div>
            <div style={{ marginTop: "20px" }}>
              {user ? (
                <Link
                  to="/dashboard"
                  className="hero-btn-retro btn-green"
                  style={{ fontSize: "0.7rem" }}
                >
                  EDIT AVATAR IN LOBBY
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hero-btn-retro btn-green"
                  style={{ fontSize: "0.7rem" }}
                >
                  LOGIN TO SAVE & USE
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="pixel-divider" aria-hidden="true" />

      {/* ===== TECH STACK MARQUEE ===== */}
      <section className="tech-stack-section">
        <h2 className="features-title-retro" style={{ marginBottom: "30px" }}>
          <span className="decor-star">🔧</span> BUILT WITH{" "}
          <span className="decor-star">🔧</span>
        </h2>
        <div className="tech-marquee">
          <div className="tech-marquee-inner">
            {[
              "React",
              "Node.js",
              "MongoDB",
              "Socket.IO",
              "WebRTC",
              "Framer Motion",
              "Express",
              "Canvas API",
            ].map((tech, i) => (
              <span key={i} className="tech-badge">
                {tech}
              </span>
            ))}
            {[
              "React",
              "Node.js",
              "MongoDB",
              "Socket.IO",
              "WebRTC",
              "Framer Motion",
              "Express",
              "Canvas API",
            ].map((tech, i) => (
              <span key={`dup-${i}`} className="tech-badge">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer-retro">
        <div className="footer-columns">
          <div className="footer-col">
            <h4 className="footer-logo">🕹️ Pixel-Nexus</h4>
            <a href="#inventory">Inventory</a>
            <a href="#how-it-works">How It Works</a>
          </div>
          <div className="footer-col">
            <h4>Navigation</h4>
            <a href="#guest-preview">Guest Preview</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Source
            </a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="#">Privacy Scroll</Link>
            <Link to="#">Terms of Pact</Link>
          </div>
        </div>
        <div className="footer-copyright">
          © 2025 Pixel-Nexus. Crafted for the 8-bit collaborative web. ⚔️
        </div>
      </footer>
    </div>
  );
}
