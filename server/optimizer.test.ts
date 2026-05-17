import { describe, expect, it } from "vitest";
import {
  AppError,
  getDeepSeekConfig,
  mapUnknownError,
  normalizeOptimizationResult,
  parseModelJson,
  parseOptimizeRequest
} from "./optimizer.js";

describe("parseOptimizeRequest", () => {
  it("trims and defaults request fields", () => {
    const request = parseOptimizeRequest({
      rawQuestion: "  帮我规划学习英语  ",
      askFollowupsFirst: true
    });

    expect(request.rawQuestion).toBe("帮我规划学习英语");
    expect(request.context).toBe("");
    expect(request.targetAi).toBe("通用 AI");
    expect(request.language).toBe("跟随输入语言");
    expect(request.askFollowupsFirst).toBe(true);
  });

  it("rejects empty raw questions", () => {
    expect(() => parseOptimizeRequest({ rawQuestion: "   " })).toThrow(AppError);
  });
});

describe("normalizeOptimizationResult", () => {
  it("normalizes model output and caps followups", () => {
    const result = normalizeOptimizationResult({
      optimizedPrompt: "  请帮我制定英语学习计划  ",
      briefRationale: "  更明确目标和交付物。  ",
      followupQuestions: ["  当前水平？  ", "", "每天多久？", "考试目标？", "偏好？"],
      autonomyNote: "  允许 AI 主动建议更优路径。  "
    });

    expect(result.optimizedPrompt).toBe("请帮我制定英语学习计划");
    expect(result.followupQuestions).toEqual(["当前水平？", "每天多久？", "考试目标？"]);
  });

  it("rejects incomplete model output", () => {
    expect(() => normalizeOptimizationResult({ optimizedPrompt: "x" })).toThrow(AppError);
  });
});

describe("parseModelJson", () => {
  it("parses valid JSON content", () => {
    const result = parseModelJson(
      JSON.stringify({
        optimizedPrompt: "请帮我制定英语学习计划",
        briefRationale: "更明确目标和交付物。",
        followupQuestions: [],
        autonomyNote: "允许 AI 主动建议更优路径。"
      })
    );

    expect(result.optimizedPrompt).toBe("请帮我制定英语学习计划");
  });

  it("rejects invalid JSON content", () => {
    expect(() => parseModelJson("not json")).toThrow("有效 JSON");
  });
});

describe("error handling", () => {
  it("maps missing DeepSeek key", () => {
    expect(() => getDeepSeekConfig({})).toThrow("缺少 DEEPSEEK_API_KEY");
  });

  it("returns DeepSeek defaults", () => {
    const config = getDeepSeekConfig({ DEEPSEEK_API_KEY: "test-key" });
    expect(config.baseURL).toBe("https://api.deepseek.com");
    expect(config.model).toBe("deepseek-v4-pro");
  });

  it("maps rate limit errors", () => {
    const error = mapUnknownError({ status: 429 });
    expect(error.status).toBe(429);
    expect(error.code).toBe("DEEPSEEK_RATE_LIMIT");
  });
});
