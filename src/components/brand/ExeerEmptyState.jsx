import { useTheme } from "../../providers/ThemeProvider.jsx";
import { brandAssets } from "../../assets/brandAssets.js";

/**
 * Centered empty state with subtle Exeer symbol watermark.
 */
export default function ExeerEmptyState({
  message,
  className = "",
  symbolClassName = "mb-4 h-14 w-14 object-contain opacity-[0.18]",
}) {
  const { theme } = useTheme();
  const symbolSrc =
    theme === "dark" ? brandAssets.logoSymbolLight : brandAssets.logoSymbolDark;

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-16 text-center ${className}`}
    >
      <img
        src={symbolSrc}
        alt=""
        aria-hidden
        className={symbolClassName}
      />
      {message ? (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
      ) : null}
    </div>
  );
}
