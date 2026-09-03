import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, ChevronDown, Sparkles, Target } from "lucide-react";
import { friendlyError, generateRoadmap, getGoal, updateRoadmapItem } from "../api/client";
import type { Goal, Milestone } from "../api/types";
import {
  Button,
  Card,
  ErrorBanner,
  ProgressBar,
  SectionLabel,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  formatDate,
} from "../components/ui";

function milestoneState(m: Milestone, isCurrent: boolean): "done" | "current" | "upcoming" {
  if (m.completed) return "done";
  return isCurrent ? "current" : "upcoming";
}

function MilestoneCard({
  milestone,
  state,
  open,
  onToggleOpen,
  onToggleItem,
  isLast,
}: {
  milestone: Milestone;
  state: "done" | "current" | "upcoming";
  open: boolean;
  onToggleOpen: () => void;
  onToggleItem: (id: string, completed: boolean) => void;
  isLast: boolean;
}) {
  const tasksDone = milestone.tasks.filter((t) => t.completed).length;
  const pct = milestone.tasks.length > 0 ? (tasksDone / milestone.tasks.length) * 100 : 0;

  return (
    <div className="flex gap-4">
      {/* Journey rail: numbered node + connector */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => onToggleItem(milestone.id, !milestone.completed)}
          aria-label={
            milestone.completed ? "Mark milestone incomplete" : "Mark milestone complete"
          }
          title={milestone.completed ? "Mark milestone incomplete" : "Mark milestone complete"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm transition-all duration-200 ${
            state === "done"
              ? "border-moss bg-moss text-navy"
              : state === "current"
                ? "border-sage bg-sage/15 text-sage-dim shadow-focus"
                : "border-hairline bg-card text-slate-ink hover:border-sage"
          }`}
        >
          {milestone.completed ? <Check size={15} strokeWidth={3} /> : milestone.order}
        </button>
        {!isLast && (
          <span
            className={`mt-1 w-0.5 flex-1 rounded-full transition-colors duration-500 ${
              milestone.completed ? "bg-moss/60" : "bg-hairline"
            }`}
          />
        )}
      </div>

      {/* Milestone body */}
      <div className="min-w-0 flex-1 pb-6">
        <Card
          className={`overflow-hidden transition-all duration-200 ${
            state === "current" ? "border-sage/60 shadow-focus" : ""
          }`}
        >
          {/* Header — click to expand */}
          <button
            onClick={onToggleOpen}
            aria-expanded={open}
            className="flex w-full items-start gap-3 p-5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-base font-semibold ${
                    milestone.completed ? "text-slate-ink/50 line-through" : "text-navy"
                  }`}
                >
                  {milestone.title}
                </h3>
                <StatusBadge status={milestone.priority} />
              </div>
              {milestone.description && (
                <p className="mt-1 text-sm leading-relaxed text-slate-ink">
                  {milestone.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-slate-ink/60">
                <span>
                  {tasksDone}/{milestone.tasks.length} tasks
                </span>
                {milestone.due_date && <span>due {formatDate(milestone.due_date)}</span>}
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`mt-1 shrink-0 text-slate-ink/60 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Expandable task list */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t border-separator px-5 pb-5 pt-4">
                {milestone.rationale && (
                  <p className="mb-4 rounded-ai bg-eucalyptus/10 px-3 py-2 text-xs leading-relaxed text-eucalyptus">
                    <span className="label-mono mr-1 text-[9px]">why this matters</span>
                    {milestone.rationale}
                  </p>
                )}

                {milestone.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {milestone.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onToggleItem(task.id, !task.completed)}
                        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                        className={`flex w-full items-start gap-3 rounded-btn border px-3 py-2.5 text-left transition-all duration-150 ${
                          task.completed
                            ? "border-separator bg-canvas"
                            : "border-separator bg-canvas hover:-translate-y-px hover:border-sage hover:shadow-focus"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-btn border transition-all duration-200 ${
                            task.completed
                              ? "border-moss bg-moss text-navy"
                              : "border-hairline bg-card text-transparent"
                          }`}
                        >
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm ${
                              task.completed
                                ? "text-slate-ink/50 line-through"
                                : "text-navy-deep"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.rationale && (
                            <span className="mt-0.5 block text-xs leading-snug text-slate-ink/60">
                              {task.rationale}
                            </span>
                          )}
                          {(task.priority !== "medium" || task.due_date) && (
                            <span className="mt-1.5 flex flex-wrap items-center gap-2">
                              {task.priority !== "medium" && (
                                <StatusBadge status={task.priority} />
                              )}
                              {task.due_date && (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-ink/60">
                                  <CalendarClock size={11} />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      <ProgressBar value={pct} />
                      <span className="font-mono text-[11px] text-slate-ink">
                        {tasksDone}/{milestone.tasks.length}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-ink/60">
                    No tasks in this milestone yet — regenerate the roadmap for a finer-grained
                    plan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function GoalPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!goalId) return;
    getGoal(goalId)
      .then((g) => {
        setGoal(g);
        // Expand the current (first incomplete) milestone by default.
        const current = g.milestones.find((m) => !m.completed);
        setOpenIds(current ? new Set([current.id]) : new Set());
      })
      .catch((err) => setError(friendlyError(err)));
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
      setError(friendlyError(err));
    }
  };

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const regenerate = async () => {
    if (!goalId) return;
    setGenerating(true);
    setGenError("");
    try {
      const updated = await generateRoadmap(goalId);
      setGoal(updated);
      const current = updated.milestones.find((m) => !m.completed);
      setOpenIds(current ? new Set([current.id]) : new Set());
    } catch (err) {
      setGenError(friendlyError(err));
    } finally {
      setGenerating(false);
    }
  };

  if (error && !goal) return <ErrorBanner message={error} />;
  if (!goal)
    return (
      <div className="space-y-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-2/5" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );

  const totalTasks = goal.milestones.flatMap((m) => m.tasks);
  const doneTasks = totalTasks.filter((t) => t.completed).length;
  const pct = totalTasks.length > 0 ? (doneTasks / totalTasks.length) * 100 : 0;
  const currentMilestoneId = goal.milestones.find((m) => !m.completed)?.id;
  const hasRoadmap = goal.milestones.length > 0;

  return (
    <div>
      <Link
        to="/goals"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-ink underline-offset-4 transition-colors hover:text-navy hover:underline"
      >
        <ArrowLeft size={13} />
        All goals
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono mb-1.5 text-[10px] text-sage-dim">goal workspace</p>
          <h1 className="font-display max-w-2xl text-2xl font-semibold tracking-tight text-navy md:text-3xl">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-ink">
              {goal.description}
            </p>
          )}
        </div>
        <Button onClick={regenerate} loading={generating} variant={hasRoadmap ? "secondary" : "primary"}>
          <Sparkles size={15} />
          {hasRoadmap ? "Regenerate with AI" : "Generate roadmap"}
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}
      {genError && <ErrorBanner message={genError} />}

      {/* Progress summary */}
      <Card className="mb-8 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-ink">
              <span>
                {doneTasks} of {totalTasks.length} tasks ·{" "}
                {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length}{" "}
                milestones
              </span>
              <span className="font-mono text-xs">{Math.round(pct)}%</span>
            </div>
            <ProgressBar value={pct} animate />
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

      {/* Roadmap */}
      {generating ? (
        <Card className="border-eucalyptus/30 bg-eucalyptus/5 p-8">
          <div className="flex items-center gap-3 text-eucalyptus">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-eucalyptus/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-eucalyptus" />
            </span>
            <SectionLabel className="text-eucalyptus">steerium intelligence</SectionLabel>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-navy-deep">
            Qwen is drafting your roadmap — milestones, tasks, and the reasoning behind each step.
            This takes a few seconds…
          </p>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-5/6" />
            <Skeleton className="h-14 w-4/6" />
          </div>
        </Card>
      ) : hasRoadmap ? (
        <div>
          <SectionLabel className="mb-4">your roadmap</SectionLabel>
          <div>
            {goal.milestones.map((m, i) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                state={milestoneState(m, m.id === currentMilestoneId)}
                open={openIds.has(m.id)}
                onToggleOpen={() => toggleOpen(m.id)}
                onToggleItem={toggleItem}
                isLast={i === goal.milestones.length - 1}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dim">
            <Target size={22} />
          </span>
          <h3 className="text-base font-semibold text-navy">No roadmap yet</h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-ink/80">
            Generate a roadmap and Steerium will break this goal into milestones, concrete tasks,
            and the reasoning behind each step.
          </p>
          <div className="mt-6">
            <Button onClick={regenerate} loading={generating}>
              <Sparkles size={15} />
              Generate roadmap with AI
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
