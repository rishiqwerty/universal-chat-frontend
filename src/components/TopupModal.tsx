import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { topupCredits, fetchCreditPlans, CreditPlan } from "../api/api";
import { getApiBaseUrl } from "../config";

type TopupModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function TopupModal({ isOpen, onClose }: TopupModalProps) {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [loading, setLoading] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCreditPlans()
        .then((data) => setPlans(data))
        .catch((err) => console.error("Failed to load plans", err));
    }
  }, [isOpen]);

  async function handleTopup(amount: number) {
    setLoading(amount);
    try {
      const data = await topupCredits(amount, window.location.origin);
      if (data.checkout_url) {
        if (/^https?:\/\//i.test(data.checkout_url)) {
          window.location.href = data.checkout_url;
        } else {
          const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
          const relativeUrl = data.checkout_url.startsWith("/") ? data.checkout_url : `/${data.checkout_url}`;
          window.location.href = `${baseUrl}${relativeUrl}`;
        }
      }
    } catch (error) {
      console.error("Topup failed", error);
    } finally {
      setLoading(null);
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
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-headline text-2xl font-bold text-textPrimary">Refuel Your Credits</h2>
              <p className="mt-2 text-sm text-textMuted">
                Credits are only used for **Image and Video generations**. Text chat is always unlimited for members.
              </p>
            </div>

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

                  return (
                    <button
                      key={opt.id}
                      disabled={loading !== null}
                      onClick={() => handleTopup(opt.amount)}
                      className="group relative flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-surface/50 p-4 transition-all hover:border-primary/50 hover:bg-surface disabled:opacity-50"
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
                      {loading === opt.amount && (
                        <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-8 w-full py-3 text-sm font-medium text-textMuted hover:text-textPrimary transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
