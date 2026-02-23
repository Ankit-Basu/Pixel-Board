import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div
      className="landing-page"
      style={{
        backgroundImage: "url('/pixel-studio-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
      }}
    >
      <section className="landing-hero-retro">
        <div className="HeroBox">
          <h1 className="hero-title-retro">
            PIXEL-BOARD: Real-Time Collaboration
          </h1>
          <p className="hero-subtitle-retro">
            Join a room, grab a pixel pencil, and draw together instantly using
            WebSockets.
          </p>
          <div className="hero-buttons-retro">
            {user ? (
              <Link to="/dashboard" className="hero-btn-retro btn-blue">
                OPEN DASHBOARD
              </Link>
            ) : (
              <>
                <Link to="/register" className="hero-btn-retro btn-blue">
                  GET STARTED
                </Link>
                <Link to="/login" className="hero-btn-retro btn-green">
                  LOGIN
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features-section-retro">
        <h2 className="features-title-retro">
          <span className="decor-star">✦</span> GAME FEATURES{" "}
          <span className="decor-star">✦</span>
        </h2>
        <div className="features-grid-retro">
          <div className="feature-card-retro">
            <div className="feature-icon-retro">
              <svg width="64" height="64" viewBox="0 0 16 16">
                <path fill="#fbbf24" d="M9 0H5v6H1v2h4v8h4v-6h4V8H9V0z" />
              </svg>
            </div>
            <h3>Instant Sync</h3>
            <p>Draw simultaneously with friends using Socket.io.</p>
          </div>
          <div className="feature-card-retro">
            <div className="feature-icon-retro">
              <svg width="64" height="64" viewBox="0 0 16 16">
                <path fill="#f87171" d="M11 1h4v4l-9 9H2v-4L11 1z" />
                <path fill="#fff" d="M13 3l-1 1-2-2 1-1zM4 11l-2 2v-1l1-1z" />
              </svg>
            </div>
            <h3>Pixel Tools</h3>
            <p>Pencil, Eraser, and Color Picker included.</p>
          </div>
          <div className="feature-card-retro">
            <div className="feature-icon-retro">
              <svg width="64" height="64" viewBox="0 0 16 16">
                <path
                  fill="#fcd34d"
                  d="M10 2a4 4 0 00-4 4c0 1.2.5 2.3 1.4 3L2 14v2h4v-2h2v-2h2l1.6-1.6A4 4 0 1010 2zM9 5h2v2H9V5z"
                />
              </svg>
            </div>
            <h3>Private Rooms</h3>
            <p>Create unique room IDs for secure collaboration.</p>
          </div>
        </div>
      </section>

      <section className="avatar-creator-section">
        <h2 className="features-title-retro">CREATE YOUR PIXEL IDENTITY</h2>
        <div className="avatar-split-layout">
          <div className="avatar-preview-column">
            <div className="avatar-anim-placeholder"></div>
            <p className="avatar-caption">
              Stand out in the collab room with your custom avatar.
            </p>
          </div>
          <div className="avatar-text-column">
            <h3>Built-in Sprite Editor</h3>
            <p className="avatar-desc">
              Design your unique 8-bit persona before you join a room. No
              external tools needed!
            </p>
            <Link to="/register" className="hero-btn-retro btn-blue">
              TRY AVATAR CREATOR NOW
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer-retro">
        <div className="footer-columns">
          <div className="footer-col">
            <h4 className="footer-logo">🕹️ Pixel-Nexus</h4>
            <Link to="/">Home</Link>
            <Link to="#about">About</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="#docs">Documentation</Link>
            <a
              href="https://github.com/Pixel-Nexus"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repo
            </a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="#privacy">Privacy Policy</Link>
            <Link to="#terms">Terms of Service</Link>
          </div>
        </div>
        <div className="footer-copyright">
          © 2024 Pixel-Nexus. Crafted for the 8-bit collaborative web.
        </div>
      </footer>
    </div>
  );
}
