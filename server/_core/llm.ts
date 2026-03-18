import { ENV } from "./env";

// ── Type Definitions (OpenAI-compatible shape kept for call-site compatibility) ─

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /**
   * Model tier to use:
   * - "flash"      → gemini-2.0-flash       (default, for heavy AI tasks)
   * - "flash-lite" → gemini-2.0-flash-lite   (for simple tips/chat, ~50% cheaper)
   * - "flash-think"→ gemini-2.0-flash-thinking-exp (for complex reasoning)
   */
  model?: "flash" | "flash-lite" | "flash-think";
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ── Model Resolution ──────────────────────────────────────────────────────────

const MODEL_MAP: Record<NonNullable<InvokeParams["model"]>, string> = {
  "flash":       "gemini-2.5-flash",      // best quality/cost ratio — primary model
  "flash-lite":  "gemini-2.0-flash-lite", // ~60% cheaper for simple tips/chat
  "flash-think": "gemini-2.5-flash",      // use same model; thinking is implicit in 2.5
};

function resolveModel(tier?: InvokeParams["model"]): string {
  return MODEL_MAP[tier ?? "flash"];
}

// ── Message Normalisation ─────────────────────────────────────────────────────

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

/**
 * Convert our internal message format to the Gemini `contents` format.
 * Gemini uses role "model" instead of "assistant" and "parts" instead of "content".
 */
function toGeminiContents(messages: Message[]): { role: string; parts: any[] }[] {
  // Gemini does not support a top-level system role in `contents` —
  // system instructions are passed via `system_instruction` separately.
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      const parts = ensureArray(m.content).map((part) => {
        if (typeof part === "string") return { text: part };
        if (part.type === "text") return { text: part.text };
        if (part.type === "image_url") {
          const url = part.image_url.url;
          // Data URI → inline_data
          if (url.startsWith("data:")) {
            const [header, b64] = url.split(",");
            const mimeType = header.replace("data:", "").replace(";base64", "");
            return { inline_data: { mime_type: mimeType, data: b64 } };
          }
          // Remote URL → file_data
          return { file_data: { mime_type: "image/jpeg", file_uri: url } };
        }
        if (part.type === "file_url") {
          return { file_data: { mime_type: part.file_url.mime_type ?? "application/octet-stream", file_uri: part.file_url.url } };
        }
        return { text: String(part) };
      });
      return { role, parts };
    });
}

function extractSystemInstruction(messages: Message[]): string | undefined {
  const sys = messages.find((m) => m.role === "system");
  if (!sys) return undefined;
  const parts = ensureArray(sys.content);
  return parts.map((p) => (typeof p === "string" ? p : (p as TextContent).text ?? "")).join("\n");
}

// ── Gemini File API (Resumable Upload) ────────────────────────────────────────

/**
 * Upload a video to the Gemini File API using resumable upload.
 * Returns a file URI that can be referenced in generateContent calls.
 * This avoids sending large base64 payloads in the request body.
 */
export async function uploadVideoToGeminiFileAPI(
  videoBuffer: Buffer,
  mimeType: string = "video/mp4",
  displayName: string = "exercise-form-video",
): Promise<{ fileUri: string; mimeType: string }> {
  const geminiKey = resolveGeminiApiKey();
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is required for video file upload");
  }

  // Step 1: Initiate resumable upload
  const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`;
  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(videoBuffer.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });

  if (!initResponse.ok) {
    const errText = await initResponse.text().catch(() => "");
    throw new Error(`Gemini File API init failed: ${initResponse.status} – ${errText}`);
  }

  const uploadUrl = initResponse.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) {
    throw new Error("Gemini File API did not return an upload URL");
  }

  // Step 2: Upload the actual bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(videoBuffer.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(videoBuffer) as any,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text().catch(() => "");
    throw new Error(`Gemini File API upload failed: ${uploadResponse.status} – ${errText}`);
  }

  const result = (await uploadResponse.json()) as any;
  const fileUri = result.file?.uri;
  if (!fileUri) {
    throw new Error("Gemini File API did not return a file URI");
  }

  // Step 3: Poll until file is ACTIVE (processing may take a few seconds for video)
  const fileName = result.file?.name;
  if (fileName) {
    const maxWait = 60_000; // 60 seconds max
    const pollInterval = 3_000; // 3 seconds
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`;
      const statusRes = await fetch(statusUrl);
      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as any;
        if (statusData.state === "ACTIVE") break;
        if (statusData.state === "FAILED") {
          throw new Error(`Gemini file processing failed: ${statusData.error?.message ?? "unknown"}`);
        }
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
  }

  return { fileUri, mimeType };
}

