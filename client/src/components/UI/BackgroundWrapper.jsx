import { useTheme } from "../../context/ThemeContext.jsx";
import "./BackgroundWrapper.css";

export default function BackgroundWrapper({ children }) {
  // Theme is handled globally via data-theme on html, but we can keep the hook if needed
  return <div className="retro-background-wrapper">{children}</div>;
}
