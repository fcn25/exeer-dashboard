import { evaluationTemplatesSeedBatch1 } from "./evaluationTemplatesSeedBatch1.js";
import { evaluationTemplatesSeedBatch2 } from "./evaluationTemplatesSeedBatch2.js";

export { evaluationTemplatesSeedBatch1, evaluationTemplatesSeedBatch2 };

/** All 17 evaluation templates (10 + 7). */
export const evaluationTemplatesSeed = [
  ...evaluationTemplatesSeedBatch1,
  ...evaluationTemplatesSeedBatch2,
];
