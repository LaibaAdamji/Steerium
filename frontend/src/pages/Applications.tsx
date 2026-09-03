import { useCallback, useEffect, useState } from "react";
import {
  getProfile,
  listApplications,
  listOpportunities,
  updateApplication,
} from "../api/client";
import { APPLICATION_STATUSES, type Application, type Opportunity, type Profile } from "../api/types";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
  StatusBadge,
  formatDate,
} from "../components/ui";

const NEXT_ACTIONS: Record<string, string> = {
  interested: "Prepare materials",
  preparing: "Mark as applied once submitted",
  applied: "Awaiting response — follow up if silent 3+ weeks",
  interview: "Schedule prep session",
  accepted: "Celebrate, then decide",
  rejected: "Ask for feedback, keep moving",
};

export default function ApplicationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [opportunities, setOpportunities] = useState<Map<string, Opportunity>>(new Map());
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err: Error) => setError(err.message));
  }, []);

  const load = useCallback(() => {
    listOpportunities()
      .then((opps) => setOpportunities(new Map(opps.map((o) => [o.id, o]))))
      .catch(() => setOpportunities(new Map()));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (profile) {
      listApplications(profile.id)
        .then(setApplications)
        .catch((err: Error) => setError(err.message));
    }
  }, [profile]);

  const setStatus = async (application: Application, status: string) => {
    if (!profile) return;
    setBusyId(application.id);
    // Optimistic update
    setApplications((prev) =>
      prev ? prev.map((a) => (a.id === application.id ? { ...a, status } : a)) : prev,
    );
    try {
      await updateApplication(application.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
      if (profile) {
        listApplications(profile.id).then(setApplications).catch(() => {});
      }
    } finally {
      setBusyId("");
    }
  };

  if (error && !applications) return <ErrorBanner message={error} />;
  if (!applications) return <Spinner label="Loading applications" />;

  const counts = APPLICATION_STATUSES.map((s) => ({
    status: s,
    count: applications.filter((a) => a.status === s).length,
  }));

  return (
    <div>
      <PageHeader title="Applications" subtitle="Every tracked opportunity and where it stands" />

      {error && <ErrorBanner message={error} />}

      {/* Pipeline summary strip */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {counts.map(({ status, count }) => (
          <div
            key={status}
            className="rounded-btn border border-hairline bg-card px-2 py-3 text-center"
          >
            <p className="font-mono text-lg font-semibold text-navy">{count}</p>
            <div className="mt-1 flex justify-center">
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications tracked yet"
          hint="Save an opportunity on the Opportunities page, then “Track application”"
        />
      ) : (
        <Card>
          <ul className="divide-y divide-separator">
            {applications.map((app) => {
              const opp = opportunities.get(app.opportunity_id);
              return (
                <li key={app.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-[200px] flex-1">
                    <p className="text-sm font-semibold text-navy">{opp?.title ?? "Opportunity"}</p>
                    <p className="text-xs text-slate-ink">{opp?.organization ?? "—"}</p>
                    <p className="label-mono mt-1 text-[10px] text-slate-ink/60">
                      {app.applied_at
                        ? `applied ${formatDate(app.applied_at)}`
                        : `tracked ${formatDate(app.created_at)}`}
                    </p>
                  </div>

                  <div className="hidden max-w-[240px] flex-1 md:block">
                    <StatusBadge status={app.status} />
                    {app.status in NEXT_ACTIONS && (
                      <p className="mt-1 text-xs text-slate-ink/70">{NEXT_ACTIONS[app.status]}</p>
                    )}
                  </div>

                  <select
                    value={app.status}
                    disabled={busyId === app.id}
                    onChange={(e) => setStatus(app, e.target.value)}
                    className="input-focus rounded-btn border border-hairline bg-card px-2 py-1.5 font-mono text-xs uppercase tracking-wide text-navy"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
