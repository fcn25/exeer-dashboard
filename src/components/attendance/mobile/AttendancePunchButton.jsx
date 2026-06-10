import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  Pause,
  ScanFace,
  ShieldCheck,
} from "lucide-react";

const STATE_CONFIG = {
  check_in: {
    background: "linear-gradient(145deg, #15803d 0%, #166534 52%, #14532d 100%)",
    bezel: "#0f3d24",
    ring: "rgba(34,197,94,0.45)",
    glowColor: "rgba(22,101,52,0.28)",
    icon: ScanFace,
    subtext: "بصمة الوجه — تسجيل الحضور",
    pulse: true,
    tappable: true,
    scanner: true,
  },
  locked: {
    background: "linear-gradient(145deg, #b91c1c 0%, #991b1b 52%, #7f1d1d 100%)",
    bezel: "#5c1212",
    ring: "rgba(248,113,113,0.35)",
    glowColor: "rgba(153,27,27,0.22)",
    icon: ShieldCheck,
    subtext: "",
    pulse: false,
    tappable: false,
    scanner: false,
  },
  check_out: {
    background: "linear-gradient(145deg, #b91c1c 0%, #991b1b 52%, #7f1d1d 100%)",
    bezel: "#5c1212",
    ring: "rgba(248,113,113,0.45)",
    glowColor: "rgba(153,27,27,0.28)",
    icon: LogOut,
    subtext: "بصمة الوجه — تسجيل الانصراف",
    pulse: true,
    tappable: true,
    scanner: true,
  },
  done: {
    background: "linear-gradient(145deg, #334155 0%, #1e293b 55%, #0f172a 100%)",
    bezel: "#0f172a",
    ring: "rgba(148,163,184,0.25)",
    glowColor: "rgba(30,41,59,0.18)",
    icon: CheckCircle2,
    subtext: "تم تسجيل الانصراف",
    pulse: false,
    tappable: false,
    scanner: false,
  },
  permission_out: {
    background: "linear-gradient(145deg, #b45309 0%, #92400e 52%, #78350f 100%)",
    bezel: "#5c2d0a",
    ring: "rgba(251,191,36,0.4)",
    glowColor: "rgba(146,64,14,0.28)",
    icon: Pause,
    subtext: "في استئذان",
    pulse: false,
    tappable: true,
    scanner: false,
  },
};

function toArabicNumerals(value) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function formatLockedCountdown(lockedUntil, now) {
  if (!lockedUntil) return "الخروج لاحقاً";

  const untilDate =
    lockedUntil instanceof Date ? lockedUntil : new Date(lockedUntil);

  const nowDate = now instanceof Date ? now : new Date(now);

  if (isNaN(untilDate.getTime())) return "الخروج لاحقاً";

  const diffMs = untilDate.getTime() - nowDate.getTime();
  if (diffMs <= 0) return "تسجيل الانصراف";

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = ["الخروج بعد"];

  if (hours > 0) {
    parts.push(`${toArabicNumerals(hours)} ساعة`);
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
  const Icon = config.icon;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (state !== "locked" || !lockedUntil) return undefined;

    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
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
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative flex items-center justify-center">
        {isProcessing ? (
          <span
            className="pointer-events-none absolute rounded-full border-[3px] border-transparent border-t-white/90 border-e-white/30"
            style={{
              width: 208,
              height: 208,
              animation: "punch-spin 0.9s linear infinite",
            }}
            aria-hidden
          />
        ) : null}

        {config.pulse && isTappable ? (
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 204,
              height: 204,
              animation: "punch-breathe 2.4s ease-in-out infinite",
              background: config.glowColor,
              borderRadius: "50%",
            }}
            aria-hidden
          />
        ) : null}

        <div
          className="relative rounded-full p-[10px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ background: config.bezel }}
        >
          <div
            className="pointer-events-none absolute inset-[10px] rounded-full border-2 border-dashed opacity-30"
            style={{ borderColor: config.ring }}
            aria-hidden
          />

          <button
            type="button"
            onClick={handleClick}
            disabled={!isTappable}
            aria-label={subtext}
            className="relative flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-full text-white transition-transform active:scale-[0.96] disabled:cursor-not-allowed"
            style={{
              background: config.background,
              boxShadow: isTappable
                ? `inset 0 2px 12px rgba(255,255,255,0.18), inset 0 -6px 16px rgba(0,0,0,0.22), 0 0 36px 6px ${config.glowColor}`
                : "inset 0 2px 8px rgba(255,255,255,0.1), inset 0 -4px 12px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.12)",
              cursor: isTappable
                ? "pointer"
                : state === "done"
                  ? "default"
                  : "not-allowed",
            }}
          >
            {config.scanner && isTappable && !isProcessing ? (
              <span
                className="pointer-events-none absolute inset-x-6 h-[2px] rounded-full bg-white/50"
                style={{ animation: "punch-scan 2.8s ease-in-out infinite" }}
                aria-hidden
              />
            ) : null}

            {isProcessing ? (
              <Loader2
                className="relative z-10 h-14 w-14 animate-spin stroke-[1.5] text-white/95"
                aria-hidden
              />
            ) : (
              <Icon
                className="relative z-10 h-[52px] w-[52px] stroke-[1.35] text-white drop-shadow-sm"
                aria-hidden
              />
            )}

            <span
              className="pointer-events-none absolute inset-[18px] rounded-full border border-white/20"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-[34px] rounded-full border border-white/10"
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="max-w-[260px] text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
          {subtext}
        </p>
        {state === "check_in" || state === "check_out" ? (
          <p className="text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]">
            اضغط لتفعيل الكاميرا والبصمة
          </p>
        ) : null}
        {state === "permission_out" ? (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            استخدم زر العودة أدناه لإنهاء الاستئذان
          </p>
        ) : null}
      </div>

      <style>{`
        @keyframes punch-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.07);
            opacity: 0.12;
          }
        }
        @keyframes punch-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes punch-scan {
          0%, 100% {
            top: 28%;
            opacity: 0.15;
          }
          50% {
            top: 68%;
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  );
}
