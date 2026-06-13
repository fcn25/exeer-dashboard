import { GoogleGenAI, Type } from "npm:@google/genai@1";
import { GEMINI_TOOL_DECLARATIONS } from "./readTools.ts";

const SYSTEM_PROMPT = `أنت موجّه استعلامات فقط لنظام Exeer HR.
اختر أداة واحدة من الكatalog لإجابة استفسار المستخدم.
- استخدم أدوات q_* للاستفسارات والقراءة فقط.
- إذا طلب المستخدم تنفيذاً أو تعديلاً أو إضافة أو حذف، استدعِ unsupported_request مع reason=write.
- إذا كان السؤال غير واضح، استدعِ unsupported_request مع reason=unclear.
- لا تكتب SQL أبداً.`;

function toGenAiSchema(params: Record<string, unknown>) {
  const properties = params.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return { type: Type.OBJECT, properties: {} };

  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const prop = { ...value };
    if (prop.type === "integer") prop.type = Type.INTEGER;
    else if (prop.type === "string") prop.type = Type.STRING;
    mapped[key] = prop;
  }

  return {
    type: Type.OBJECT,
    properties: mapped,
    required: params.required ?? undefined,
  };
}

export type GeminiToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export async function selectReadTool(
  query: string,
  apiKey: string,
  modelName: string,
): Promise<GeminiToolCall | null> {
  const ai = new GoogleGenAI({ apiKey });

  const functionDeclarations = GEMINI_TOOL_DECLARATIONS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: toGenAiSchema(tool.parameters as Record<string, unknown>),
  }));

  const response = await ai.models.generateContent({
    model: modelName,
    contents: query,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations }],
      toolConfig: { functionCallingConfig: { mode: "ANY" } },
    },
  });

  const calls = response.functionCalls ?? [];
  if (!calls.length) return null;

  const first = calls[0];
  return {
    name: String(first.name ?? ""),
    args: (first.args ?? {}) as Record<string, unknown>,
  };
}
