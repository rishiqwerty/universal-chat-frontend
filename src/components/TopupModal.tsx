import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function cleanupRazorpayDom() {
  try {
    const elements = document.querySelectorAll(".razorpay-container, iframe[src*='razorpay'], iframe[name^='razorpay']");
    elements.forEach((el) => el.remove());
  } catch {
    // ignore
  }
}

export default function TopupModal({ isOpen, onClose }: TopupModalProps) {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState<string | number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    return () => {
      cleanupRazorpayDom();
    };
  }, []);

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
    } else {
      cleanupRazorpayDom();
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

            await refreshProfile();
            setSuccessMessage(
              verifyRes.message || `Successfully added ${verifyRes.credits_added || plan.amount} credits!`
            );

            setTimeout(() => {
              cleanupRazorpayDom();
              onClose();
              setSuccessMessage(null);
            }, 2500);
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
            cleanupRazorpayDom();
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
        cleanupRazorpayDom();
      });

      rzpInstance.open();
    } catch (err: any) {
      console.error("Checkout initiation failed", err);
      setErrorMessage(
        err?.response?.data?.detail || err?.message || "Failed to initiate payment. Please try again."
      );
      setLoading(null);
      cleanupRazorpayDom();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/50 bg-elevated p-8 shadow-2xl"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-headline text-2xl font-bold text-textPrimary">Refuel Your Credits</h2>
              <p className="mt-2 text-sm text-textMuted">
                Instant delivery. Credits are used for <b>Image generations</b> & Pro models.
              </p>
            </div>

            {/* Status Messages */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-400"
              >
                ✓ {successMessage}
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-400"
              >
                ⚠ {errorMessage}
              </motion.div>
            )}

            {verifying && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-semibold text-primary">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Verifying payment with bank & adding credits...</span>
              </div>
            )}

            <div className="space-y-3">
              {plans.length === 0 ? (
                <div className="py-8 text-center text-sm text-textMuted">
                  Loading credit plans...
                </div>
              ) : (
                plans.map((opt) => {
                  let priceLabel = "";
                  if (Number(opt.price) === 0) {
                    priceLabel = "FREE";
                  } else {
                    const symbol = opt.currency === "USD" ? "$" : opt.currency === "INR" ? "₹" : `${opt.currency} `;
                    priceLabel = `${symbol}${Number(opt.price).toFixed(2)}`;
                  }

                  const isCurrentLoading = loading === opt.id || loading === opt.amount;

                  return (
                    <button
                      key={opt.id}
                      disabled={loading !== null || verifying}
                      onClick={() => handleCheckout(opt)}
                      className="group relative flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-surface/50 p-4 transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-surface disabled:opacity-50"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated font-headline text-lg font-bold text-primary group-hover:scale-110 transition-transform">
                        {opt.amount}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-textPrimary">{opt.label}</span>
                          <span className="text-xs font-bold text-primary uppercase tracking-widest">{priceLabel}</span>
                        </div>
                        <p className="text-xs text-textMuted">{opt.description}</p>
                      </div>
                      {isCurrentLoading && (
                        <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Legal & Razorpay Compliance */}
            <div className="mt-6 border-t border-border/30 pt-4 text-center text-[11px] text-textMuted">
              <div className="flex items-center justify-center gap-2.5">
                <a
                  href="/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-textMuted hover:text-primary transition-colors underline underline-offset-2"
                >
                  Refund Policy
                </a>
                <span>•</span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-textMuted hover:text-primary transition-colors underline underline-offset-2"
                >
                  Terms
                </a>
                <span>•</span>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-textMuted hover:text-primary transition-colors underline underline-offset-2"
                >
                  Privacy
                </a>
                <span>•</span>
                <a
                  href="/contact-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-textMuted hover:text-primary transition-colors underline underline-offset-2"
                >
                  Support
                </a>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-textMuted/70">
                <svg className="h-3 w-3 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Secured by Razorpay Standard Checkout • Instant credit delivery</span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading !== null || verifying}
              className="mt-4 w-full py-2 text-xs font-medium text-textMuted hover:text-textPrimary hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
