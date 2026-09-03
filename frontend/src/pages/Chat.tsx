import { useEffect, useRef, useState } from "react";
import { FileText, Send, Sparkles } from "lucide-react";
import { chat, friendlyError } from "../api/client";
import type { ChatMessage } from "../api/types";
import { Button, ErrorBanner, PageHeader, SectionLabel } from "../components/ui";

const SUGGESTIONS = [
  "What should I work on next?",
  "Am I competitive for the scholarships I saved?",
  "Which of my saved programs best matches my profile?",
  "What should I improve before applying?",
];

const MODE_LABELS: Record<string, string> = {
  vector: "semantic retrieval",
  keyword: "keyword retrieval",
  none: "general knowledge",
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
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        eyebrow="knowledge"
        title="Steerium Intelligence"
        subtitle="Grounded in your profile, documents, goals, and saved opportunities"
        actions={
          <span className="flex h-9 w-9 items-center justify-center rounded-ai border border-eucalyptus/40 bg-eucalyptus/10">
            <Sparkles size={16} className="text-eucalyptus" />
          </span>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex min-h-[480px] flex-col rounded-card border border-hairline bg-card p-4">
        {/* Transcript */}
        <div className="flex-1 space-y-5 overflow-y-auto p-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-5 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-ai border border-eucalyptus/40 bg-eucalyptus/10">
                <Sparkles size={24} className="text-eucalyptus" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Ask anything about your career plan</p>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-ink/80">
                  Answers cite the documents they rely on — and say so when they&rsquo;re
                  reasoning from general knowledge instead.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-full border border-hairline bg-canvas px-3.5 py-1.5 text-xs text-slate-ink transition-all duration-150 hover:-translate-y-px hover:border-sage hover:text-navy"
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
                <div className="w-full max-w-[92%] rounded-ai rounded-bl-btn border border-eucalyptus/25 bg-eucalyptus/5 px-4 py-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles size={11} className="text-eucalyptus" />
                    <p className="label-mono text-[9px] text-eucalyptus">
                      answer
                      {msg.retrievalMode && msg.retrievalMode in MODE_LABELS
                        ? ` · ${MODE_LABELS[msg.retrievalMode]}`
                        : ""}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-deep">
                    {msg.content}
                  </p>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 border-t border-eucalyptus/20 pt-3">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText size={11} className="text-slate-ink/60" />
                        <p className="label-mono text-[9px] text-slate-ink/60">context used</p>
                      </div>
                      <div className="space-y-2">
                        {msg.citations.map((c) => (
                          <div
                            key={`${c.document_id}-${c.chunk_index}`}
                            className="rounded-btn border border-hairline bg-card px-3 py-2"
                          >
                            <p className="font-mono text-[10px] text-slate-ink">
                              {c.filename} · chunk {c.chunk_index}
                              {c.score !== null && c.score !== undefined
                                ? ` · ${(c.score * 100).toFixed(0)}% match`
                                : ""}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-ink/70">
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
            <div className="flex items-center gap-2 px-1 text-eucalyptus">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-eucalyptus [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-eucalyptus [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-eucalyptus [animation-delay:300ms]" />
              </span>
              <span className="label-mono text-[10px]">thinking</span>
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
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send question">
            <Send size={15} />
            Ask
          </Button>
        </form>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <SectionLabel>rag</SectionLabel>
        <p className="text-xs text-slate-ink/60">
          answers distinguish known context from assumptions
        </p>
      </div>
    </div>
  );
}
