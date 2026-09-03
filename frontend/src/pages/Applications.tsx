import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import {
  friendlyError,
  listApplications,
  listOpportunities,
  updateApplication,
} from "../api/client";
import { APPLICATION_STATUSES, type Application, type Opportunity } from "../api/types";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  SkeletonCard,
  StatusBadge,
  Textarea,
  formatDate,
} from "../components/ui";

const COLUMN_LABELS: Record<string, string> = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
};

const NEXT_ACTIONS: Record<string, string> = {
  interested: "Prepare materials",
  preparing: "Mark as applied once submitted",
  applied: "Awaiting response — follow up if silent 3+ weeks",
  interview: "Schedule prep session",
  accepted: "Celebrate, then decide",
  rejected: "Ask for feedback, keep moving",
};

export default function ApplicationsPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");

  const [applications, setApplications] = useState<Application[] | null>(null);
  const [opportunities, setOpportunities] = useState<Map<string, Opportunity>>(new Map());
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Detail modal state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(() => {
    Promise.all([listApplications(), listOpportunities()])
      .then(([apps, opps]) => {
        setApplications(apps);
        setOpportunities(new Map(opps.map((o) => [o.id, o])));
      })
      .catch((err) => setError(friendlyError(err)));
  }, []);

  useEffect(load, [load]);

  const detail = applications?.find((a) => a.id === detailId) ?? null;
  const detailOpp = detail ? opportunities.get(detail.opportunity_id) : undefined;

  const setStatus = useCallback(
    async (application: Application, status: string) => {
      if (application.status === status) return;
      // Optimistic update
      setApplications((prev) =>
        prev ? prev.map((a) => (a.id === application.id ? { ...a, status } : a)) : prev,
      );
      try {
        await updateApplication(application.id, { status });
        toast(`Moved to ${COLUMN_LABELS[status] ?? status}.`);
      } catch (err) {
        setError(friendlyError(err));
        load(); // revert
      }
    },
    [load, toast],
  );

  function openDetail(app: Application) {
    setDetailId(app.id);
    setNotesDraft(app.notes ?? "");
  }

  async function saveNotes() {
    if (!detail || savingNotes) return;
    setSavingNotes(true);
    try {
      const updated = await updateApplication(detail.id, { notes: notesDraft.trim() || undefined });
      setApplications((prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
      toast("Notes saved.");
      setDetailId(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSavingNotes(false);
    }
  }

  if (error && !applications) return <ErrorBanner message={error} />;
  if (!applications)
    return (
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    );

  const byStatus = (status: string) => applications.filter((a) => a.status === status);

  return (
    <div>
      <PageHeader
        eyebrow="workspace"
        title="Applications"
        subtitle="Drag cards across the pipeline — or open one to update status and notes"
        actions={
          <Link to="/opportunities">
            <Button variant="secondary">
              <Plus size={15} />
              Track an opportunity
            </Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      {applications.length === 0 ? (
        <EmptyState
          title="No applications tracked yet"
          hint="Find an opportunity that fits, then hit “Track application” to add it to your pipeline."
          action={
            <Link to="/opportunities">
              <Button>Browse opportunities</Button>
            </Link>
          }
        />
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {APPLICATION_STATUSES.map((status) => {
            const items = byStatus(status);
            const isHighlighted = statusParam === status;
            return (
              <section
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((prev) => (prev === status ? null : prev))}
                onDrop={() => {
                  const app = applications.find((a) => a.id === dragId);
                  if (app) setStatus(app, status);
                  setDragId(null);
                  setDragOver(null);
                }}
                className={`flex w-[260px] shrink-0 snap-start flex-col rounded-card border p-3 transition-colors md:w-auto md:min-w-[200px] md:flex-1 ${
                  isHighlighted
                    ? "border-sage/60 bg-sage/5"
                    : dragOver === status
                      ? "border-sage bg-sage/10"
                      : "border-hairline bg-canvas"
                }`}
                aria-label={`${COLUMN_LABELS[status]} column`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <StatusBadge status={status} />
                  <span className="font-mono text-xs text-slate-ink/60">{items.length}</span>
                </div>

                <div className="flex-1 space-y-2">
                  {items.map((app) => {
                    const opp = opportunities.get(app.opportunity_id);
                    return (
                      <Card
                        key={app.id}
                        interactive
                        className={`cursor-grab p-3 active:cursor-grabbing ${
                          dragId === app.id ? "opacity-40" : ""
                        }`}
                      >
                        <div
                          draggable
                          onDragStart={() => setDragId(app.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDragOver(null);
                          }}
                          onClick={() => openDetail(app)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDetail(app);
                            }
                          }}
                        >
                          <p className="text-sm font-semibold leading-snug text-navy">
                            {opp?.title ?? "Opportunity"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-ink">
                            {opp?.organization ?? "—"}
                          </p>
                          <p className="label-mono mt-2 text-[9px] text-slate-ink/50">
                            {app.applied_at ? `applied ${formatDate(app.applied_at)}` : `tracked ${formatDate(app.created_at)}`}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="rounded-btn border border-dashed border-hairline px-3 py-4 text-center font-mono text-[10px] text-slate-ink/40">
                      drop here
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detailOpp?.title ?? "Application"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailId(null)} disabled={savingNotes}>
              Close
            </Button>
            <Button onClick={saveNotes} loading={savingNotes}>
              Save notes
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-slate-ink">{detailOpp?.organization ?? "—"}</p>

            {detailOpp?.url && (
              <a
                href={detailOpp.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-eucalyptus transition-colors hover:underline"
              >
                open opportunity page
                <ExternalLink size={11} />
              </a>
            )}

            <Field label="Status">
              <div className="flex flex-wrap gap-2">
                {APPLICATION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(detail, s)}
                    disabled={savingNotes}
                    className={`rounded-btn border px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors ${
                      detail.status === s
                        ? "border-sage bg-sage/15 text-sage-dim"
                        : "border-hairline bg-card text-slate-ink hover:border-sage"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-ink/60">{NEXT_ACTIONS[detail.status]}</p>
            </Field>

            <Field label="Notes" hint="Deadlines, contacts, tailored materials…">
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder="e.g. Recommender confirmed · essay draft v2 due Friday"
              />
            </Field>

            <div className="flex gap-4 border-t border-separator pt-3 font-mono text-[10px] text-slate-ink/50">
              <span>tracked {formatDate(detail.created_at)}</span>
              {detail.applied_at && <span>applied {formatDate(detail.applied_at)}</span>}
              <span>updated {formatDate(detail.updated_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
