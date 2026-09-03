import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Trash2, UploadCloud } from "lucide-react";
import { deleteDocument, friendlyError, getDocument, listDocuments, uploadDocument } from "../api/client";
import type { DocumentDetail, DocumentItem } from "../api/types";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  SkeletonCard,
  formatDate,
} from "../components/ui";

const DOC_TYPES = ["resume", "transcript", "other"] as const;

const PIPELINE_STEPS = ["uploading", "parsing", "indexing", "ready"] as const;
type PipelineStep = (typeof PIPELINE_STEPS)[number];

/** Visual pipeline for an in-flight upload — extraction + embedding happen server-side. */
function PipelineIndicator({ step }: { step: PipelineStep }) {
  return (
    <div className="mt-4 grid w-full max-w-sm grid-cols-4 gap-2">
      {PIPELINE_STEPS.map((s) => {
        const active = PIPELINE_STEPS.indexOf(step) >= PIPELINE_STEPS.indexOf(s);
        const current = step === s;
        return (
          <div key={s} className="flex flex-col items-center gap-1.5">
            <span
              className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                active ? (current ? "bg-sage" : "bg-moss") : "bg-hairline"
              }`}
            />
            <span
              className={`font-mono text-[9px] uppercase tracking-wide transition-colors duration-300 ${
                current ? "text-sage-dim" : active ? "text-slate-ink/60" : "text-slate-ink/40"
              }`}
            >
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState<string>("resume");
  const [uploading, setUploading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Detail modal
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cycle the pipeline labels while the request is in flight.
  useEffect(() => {
    if (!uploading) return;
    setPipelineStep("uploading");
    const t1 = setTimeout(() => setPipelineStep("parsing"), 900);
    const t2 = setTimeout(() => setPipelineStep("indexing"), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [uploading]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || uploading) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "txt", "md"].includes(ext)) {
        setError("Only .pdf, .txt, and .md files are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("That file is over the 10 MB limit.");
        return;
      }

      setUploading(true);
      setError("");
      try {
        const result = await uploadDocument(file, docType);
        setPipelineStep("ready");
        toast(
          result.embedded
            ? `“${result.filename}” parsed into ${result.chunk_count} chunks and embedded for semantic search.`
            : `“${result.filename}” parsed into ${result.chunk_count} chunks — keyword search only (no embedding key).`,
        );
        if (fileInput.current) fileInput.current.value = "";
        await load();
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setUploading(false);
        setTimeout(() => setPipelineStep(null), 1200);
      }
    },
    [docType, load, toast, uploading],
  );

  async function openDetail(doc: DocumentItem) {
    setDetailLoading(true);
    setDetail({
      ...doc,
      extracted_text: null,
      chunk_count: 0,
      embedded: false,
    });
    try {
      setDetail(await getDocument(doc.id));
    } catch (err) {
      setError(friendlyError(err));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(doc: DocumentItem) {
    try {
      await deleteDocument(doc.id);
      setDetail(null);
      toast(`Deleted “${doc.filename}”.`);
      await load();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="knowledge"
        title="Documents"
        subtitle="Resumes and transcripts feed the AI assistant's grounded answers"
      />

      {error && <ErrorBanner message={error} />}

      {/* Upload zone */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <p className="label-mono text-[10px] text-slate-ink">document type</p>
          <div className="flex gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDocType(t)}
                className={`rounded-btn border px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors ${
                  docType === t
                    ? "border-sage bg-sage/15 text-sage-dim"
                    : "border-hairline bg-card text-slate-ink hover:border-sage"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a document"
          onClick={() => !uploading && fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
            uploading
              ? "cursor-wait border-hairline bg-card"
              : dragActive
                ? "-translate-y-0.5 border-sage bg-sage/5 shadow-focus"
                : "border-hairline bg-card hover:border-sage hover:shadow-focus"
          }`}
        >
          <span
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              uploading ? "bg-sage/20 text-sage-dim" : "bg-sage/10 text-sage-dim"
            }`}
          >
            {uploading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-sage/30 border-t-sage-dim" />
            ) : (
              <UploadCloud size={22} />
            )}
          </span>

          {uploading && pipelineStep ? (
            <>
              <p className="text-sm font-semibold text-navy">
                {pipelineStep === "uploading" && "Uploading file…"}
                {pipelineStep === "parsing" && "Parsing text…"}
                {pipelineStep === "indexing" && "Indexing into RAG store…"}
                {pipelineStep === "ready" && "Ready"}
              </p>
              <PipelineIndicator step={pipelineStep} />
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-navy">
                Drop your {docType} here — or click to browse
              </p>
              <p className="mt-1.5 text-xs text-slate-ink/70">
                PDF text is extracted and chunked into the pgvector index · max 10 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.txt,.md"
          disabled={uploading}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* List */}
      {!documents ? (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No documents uploaded"
          hint="Upload your resume so the assistant can ground answers in your actual experience."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-separator">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas"
                onClick={() => openDetail(doc)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-canvas font-mono text-[10px] uppercase text-slate-ink">
                  {doc.filename.split(".").pop()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{doc.filename}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Chip>{doc.document_type}</Chip>
                    <span className="font-mono text-[10px] text-slate-ink/60">
                      {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                </div>
                <span className="label-mono shrink-0 text-[9px] text-sage-dim">view pipeline →</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Detail modal */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.filename ?? "Document"}
        footer={
          <>
            <Button variant="danger" onClick={() => detail && handleDelete(detail)}>
              <Trash2 size={14} />
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Close
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{detail.document_type}</Chip>
              <span className="font-mono text-[10px] text-slate-ink/60">
                uploaded {formatDate(detail.uploaded_at)}
              </span>
            </div>

            {/* RAG pipeline badges */}
            <div className="rounded-card border border-hairline bg-canvas p-4">
              <p className="label-mono mb-3 text-[9px] text-slate-ink">rag pipeline</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-ink">Parsed</span>
                  {detailLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-hairline border-t-sage" />
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-sage-dim">
                      <CheckCircle2 size={12} />
                      {detail.chunk_count} chunks
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-ink">Embedded (semantic search)</span>
                  {detailLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-hairline border-t-sage" />
                  ) : detail.embedded ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-sage-dim">
                      <CheckCircle2 size={12} />
                      pgvector
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-ink/60">
                      keyword fallback
                    </span>
                  )}
                </div>
              </div>
            </div>

            {detail.extracted_text && (
              <Field label="Extracted text (preview)">
                <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-btn border border-hairline bg-canvas px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-ink">
                  {detail.extracted_text.slice(0, 1500)}
                  {detail.extracted_text.length > 1500 ? "\n…" : ""}
                </pre>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
