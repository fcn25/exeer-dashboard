import logoSymbol from "../../assets/logo-symbol-light.png";
import { getAppDateLocale } from "../../i18n/formatLocale.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذّر تحميل شعار Exeer."));
    image.src = src;
  });
}

function formatWatermarkDateTime(capturedAt) {
  const locale = getAppDateLocale();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(capturedAt);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(capturedAt);
  return { dateLabel, timeLabel };
}

export async function captureVideoFrameWithWatermark(
  video,
  { branchName = "—", capturedAt = new Date() } = {},
) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("الكاميرا غير جاهزة للالتقاط.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذّر إنشاء صورة السيلفي.");

  context.drawImage(video, 0, 0, width, height);

  const logo = await loadImage(logoSymbol);
  const padding = Math.max(10, Math.round(width * 0.025));
  const boxWidth = Math.min(Math.round(width * 0.46), width - padding * 2);
  const boxHeight = Math.max(52, Math.round(height * 0.11));
  const boxX = padding;
  const boxY = height - boxHeight - padding;

  context.fillStyle = "rgba(15, 23, 42, 0.62)";
  context.beginPath();
  const radius = 8;
  context.moveTo(boxX + radius, boxY);
  context.lineTo(boxX + boxWidth - radius, boxY);
  context.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  context.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  context.quadraticCurveTo(
    boxX + boxWidth,
    boxY + boxHeight,
    boxX + boxWidth - radius,
    boxY + boxHeight,
  );
  context.lineTo(boxX + radius, boxY + boxHeight);
  context.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  context.lineTo(boxX, boxY + radius);
  context.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  context.closePath();
  context.fill();

  const logoSize = Math.round(boxHeight * 0.58);
  const textX = boxX + padding + logoSize + 8;
  const { dateLabel, timeLabel } = formatWatermarkDateTime(capturedAt);

  context.drawImage(
    logo,
    boxX + padding,
    boxY + (boxHeight - logoSize) / 2,
    logoSize,
    logoSize,
  );

  const primaryFont = Math.max(11, Math.round(boxHeight * 0.2));
  const secondaryFont = Math.max(10, Math.round(boxHeight * 0.17));

  context.fillStyle = "#ffffff";
  context.font = `600 ${primaryFont}px system-ui, sans-serif`;
  context.fillText(`${dateLabel} · ${timeLabel}`, textX, boxY + boxHeight * 0.42);

  context.font = `500 ${secondaryFont}px system-ui, sans-serif`;
  context.fillText(String(branchName ?? "—").trim() || "—", textX, boxY + boxHeight * 0.74);

  return canvas.toDataURL("image/jpeg", 0.86);
}
