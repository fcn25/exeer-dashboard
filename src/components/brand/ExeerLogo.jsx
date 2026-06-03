import { useTheme } from "../../providers/ThemeProvider.jsx";
import { brandAssets } from "../../assets/brandAssets.js";

/**
 * Full Exeer wordmark — dark variant on light UI, light variant in dark mode.
 * @param {{ collapsed?: boolean, className?: string, symbolClassName?: string, onLightBackground?: boolean }} props
 */
export default function ExeerLogo({
  collapsed = false,
  className = "h-10 w-auto object-contain",
  symbolClassName = "h-9 w-9 object-contain",
  onLightBackground = false,
}) {
  const { theme } = useTheme();
  const useLightBackgroundAssets = onLightBackground || theme !== "dark";

  const fullSrc = useLightBackgroundAssets
    ? brandAssets.logoDark
    : brandAssets.logoLight;
  const symbolSrc = useLightBackgroundAssets
    ? brandAssets.logoSymbolDark
    : brandAssets.logoSymbolLight;

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
