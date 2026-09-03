import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Target } from "lucide-react";
import { createGoal, friendlyError, listGoals } from "../api/client";
import type { GoalListItem } from "../api/types";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageHeader,
  SkeletonCard,
  StatusBadge,
  Textarea,
  formatDate,
} from "../components/ui";

export default function GoalsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [goals, setGoals] = useState<GoalListItem[] | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    listGoals()
      .then(setGoals)
      .catch((err) => setError(friendlyError(err)));
  }, []);

  useEffect(load, [load]);

  function openModal() {
    setTitle("");
    setDescription("");
    setTargetDate("");
    setFieldError("");
    setModalOpen(true);
  }

  async function handleCreate() {
    if (creating) return;
    if (!title.trim()) {
      setFieldError("Give your goal a name — e.g. “Land a summer internship”.");
      return;
    }
    setFieldError("");
    setCreating(true);
    try {
      const goal = await createGoal({
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
      });
      toast("Goal created — generate a roadmap next.");
      setModalOpen(false);
      navigate(`/goals/${goal.id}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="workspace"
        title="Goals"
        subtitle="Each goal becomes a living roadmap of milestones and tasks"
        actions={
          <Button onClick={openModal}>
            <Plus size={15} />
            New goal
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {!goals ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title="No goals yet"
          hint="Your first goal is the seed of everything else — roadmaps, opportunities, and AI guidance all grow from it."
          action={
            <Button onClick={openModal}>
              <Plus size={15} />
              Create a goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} interactive className="flex flex-col p-5">
              <Link to={`/goals/${goal.id}`} className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-navy">
                    {goal.title}
                  </h3>
                  <StatusBadge status={goal.status} />
                </div>
                {goal.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-ink">
                    {goal.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center gap-3 font-mono text-[10px] text-slate-ink/60">
                    {goal.target_date && <span>target {formatDate(goal.target_date)}</span>}
                    <span>created {formatDate(goal.created_at)}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage-dim">
                    Open
                    <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a goal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Create goal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Goal" error={fieldError || undefined}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Land a software engineering internship this summer"
              autoFocus
              invalid={!!fieldError}
            />
          </Field>
          <Field label="Context (optional)" hint="Constraints, preferences, location — anything that sharpens the roadmap.">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="I'm interested in AI/ML roles and want to stay in Europe…"
            />
          </Field>
          <Field label="Target date (optional)">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
