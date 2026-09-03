import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, ExternalLink, Search } from "lucide-react";
import {
  createApplication,
  friendlyError,
  listOpportunities,
  listSavedOpportunityIds,
  saveOpportunity,
  unsaveOpportunity,
} from "../api/client";
import { OPPORTUNITY_TYPES, type Opportunity, type Profile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SkeletonCard,
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

/**
 * Honest client-side heuristic: how much this opportunity overlaps with the
 * signed-in profile. Labeled "profile match" — not an official ranking.
 */
function matchProfile(
  opp: Opportunity,
  profile: Profile | null,
): { score: number; reasons: string[] } {
  if (!profile) return { score: 0, reasons: [] };

  const skills = (profile.skills ?? []).map((s) => s.toLowerCase());
  const interests = (profile.interests ?? []).map((i) => i.toLowerCase());
  const goals = (profile.career_goals ?? "").toLowerCase();
  const degree = (profile.education?.degree ?? "").toLowerCase();
  const haystack = [
    opp.title,
    opp.description ?? "",
    opp.organization ?? "",
    ...(opp.tags ?? []),
    ...(opp.requirements ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  const skillHits = skills.filter((s) => s.length > 1 && haystack.includes(s));
  if (skillHits.length > 0) {
    score += Math.min(40, skillHits.length * 12);
    reasons.push(`Skills overlap: ${skillHits.slice(0, 3).join(", ")}`);
  }

  const interestHits = interests.filter(
    (i) => haystack.includes(i) || (opp.tags ?? []).some((t) => t.toLowerCase().includes(i)),
  );
  if (interestHits.length > 0) {
    score += Math.min(25, interestHits.length * 10);
    reasons.push(`Matches your interests: ${interestHits.slice(0, 2).join(", ")}`);
  }

  const goalWords = goals.split(/[^a-z]+/).filter((w) => w.length > 4);
  const goalHits = goalWords.filter((w) => haystack.includes(w));
  if (goalHits.length > 0) {
    score += Math.min(20, goalHits.length * 7);
    reasons.push("Aligns with your stated career direction");
  }

  if (opp.type === "masters_program" && /master|msc|m\.s\./.test(degree)) {
    score += 8;
    reasons.push("Graduate-level fit for your degree");
  }
  if (opp.type === "internship" && /in progress|expected|bache|undergrad/.test(degree)) {
    score += 8;
    reasons.push("Suited to current students");
  }

  if (reasons.length === 0) reasons.push("Explore this one to see if it fits");
  return { score: Math.min(95, score), reasons };
}

function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 60
      ? "border-sage/60 bg-sage/15 text-sage-dim"
      : score >= 30
        ? "border-eucalyptus/40 bg-eucalyptus/10 text-eucalyptus"
        : "border-hairline bg-canvas text-slate-ink";
  return (
    <div className={`shrink-0 rounded-card border px-3 py-2 text-center ${tone}`}>
      <p className="font-display text-lg font-semibold leading-none">{score}%</p>
      <p className="label-mono mt-1 text-[8px]">profile match</p>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string> | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    listOpportunities({ type: typeFilter || undefined, search: search || undefined })
      .then(setOpportunities)
      .catch((err) => setError(friendlyError(err)));
  }, [typeFilter, search]);

  useEffect(load, [load]);

  useEffect(() => {
    listSavedOpportunityIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => setSavedIds(new Set())); // saved badges are cosmetic — ignore errors
  }, []);

  // Rank by profile match so the most relevant rise to the top (equal scores keep server order).
  const ranked = useMemo(() => {
    if (!opportunities || !profile) return opportunities ?? [];
    return [...opportunities].sort(
      (a, b) => matchProfile(b, profile).score - matchProfile(a, profile).score,
    );
  }, [opportunities, profile]);

  const toggleSave = async (opp: Opportunity) => {
    if (busyId) return;
    setBusyId(opp.id);
    try {
      if (savedIds?.has(opp.id)) {
        await unsaveOpportunity(opp.id);
        setSavedIds((prev) => {
          const next = new Set(prev ?? []);
          next.delete(opp.id);
          return next;
        });
      } else {
        await saveOpportunity(opp.id);
        setSavedIds((prev) => new Set(prev ?? []).add(opp.id));
        toast("Saved to your shortlist.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyId("");
    }
  };

  const trackApplication = async (opp: Opportunity) => {
    if (busyId) return;
    setBusyId(opp.id);
    try {
      await createApplication(opp.id, "interested");
      toast(`Tracking “${opp.title}” — moved to Interested.`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="workspace"
        title="Opportunities"
        subtitle={
          profile
            ? "Ranked by overlap with your profile — programs, scholarships, internships, jobs, and certifications"
            : "Curated programs, scholarships, internships, jobs, and certifications"
        }
        actions={
          <Link to="/applications">
            <Button variant="secondary">View tracker</Button>
          </Link>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-ink/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, organization…"
            className="input-focus w-64 rounded-btn border border-hairline bg-card py-2 pl-9 pr-3 text-sm"
          />
        </div>
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

      {!opportunities || !savedIds ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState
          title="No opportunities match"
          hint="Try clearing the search or filters"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ranked.map((opp) => {
            const days = daysUntil(opp.deadline);
            const saved = savedIds.has(opp.id);
            const match = matchProfile(opp, profile);
            return (
              <Card key={opp.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip>{TYPE_LABELS[opp.type] ?? opp.type}</Chip>
                      {opp.tags?.slice(0, 2).map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-navy">{opp.title}</h3>
                    <p className="text-sm text-slate-ink">{opp.organization ?? "—"}</p>
                  </div>
                  {profile && <MatchBadge score={match.score} />}
                </div>

                {match.reasons.length > 0 && profile && (
                  <div className="mt-3 space-y-1">
                    {match.reasons.slice(0, 2).map((reason) => (
                      <p key={reason} className="flex items-start gap-1.5 text-xs text-sage-dim">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-sage" />
                        {reason}
                      </p>
                    ))}
                  </div>
                )}

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
                    {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                    {saved ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => trackApplication(opp)}
                    disabled={busyId === opp.id}
                  >
                    Track application
                  </Button>
                  {opp.url && (
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-eucalyptus transition-colors hover:underline"
                    >
                      open link
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {opp.deadline && (
                  <div className="mt-3 flex items-center justify-between border-t border-separator pt-3">
                    <span className="font-mono text-[10px] text-slate-ink/60">
                      deadline {formatDate(opp.deadline)}
                    </span>
                    {days !== null && (
                      <span
                        className={`font-mono text-[10px] ${
                          days < 0
                            ? "text-slate-ink/50"
                            : days <= 30
                              ? "text-error"
                              : "text-sage-dim"
                        }`}
                      >
                        {days < 0 ? "closed" : `${days}d left`}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
