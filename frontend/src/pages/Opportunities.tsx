import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createApplication,
  getProfile,
  listOpportunities,
  listSavedOpportunityIds,
  saveOpportunity,
  unsaveOpportunity,
} from "../api/client";
import { OPPORTUNITY_TYPES, type Opportunity, type Profile } from "../api/types";
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  EmptyState,
  PageHeader,
  Spinner,
  daysUntil,
  formatDate,
} from "../components/ui";

const TYPE_LABELS: Record<string, string> = {
  masters_program: "Master's",
  scholarship: "Scholarship",
  internship: "Internship",
  job: "Job",
  certification: "Certification",
};

export default function OpportunitiesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err: Error) => setError(err.message));
  }, []);

  const load = useCallback(() => {
    listOpportunities({ type: typeFilter || undefined, search: search || undefined })
      .then(setOpportunities)
      .catch((err: Error) => setError(err.message));
  }, [typeFilter, search]);

  useEffect(load, [load]);

  useEffect(() => {
    if (profile) {
      listSavedOpportunityIds(profile.id)
        .then((ids) => setSavedIds(new Set(ids)))
        .catch(() => setSavedIds(new Set())); // saved badges are cosmetic — ignore errors
    }
  }, [profile]);

  const toggleSave = async (opp: Opportunity) => {
    if (!profile) return;
    setBusyId(opp.id);
    try {
      if (savedIds.has(opp.id)) {
        await unsaveOpportunity(opp.id, profile.id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(opp.id);
          return next;
        });
      } else {
        await saveOpportunity(opp.id, profile.id);
        setSavedIds((prev) => new Set(prev).add(opp.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update saved list");
    } finally {
      setBusyId("");
    }
  };

  const trackApplication = async (opp: Opportunity) => {
    if (!profile) return;
    setBusyId(opp.id);
    try {
      await createApplication(profile.id, opp.id, "interested");
      setSavedIds((prev) => new Set(prev).add(opp.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create application");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Curated programs, scholarships, internships, jobs, and certifications"
        actions={
          <Link to="/applications">
            <Button variant="secondary">View tracker</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, organization…"
          className="input-focus w-64 rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("")}
            className={`rounded-btn border px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide transition-colors ${
              typeFilter === ""
                ? "border-sage bg-sage/15 text-sage-dim"
                : "border-hairline bg-card text-slate-ink hover:border-sage"
            }`}
          >
            all
          </button>
          {OPPORTUNITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-btn border px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide transition-colors ${
                typeFilter === t
                  ? "border-sage bg-sage/15 text-sage-dim"
                  : "border-hairline bg-card text-slate-ink hover:border-sage"
              }`}
            >
              {TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {!opportunities ? (
        <Spinner label="Loading opportunities" />
      ) : opportunities.length === 0 ? (
        <EmptyState title="No opportunities match" hint="Try clearing the search or filters" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((opp) => {
            const days = daysUntil(opp.deadline);
            const saved = savedIds.has(opp.id);
            return (
              <Card key={opp.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip>{TYPE_LABELS[opp.type] ?? opp.type}</Chip>
                      {opp.tags?.slice(0, 2).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-navy">{opp.title}</h3>
                    <p className="text-sm text-slate-ink">{opp.organization ?? "—"}</p>
                  </div>
                  {opp.deadline && (
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-slate-ink">
                        {formatDate(opp.deadline)}
                      </p>
                      {days !== null && (
                        <p
                          className={`font-mono text-[10px] ${
                            days < 0 ? "text-slate-ink/50" : days <= 30 ? "text-error" : "text-sage-dim"
                          }`}
                        >
                          {days < 0 ? "closed" : `${days}d left`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {opp.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-ink">
                    {opp.description}
                  </p>
                )}

                {opp.requirements && opp.requirements.length > 0 && (
                  <p className="mt-2 text-xs text-slate-ink/70">
                    <span className="label-mono mr-1 text-[10px]">requires</span>
                    {opp.requirements.slice(0, 4).join(" · ")}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    variant={saved ? "secondary" : "primary"}
                    onClick={() => toggleSave(opp)}
                    disabled={busyId === opp.id}
                  >
                    {saved ? "★ Saved" : "☆ Save"}
                  </Button>
                  <Button variant="ghost" onClick={() => trackApplication(opp)} disabled={busyId === opp.id}>
                    Track application →
                  </Button>
                  {opp.url && (
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto font-mono text-xs text-eucalyptus hover:underline"
                    >
                      open link ↗
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
