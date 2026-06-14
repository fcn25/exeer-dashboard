export const TASK_ATTACHMENT_MAX_BYTES = 1048576;

export const TASK_ATTACHMENT_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export function isAllowedTaskAttachmentType(file) {
  if (!file) return false;
  const type = String(file.type ?? "").toLowerCase();
  if (TASK_ATTACHMENT_ALLOWED_MIME.includes(type)) return true;
  return /\.(jpe?g|png|webp|gif|pdf)$/i.test(String(file.name ?? ""));
}

export function isCompressibleTaskImage(file) {
  if (!file) return false;
  const type = String(file.type ?? "").toLowerCase();
  if (type.startsWith("image/") && type !== "image/svg+xml") return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(String(file.name ?? ""));
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function renderScaledJpeg(img, maxDim, quality) {
  const canvas = document.createElement("canvas");
  const longest = Math.max(img.width, img.height, 1);
  const scale = Math.min(1, maxDim / longest);
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToJpegBlob(canvas, quality);
}

async function compressImageFile(file, maxBytes) {
  const img = await loadImageFromFile(file);
  let maxDim = 2048;
  let quality = 0.88;
  let lastBlob = null;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const blob = await renderScaledJpeg(img, maxDim, quality);
    if (!blob) break;
    lastBlob = blob;
    if (blob.size <= maxBytes) {
      const baseName = String(file.name ?? "attachment").replace(/\.[^.]+$/, "") || "attachment";
      return new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    if (quality > 0.42) {
      quality -= 0.08;
    } else {
      maxDim = Math.round(maxDim * 0.72);
      quality = 0.84;
    }
  }

  if (lastBlob && lastBlob.size <= maxBytes) {
    const baseName = String(file.name ?? "attachment").replace(/\.[^.]+$/, "") || "attachment";
    return new File([lastBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  return null;
}

/**
 * Validates type/size and compresses large images client-side before upload.
 */
export async function prepareTaskAttachment(file) {
  if (!file) throw new Error("لم يُحدَّد ملف.");

  if (!isAllowedTaskAttachmentType(file)) {
    throw new Error("يُسمح برفع صور (JPEG, PNG, WebP, GIF) أو PDF فقط.");
  }

  if (file.size <= TASK_ATTACHMENT_MAX_BYTES) {
    return file;
  }

  if (isCompressibleTaskImage(file)) {
    const compressed = await compressImageFile(file, TASK_ATTACHMENT_MAX_BYTES);
    if (compressed) return compressed;
    throw new Error("تعذّر ضغط الصورة تحت 1 ميجابايت. جرّب صورة أصغر.");
  }

  throw new Error("الحد الأقصى 1 ميجابايت.");
}

export function formatAttachmentSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
