"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  addProjectMember,
  createProjectMilestone,
  createProjectComment,
  createProjectTask,
  deleteProjectAsset,
  deleteProjectComment,
  deleteProjectMilestone,
  deleteProjectTask,
  removeProjectMember,
  updateProject,
  updateProjectMilestone,
  updateProjectTask,
  uploadProjectAsset,
} from "@/lib/actions/projects";
import type {
  ActionState,
  ActivityItem,
  BillingGatePayload,
  PlanLimitPayload,
  Profile,
  ProjectAssetWithUrl,
  ProjectCommentWithAuthor,
  ProjectMilestone,
  ProjectTaskWithAssignee,
  ProjectWithMembers,
} from "@/lib/types";
import { BillingGateAlert } from "@/components/dashboard/BillingGateAlert";
import { PlanLimitAlert } from "@/components/dashboard/PlanLimitAlert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

const initialState: ActionState = {};

function getPlanLimitPayload(payload: ActionState["payload"]): PlanLimitPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.kind !== "plan_limit") {
    return null;
  }

  return payload as PlanLimitPayload;
}

function getBillingGatePayload(payload: ActionState["payload"]): BillingGatePayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.kind !== "billing_gate") {
    return null;
  }

  return payload as BillingGatePayload;
}

interface ProjectDetailEditorProps {
  project: ProjectWithMembers;
  canManage: boolean;
  currentUserId: string | null;
  availableMembers: Profile[];
  activity: ActivityItem[];
  assets: ProjectAssetWithUrl[];
  milestones: ProjectMilestone[];
  tasks: ProjectTaskWithAssignee[];
  comments: ProjectCommentWithAuthor[];
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
  currentUserId,
  availableMembers,
  activity,
  assets,
  milestones,
  tasks,
  comments,
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
  const [assetState, uploadAssetAction, isAssetPending] = useActionState(
    uploadProjectAsset.bind(null, project.id),
    initialState,
  );
  const [milestoneState, createMilestoneAction, isMilestonePending] = useActionState(
    createProjectMilestone.bind(null, project.id),
    initialState,
  );
  const [taskState, createTaskAction, isTaskPending] = useActionState(
    createProjectTask.bind(null, project.id),
    initialState,
  );
  const [commentState, createCommentAction, isCommentPending] = useActionState(
    createProjectComment.bind(null, project.id),
    initialState,
  );
  const [isRemovingMember, startRemoveTransition] = useTransition();
  const [isDeletingAsset, startDeleteAssetTransition] = useTransition();
  const [isUpdatingDelivery, startDeliveryTransition] = useTransition();
  const [isDeletingComment, startCommentDeleteTransition] = useTransition();
  const { showToast } = useToast();
  const lastProjectMessageRef = useRef<string | null>(null);
  const lastMemberMessageRef = useRef<string | null>(null);
  const lastAssetMessageRef = useRef<string | null>(null);
  const lastMilestoneMessageRef = useRef<string | null>(null);
  const lastTaskMessageRef = useRef<string | null>(null);
  const lastCommentMessageRef = useRef<string | null>(null);
  const [activeRemovalId, setActiveRemovalId] = useState<string | null>(null);
  const [activeAssetDeleteId, setActiveAssetDeleteId] = useState<string | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const coverAsset = assets.find((asset) => asset.asset_type === "cover") ?? null;
  const attachmentAssets = assets.filter((asset) => asset.asset_type === "attachment");
  const assetPlanLimitPayload = getPlanLimitPayload(assetState.payload);
  const assetBillingGatePayload = getBillingGatePayload(assetState.payload);

  useEffect(() => {
    setSelectedMemberId(availableMembers[0]?.id ?? "");
  }, [availableMembers]);

  useEffect(() => {
    if (projectState.message && projectState.message !== lastProjectMessageRef.current) {
      lastProjectMessageRef.current = projectState.message;
      showToast({
        tone: projectState.success ? "success" : "error",
        message: projectState.message,
      });
    }
  }, [projectState.message, projectState.success, showToast]);

  useEffect(() => {
    if (
      memberState.message &&
      memberState.message !== lastMemberMessageRef.current &&
      !memberState.fieldErrors?.userId?.[0]
    ) {
      lastMemberMessageRef.current = memberState.message;
      showToast({
        tone: memberState.success ? "success" : "error",
        message: memberState.message,
      });
    }
  }, [memberState.fieldErrors, memberState.message, memberState.success, showToast]);

