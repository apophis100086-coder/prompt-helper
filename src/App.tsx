import { AlertTriangle, Check, Clipboard, Copy, HelpCircle, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { optimizePrompt } from "./api";
import type { HistoryItem, OptimizeRequest, OptimizeResponse } from "./types";

const HISTORY_KEY = "prompt-helper-history";

const initialRequest: OptimizeRequest = {
  rawQuestion: "",
  context: "",
  targetAi: "ChatGPT / 通用 AI",
  language: "跟随输入语言",
  askFollowupsFirst: false
};

function readHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function App() {
  const [request, setRequest] = useState<OptimizeRequest>(initialRequest);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const canSubmit = useMemo(() => request.rawQuestion.trim().length > 0 && !loading, [loading, request.rawQuestion]);

  function updateField<Key extends keyof OptimizeRequest>(key: Key, value: OptimizeRequest[Key]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopied(false);

    if (!request.rawQuestion.trim()) {
      setError("请输入你的原始问题。");
      return;
    }

    setLoading(true);
    try {
      const nextResult = await optimizePrompt(request);
      setResult(nextResult);

      const item: HistoryItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        request,
        result: nextResult
      };
      const nextHistory = [item, ...history].slice(0, 8);
      setHistory(nextHistory);
      saveHistory(nextHistory);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.optimizedPrompt) {
      return;
    }

    await navigator.clipboard.writeText(result.optimizedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function restoreHistory(item: HistoryItem) {
    setRequest(item.request);
    setResult(item.result);
    setError("");
    setCopied(false);
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="高效提示词助手">
        <form className="panel input-panel" onSubmit={handleSubmit}>
          <div className="panel-title">
            <Sparkles size={20} aria-hidden="true" />
            <h1>高效提示词助手</h1>
          </div>

          <label className="field">
            <span>原始问题</span>
            <textarea
              value={request.rawQuestion}
              onChange={(event) => updateField("rawQuestion", event.target.value)}
              placeholder="例如：帮我规划学习英语"
              rows={9}
            />
          </label>

          <label className="field">
            <span>补充背景</span>
            <textarea
              value={request.context}
              onChange={(event) => updateField("context", event.target.value)}
              placeholder="目标、受众、限制、已有资料"
              rows={5}
            />
          </label>

          <div className="compact-grid">
            <label className="field">
              <span>目标 AI</span>
              <input
                value={request.targetAi}
                onChange={(event) => updateField("targetAi", event.target.value)}
                placeholder="ChatGPT / Claude / 通用 AI"
              />
            </label>

            <label className="field">
              <span>输出语言</span>
              <input
                value={request.language}
                onChange={(event) => updateField("language", event.target.value)}
                placeholder="跟随输入语言"
              />
            </label>
          </div>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={request.askFollowupsFirst}
              onChange={(event) => updateField("askFollowupsFirst", event.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
            <span>先追问</span>
          </label>

          {error ? (
            <div className="status error" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <button className="primary-button" type="submit" disabled={!canSubmit} title="生成优化提示词">
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            <span>{loading ? "生成中" : "生成"}</span>
          </button>
        </form>

        <section className="panel output-panel" aria-label="生成结果">
          <div className="output-header">
            <div className="panel-title">
              <Clipboard size={20} aria-hidden="true" />
              <h2>结果</h2>
            </div>
            <button className="icon-button" type="button" onClick={handleCopy} disabled={!result} title="复制提示词">
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              <span>{copied ? "已复制" : "复制"}</span>
            </button>
          </div>

          {result ? (
            <div className="result-stack">
              <section className="result-block prompt-block">
                <h3>可复制提示词</h3>
                <pre>{result.optimizedPrompt}</pre>
              </section>

              <section className="result-block">
                <h3>简析</h3>
                <p>{result.briefRationale}</p>
              </section>

              <section className="result-block">
                <h3>追问</h3>
                {result.followupQuestions.length ? (
                  <ol className="question-list">
                    {result.followupQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ol>
                ) : (
                  <p>暂无必要追问。</p>
                )}
              </section>

              <section className="result-block">
                <h3>自主空间</h3>
                <p>{result.autonomyNote}</p>
              </section>
            </div>
          ) : (
            <div className="empty-state">
              <HelpCircle size={32} aria-hidden="true" />
              <p>输入问题后生成结果。</p>
            </div>
          )}
        </section>
      </section>

      <aside className="history-panel" aria-label="历史记录">
        <div className="history-header">
          <h2>历史</h2>
          <button className="icon-button subtle" type="button" onClick={clearHistory} disabled={!history.length} title="清空历史">
            <Trash2 size={17} aria-hidden="true" />
            <span>清空</span>
          </button>
        </div>

        <div className="history-list">
          {history.length ? (
            history.map((item) => (
              <button className="history-item" key={item.id} type="button" onClick={() => restoreHistory(item)}>
                <span>{formatTime(item.createdAt)}</span>
                <strong>{item.request.rawQuestion}</strong>
              </button>
            ))
          ) : (
            <p className="history-empty">暂无历史。</p>
          )}
        </div>
      </aside>
    </main>
  );
}
