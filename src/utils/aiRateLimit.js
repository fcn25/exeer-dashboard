export const RATE_LIMIT_MESSAGE =
  "لقد استنفدت رصيد المحاولات المتاحة لهذه الأداة. يرجى المحاولة لاحقاً";

export class AiRateLimitError extends Error {
  constructor(message = RATE_LIMIT_MESSAGE) {
    super(message);
    this.name = "AiRateLimitError";
    this.isRateLimit = true;
  }
}

export function isRateLimitError(error) {
  return Boolean(error?.isRateLimit || error?.name === "AiRateLimitError");
}