  useEffect(() => {
    if (
      assetState.message &&
      assetState.message !== lastAssetMessageRef.current &&
      !assetState.fieldErrors?.assetFile?.[0]
    ) {
      lastAssetMessageRef.current = assetState.message;
      showToast({
        tone: assetState.success ? "success" : "error",
        message: assetState.message,
      });
    }
  }, [assetState.fieldErrors, assetState.message, assetState.success, showToast]);

  useEffect(() => {
    if (
      milestoneState.message &&
      milestoneState.message !== lastMilestoneMessageRef.current &&
      !milestoneState.fieldErrors?.title?.[0]
    ) {
      lastMilestoneMessageRef.current = milestoneState.message;
      showToast({
        tone: milestoneState.success ? "success" : "error",
        message: milestoneState.message,
      });
    }
  }, [milestoneState.fieldErrors, milestoneState.message, milestoneState.success, showToast]);

  useEffect(() => {
    if (
      taskState.message &&
      taskState.message !== lastTaskMessageRef.current &&
      !taskState.fieldErrors?.title?.[0]
    ) {
      lastTaskMessageRef.current = taskState.message;
      showToast({
        tone: taskState.success ? "success" : "error",
        message: taskState.message,
      });
    }
  }, [taskState.fieldErrors, taskState.message, taskState.success, showToast]);

