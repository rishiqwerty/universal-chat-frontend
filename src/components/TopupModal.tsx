import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { fetchCreditPlans, createPaymentOrder, verifyPayment, type CreditPlan } from "../api/api";
import { useAuth } from "../context/AuthContext";

type TopupModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

let razorpaySdkPromise: Promise<any> | null = null;

function loadRazorpaySdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);
  if (razorpaySdkPromise) return razorpaySdkPromise;

  razorpaySdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("razorpay-checkout-script");
    if (existing) {
      if ((window as any).Razorpay) {
        resolve((window as any).Razorpay);
      } else {
        existing.addEventListener("load", () => resolve((window as any).Razorpay));
        existing.addEventListener("error", () => {
          razorpaySdkPromise = null;
          reject(new Error("Failed to load Razorpay Checkout SDK."));
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve((window as any).Razorpay);
    script.onerror = () => {
      razorpaySdkPromise = null;
      script.remove();
      reject(new Error("Failed to load Razorpay Checkout SDK."));
    };
    document.body.appendChild(script);
  });

  return razorpaySdkPromise;
}

export default function TopupModal({ isOpen, onClose }: TopupModalProps) {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState<string | number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setErrorMessage(null);
      fetchCreditPlans()
        .then((data) => setPlans(data))
        .catch((err) => {
          console.error("Failed to load plans", err);
          setErrorMessage("Failed to load credit plans. Please try again.");
        });
    }
  }, [isOpen]);

  async function handleCheckout(plan: CreditPlan) {
    setLoading(plan.id || plan.amount);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create order on backend and load Razorpay SDK on-demand in parallel
      const [orderData, RazorpayConstructor] = await Promise.all([
        createPaymentOrder({
          plan_id: plan.id,
          amount: plan.amount,
          currency: plan.currency || "INR",
        }),
        loadRazorpaySdk(),
      ]);

      if (!orderData || !orderData.order_id) {
        throw new Error("Failed to initialize payment order.");
      }

      if (!RazorpayConstructor) {
        throw new Error("Razorpay SDK is still loading. Please check your internet connection.");
      }

      const options = {
        key: orderData.key_id || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || "rzp_test_TQbLdeKqtYOisC",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Neural Architect",
        description: `Refuel ${plan.amount} Credits`,
        image: "/mascot.png",
        order_id: orderData.order_id,
        prefill: {
          name: user?.full_name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#d9ff00",
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setVerifying(true);
          try {
            // 3. Verify signature on backend & credit user balance
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Refresh user profile and broadcast balance-update immediately across all UI components
            window.dispatchEvent(new Event("balance-update"));
            await refreshProfile();

            setSuccessMessage(
              verifyRes.message || `Successfully added ${verifyRes.credits_added || plan.amount} credits!`
            );

            setTimeout(() => {
              onClose();
              setSuccessMessage(null);
            }, 1800);
          } catch (err: any) {
            console.error("Payment verification failed", err);
            setErrorMessage(
              err?.response?.data?.detail || "Payment verification failed. Please contact support."
            );
          } finally {
            setVerifying(false);
            setLoading(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
      };

      const rzpInstance = new RazorpayConstructor(options);
      rzpInstance.on("payment.failed", function (response: any) {
        console.error("Razorpay payment failed", response);
        setErrorMessage(
          response?.error?.description || "Payment failed or was cancelled by user."
        );
        setLoading(null);
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error("Checkout initiation failed", err);
      setErrorMessage(
        err?.response?.data?.detail || err?.message || "Failed to initiate payment. Please try again."
      );
      setLoading(null);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-border/60 bg-surface/95 p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-64 rounded-full bg-primary/15 blur-3xl" />

            {/* Top Close Button for Mobile & Desktop */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading !== null || verifying}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-elevated/60 text-textMuted transition-all hover:bg-elevated hover:text-textPrimary hover:scale-105 active:scale-95 disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="relative mb-5 text-center">
              {/* Lightning Logo with Electric Spark Animations */}
              <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
                {/* Electric Pulsing Halo Background */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.75, 0.35],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl pointer-events-none"
                />

                {/* Sparkling Mini Particles */}
                <motion.span
                  animate={{
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0],
                    x: [0, 8],
                    y: [0, -8],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.2,
                  }}
                  className="absolute -top-1 right-1 text-primary text-xs pointer-events-none select-none"
                >
                  ✦
                </motion.span>
                <motion.span
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    x: [0, -8],
                    y: [0, 6],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.9,
                  }}
                  className="absolute bottom-1 -left-1 text-primary text-[10px] pointer-events-none select-none"
                >
                  ✦
                </motion.span>
                <motion.span
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    y: [0, -10],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.6,
                  }}
                  className="absolute -top-2 left-3 text-primary text-[8px] pointer-events-none select-none"
                >
                  ★
                </motion.span>

                {/* Central Electric Lightning Container */}
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 15px rgba(217, 255, 0, 0.2), inset 0 0 10px rgba(217, 255, 0, 0.1)",
                      "0 0 30px rgba(217, 255, 0, 0.5), inset 0 0 15px rgba(217, 255, 0, 0.25)",
                      "0 0 15px rgba(217, 255, 0, 0.2), inset 0 0 10px rgba(217, 255, 0, 0.1)",
                    ],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/20 to-primary/5 text-primary backdrop-blur-md"
                >
                  <motion.svg
                    animate={{
                      scale: [1, 1.08, 1],
                      filter: [
                        "drop-shadow(0 0 4px rgba(217, 255, 0, 0.4))",
                        "drop-shadow(0 0 12px rgba(217, 255, 0, 0.9))",
                        "drop-shadow(0 0 4px rgba(217, 255, 0, 0.4))",
                      ],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="h-7 w-7 text-primary fill-primary/30"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </motion.svg>
                </motion.div>
              </div>
              <h2 className="font-headline text-xl sm:text-2xl font-bold text-textPrimary tracking-tight">Refuel Neural Credits</h2>
              <p className="mt-1 text-xs sm:text-sm text-textMuted max-w-sm mx-auto">
                Credits fuel AI image syntheses & specialized models with zero subscriptions.
              </p>
            </div>

            {/* Status Messages */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                ✓ {successMessage}
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-400"
              >
                ⚠ {errorMessage}
              </motion.div>
            )}

            {verifying && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs font-semibold text-primary shadow-[0_0_15px_rgba(217,255,0,0.1)]">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Verifying payment with bank & adding credits...</span>
              </div>
            )}

            {/* Credit Plans List */}
            <div className="space-y-2.5 sm:space-y-3">
              {plans.length === 0 ? (
                <div className="py-8 text-center text-xs sm:text-sm text-textMuted flex flex-col items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading credit packages...</span>
                </div>
              ) : (
                plans.map((opt, idx) => {
                  let priceLabel = "";
                  if (Number(opt.price) === 0) {
                    priceLabel = "FREE";
                  } else {
                    const symbol = opt.currency === "USD" ? "$" : opt.currency === "INR" ? "₹" : `${opt.currency} `;
                    priceLabel = `${symbol}${Number(opt.price).toFixed(2)}`;
                  }

                  const isCurrentLoading = loading === opt.id || loading === opt.amount;
                  const isPopular = idx === 1 || opt.amount >= 200;

                  return (
                    <button
                      key={opt.id}
                      disabled={loading !== null || verifying}
                      onClick={() => handleCheckout(opt)}
                      className={`group relative flex w-full items-center gap-3 sm:gap-4 rounded-2xl border p-3.5 sm:p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${isPopular
                          ? "border-primary/40 bg-gradient-to-r from-primary/10 via-elevated/80 to-elevated/40 hover:border-primary shadow-[0_0_20px_rgba(217,255,0,0.06)]"
                          : "border-border/50 bg-elevated/50 hover:border-primary/50 hover:bg-elevated"
                        }`}
                    >
                      {/* Popular Pill */}
                      {isPopular && (
                        <div className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-background shadow-[0_0_10px_rgba(217,255,0,0.3)]">
                          Popular
                        </div>
                      )}

                      {/* Amount Token Icon */}
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/10 font-headline font-black text-primary transition-all group-hover:scale-105 group-hover:border-primary group-hover:bg-primary group-hover:text-background">
                        <span className="text-sm sm:text-base leading-none">{opt.amount}</span>
                        <span className="text-[8px] font-bold uppercase tracking-tighter opacity-80">CR</span>
                      </div>

                      {/* Plan Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-textPrimary truncate">{opt.label}</span>
                          <span className="shrink-0 text-xs sm:text-sm font-bold text-primary tracking-wide">{priceLabel}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-textMuted truncate">{opt.description}</p>
                      </div>

                      {/* Loading Spinner or Arrow */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isCurrentLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface/60 text-textMuted group-hover:bg-primary group-hover:text-background transition-colors">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Legal & Razorpay Compliance Footer */}
            <div className="mt-5 border-t border-border/30 pt-3.5 text-center text-[10px] sm:text-[11px] text-textMuted">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <a
                  href="/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2"
                >
                  Refund Policy
                </a>
                <span>•</span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2"
                >
                  Terms
                </a>
                <span>•</span>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2"
                >
                  Privacy
                </a>
                <span>•</span>
                <a
                  href="/contact-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline underline-offset-2"
                >
                  Support
                </a>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-textMuted/70">
                <svg className="h-3 w-3 text-primary/70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Secured Razorpay Checkout • Instant Balance Refuel</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
