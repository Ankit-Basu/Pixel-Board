import { useTheme } from "../../context/ThemeContext.jsx";
import "./BackgroundWrapper.css";

export default function BackgroundWrapper({ children }) {
  const { theme } = useTheme();

  return (
    <div
      className={`background-wrapper ${theme === "light" ? "blueprint-grid" : "cyber-void"}`}
    >
      {children}
    </div>
  );
}
