import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Check, Lightbulb, Target } from "lucide-react";
import { friendlyError, getDashboard } from "../api/client";
import type { Dashboard as DashboardData } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  ProgressBar,
  SectionLabel,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  daysUntil,
  formatDate,
  greeting,
} from "../components/ui";

const PIPELINE_STAGES = [
  { key: "interested", label: "Interested" },
  { key: "preparing", label: "Preparing" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
] as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-2/3 max-w-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard className="md:col-span-2" />
        <SkeletonCard />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard className="md:col-span-2" />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(friendlyError(err)));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <DashboardSkeleton />;

  const displayName = data.profile_name ?? profile?.name ?? user?.name ?? "there";
  const firstName = displayName.split(" ")[0];
  const goal = data.goal;
  const taskPct =
    goal && goal.tasks_total > 0 ? (goal.tasks_completed / goal.tasks_total) * 100 : 0;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <p className="label-mono text-[10px] text-sage-dim">
          {greeting()} · {firstName}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-navy md:text-4xl">
          Your career, in motion.
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {/* Active goal */}
        <Card className="p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>active goal</SectionLabel>
            {goal && <StatusBadge status={goal.status} />}
          </div>
          {goal ? (
            <>
              <Link to={`/goals/${goal.id}`} className="group">
                <h2 className="font-display text-xl font-semibold tracking-tight text-navy transition-colors group-hover:text-sage-dim">
                  {goal.title}
                </h2>
              </Link>
              {goal.description && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-ink">
                  {goal.description}
                </p>
              )}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-ink">
                  <span>
                    {goal.tasks_completed} of {goal.tasks_total} tasks ·{" "}
                    {goal.milestones_completed}/{goal.milestones_total} milestones
                  </span>
                  <span className="font-mono text-xs">{Math.round(taskPct)}%</span>
                </div>
                <ProgressBar value={taskPct} animate />
              </div>

              {/* Milestone timeline */}
              <div className="mt-6 space-y-2.5">
                {goal.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-colors ${
                        m.completed
                          ? "border-moss bg-moss text-navy"
                          : "border-hairline bg-card text-slate-ink"
                      }`}
                    >
                      {m.completed ? <Check size={11} strokeWidth={3} /> : m.order}
                    </span>
                    <span
                      className={`flex-1 truncate text-sm ${
                        m.completed ? "text-slate-ink/50 line-through" : "text-navy-deep"
                      }`}
                    >
                      {m.title}
                    </span>
                    <span className="font-mono text-[11px] text-slate-ink">
                      {m.completed_task_count}/{m.task_count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Link to={`/goals/${goal.id}`}>
                  <Button variant="secondary">
                    Open goal workspace
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Target size={20} />}
              title="No goal yet"
              hint="Create your first goal and Steerium will turn it into a complete roadmap — milestones, tasks, and the reasoning behind each step."
              action={
                <Link to="/goals">
                  <Button>Create your first goal</Button>
                </Link>
              }
            />
          )}
        </Card>

        {/* Next action */}
        <Card className="p-6">
          <SectionLabel className="mb-4">next action</SectionLabel>
          {data.next_task ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-snug text-navy">
                  {data.next_task.title}
                </h3>
                <StatusBadge status={data.next_task.priority} />
              </div>
              {data.next_task.milestone_title && (
                <p className="label-mono mt-2 text-[10px] text-slate-ink/60">
                  {data.next_task.milestone_title}
                </p>
              )}
              {data.next_task.due_date && (
                <p className="mt-3 flex items-center gap-1.5 font-mono text-xs text-slate-ink">
                  <CalendarClock size={13} className="shrink-0" />
                  {formatDate(data.next_task.due_date)}
                  {(() => {
                    const days = daysUntil(data.next_task!.due_date);
                    if (days === null) return null;
                    return (
                      <span className={days >= 0 && days <= 7 ? "text-error" : "text-sage-dim"}>
                        · {days < 0 ? "overdue" : `${days}d left`}
                      </span>
                    );
                  })()}
                </p>
              )}
              {data.next_task.rationale && (
                <p className="mt-3 rounded-ai bg-eucalyptus/10 px-3 py-2 text-xs leading-relaxed text-eucalyptus">
                  <span className="label-mono mr-1 text-[9px]">why</span>
                  {data.next_task.rationale}
                </p>
              )}
              {goal && (
                <Link
                  to={`/goals/${goal.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-dim underline-offset-4 transition-colors hover:underline"
                >
                  Go to roadmap
                  <ArrowRight size={12} />
                </Link>
              )}
            </>
          ) : goal ? (
            <p className="text-sm leading-relaxed text-slate-ink/70">
              All tasks complete — regenerate your roadmap to keep the momentum going.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-ink/70">
              Your next action appears here once a roadmap exists.
            </p>
          )}
        </Card>

        {/* Application pipeline */}
        <Card className="p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>application pipeline</SectionLabel>
            <Link
              to="/applications"
              className="text-xs font-semibold text-sage-dim underline-offset-4 transition-colors hover:underline"
            >
              View tracker
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PIPELINE_STAGES.map((stage) => (
              <Link
                key={stage.key}
                to={`/applications?status=${stage.key}`}
                className="rounded-btn border border-hairline bg-canvas px-3 py-4 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-sage hover:shadow-focus"
              >
                <p className="font-display text-xl font-semibold text-navy">
                  {data.application_pipeline[stage.key]}
                </p>
                <p className="label-mono mt-1 text-[9px] text-slate-ink">{stage.label}</p>
              </Link>
            ))}
          </div>
          {data.application_pipeline.total === 0 && (
            <p className="mt-4 text-sm text-slate-ink/70">
              No applications yet —{" "}
              <Link
                to="/opportunities"
                className="font-semibold text-sage-dim underline-offset-4 hover:underline"
              >
                browse opportunities
              </Link>{" "}
              to get started.
            </p>
          )}
        </Card>

        {/* Recommended next move */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2 text-eucalyptus">
            <Lightbulb size={14} />
            <SectionLabel className="text-eucalyptus">recommended next move</SectionLabel>
          </div>
          <p className="text-sm leading-relaxed text-navy-deep">
            {data.ai_recommendation ?? "Personalized guidance appears here as your workspace fills."}
          </p>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="p-6">
          <SectionLabel className="mb-4">upcoming deadlines</SectionLabel>
          {data.upcoming_deadlines.length === 0 ? (
            <p className="text-sm text-slate-ink/70">Nothing on the horizon.</p>
          ) : (
            <ul className="divide-y divide-separator">
              {data.upcoming_deadlines.slice(0, 6).map((d) => {
                const days = daysUntil(d.due_date);
                return (
                  <li key={d.item_id} className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-deep">{d.title}</p>
                      <p className="label-mono mt-0.5 text-[10px] text-slate-ink/60">{d.source}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-slate-ink">{formatDate(d.due_date)}</p>
                      {days !== null && (
                        <p
                          className={`font-mono text-[10px] ${
                            days < 0
                              ? "text-slate-ink/50"
                              : days <= 14
                                ? "text-error"
                                : "text-sage-dim"
                          }`}
                        >
                          {days < 0 ? "passed" : `${days}d left`}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Saved opportunities */}
        <Card className="p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>saved, not applied</SectionLabel>
            <Link
              to="/opportunities"
              className="text-xs font-semibold text-sage-dim underline-offset-4 transition-colors hover:underline"
            >
              Find more
            </Link>
          </div>
          {data.saved_opportunities.length === 0 ? (
            <p className="text-sm text-slate-ink/70">
              Nothing saved yet — bookmark opportunities that fit your direction.
            </p>
          ) : (
            <ul className="grid gap-x-6 divide-y divide-separator md:grid-cols-2">
              {data.saved_opportunities.slice(0, 6).map((o) => (
                <li key={o.id} className="py-3">
                  <p className="text-sm font-medium text-navy-deep">{o.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Chip>{o.type.replace(/_/g, " ")}</Chip>
                    {o.deadline && (
                      <span className="font-mono text-[10px] text-slate-ink">
                        due {formatDate(o.deadline)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