  useEffect(() => {
    if (
      commentState.message &&
      commentState.message !== lastCommentMessageRef.current &&
      !commentState.fieldErrors?.body?.[0]
    ) {
      lastCommentMessageRef.current = commentState.message;
      showToast({
        tone: commentState.success ? "success" : "error",
        message: commentState.message,
      });
    }
  }, [commentState.fieldErrors, commentState.message, commentState.success, showToast]);

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
                    startTransition(() => {
                      showToast({ tone: "pending", message: "Saving project title..." });
                      submitProjectAction(formData);
                    });
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
                  startTransition(() => {
                    showToast({ tone: "pending", message: "Saving project description..." });
                    submitProjectAction(formData);
                  });
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
            <h2 className="text-lg font-semibold text-slate-950">Delivery plan</h2>
            <p className="text-sm text-slate-500">Track milestones and execution tasks directly inside the project workspace.</p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              {canManage ? (
                <form
                  action={(formData) => {
                    startTransition(() => {
                      showToast({ tone: "pending", message: "Creating milestone..." });
                      createMilestoneAction(formData);
                    });
                  }}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="grid gap-3">
                    <Input
                      name="title"
                      label="New milestone"
                      placeholder="Launch client review"
                      error={milestoneState.fieldErrors?.title?.[0]}
                    />
                    <Input name="dueDate" label="Due date" type="date" error={milestoneState.fieldErrors?.dueDate?.[0]} />
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Notes</span>
                      <textarea
                        name="notes"
                        className="min-h-24 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                        placeholder="What should be complete by this milestone?"
                      />
                    </label>
                    <input type="hidden" name="status" value="planned" />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" loading={isMilestonePending}>
                        Add milestone
                      </Button>
                    </div>
                  </div>
                </form>
              ) : null}
              <div className="space-y-3">
                {milestones.length > 0 ? (
                  milestones.map((milestone) => (
                    <div key={milestone.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{milestone.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Due {milestone.due_date ?? "not set"}
                          </p>
                          {milestone.notes ? <p className="mt-2 text-sm leading-6 text-slate-500">{milestone.notes}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              milestone.status === "completed"
                                ? "success"
                                : milestone.status === "in_progress"
                                  ? "info"
                                  : "neutral"
                            }
                          >
                            {milestone.status.replace("_", " ")}
                          </Badge>
                          {canManage ? (
                            <>
                              <select
                                value={milestone.status}
                                onChange={(event) => {
                                  const formData = new FormData();
                                  formData.set("status", event.target.value);
                                  startDeliveryTransition(async () => {
                                    setActiveMilestoneId(milestone.id);
                                    showToast({ tone: "pending", message: `Updating ${milestone.title}...` });
                                    const result = await updateProjectMilestone(project.id, milestone.id, {}, formData);
                                    setActiveMilestoneId(null);
                                    if (result.message) {
                                      showToast({
                                        tone: result.success ? "success" : "error",
                                        message: result.message,
                                      });
                                    }
                                  });
                                }}
                                className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                                disabled={isUpdatingDelivery && activeMilestoneId === milestone.id}
                              >
                                <option value="planned">Planned</option>
                                <option value="in_progress">In progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                loading={isUpdatingDelivery && activeMilestoneId === milestone.id}
                                onClick={() => {
                                  if (!window.confirm(`Delete milestone "${milestone.title}"?`)) {
                                    return;
                                  }

                                  startDeliveryTransition(async () => {
                                    setActiveMilestoneId(milestone.id);
                                    showToast({ tone: "pending", message: `Deleting ${milestone.title}...` });
                                    const result = await deleteProjectMilestone(project.id, milestone.id);
                                    setActiveMilestoneId(null);
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
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
                    No milestones yet. Break the project into meaningful delivery checkpoints.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {canManage ? (
                <form
                  action={(formData) => {
                    startTransition(() => {
                      showToast({ tone: "pending", message: "Creating task..." });
                      createTaskAction(formData);
                    });
                  }}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      name="title"
                      label="New task"
                      placeholder="Draft KPI summary"
                      error={taskState.fieldErrors?.title?.[0]}
                    />
                    <Input name="dueDate" label="Due date" type="date" error={taskState.fieldErrors?.dueDate?.[0]} />
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Priority</span>
                      <select
                        name="priority"
                        className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Assignee</span>
                      <select
                        name="assigneeId"
                        className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">Unassigned</option>
                        {project.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name ?? member.email ?? member.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input type="hidden" name="status" value="todo" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button type="submit" size="sm" loading={isTaskPending}>
                      Add task
                    </Button>
                  </div>
                </form>
              ) : null}
              <div className="space-y-3">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span>Due {task.due_date ?? "not set"}</span>
                            <span>•</span>
                            <span>{task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={task.priority === "high" ? "warning" : task.priority === "medium" ? "info" : "neutral"}>
                            {task.priority}
                          </Badge>
                          <select
                            value={task.status}
                            onChange={(event) => {
                              const formData = new FormData();
                              formData.set("status", event.target.value);
                              startDeliveryTransition(async () => {
                                setActiveTaskId(task.id);
                                showToast({ tone: "pending", message: `Updating ${task.title}...` });
                                const result = await updateProjectTask(project.id, task.id, {}, formData);
                                setActiveTaskId(null);
                                if (result.message) {
                                  showToast({
                                    tone: result.success ? "success" : "error",
                                    message: result.message,
                                  });
                                }
                              });
                            }}
                            className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                            disabled={!canManage || (isUpdatingDelivery && activeTaskId === task.id)}
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              loading={isUpdatingDelivery && activeTaskId === task.id}
                              onClick={() => {
                                if (!window.confirm(`Delete task "${task.title}"?`)) {
                                  return;
                                }

                                startDeliveryTransition(async () => {
                                  setActiveTaskId(task.id);
                                  showToast({ tone: "pending", message: `Deleting ${task.title}...` });
                                  const result = await deleteProjectTask(project.id, task.id);
                                  setActiveTaskId(null);
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
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
                    No delivery tasks yet. Add the execution work that turns this project into a believable operating workspace.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">Discussion</h2>
            <p className="text-sm text-slate-500">Capture delivery notes, clarifications, and task-linked conversation inside the project.</p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <form
              action={(formData) => {
                startTransition(() => {
                  showToast({ tone: "pending", message: "Posting comment..." });
                  createCommentAction(formData);
                });
              }}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
            >
              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Comment</span>
                  <textarea
                    name="body"
                    className="min-h-32 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                    placeholder="Share project context, blockers, decisions, or next steps."
                  />
                </label>
                {commentState.fieldErrors?.body?.[0] ? (
                  <p className="text-sm text-red-600">{commentState.fieldErrors.body[0]}</p>
                ) : null}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Link to task</span>
                  <select
                    name="taskId"
                    className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">Project-wide note</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={isCommentPending}>
                    Post comment
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <article key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {comment.author?.full_name ?? comment.author?.email ?? "Workspace member"}
                          </p>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{comment.relativeTime}</span>
                          {comment.task_id ? (
                            <Badge tone="info">
                              {tasks.find((task) => task.id === comment.task_id)?.title ?? "Task thread"}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{comment.body}</p>
                      </div>
                      {(canManage || comment.author_id === currentUserId) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={isDeletingComment && activeCommentId === comment.id}
                          onClick={() => {
                            if (!window.confirm("Delete this comment?")) {
                              return;
                            }

                            startCommentDeleteTransition(async () => {
                              setActiveCommentId(comment.id);
                              showToast({ tone: "pending", message: "Removing comment..." });
                              const result = await deleteProjectComment(project.id, comment.id);
                              setActiveCommentId(null);
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
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-500">
                  No discussion yet. Use comments to capture decisions, delivery notes, and task context.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-950">Project assets</h2>
            <p className="text-sm text-slate-500">Keep a real cover image and working files attached to the project brief.</p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/80">
                {coverAsset ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverAsset.publicUrl} alt={`${project.name} cover`} className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_45%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.88))] p-8 text-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Cover image</p>
                      <p className="mt-3 text-lg font-semibold text-white">No cover uploaded yet</p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                        Add a project cover to make delivery pages feel like a real client workspace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {coverAsset ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{coverAsset.file_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {(coverAsset.file_size / (1024 * 1024)).toFixed(2)} MB cover image
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a href={coverAsset.publicUrl} target="_blank" rel="noreferrer">
                        <Button type="button" variant="secondary" size="sm">
                          Open
                        </Button>
                      </a>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={isDeletingAsset && activeAssetDeleteId === coverAsset.id}
                          onClick={() => {
                            if (!window.confirm("Delete the project cover image?")) {
                              return;
                            }

                            startDeleteAssetTransition(async () => {
                              setActiveAssetDeleteId(coverAsset.id);
                              showToast({ tone: "pending", message: "Removing project cover..." });
                              const result = await deleteProjectAsset(project.id, coverAsset.id);
                              setActiveAssetDeleteId(null);
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
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {canManage ? (
                <>
                  {assetBillingGatePayload ? <BillingGateAlert payload={assetBillingGatePayload} /> : null}
                  {assetPlanLimitPayload ? <PlanLimitAlert payload={assetPlanLimitPayload} /> : null}
                  <form
                    action={(formData) => {
                      formData.set("assetType", "cover");
                      startTransition(() => {
                        showToast({ tone: "pending", message: "Uploading project cover..." });
                        uploadAssetAction(formData);
                      });
                    }}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                  >
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Update cover image</span>
                      <input
                        type="file"
                        name="assetFile"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="block h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                      />
                    </label>
                    {assetState.fieldErrors?.assetFile?.[0] ? (
                      <p className="mt-2 text-sm text-red-600">{assetState.fieldErrors.assetFile[0]}</p>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <Button type="submit" size="sm" loading={isAssetPending}>
                        Upload cover
                      </Button>
                    </div>
                  </form>

                  <form
                    action={(formData) => {
                      formData.set("assetType", "attachment");
                      startTransition(() => {
                        showToast({ tone: "pending", message: "Uploading attachment..." });
                        uploadAssetAction(formData);
                      });
                    }}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                  >
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Upload attachment</span>
                      <input
                        type="file"
                        name="assetFile"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.md,.txt,.docx,.xlsx,.ppt,.pptx"
                        className="block h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                      />
                    </label>
                    {assetState.fieldErrors?.assetFile?.[0] ? (
                      <p className="mt-2 text-sm text-red-600">{assetState.fieldErrors.assetFile[0]}</p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Upload briefs, reports, screenshots, and working docs up to 20 MB.</p>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button type="submit" size="sm" loading={isAssetPending}>
                        Upload file
                      </Button>
                    </div>
                  </form>
                </>
              ) : null}

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-900">Attachments</h3>
                  <Badge tone="info">{attachmentAssets.length}</Badge>
                </div>
                {attachmentAssets.length > 0 ? (
                  <div className="space-y-3">
                    {attachmentAssets.map((asset) => (
                      <div key={asset.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{asset.file_name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {(asset.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <a href={asset.publicUrl} target="_blank" rel="noreferrer">
                              <Button type="button" variant="secondary" size="sm">
                                Open
                              </Button>
                            </a>
                            {canManage ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                loading={isDeletingAsset && activeAssetDeleteId === asset.id}
                                onClick={() => {
                                  if (!window.confirm(`Delete ${asset.file_name}?`)) {
                                    return;
                                  }

                                  startDeleteAssetTransition(async () => {
                                    setActiveAssetDeleteId(asset.id);
                                    showToast({ tone: "pending", message: `Removing ${asset.file_name}...` });
                                    const result = await deleteProjectAsset(project.id, asset.id);
                                    setActiveAssetDeleteId(null);
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    No attachments yet. Upload project docs, exports, or visual references here.
                  </p>
                )}
              </div>
            </div>
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
                  showToast({ tone: "pending", message: "Adding collaborator..." });
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
                        loading={isRemovingMember && activeRemovalId === member.id}
                        onClick={() => {
                          if (!window.confirm(`Remove ${member.full_name ?? member.email ?? "this collaborator"} from the project?`)) {
                            return;
                          }

                          startRemoveTransition(async () => {
                            setActiveRemovalId(member.id);
                            showToast({
                              tone: "pending",
                              message: `Removing ${member.full_name ?? member.email ?? "collaborator"}...`,
                            });
                            const result = await removeProjectMember(project.id, member.id);
                            setActiveRemovalId(null);
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
