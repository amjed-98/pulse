"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";

import { addProjectMember, removeProjectMember, updateProject } from "@/lib/actions/projects";
import type { ActionState, ActivityItem, Profile, ProjectWithMembers } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

const initialState: ActionState = {};

interface ProjectDetailEditorProps {
  project: ProjectWithMembers;
  canManage: boolean;
  availableMembers: Profile[];
  activity: ActivityItem[];
}

const activityTone = {
  project: "bg-indigo-50 text-indigo-700",
  team: "bg-sky-50 text-sky-700",
  revenue: "bg-emerald-50 text-emerald-700",
  system: "bg-slate-100 text-slate-600",
};

export function ProjectDetailEditor({
  project,
  canManage,
  availableMembers,
  activity,
}: ProjectDetailEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(availableMembers[0]?.id ?? "");
  const [projectState, submitProjectAction, isProjectPending] = useActionState(
    updateProject.bind(null, project.id),
    initialState,
  );
  const [memberState, addMemberAction, isMemberPending] = useActionState(
    addProjectMember.bind(null, project.id),
    initialState,
  );
  const [isRemovingMember, startRemoveTransition] = useTransition();
  const { showToast } = useToast();

  useEffect(() => {
    setSelectedMemberId(availableMembers[0]?.id ?? "");
  }, [availableMembers]);

  useEffect(() => {
    if (projectState.message) {
      showToast({
        tone: projectState.success ? "success" : "error",
        message: projectState.message,
      });
    }
  }, [projectState.message, projectState.success, showToast]);

  useEffect(() => {
    if (memberState.message && !memberState.fieldErrors?.userId?.[0]) {
      showToast({
        tone: memberState.success ? "success" : "error",
        message: memberState.message,
      });
    }
  }, [memberState.fieldErrors, memberState.message, memberState.success, showToast]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
      <section className="space-y-6">
        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              {editingTitle && canManage ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    startTransition(() => submitProjectAction(formData));
                    setEditingTitle(false);
                  }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Input name="name" defaultValue={project.name} className="min-w-64" />
                  <Button type="submit" size="sm" loading={isProjectPending}>
                    Save
                  </Button>
                </form>
              ) : canManage ? (
                <button type="button" className="text-left" onClick={() => setEditingTitle(true)}>
                  <h1 className="text-3xl font-semibold text-slate-950">{project.name}</h1>
                </button>
              ) : (
                <h1 className="text-3xl font-semibold text-slate-950">{project.name}</h1>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  tone={
                    project.status === "active"
                      ? "success"
                      : project.status === "paused"
                        ? "warning"
                        : project.status === "completed"
                          ? "info"
                          : "neutral"
                  }
                >
                  {project.status}
                </Badge>
                <span className="text-sm text-slate-500">Due {project.due_date ?? "not set"}</span>
                <span className="text-sm text-slate-500">{project.members.length} collaborators</span>
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
              {!editingDescription && canManage ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                  Edit
                </Button>
              ) : null}
            </div>
            {editingDescription && canManage ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  startTransition(() => submitProjectAction(formData));
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
                  <Button type="submit" size="sm" loading={isProjectPending}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : canManage ? (
              <button
                type="button"
                className="w-full rounded-2xl bg-slate-50 p-4 text-left text-sm leading-7 text-slate-600"
                onClick={() => setEditingDescription(true)}
              >
                {project.description ?? "Add project context, goals, and ownership details."}
              </button>
            ) : (
              <div className="w-full rounded-2xl bg-slate-50 p-4 text-left text-sm leading-7 text-slate-600">
                {project.description ?? "Add project context, goals, and ownership details."}
              </div>
            )}
            {!canManage ? (
              <p className="text-sm text-slate-500">Only the project owner or an admin can edit this project.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">Project activity</h2>
            <p className="text-sm text-slate-500">A scoped timeline of changes and collaboration events for this project.</p>
          </div>
          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-2xl bg-slate-950 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <h3 className="font-medium text-slate-900">{item.title}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activityTone[item.type]}`}>
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{item.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
              No project-scoped activity yet. Updates, member changes, and status edits will appear here automatically.
            </div>
          )}
        </section>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-slate-950">Collaborators</h2>
          <p className="mt-1 text-sm text-slate-500">Members with visibility into this project and its recent changes.</p>

          {canManage ? (
            <form
              action={(formData) => {
                startTransition(() => {
                  addMemberAction(formData);
                });
              }}
              className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
            >
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Add collaborator</span>
                <select
                  name="userId"
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                  className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                  disabled={availableMembers.length === 0}
                >
                  {availableMembers.length === 0 ? (
                    <option value="">No more teammates available</option>
                  ) : (
                    availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name ?? member.email ?? member.id}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {memberState.fieldErrors?.userId?.[0] ? (
                <p className="text-sm text-red-600">{memberState.fieldErrors.userId[0]}</p>
              ) : null}
              <Button type="submit" size="sm" loading={isMemberPending} disabled={availableMembers.length === 0 || !selectedMemberId}>
                Add to project
              </Button>
            </form>
          ) : null}

          <div className="mt-5 space-y-4">
            {project.members.map((member) => {
              const isOwner = member.id === project.owner_id;

              return (
                <div key={member.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-sm font-semibold text-white">
                      {member.full_name?.slice(0, 1) ?? "P"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{member.full_name}</p>
                        <Badge tone={isOwner ? "warning" : "info"}>{isOwner ? "owner" : member.role}</Badge>
                      </div>
                      <p className="truncate text-sm text-slate-500">{member.email ?? "No email available"}</p>
                    </div>
                    {canManage && !isOwner ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={isRemovingMember}
                        onClick={() => {
                          if (!window.confirm(`Remove ${member.full_name ?? member.email ?? "this collaborator"} from the project?`)) {
                            return;
                          }

                          startRemoveTransition(async () => {
                            const result = await removeProjectMember(project.id, member.id);
                            if (result.message) {
                              showToast({
                                tone: result.success ? "success" : "error",
                                message: result.message,
                              });
                            }
                          });
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-slate-950">Collaboration health</h2>
          <p className="mt-1 text-sm text-slate-500">Quick signals that make this project read like a real delivery environment.</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Member count</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{project.members.length}</p>
              <p className="mt-1 text-sm text-slate-500">Owner plus assigned collaborators with project access.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Latest activity</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{activity[0]?.timestamp ?? "None yet"}</p>
              <p className="mt-1 text-sm text-slate-500">Project timeline updates appear as actions happen.</p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
