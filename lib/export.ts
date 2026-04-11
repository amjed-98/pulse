import type {
  ActivityItem,
  AnalyticsEvent,
  ProjectAssetWithUrl,
  ProjectCommentWithAuthor,
  ProjectMilestone,
  ProjectTaskWithAssignee,
  ProjectWithMembers,
} from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/utils";

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

export function buildAnalyticsEventsCsv(events: AnalyticsEvent[]) {
  return buildCsv(
    events.map((event) => ({
      recorded_at: event.recorded_at,
      user_id: event.user_id,
      event_name: event.event_name,
      value: event.value,
    })),
  );
}

export function buildProjectReport(params: {
  project: ProjectWithMembers;
  milestones: ProjectMilestone[];
  tasks: ProjectTaskWithAssignee[];
  comments: ProjectCommentWithAuthor[];
  assets: ProjectAssetWithUrl[];
  activity: ActivityItem[];
}) {
  const { project, milestones, tasks, comments, assets, activity } = params;
  const cover = assets.find((asset) => asset.asset_type === "cover") ?? null;
  const attachments = assets.filter((asset) => asset.asset_type === "attachment");

  return `# ${project.name}

## Overview

- Status: ${project.status}
- Progress: ${project.progress}%
- Due date: ${formatDate(project.due_date)}
- Owner: ${project.members.find((member) => member.id === project.owner_id)?.full_name ?? project.owner_id}
- Collaborators: ${project.members.map((member) => member.full_name ?? member.email ?? member.id).join(", ") || "None"}

## Description

${project.description ?? "No project description provided."}

## Delivery Plan

### Milestones

${milestones.length > 0
    ? milestones
        .map(
          (milestone) =>
            `- ${milestone.title} | ${milestone.status} | Due ${formatDate(milestone.due_date)}${milestone.notes ? ` | ${milestone.notes}` : ""}`,
        )
        .join("\n")
    : "- No milestones"}

### Tasks

${tasks.length > 0
    ? tasks
        .map(
          (task) =>
            `- ${task.title} | ${task.status} | ${task.priority} priority | Assignee: ${task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"} | Due ${formatDate(task.due_date)}`,
        )
        .join("\n")
    : "- No tasks"}

## Assets

- Cover: ${cover ? cover.publicUrl : "No cover uploaded"}
- Attachments: ${attachments.length}

${attachments.length > 0 ? attachments.map((asset) => `- ${asset.file_name} (${formatFileSize(asset.file_size)}) - ${asset.publicUrl}`).join("\n") : ""}

## Recent Discussion

${comments.length > 0
    ? comments
        .map(
          (comment) =>
            `- ${comment.author?.full_name ?? comment.author?.email ?? "Unknown"} (${comment.relativeTime}): ${comment.body}`,
        )
        .join("\n")
    : "- No comments"}

## Activity

${activity.length > 0
    ? activity.map((entry) => `- ${entry.title} (${entry.timestamp})${entry.description ? `: ${entry.description}` : ""}`).join("\n")
    : "- No recent activity"}
`;
}
