import { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  onComplete: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  error?: string;
  resendCooldownSeconds?: number;
}

export default function OtpInput({
  onComplete,
  onResend,
  loading = false,
  error = "",
  resendCooldownSeconds = 60,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [cooldown, setCooldown] = useState(resendCooldownSeconds);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleChange(value: string, index: number) {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const combinedCode = newOtp.join("");
    if (combinedCode.length === 6) {
      onComplete(combinedCode);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = Array(6).fill("");
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextFocusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();

    if (pastedData.length === 6) {
      onComplete(pastedData);
    }
  }

  function handleResendClick() {
    if (cooldown > 0 || loading) return;
    setOtp(Array(6).fill(""));
    setCooldown(resendCooldownSeconds);
    onResend();
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="w-full text-center">
      <p className="text-xs text-textSecondary mb-4">
        Enter the 6-digit verification code sent to your email
      </p>

      {error && (
        <p className="mb-4 rounded-input bg-primary/10 px-3 py-2 text-xs text-primary ring-1 ring-primary/50">
          {error}
        </p>
      )}

      <div className="flex justify-center gap-2 my-6" onPaste={handlePaste}>
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            disabled={loading}
            className="h-12 w-11 text-center font-mono text-lg font-bold rounded-input border border-border/50 bg-elevated text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:opacity-50"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-textMuted mt-4">
        <span>Didn't get code?</span>
        <button
          type="button"
          onClick={handleResendClick}
          disabled={cooldown > 0 || loading}
          className="font-medium text-primary hover:text-primaryHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
        </button>
      </div>
    </div>
  );
}
