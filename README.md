# 高效提示词助手

一个本地网页 App，用 DeepSeek V4 把原始问题改写成 AI 更容易充分理解、同时保留自主发挥空间的高质量提示词。

## 启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

把 `.env.local` 里的 `DEEPSEEK_API_KEY` 改成你自己的 DeepSeek API key，然后打开 Vite 输出的本地地址，通常是 `http://127.0.0.1:5173`。

## 环境变量

复制 `.env.example` 为 `.env.local`，并填写自己的 key：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
PORT=8787
```

`.env.local` 已被 `.gitignore` 忽略。默认使用 `deepseek-v4-pro`；如果想降低成本或提高速度，可以把 `DEEPSEEK_MODEL` 改为 `deepseek-v4-flash`。

不要把 `.env.local` 或任何真实 API key 提交到 GitHub。项目使用 OpenAI 官方 SDK 作为兼容协议客户端，但请求会发往 `DEEPSEEK_BASE_URL` 指定的 DeepSeek API。

## 使用

输入原始问题，可补充背景、目标 AI 和输出语言。默认直接生成可复制提示词、简析和自主空间说明；复杂场景可勾选“先追问”，让工具优先返回 1-3 个关键补充问题。

## 常用命令

```bash
npm run test
npm run typecheck
npm run build
```
