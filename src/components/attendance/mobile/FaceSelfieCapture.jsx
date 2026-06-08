import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function drawVideoFrameToCanvas(video, canvas) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function FaceSelfieCapture({
  title,
  subtitle,
  confirmLabel = "تأكيد الصورة",
  retakeLabel = "إعادة الالتقاط",
  onConfirm,
  onCancel,
  isSaving = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isStartingCamera, setIsStartingCamera] = useState(true);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setIsStartingCamera(true);
    setPreviewDataUrl("");

    stopStream(streamRef.current);
    streamRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("الكاميرا غير مدعومة على هذا الجهاز.");
      setIsStartingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        throw new Error("تعذّر تهيئة معاينة الكاميرا.");
      }

      video.srcObject = stream;
      await video.play();
    } catch (error) {
      const message = String(error?.message ?? "").toLowerCase();
      if (message.includes("denied") || message.includes("permission")) {
        setCameraError("يجب السماح بالوصول إلى الكاميرا الأمامية.");
      } else {
        setCameraError(error?.message || "تعذّر فتح الكاميرا.");
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [startCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const dataUrl = drawVideoFrameToCanvas(video, canvas);
    if (!dataUrl) {
      setCameraError("تعذّر التقاط الصورة. حاول مرة أخرى.");
      return;
    }

    stopStream(streamRef.current);
    streamRef.current = null;
    setPreviewDataUrl(dataUrl);
    setCameraError("");
  };

  const handleRetake = async () => {
    setPreviewDataUrl("");
    await startCamera();
  };

  const handleConfirm = () => {
    if (!previewDataUrl || isSaving) return;
    onConfirm?.(previewDataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover dark:border-[var(--border-color)]"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-exeer-border bg-black dark:border-[var(--border-color)]">
        {previewDataUrl ? (
          <img
            src={previewDataUrl}
            alt="معاينة سيلفي الوجه"
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="aspect-[3/4] w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {isStartingCamera ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2
                  className="h-8 w-8 animate-spin text-white"
                  aria-hidden
                />
              </div>
            ) : null}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      {cameraError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {cameraError}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-exeer-muted dark:text-[var(--text-secondary)]">
        يُلتقط السيلفي مباشرة من الكاميرا الأمامية — لا يمكن الرفع من الاستديو أو المعرض.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {previewDataUrl ? (
          <>
            <button
              type="button"
              onClick={handleRetake}
              disabled={isSaving}
              className="md-btn-tonal inline-flex w-full items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {retakeLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="md-btn-primary w-full"
            >
              {isSaving ? "جاري الحفظ..." : confirmLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={isStartingCamera || Boolean(cameraError)}
            className="md-btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" aria-hidden />
            التقاط سيلفي الوجه
          </button>
        )}
      </div>
    </div>
  );
}
