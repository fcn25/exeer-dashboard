export function formatErrorMessage(error, fallback = "تعذّر إكمال العملية.") {
  if (!error) return fallback;
  if (typeof error === "string") return error.trim() || fallback;

  if (error instanceof Error && error.message?.trim()) {
    return error.message.trim();
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error.error_description === "string" && error.error_description.trim()) {
    return error.error_description.trim();
  }

  if (typeof error.details === "string" && error.details.trim()) {
    return error.details.trim();
  }

  if (typeof error.hint === "string" && error.hint.trim()) {
    return error.hint.trim();
  }

  if (typeof error.code === "string" && error.code.trim()) {
    return error.code.trim();
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}" && serialized !== "null") {
      return serialized;
    }
  } catch {
    // ignore
  }

  return fallback;
}
