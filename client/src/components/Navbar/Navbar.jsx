import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar-hud">
      <Link to="/" className="hud-brand">
        <svg
          className="hud-joystick"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
        >
          {/* Paint palette */}
          <ellipse
            cx="12"
            cy="13"
            rx="10"
            ry="9"
            fill="#3a3a5c"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="10" r="2" fill="#ff6b6b" />
          <circle cx="13" cy="8" r="2" fill="#fbbf24" />
          <circle cx="17" cy="12" r="2" fill="#4ecdc4" />
          <circle cx="9" cy="16" r="2" fill="#a29bfe" />
          <ellipse
            cx="16"
            cy="17"
            rx="2.5"
            ry="1.5"
            fill="#fff"
            opacity="0.9"
          />
        </svg>
        Pixel-Nexus
      </Link>

      <div className="hud-center-links">
        {!user && (
          <>
            <a href="#inventory" className="hud-link">
              Inventory
            </a>
            <a href="#guest-preview" className="hud-link">
              Guest Preview
            </a>
          </>
        )}
        {user && (
          <Link to="/dashboard" className="hud-link">
            Dashboard
          </Link>
        )}
      </div>

      <div className="hud-actions">
        <button
          className="hud-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#fbbf24">
              <path d="M7 0h2v3H7V0zM7 13h2v3H7v-3zM0 7h3v2H0V7zm13 0h3v2h-3V7zM3 10H1v2h2v-2zm10 0h2v2h-2v-2zM3 4H1V2h2v2zm10 0h2V2h-2v2zM5 5h6v6H5V5z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#818cf8">
              <path d="M8 1a7 7 0 00-7 7h2a5 5 0 015-5V1zm0 14a7 7 0 007-7h-2a5 5 0 01-5 5v2z" />
            </svg>
          )}
        </button>

        {user ? (
          <div className="hud-profile-container">
            <div className="hud-profile">
              <img
                src={
                  user.avatar
                    ? user.avatar
                    : `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(user.name)}`
                }
                alt="Avatar"
                className="hud-avatar"
              />
              <span className="hud-username">{user.name}</span>
            </div>
            <button className="hud-btn-logout" onClick={logout}>
              LOGOUT
            </button>
          </div>
        ) : (
          <div className="hud-profile-container">
            <div className="hud-profile">
              <img
                src="https://api.dicebear.com/9.x/pixel-art/svg?seed=Guest"
                alt="Avatar"
                className="hud-avatar"
              />
              <span className="hud-username">Guest</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
