"use client";

import { startTransition, useActionState, useState } from "react";

import { updateProject } from "@/lib/actions/projects";
import type { ActionState, ProjectWithMembers } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: ActionState = {};

interface ProjectDetailEditorProps {
  project: ProjectWithMembers;
}

export function ProjectDetailEditor({ project }: ProjectDetailEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [state, submitAction, isPending] = useActionState(updateProject.bind(null, project.id), initialState);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
      <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            {editingTitle ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  startTransition(() => submitAction(formData));
                  setEditingTitle(false);
                }}
                className="flex flex-wrap items-center gap-3"
              >
                <Input name="name" defaultValue={project.name} className="min-w-64" />
                <Button type="submit" size="sm" loading={isPending}>
                  Save
                </Button>
              </form>
            ) : (
              <button type="button" className="text-left" onClick={() => setEditingTitle(true)}>
                <h1 className="text-3xl font-semibold text-slate-950">{project.name}</h1>
              </button>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={project.status === "active" ? "success" : project.status === "paused" ? "warning" : project.status === "completed" ? "info" : "neutral"}>
                {project.status}
              </Badge>
              <span className="text-sm text-slate-500">Due {project.due_date ?? "not set"}</span>
            </div>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Project brief</h2>
            {!editingDescription ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                Edit
              </Button>
            ) : null}
          </div>
          {editingDescription ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                startTransition(() => submitAction(formData));
                setEditingDescription(false);
              }}
              className="space-y-3"
            >
              <textarea
                name="description"
                defaultValue={project.description ?? ""}
                className="min-h-36 w-full rounded-2xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
              />
              <div className="flex gap-3">
                <Button type="submit" size="sm" loading={isPending}>
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button type="button" className="w-full rounded-2xl bg-slate-50 p-4 text-left text-sm leading-7 text-slate-600" onClick={() => setEditingDescription(true)}>
              {project.description ?? "Add project context, goals, and ownership details."}
            </button>
          )}
          {state.message ? <p className={state.success ? "text-sm text-emerald-600" : "text-sm text-red-600"}>{state.message}</p> : null}
        </div>
      </section>

      <aside className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-slate-950">Team members</h2>
        <p className="mt-1 text-sm text-slate-500">Current collaborators with project visibility.</p>
        <div className="mt-5 space-y-4">
          {project.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-sm font-semibold text-white">
                {member.full_name?.slice(0, 1) ?? "P"}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{member.full_name}</p>
                <p className="truncate text-sm text-slate-500">{member.email ?? "No email available"}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
