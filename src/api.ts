import type { OptimizeRequest, OptimizeResponse } from "./types";

export async function optimizePrompt(payload: OptimizeRequest): Promise<OptimizeResponse> {
  const response = await fetch("/api/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message ?? "生成失败，请稍后重试。";
    throw new Error(message);
  }

  return response.json();
}
