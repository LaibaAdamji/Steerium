import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, listGoals } from "../api/client";
import type { Dashboard as DashboardData, GoalListItem } from "../api/types";
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  PageHeader,
  ProgressBar,
  Spinner,
  StatusBadge,
  daysUntil,
  formatDate,
} from "../components/ui";

const PIPELINE_STAGES = [
  { key: "interested", label: "Interested" },
  { key: "preparing", label: "Preparing" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
] as const;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getDashboard(), listGoals()])
      .then(([dashboard, goalList]) => {
        setData(dashboard);
        setGoals(goalList);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Loading workspace" />;

  const goal = data.goal;
  const taskPct = goal && goal.tasks_total > 0 ? (goal.tasks_completed / goal.tasks_total) * 100 : 0;
  const primaryGoal = goals[0];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your career workspace at a glance"
        actions={
          primaryGoal && (
            <Link to={`/goals/${primaryGoal.id}`}>
              <Button variant="secondary">Open goal workspace</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goal progress */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-mono text-slate-ink">active goal</p>
            {goal && <StatusBadge status={goal.status} />}
          </div>
          {goal ? (
            <>
              <h2 className="text-lg font-semibold text-navy">{goal.title}</h2>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-ink">
                  <span>
                    {goal.tasks_completed} of {goal.tasks_total} tasks complete
                  </span>
                  <span className="font-mono text-xs">{Math.round(taskPct)}%</span>
                </div>
                <ProgressBar value={taskPct} />
              </div>
              <div className="mt-6 space-y-3">
                {goal.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        m.completed
                          ? "border-moss bg-moss text-navy"
                          : "border-hairline bg-card text-slate-ink"
                      }`}
                    >
                      {m.completed ? "✓" : m.order}
                    </span>
                    <span
                      className={`flex-1 text-sm ${
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
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-ink">
              No goal yet — create one to generate a roadmap.
            </p>
          )}
        </Card>

        {/* Upcoming deadlines */}
        <Card className="p-6">
          <p className="label-mono mb-4 text-slate-ink">upcoming deadlines</p>
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

        {/* Application pipeline */}
        <Card className="p-6 lg:col-span-2">
          <p className="label-mono mb-4 text-slate-ink">application pipeline</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.key}
                className="rounded-btn border border-hairline bg-canvas px-3 py-4 text-center"
              >
                <p className="font-mono text-xl font-semibold text-navy">
                  {data.application_pipeline[stage.key]}
                </p>
                <p className="label-mono mt-1 text-[9px] text-slate-ink">{stage.label}</p>
              </div>
            ))}
          </div>
          {data.application_pipeline.total === 0 && (
            <p className="mt-4 text-sm text-slate-ink/70">
              No applications yet — save an opportunity to get started.
            </p>
          )}
        </Card>

        {/* Saved opportunities */}
        <Card className="p-6">
          <p className="label-mono mb-4 text-slate-ink">saved, not applied</p>
          {data.saved_opportunities.length === 0 ? (
            <p className="text-sm text-slate-ink/70">Nothing saved yet.</p>
          ) : (
            <ul className="divide-y divide-separator">
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
