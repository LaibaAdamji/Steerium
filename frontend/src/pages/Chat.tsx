import { useEffect, useRef, useState } from "react";
import { chat } from "../api/client";
import type { ChatMessage } from "../api/types";
import { Button, Card, Chip, ErrorBanner, PageHeader } from "../components/ui";

const SUGGESTIONS = [
  "What should I work on next?",
  "Am I competitive for the scholarships I saved?",
  "Which of my saved programs best matches my profile?",
  "What should I improve before applying?",
];

const MODE_LABELS: Record<string, string> = {
  vector: "semantic",
  keyword: "keyword",
  none: "no docs",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await chat(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          citations: res.citations,
          retrievalMode: res.retrieval_mode,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle="Grounded in your profile, documents, goals, and saved opportunities"
      />

      {error && <ErrorBanner message={error} />}

      <Card className="flex min-h-[420px] flex-1 flex-col p-4">
        {/* Transcript */}
        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-ai border border-eucalyptus/40 bg-eucalyptus/10">
                <span className="h-2.5 w-2.5 rounded-full bg-eucalyptus" />
              </span>
              <p className="max-w-sm text-sm text-slate-ink">
                Ask anything about your career plan. Answers cite the documents they rely on.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-xs text-slate-ink transition-colors hover:border-sage hover:text-navy"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-ai rounded-br-btn bg-navy px-4 py-2.5 text-sm text-white">
                  {msg.content}
                </p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-ai rounded-bl-btn border border-eucalyptus/25 bg-eucalyptus/5 px-4 py-3">
                  <p className="label-mono mb-1.5 text-[9px] text-eucalyptus">
                    assistant
                    {msg.retrievalMode && msg.retrievalMode in MODE_LABELS
                      ? ` · ${MODE_LABELS[msg.retrievalMode]} retrieval`
                      : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-deep">
                    {msg.content}
                  </p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 border-t border-eucalyptus/20 pt-2">
                      <p className="label-mono mb-1.5 text-[9px] text-slate-ink/60">sources</p>
                      <div className="space-y-1.5">
                        {msg.citations.map((c) => (
                          <div
                            key={`${c.document_id}-${c.chunk_index}`}
                            className="rounded-btn bg-card px-2.5 py-1.5"
                          >
                            <p className="font-mono text-[10px] text-slate-ink">
                              {c.filename} · chunk {c.chunk_index}
                              {c.score !== null && c.score !== undefined
                                ? ` · ${(c.score * 100).toFixed(0)}% match`
                                : ""}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-ink/70">
                              {c.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-2 px-1 text-slate-ink">
              <span className="h-3 w-3 animate-pulse rounded-full bg-eucalyptus" />
              <span className="label-mono text-[10px]">thinking…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form
          className="mt-3 flex gap-2 border-t border-hairline pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your career question…"
            disabled={busy}
            className="input-focus flex-1 rounded-btn border border-hairline bg-card px-3 py-2.5 text-sm"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            Ask
          </Button>
        </form>
      </Card>

      <p className="mt-3 text-center text-xs text-slate-ink/60">
        <Chip>rag</Chip> answers distinguish known context from assumptions
      </p>
    </div>
  );
}