// ── Gemini API Call ───────────────────────────────────────────────────────────

function resolveGeminiApiKey(): string {
  const key = (ENV as any).geminiApiKey ?? process.env.GEMINI_API_KEY;
  if (!key) {
    // Fallback to Forge proxy if no Gemini key is set
    return "";
  }
  return key;
}

function resolveForgeApiKey(): string {
  return (ENV as any).forgeApiKey ?? process.env.OPENAI_API_KEY ?? "";
}

/**
 * Call the Google Gemini API directly.
 * Falls back to the Manus Forge proxy (OpenAI-compatible) if GEMINI_API_KEY is not set.
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const geminiKey = resolveGeminiApiKey();
  const modelName = resolveModel(params.model);

  // ── Gemini native path ────────────────────────────────────────────────────
  if (geminiKey) {
    const systemInstruction = extractSystemInstruction(params.messages);
    const contents = toGeminiContents(params.messages);

    const wantJson =
      params.response_format?.type === "json_object" ||
      params.responseFormat?.type === "json_object" ||
      params.response_format?.type === "json_schema" ||
      params.responseFormat?.type === "json_schema";

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: params.maxTokens ?? params.max_tokens ?? 8192,
    };
    if (wantJson) {
      generationConfig.responseMimeType = "application/json";
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig,
    };

    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} – ${errorText}`);
    }

    const raw = (await response.json()) as any;

    // Normalise Gemini response → OpenAI-compatible InvokeResult
    const candidate = raw.candidates?.[0];
    const textContent = candidate?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

    return {
      id: raw.usageMetadata?.candidatesTokenCount ? `gemini-${Date.now()}` : `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: textContent,
          },
          finish_reason: candidate?.finishReason ?? "stop",
        },
      ],
      usage: raw.usageMetadata
        ? {
            prompt_tokens: raw.usageMetadata.promptTokenCount ?? 0,
            completion_tokens: raw.usageMetadata.candidatesTokenCount ?? 0,
            total_tokens: raw.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  // ── Forge proxy fallback (OpenAI-compatible) ──────────────────────────────
  const forgeKey = resolveForgeApiKey();
  if (!forgeKey) {
    throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY (Forge) is configured");
  }

  const forgeUrl = (ENV as any).forgeApiUrl
    ? `${(ENV as any).forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

  const normalizeContentPart = (part: MessageContent): TextContent | ImageContent | FileContent => {
    if (typeof part === "string") return { type: "text", text: part };
    return part as TextContent | ImageContent | FileContent;
  };

  const normalizeMsg = (m: Message) => {
    const parts = ensureArray(m.content).map(normalizeContentPart);
    if (parts.length === 1 && parts[0].type === "text") {
      return { role: m.role, content: (parts[0] as TextContent).text };
    }
    return { role: m.role, content: parts };
  };

  const wantJson =
    params.response_format?.type === "json_object" ||
    params.responseFormat?.type === "json_object";

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: params.messages.map(normalizeMsg),
    max_tokens: params.maxTokens ?? params.max_tokens ?? 8192,
  };
  if (wantJson) payload.response_format = { type: "json_object" };

  const res = await fetch(forgeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${forgeKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Forge LLM error: ${res.status} ${res.statusText} – ${errorText}`);
  }

  return (await res.json()) as InvokeResult;
}
