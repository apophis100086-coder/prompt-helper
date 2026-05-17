import { z } from "zod";

export const OptimizeRequestSchema = z.object({
  rawQuestion: z
    .string()
    .trim()
    .min(1, "请输入你的原始问题。")
    .max(8000, "原始问题过长，请先压缩到 8000 字以内。"),
  context: z.string().trim().max(6000, "背景信息过长，请先压缩到 6000 字以内。").optional().default(""),
  targetAi: z.string().trim().max(80, "目标 AI 名称过长。").optional().default("通用 AI"),
  language: z.string().trim().max(40, "输出语言描述过长。").optional().default("跟随输入语言"),
  askFollowupsFirst: z.boolean().optional().default(false)
});

export const OptimizeResponseSchema = z.object({
  optimizedPrompt: z.string().min(1),
  briefRationale: z.string().min(1),
  followupQuestions: z.array(z.string().min(1)),
  autonomyNote: z.string().min(1)
});

export type OptimizeRequest = z.infer<typeof OptimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof OptimizeResponseSchema>;
