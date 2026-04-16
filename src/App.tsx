import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Chat from "./pages/Chat";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return isAuth ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return isAuth ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to={isAuth ? "/chat" : "/login"} replace />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuth ? "/chat" : "/login"} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

