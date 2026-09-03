import { useCallback, useEffect, useRef, useState } from "react";
import { deleteDocument, listDocuments, uploadDocument } from "../api/client";
import type { DocumentItem } from "../api/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
  formatDate,
} from "../components/ui";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("resume");
  const [lastResult, setLastResult] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a file first (.pdf, .txt, .md)");
      return;
    }
    setUploading(true);
    setError("");
    setLastResult("");
    try {
      const detail = await uploadDocument(file, docType);
      setLastResult(
        `Extracted ${detail.chunk_count} chunk${detail.chunk_count === 1 ? "" : "s"} from “${detail.filename}”` +
          (detail.embedded ? " — embedded for semantic search" : " — keyword search only (no API key)"),
      );
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await deleteDocument(doc.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Resumes and transcripts feed the AI assistant's grounded answers"
      />

      {error && <ErrorBanner message={error} />}
      {lastResult && (
        <div className="mb-6 rounded-ai border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage-dim">
          {lastResult}
        </div>
      )}

      {/* Upload */}
      <Card className="mb-6 p-5">
        <p className="label-mono mb-4 text-slate-ink">upload document</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md"
            disabled={uploading}
            className="input-focus w-full max-w-sm rounded-btn border border-hairline bg-card px-3 py-2 text-sm text-slate-ink file:mr-3 file:rounded-btn file:border-0 file:bg-canvas file:px-3 file:py-1 file:text-xs file:font-semibold file:text-navy"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="input-focus rounded-btn border border-hairline bg-card px-3 py-2 font-mono text-xs uppercase tracking-wide text-navy"
          >
            <option value="resume">resume</option>
            <option value="transcript">transcript</option>
            <option value="other">other</option>
          </select>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload & extract"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-ink/70">
          PDF text is extracted on upload and chunked into the RAG index (pgvector). Max 10 MB.
        </p>
      </Card>

      {/* List */}
      {!documents ? (
        <Spinner label="Loading documents" />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents uploaded"
          hint="Upload your resume so the assistant can ground answers in it"
        />
      ) : (
        <Card>
          <ul className="divide-y divide-separator">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-canvas font-mono text-[10px] uppercase text-slate-ink">
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
                <Button variant="ghost" onClick={() => handleDelete(doc)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
