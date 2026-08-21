import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import { useSilentKeepAlive } from "./hooks/useSilentKeepAlive";

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
  useSilentKeepAlive(); // Silent background server wake-up & keep-alive without any UI hints
  const { isAuthenticating, authStatusMessage } = useAuth();

  if (isAuthenticating) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background p-6 text-center select-none">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-pulse" />
        
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary shadow-[0_0_30px_rgba(217,255,0,0.35)]" />
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/30 shadow-[0_0_20px_rgba(217,255,0,0.15)]">
            <svg className="h-5 w-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h3 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-textPrimary">
          {authStatusMessage || "Authenticating with Google..."}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-textMuted max-w-sm leading-relaxed">
          Establishing secure neural session and preparing your workspace...
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-surface/80 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-widest">
            Neural Architect Ingress
          </span>
        </div>
      </div>
    );
  }

  return (
    <Routes location={location}>
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
  );
}
