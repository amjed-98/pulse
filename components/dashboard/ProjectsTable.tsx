"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteProject } from "@/lib/actions/projects";
import type { ProjectWithMembers } from "@/lib/types";
import { formatDate, getStatusTone } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ProjectsTableProps {
  projects: ProjectWithMembers[];
}

type SortKey = "name" | "status" | "due_date";

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [isPending, startTransition] = useTransition();

  const sortedProjects = [...projects].sort((left, right) => {
    if (sortKey === "due_date") {
      return (left.due_date ?? "").localeCompare(right.due_date ?? "");
    }

    return left[sortKey].localeCompare(right[sortKey]);
  });

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Project portfolio</h2>
          <p className="text-sm text-slate-500">Sort the list client-side and jump into project detail views.</p>
        </div>
        <div className="flex gap-2">
          {(["name", "status", "due_date"] as const).map((key) => (
            <Button key={key} type="button" size="sm" variant={sortKey === key ? "primary" : "secondary"} onClick={() => setSortKey(key)}>
              Sort by {key === "due_date" ? "due date" : key}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-slate-400">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Progress</th>
              <th className="px-5 py-4">Due date</th>
              <th className="px-5 py-4">Members</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedProjects.map((project) => (
              <tr key={project.id} className="align-top">
                <td className="px-5 py-4">
                  <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 transition hover:text-[var(--color-accent)]">
                    {project.name}
                  </Link>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{project.description ?? "No description provided."}</p>
                </td>
                <td className="px-5 py-4">
                  <Badge tone={getStatusTone(project.status)}>{project.status}</Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex min-w-32 items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-sm text-slate-600">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{formatDate(project.due_date)}</td>
                <td className="px-5 py-4">
                  <div className="flex -space-x-3">
                    {project.members.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.id}
                        src={member.avatar_url}
                        name={member.full_name}
                        className="size-9 border-2 border-white"
                      />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete ${project.name}?`)) {
                          return;
                        }

                        startTransition(async () => {
                          await deleteProject(project.id);
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
