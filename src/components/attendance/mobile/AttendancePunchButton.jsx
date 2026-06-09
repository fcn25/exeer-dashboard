import { useEffect, useMemo, useState } from "react";

const STATE_CONFIG = {
  check_in: {
    background: "#16A34A",
    icon: "→",
    subtext: "تسجيل الحضور",
    pulse: true,
    tappable: true,
  },
  locked: {
    background: "#DC2626",
    icon: "✓",
    subtext: "",
    pulse: false,
    tappable: false,
  },
  check_out: {
    background: "#DC2626",
    icon: "←",
    subtext: "تسجيل الانصراف",
    pulse: true,
    tappable: true,
  },
  done: {
    background: "#64748B",
    icon: "✓",
    subtext: "تم تسجيل الانصراف",
    pulse: false,
    tappable: false,
  },
};

function toArabicNumerals(value) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function formatLockedCountdown(lockedUntil, now) {
  if (!lockedUntil) return "الخروج لاحقاً";

  const diffMs = lockedUntil.getTime() - now.getTime();
  if (diffMs <= 0) return "تسجيل الانصراف";

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = ["الخروج بعد"];

  if (hours > 0) {
    parts.push(`${toArabicNumerals(hours)} ساعات`);
  }
  if (minutes > 0) {
    parts.push(`${toArabicNumerals(minutes)} دقيقة`);
  }

  return parts.join(" ");
}

export default function AttendancePunchButton({
  state = "check_in",
  onPress,
  lockedUntil = null,
  isProcessing = false,
}) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.check_in;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state !== "locked" || !lockedUntil) return undefined;

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [lockedUntil, state]);

  const subtext = useMemo(() => {
    if (isProcessing) return "جارٍ التسجيل...";
    if (state === "locked") {
      return formatLockedCountdown(lockedUntil, now);
    }
    return config.subtext;
  }, [config.subtext, isProcessing, lockedUntil, now, state]);

  const isTappable = config.tappable && !isProcessing;

  const handleClick = () => {
    if (!isTappable) return;
    onPress?.();
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative flex items-center justify-center">
        {isProcessing ? (
          <span
            className="pointer-events-none absolute rounded-full border-2 border-transparent border-t-white/90 border-e-white/35"
            style={{
              width: 196,
              height: 196,
              animation: "punch-spin 0.9s linear infinite",
            }}
            aria-hidden
          />
        ) : null}

        {config.pulse && isTappable ? (
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              animation: "punch-breathe 2.4s ease-in-out infinite",
              background: config.background,
              opacity: 0.35,
            }}
            aria-hidden
          />
        ) : null}

        <button
          type="button"
          onClick={handleClick}
          disabled={!isTappable}
          aria-label={subtext}
          className="relative flex items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-[0.97] disabled:cursor-not-allowed"
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: config.background,
            cursor: isTappable
              ? "pointer"
              : state === "done"
                ? "default"
                : "not-allowed",
          }}
        >
          <span
            className="font-semibold leading-none text-white"
            style={{ fontSize: 32 }}
            aria-hidden
          >
            {config.icon}
          </span>
        </button>
      </div>

      <p className="max-w-[240px] text-center text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
        {subtext}
      </p>

      <style>{`
        @keyframes punch-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.15;
          }
        }
        @keyframes punch-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
