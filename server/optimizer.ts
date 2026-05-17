import OpenAI from "openai";
import { buildUserPrompt, OPTIMIZER_INSTRUCTIONS } from "./prompts.js";
import { OptimizeRequestSchema, OptimizeResponseSchema, type OptimizeRequest, type OptimizeResponse } from "./schema.js";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function parseOptimizeRequest(body: unknown): OptimizeRequest {
  const parsed = OptimizeRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "请求内容无效。");
  }

  return parsed.data;
}

export function parseModelJson(content: string | null | undefined): OptimizeResponse {
  if (!content?.trim()) {
    throw new AppError(502, "EMPTY_MODEL_OUTPUT", "DeepSeek 返回内容为空，请重试。");
  }

  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return normalizeOptimizationResult(JSON.parse(withoutFence));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, "BAD_MODEL_OUTPUT", "DeepSeek 返回格式不是有效 JSON，请重试。");
  }
}

export function normalizeOptimizationResult(candidate: unknown): OptimizeResponse {
  const cleanedCandidate =
    typeof candidate === "object" && candidate !== null && "followupQuestions" in candidate
      ? {
          ...candidate,
          followupQuestions: Array.isArray(candidate.followupQuestions)
            ? candidate.followupQuestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
            : []
        }
      : candidate;

  const parsed = OptimizeResponseSchema.safeParse(cleanedCandidate);

  if (!parsed.success) {
    throw new AppError(502, "BAD_MODEL_OUTPUT", "DeepSeek 返回格式不完整，请重试。");
  }

  return {
    optimizedPrompt: parsed.data.optimizedPrompt.trim(),
    briefRationale: parsed.data.briefRationale.trim(),
    followupQuestions: parsed.data.followupQuestions,
    autonomyNote: parsed.data.autonomyNote.trim()
  };
}

export function mapUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const maybeStatus = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;

  if (maybeStatus === 401) {
    return new AppError(401, "DEEPSEEK_AUTH_ERROR", "DeepSeek API key 无效或没有访问权限。");
  }

  if (maybeStatus === 402) {
    return new AppError(402, "DEEPSEEK_BALANCE_ERROR", "DeepSeek 账户余额不足，请充值后再试。");
  }

  if (maybeStatus === 429) {
    return new AppError(429, "DEEPSEEK_RATE_LIMIT", "DeepSeek API 当前限流，请稍后再试。");
  }

  if (maybeStatus && maybeStatus >= 400 && maybeStatus < 500) {
    return new AppError(maybeStatus, "DEEPSEEK_REQUEST_ERROR", "DeepSeek API 拒绝了这次请求，请检查模型、key 或输入内容。");
  }

  return new AppError(502, "DEEPSEEK_UPSTREAM_ERROR", "调用 DeepSeek API 时出错，请稍后重试。");
}

export function getDeepSeekConfig(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DEEPSEEK_API_KEY) {
    throw new AppError(500, "MISSING_DEEPSEEK_API_KEY", "缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置。");
  }

  return {
    apiKey: env.DEEPSEEK_API_KEY,
    baseURL: env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: env.DEEPSEEK_MODEL || "deepseek-v4-pro"
  };
}

export async function optimizePrompt(request: OptimizeRequest): Promise<OptimizeResponse> {
  const { apiKey, baseURL, model } = getDeepSeekConfig();
  const client = new OpenAI({ apiKey, baseURL });

  try {
    const response = (await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: OPTIMIZER_INSTRUCTIONS },
        { role: "user", content: buildUserPrompt(request) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1600,
      stream: false,
      extra_body: {
        thinking: { type: "disabled" }
      }
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
      extra_body: { thinking: { type: "disabled" } };
    })) as OpenAI.Chat.Completions.ChatCompletion;

    return parseModelJson(response.choices[0]?.message?.content);
  } catch (error) {
    throw mapUnknownError(error);
  }
}
