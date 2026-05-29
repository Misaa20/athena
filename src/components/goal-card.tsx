"use client";

import { useEffect, useState } from "react";
import { GoalRing } from "@/components/goal-ring";
import { authedFetch } from "@/lib/client";

type Goal = { year: number; target: number | null; read: number };

// Dashboard widget: shows the yearly reading-goal ring and lets the user set or
// change the target. Loads its own state once authenticated.
export function GoalCard() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    authedFetch<Goal>("/api/me/goal")
      .then((g) => {
        setGoal(g);
        if (g.target) setDraft(String(g.target));
      })
      .catch(() => setGoal({ year: new Date().getFullYear(), target: null, read: 0 }));
  }, []);

  async function save() {
    const target = Number(draft);
    if (!target || target < 1) return;
    setSaving(true);
    setError(false);
    try {
      const g = await authedFetch<Goal>("/api/me/goal", {
        method: "PUT",
        body: JSON.stringify({ target }),
      });
      setGoal(g);
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!goal) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-100/60 p-6 text-sm text-ink-900/40">
        Loading goal…
      </div>
    );
  }

  const hasGoal = goal.target !== null;
  const remaining = hasGoal ? Math.max(0, goal.target! - goal.read) : 0;

  return (
    <div className="flex items-center gap-6 rounded-xl border border-ink-200 bg-ink-100/60 p-6 backdrop-blur">
      {hasGoal ? (
        <>
          <GoalRing read={goal.read} target={goal.target!} />
          <div className="space-y-1">
            <p className="font-serif text-lg text-ink-900">{goal.year} reading goal</p>
            <p className="text-sm text-ink-900/70">
              {goal.read >= goal.target!
                ? "🎉 Goal reached — beautiful work."
                : `${remaining} book${remaining === 1 ? "" : "s"} to go.`}
            </p>
            {editing ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-8 w-20 rounded-md border border-ink-200 bg-ink-100 px-2 text-sm text-ink-900 focus:border-accent focus:outline-none"
                />
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-ink-900 px-3 py-1 text-sm text-ink-50 hover:bg-ink-950 disabled:opacity-50"
                >
                  {saving ? "…" : "Save"}
                </button>
                {error && <span className="text-xs text-wine">Couldn’t save — try again.</span>}
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="pt-1 text-sm text-accent hover:underline"
              >
                Change goal
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="font-serif text-lg text-ink-900">Set a {goal.year} reading goal</p>
          <p className="text-sm text-ink-900/60">How many books do you want to read this year?</p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              placeholder="24"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9 w-24 rounded-md border border-ink-200 bg-ink-100 px-3 text-sm text-ink-900 focus:border-accent focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving || !draft}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-ink-50 hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "…" : "Set goal"}
            </button>
            {error && <span className="text-xs text-wine">Couldn’t save — try again.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
