import { Routes, Route, useLocation } from "react-router-dom";
import { MathJaxContext } from "better-react-mathjax";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import ProtectedRoute from "./components/UI/ProtectedRoute.jsx";
import RetroOverlay from "./components/UI/RetroOverlay.jsx";
import PageTransition from "./components/UI/PageTransition.jsx";
import Navbar from "./components/Navbar/Navbar.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import WhiteboardRoom from "./pages/WhiteboardRoom.jsx";

const mathJaxConfig = {
  loader: { load: ["[tex]/ams"] },
  tex: {
    packages: { "[+]": ["ams"] },
    inlineMath: [["$", "$"]],
    displayMath: [["$$", "$$"]],
  },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Navbar />
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Navbar />
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <Navbar />
              <Register />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <WhiteboardRoom />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <MathJaxContext config={mathJaxConfig}>
            <RetroOverlay />
            <AnimatedRoutes />
          </MathJaxContext>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
