import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Chat from "./pages/Chat";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import ImageStudio from "./pages/ImageStudio";
import { useTheme } from "./hooks/useTheme";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return isAuth ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return isAuth ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  const location = useLocation();
  useTheme(); // Initialize global accent theme

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Homepage and /chat are fully public, allowing guest access to Incognito mode */}
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        
        {/* Unauthenticated routes: Restricted for logged-in users */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes: Redirect to /login if unauthenticated */}
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/studio" element={<ProtectedRoute><ImageStudio /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

