import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Chat from "./pages/Chat";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import ImageStudio from "./pages/ImageStudio";
import Documentation from "./pages/Documentation";
import Legal from "./pages/Legal";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/chat" replace /> : children;
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
        <Route path="/gallery" element={<Navigate to="/library" replace />} />
        <Route path="/studio" element={<ProtectedRoute><ImageStudio /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* Public documentation & setup guides */}
        <Route path="/docs" element={<Documentation />} />
        <Route path="/docs/:slug" element={<Documentation />} />

        {/* Public Legal, Compliance, and Payment Policy Pages */}
        <Route path="/terms" element={<Legal />} />
        <Route path="/terms-and-conditions" element={<Legal />} />
        <Route path="/terms-of-service" element={<Legal />} />
        <Route path="/privacy" element={<Legal />} />
        <Route path="/privacy-policy" element={<Legal />} />
        <Route path="/refunds" element={<Legal />} />
        <Route path="/refund-policy" element={<Legal />} />
        <Route path="/cancellation-refund" element={<Legal />} />
        <Route path="/pricing" element={<Legal />} />
        <Route path="/pricing-policy" element={<Legal />} />
        <Route path="/plans" element={<Legal />} />
        <Route path="/delivery" element={<Legal />} />
        <Route path="/delivery-policy" element={<Legal />} />
        <Route path="/shipping-policy" element={<Legal />} />
        <Route path="/contact" element={<Legal />} />
        <Route path="/contact-us" element={<Legal />} />
        <Route path="/support" element={<Legal />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:slug" element={<Legal />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
