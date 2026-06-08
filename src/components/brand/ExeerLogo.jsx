import { useTheme } from "../../providers/ThemeProvider.jsx";
import { brandAssets } from "../../assets/brandAssets.js";

/**
 * Full Exeer wordmark — dark logo on light UI, light logo in dark mode.
 * @param {{ collapsed?: boolean, className?: string, symbolClassName?: string, onLightBackground?: boolean }} props
 */
export default function ExeerLogo({
  collapsed = false,
  className = "h-10 w-auto object-contain",
  symbolClassName = "h-9 w-9 object-contain",
}) {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  const fullSrc = isDarkTheme ? brandAssets.logoLight : brandAssets.logoDark;
  const symbolSrc = isDarkTheme
    ? brandAssets.logoSymbolLight
    : brandAssets.logoSymbolDark;

  if (collapsed) {
    return (
      <img
        src={symbolSrc}
        alt="Exeer"
        className={symbolClassName}
      />
    );
  }

  return (
    <img
      src={fullSrc}
      alt="Exeer"
      className={className}
    />
  );
}
