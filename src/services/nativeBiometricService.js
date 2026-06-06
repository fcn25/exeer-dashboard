import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";

const BIOMETRIC_REASON = "تأكيد هويتك لتسجيل الحضور أو الانصراف";

function mapBiometricError(error) {
  if (error instanceof BiometryError) {
    if (
      error.code === BiometryErrorType.userCancel ||
      error.code === BiometryErrorType.appCancel ||
      error.code === BiometryErrorType.systemCancel
    ) {
      return "تم إلغاء المصادقة الحيوية.";
    }
    if (error.code === BiometryErrorType.biometryNotAvailable) {
      return "المصادقة الحيوية غير متاحة على هذا الجهاز.";
    }
    if (error.code === BiometryErrorType.biometryNotEnrolled) {
      return "لم يتم تسجيل بصمة أو وجه على الجهاز.";
    }
  }

  return error?.message || "فشلت المصادقة الحيوية. حاول مرة أخرى.";
}

async function ensureWebBiometrySimulation() {
  if (Capacitor.isNativePlatform()) return;

  await BiometricAuth.setBiometryType(BiometryType.faceId);
  await BiometricAuth.setBiometryIsEnrolled(true);
  await BiometricAuth.setDeviceIsSecure(true);
}

export async function authenticateWithBiometric() {
  try {
    await ensureWebBiometrySimulation();
    await BiometricAuth.authenticate({
      reason: BIOMETRIC_REASON,
      cancelTitle: "إلغاء",
      allowDeviceCredential: true,
    });
  } catch (error) {
    throw new Error(mapBiometricError(error));
  }
}

function mapGeolocationError(error) {
  const message = String(error?.message ?? "").toLowerCase();

  if (message.includes("denied") || message.includes("permission")) {
    return "يجب السماح بالوصول إلى الموقع لتسجيل الحضور.";
  }
  if (message.includes("timeout")) {
    return "انتهت مهلة تحديد الموقع. حاول مرة أخرى في مكان مكشوف.";
  }

  return error?.message || "تعذّر تحديد موقعك الحالي.";
}

export async function captureCurrentPosition() {
  try {
    const permissions = await Geolocation.requestPermissions();

    const locationGranted =
      permissions?.location === "granted" ||
      permissions?.coarseLocation === "granted";

    if (!locationGranted && Capacitor.isNativePlatform()) {
      throw new Error("يجب السماح بالوصول إلى الموقع لتسجيل الحضور.");
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });

    const { latitude, longitude, accuracy } = position.coords;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("إحداثيات الموقع غير صالحة.");
    }

    return { latitude, longitude, accuracy };
  } catch (error) {
    throw new Error(mapGeolocationError(error));
  }
}
