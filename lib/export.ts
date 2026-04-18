import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type {
  ActivityItem,
  AnalyticsEvent,
  ProjectAssetWithUrl,
  ProjectCommentWithAuthor,
  ProjectMilestone,
  ProjectTaskWithAssignee,
  ProjectWithMembers,
} from "@/lib/types";
import { buildAnalyticsSeries, buildEventBreakdown, formatCurrency, formatDate, formatFileSize, formatNumber } from "@/lib/utils";

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

function getRevenueWeight(eventName: string) {
  switch (eventName) {
    case "conversion_recorded":
      return 900;
    case "project_completed":
      return 480;
    case "team_invited":
      return 220;
    case "project_created":
      return 180;
    case "project_member_added":
      return 90;
    default:
      return 60;
  }
}

function buildAnalyticsReportLines(events: AnalyticsEvent[], range: number, category: string) {
  const series = buildAnalyticsSeries(events, range);
  const eventsByType = buildEventBreakdown(events).slice(0, 8);
  const totalEvents = events.length;
  const uniqueUsers = new Set(events.map((event) => event.user_id)).size;
  const estimatedRevenue = events.reduce(
    (sum, event) => sum + Number(event.value) * getRevenueWeight(event.event_name),
    0,
  );
  const conversionRate = totalEvents === 0
    ? 0
    : Math.round(
        (events.filter((event) => event.event_name.includes("conversion")).length / totalEvents) * 1000,
      ) / 10;

  return [
    "Pulse Analytics Report",
    "",
    `Range: Last ${range} days`,
    `Category: ${category}`,
    `Generated: ${formatDate(new Date().toISOString(), {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`,
    "",
    "Summary",
    `- Total events: ${formatNumber(totalEvents)}`,
    `- Unique users: ${formatNumber(uniqueUsers)}`,
    `- Estimated revenue: ${formatCurrency(estimatedRevenue)}`,
    `- Conversion rate: ${conversionRate}%`,
    "",
    "Top event types",
    ...(eventsByType.length > 0
      ? eventsByType.map((item) => `- ${item.event}: ${formatNumber(item.total)}`)
      : ["- No events in this range"]),
    "",
    "Daily trend",
    ...(series.length > 0
      ? series.map(
          (item) =>
            `- ${item.label}: ${formatNumber(item.users)} events, ${formatCurrency(item.revenue)} estimated revenue`,
        )
      : ["- No daily trend available"]),
    "",
    "Recent events",
    ...(events.slice(0, 20).map(
      (event) =>
        `- ${formatDate(event.recorded_at, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}: ${event.event_name} (${event.user_id}) value ${event.value}`,
    ) || ["- No recent events available"]),
  ];
}

async function buildTextPdfDocument(title: string, lines: string[]) {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = [612, 792];
  const margin = 56;
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage(pageSize);
  let { width, height } = page.getSize();
  let y = height - margin;
  const maxWidth = width - margin * 2;

  const addPage = () => {
    page = pdfDoc.addPage(pageSize);
    ({ width, height } = page.getSize());
    y = height - margin;
  };

  const drawWrappedLine = (text: string, fontSize: number, font = bodyFont, color = rgb(0.15, 0.18, 0.24)) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
      }

      current = word;
    }

    if (current) {
      lines.push(current);
    }

    const lineHeight = fontSize + 4;

    for (const line of lines) {
      if (y - lineHeight < margin) {
        addPage();
      }

      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color,
      });
      y -= lineHeight;
    }
  };

  drawWrappedLine(title, 20, headingFont, rgb(0.05, 0.09, 0.2));
  y -= 8;

  for (const rawLine of lines) {
    if (rawLine === "") {
      y -= 8;
      continue;
    }

    const isHeading = !rawLine.startsWith("- ") && !rawLine.includes(":") && rawLine === rawLine.trim();
    drawWrappedLine(rawLine, isHeading ? 13 : 11, isHeading ? headingFont : bodyFont);
  }

  return pdfDoc.save();
}

export async function buildAnalyticsReportPdf(events: AnalyticsEvent[], range: number, category: string) {
  const lines = buildAnalyticsReportLines(events, range, category);
  return buildTextPdfDocument("Pulse Analytics Report", lines.slice(1));
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

export async function buildProjectReportPdf(params: {
  project: ProjectWithMembers;
  milestones: ProjectMilestone[];
  tasks: ProjectTaskWithAssignee[];
  comments: ProjectCommentWithAuthor[];
  assets: ProjectAssetWithUrl[];
  activity: ActivityItem[];
}) {
  const report = buildProjectReport(params);
  const lines = report.split("\n").map((line) => {
    if (line.startsWith("# ")) {
      return line.slice(2);
    }

    if (line.startsWith("## ")) {
      return line.slice(3);
    }

    if (line.startsWith("### ")) {
      return line.slice(4);
    }

    return line;
  });

  return buildTextPdfDocument(`${params.project.name} Report`, lines);
}
