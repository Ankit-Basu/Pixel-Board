import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar-hud">
      <Link to={user ? "/dashboard" : "/"} className="hud-brand">
        <svg
          className="hud-joystick"
          width="24"
          height="24"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M4 10v4h8v-4H4zm1 1h2v2H5v-2zm4 0h2v2H9v-2zM6 4h4v6H6V4zm1 1h2v4H7V5z"
            fill="#fff"
          />
          <path d="M7 1h2v3H7V1z" fill="red" />
        </svg>
        Pixel-Nexus
      </Link>

      <div className="hud-center-links">
        <Link to="#features" className="hud-link">
          Features
        </Link>
        <Link to="#docs" className="hud-link">
          Docs
        </Link>
        <Link to="#community" className="hud-link">
          Community
        </Link>
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
                src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${user.name}`}
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
