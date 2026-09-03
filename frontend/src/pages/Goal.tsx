import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  generateRoadmap,
  getGoal,
  ApiError,
  updateRoadmapItem,
} from "../api/client";
import type { Goal, Milestone } from "../api/types";
import {
  Button,
  Card,
  ErrorBanner,
  PageHeader,
  ProgressBar,
  Spinner,
  StatusBadge,
  formatDate,
} from "../components/ui";

function RoadmapChecklist({
  item,
  onToggle,
}: {
  item: Milestone;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const tasksDone = item.tasks.filter((t) => t.completed).length;
  const pct = item.tasks.length > 0 ? (tasksDone / item.tasks.length) * 100 : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(item.id, !item.completed)}
          aria-label={item.completed ? "Mark milestone incomplete" : "Mark milestone complete"}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
            item.completed
              ? "border-moss bg-moss text-navy"
              : "border-hairline bg-card text-slate-ink hover:border-sage"
          }`}
        >
          {item.completed ? "✓" : item.order}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-base font-semibold ${
                item.completed ? "text-slate-ink/50 line-through" : "text-navy"
              }`}
            >
              {item.title}
            </h3>
            <StatusBadge status={item.priority} />
          </div>
          {item.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-ink">{item.description}</p>
          )}
          {item.rationale && (
            <p className="mt-1 rounded-ai bg-eucalyptus/10 px-3 py-2 text-xs leading-relaxed text-eucalyptus">
              <span className="label-mono mr-1">why</span>
              {item.rationale}
            </p>
          )}

          {item.tasks.length > 0 && (
            <div className="mt-4 space-y-2">
              {item.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onToggle(task.id, !task.completed)}
                  className="flex w-full items-center gap-3 rounded-btn border border-separator bg-canvas px-3 py-2 text-left transition-colors hover:border-sage"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-btn border text-[9px] ${
                      task.completed
                        ? "border-moss bg-moss text-navy"
                        : "border-hairline bg-card text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`flex-1 text-sm ${
                      task.completed ? "text-slate-ink/50 line-through" : "text-navy-deep"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.rationale && (
                    <span className="hidden max-w-[240px] truncate text-xs text-slate-ink/60 md:block">
                      {task.rationale}
                    </span>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <ProgressBar value={pct} />
                <span className="font-mono text-[11px] text-slate-ink">
                  {tasksDone}/{item.tasks.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function GoalPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const load = useCallback(() => {
    if (!goalId) return;
    getGoal(goalId)
      .then(setGoal)
      .catch((err: Error) => setError(err.message));
  }, [goalId]);

  useEffect(load, [load]);

  const toggleItem = async (itemId: string, completed: boolean) => {
    if (!goal) return;
    // Optimistic update: flip the item locally, then persist.
    const flip = (m: Milestone): Milestone => ({
      ...m,
      completed: m.id === itemId ? completed : m.completed,
      tasks: m.tasks.map((t) => (t.id === itemId ? { ...t, completed } : t)),
    });
    setGoal({ ...goal, milestones: goal.milestones.map(flip) });
    try {
      await updateRoadmapItem(itemId, { completed });
    } catch (err) {
      load(); // revert on failure
      setError(err instanceof ApiError ? err.message : "Could not save the change");
    }
  };

  const regenerate = async () => {
    if (!goalId) return;
    setGenerating(true);
    setGenError("");
    try {
      setGoal(await generateRoadmap(goalId));
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (error && !goal) return <ErrorBanner message={error} />;
  if (!goal) return <Spinner label="Loading goal" />;

  const totalTasks = goal.milestones.flatMap((m) => m.tasks);
  const doneTasks = totalTasks.filter((t) => t.completed).length;
  const pct = totalTasks.length > 0 ? (doneTasks / totalTasks.length) * 100 : 0;

  return (
    <div>
      <PageHeader
        title={goal.title}
        subtitle={goal.description ?? undefined}
        actions={
          <Button onClick={regenerate} disabled={generating}>
            {generating ? "Generating…" : "Regenerate with AI"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {genError && <ErrorBanner message={genError} />}

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-ink">
              <span>
                {doneTasks} of {totalTasks.length} tasks complete ·{" "}
                {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length}{" "}
                milestones
              </span>
              <span className="font-mono text-xs">{Math.round(pct)}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="label-mono text-[10px] text-slate-ink/60">status</p>
              <div className="mt-1">
                <StatusBadge status={goal.status} />
              </div>
            </div>
            <div>
              <p className="label-mono text-[10px] text-slate-ink/60">target</p>
              <p className="mt-1 font-mono text-sm text-navy">{formatDate(goal.target_date)}</p>
            </div>
          </div>
        </div>
      </Card>

      {generating ? (
        <div className="rounded-ai border border-eucalyptus/30 bg-eucalyptus/5 px-4 py-3 text-sm text-eucalyptus">
          <span className="label-mono mr-2">ai</span>
          Qwen is drafting your roadmap — this takes a few seconds…
        </div>
      ) : (
        <div className="space-y-4">
          {goal.milestones.map((m) => (
            <RoadmapChecklist key={m.id} item={m} onToggle={toggleItem} />
          ))}
          {goal.milestones.length === 0 && (
            <Card className="p-10 text-center text-sm text-slate-ink">
              No roadmap yet — hit “Regenerate with AI” to create one.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
