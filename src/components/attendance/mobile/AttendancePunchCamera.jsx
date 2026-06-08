import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { captureVideoFrameWithWatermark } from "../../../utils/attendance/selfieWatermark.js";

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

export default function AttendancePunchCamera({
  isOpen,
  branchName = "—",
  onCapture,
  onClose,
  isProcessing = false,
  autoCaptureDelayMs = 1400,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const capturedRef = useRef(false);

  const [cameraError, setCameraError] = useState("");
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [statusText, setStatusText] = useState("");

  const startCamera = useCallback(async () => {
    setCameraError("");
    setIsStartingCamera(true);
    setStatusText("جاري تشغيل الكاميرا...");
    capturedRef.current = false;

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
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        throw new Error("تعذّر تهيئة الكاميرا.");
      }

      video.srcObject = stream;
      await video.play();
      setStatusText("ثبّت وجهك أمام الكاميرا...");
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

  const captureAndSubmit = useCallback(async () => {
    if (capturedRef.current || isProcessing) return;

    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    capturedRef.current = true;
    setStatusText("جاري التقاط الصورة...");

    try {
      const dataUrl = await captureVideoFrameWithWatermark(video, {
        branchName,
        capturedAt: new Date(),
      });
      stopStream(streamRef.current);
      streamRef.current = null;
      await onCapture?.(dataUrl);
    } catch (error) {
      capturedRef.current = false;
      setCameraError(error.message || "تعذّر التقاط السيلفي.");
      setStatusText("");
      await startCamera();
    }
  }, [branchName, isProcessing, onCapture, startCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopStream(streamRef.current);
      streamRef.current = null;
      capturedRef.current = false;
      setCameraError("");
      setStatusText("");
      return undefined;
    }

    startCamera();
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [isOpen, startCamera]);

  useEffect(() => {
    if (!isOpen || isStartingCamera || cameraError || isProcessing) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    let cancelled = false;
    let delayTimer = null;

    const scheduleCapture = () => {
      if (cancelled || capturedRef.current || !video.videoWidth) return;
      delayTimer = window.setTimeout(() => {
        if (!cancelled) captureAndSubmit();
      }, autoCaptureDelayMs);
    };

    if (video.readyState >= 2 && video.videoWidth) {
      scheduleCapture();
    } else {
      video.addEventListener("loadeddata", scheduleCapture, { once: true });
    }

    return () => {
      cancelled = true;
      if (delayTimer) window.clearTimeout(delayTimer);
      video.removeEventListener("loadeddata", scheduleCapture);
    };
  }, [
    autoCaptureDelayMs,
    cameraError,
    captureAndSubmit,
    isOpen,
    isProcessing,
    isStartingCamera,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="كاميرا تسجيل الحضور"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-4">
        <p className="text-center text-sm font-medium text-white">{statusText}</p>
      </div>

      {(isStartingCamera || isProcessing) && !cameraError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden />
        </div>
      ) : null}

      {cameraError ? (
        <div className="absolute inset-x-4 bottom-24 rounded-xl bg-red-950/85 px-4 py-3 text-center text-sm text-red-100">
          {cameraError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm disabled:opacity-50"
        aria-label="إغلاق"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
