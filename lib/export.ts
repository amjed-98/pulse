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

const PDF_THEME = {
  ink: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.56),
  subtle: rgb(0.82, 0.86, 0.91),
  accent: rgb(0.31, 0.27, 0.9),
  accentDark: rgb(0.22, 0.19, 0.64),
  accentTint: rgb(0.93, 0.94, 1),
  panel: rgb(0.97, 0.98, 1),
  successTint: rgb(0.91, 0.98, 0.95),
  infoTint: rgb(0.92, 0.97, 1),
} as const;

interface PdfMetricCard {
  label: string;
  value: string;
  tone?: "accent" | "info" | "success";
}

interface PdfListItem {
  title: string;
  detail?: string | null;
}

function wrapText(text: string, maxWidth: number, measure: (value: string) => number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushSegment = (segment: string) => {
    if (!segment) {
      return;
    }

    if (measure(segment) <= maxWidth) {
      lines.push(segment);
      return;
    }

    let chunk = "";
    for (const char of segment) {
      const candidate = `${chunk}${char}`;
      if (measure(candidate) <= maxWidth) {
        chunk = candidate;
        continue;
      }

      if (chunk) {
        lines.push(chunk);
      }
      chunk = char;
    }

    if (chunk) {
      lines.push(chunk);
    }
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (measure(word) > maxWidth) {
      pushSegment(word);
      current = "";
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

async function createBrandedPdfDocument(meta: { eyebrow: string; title: string; subtitle: string }) {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = [612, 792];
  const margin = 56;
  const contentWidth = pageSize[0] - margin * 2;
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage(pageSize);
  let { width, height } = page.getSize();
  let y = height - margin;

  const drawPageChrome = (isFirstPage: boolean) => {
    page.drawRectangle({
      x: 0,
      y: height - (isFirstPage ? 168 : 88),
      width,
      height: isFirstPage ? 168 : 88,
      color: isFirstPage ? PDF_THEME.accentDark : PDF_THEME.accent,
    });

    page.drawRectangle({
      x: margin,
      y: height - (isFirstPage ? 158 : 78),
      width: contentWidth,
      height: isFirstPage ? 104 : 24,
      color: isFirstPage ? PDF_THEME.accent : PDF_THEME.accentDark,
      opacity: isFirstPage ? 0.18 : 0.1,
    });

    if (isFirstPage) {
      page.drawText(meta.eyebrow.toUpperCase(), {
        x: margin,
        y: height - 64,
        size: 10,
        font: headingFont,
        color: rgb(0.91, 0.94, 1),
      });
      page.drawText(meta.title, {
        x: margin,
        y: height - 102,
        size: 24,
        font: headingFont,
        color: rgb(1, 1, 1),
      });

      const subtitleLines = wrapText(meta.subtitle, contentWidth - 20, (value) => bodyFont.widthOfTextAtSize(value, 11));
      let subtitleY = height - 124;
      for (const line of subtitleLines.slice(0, 3)) {
        page.drawText(line, {
          x: margin,
          y: subtitleY,
          size: 11,
          font: bodyFont,
          color: rgb(0.9, 0.93, 1),
        });
        subtitleY -= 15;
      }
      y = height - 196;
      return;
    }

    page.drawText(meta.title, {
      x: margin,
      y: height - 54,
      size: 13,
      font: headingFont,
      color: rgb(1, 1, 1),
    });
    y = height - 118;
  };

  const addPage = () => {
    page = pdfDoc.addPage(pageSize);
    ({ width, height } = page.getSize());
    drawPageChrome(false);
  };

  drawPageChrome(true);

  const ensureSpace = (required: number) => {
    if (y - required >= margin) {
      return;
    }
    addPage();
  };

  const drawParagraph = (text: string, options?: { size?: number; color?: ReturnType<typeof rgb>; font?: typeof bodyFont }) => {
    const fontSize = options?.size ?? 11;
    const font = options?.font ?? bodyFont;
    const color = options?.color ?? PDF_THEME.ink;
    const lines = wrapText(text, contentWidth, (value) => font.widthOfTextAtSize(value, fontSize));
    const lineHeight = fontSize + 5;
    ensureSpace(lines.length * lineHeight + 6);
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color,
      });
      y -= lineHeight;
    }
    y -= 2;
  };

  const drawSection = (title: string, description?: string) => {
    ensureSpace(description ? 54 : 32);
    page.drawText(title, {
      x: margin,
      y,
      size: 14,
      font: headingFont,
      color: PDF_THEME.ink,
    });
    y -= 18;

    if (description) {
      drawParagraph(description, { size: 10, color: PDF_THEME.muted });
    } else {
      y -= 4;
    }
  };

  const drawMetricGrid = (cards: PdfMetricCard[]) => {
    const columns = 2;
    const gap = 14;
    const cardWidth = (contentWidth - gap) / columns;
    const cardHeight = 78;
    const rows = Math.ceil(cards.length / columns);
    ensureSpace(rows * (cardHeight + gap));

    cards.forEach((card, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = margin + column * (cardWidth + gap);
      const top = y - row * (cardHeight + gap);
      const toneColor =
        card.tone === "success" ? PDF_THEME.successTint : card.tone === "info" ? PDF_THEME.infoTint : PDF_THEME.accentTint;

      page.drawRectangle({
        x,
        y: top - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: toneColor,
        borderColor: PDF_THEME.subtle,
        borderWidth: 1,
      });
      page.drawText(card.label.toUpperCase(), {
        x: x + 14,
        y: top - 22,
        size: 9,
        font: headingFont,
        color: PDF_THEME.muted,
      });
      page.drawText(card.value, {
        x: x + 14,
        y: top - 48,
        size: 18,
        font: headingFont,
        color: PDF_THEME.ink,
      });
    });

    y -= rows * (cardHeight + gap);
  };

  const drawList = (items: PdfListItem[], emptyLabel: string) => {
    const rows = items.length > 0 ? items : [{ title: emptyLabel }];
    for (const item of rows) {
      const detailLines = item.detail
        ? wrapText(item.detail, contentWidth - 36, (value) => bodyFont.widthOfTextAtSize(value, 10))
        : [];
      ensureSpace(28 + detailLines.length * 14);
      page.drawCircle({
        x: margin + 6,
        y: y - 7,
        size: 3.5,
        color: PDF_THEME.accent,
      });
      page.drawText(item.title, {
        x: margin + 18,
        y,
        size: 11,
        font: headingFont,
        color: PDF_THEME.ink,
      });
      y -= 15;
      for (const line of detailLines) {
        page.drawText(line, {
          x: margin + 18,
          y,
          size: 10,
          font: bodyFont,
          color: PDF_THEME.muted,
        });
        y -= 14;
      }
      y -= 6;
    }
  };

  const drawKeyValueGrid = (items: Array<{ label: string; value: string }>) => {
    const columnGap = 20;
    const columnWidth = (contentWidth - columnGap) / 2;
    const rowHeight = 42;
    const rows = Math.ceil(items.length / 2);
    ensureSpace(rows * rowHeight + 8);

    items.forEach((item, index) => {
      const row = Math.floor(index / 2);
      const column = index % 2;
      const x = margin + column * (columnWidth + columnGap);
      const baseY = y - row * rowHeight;
      page.drawText(item.label.toUpperCase(), {
        x,
        y: baseY,
        size: 9,
        font: headingFont,
        color: PDF_THEME.muted,
      });
      const valueLines = wrapText(item.value, columnWidth, (value) => bodyFont.widthOfTextAtSize(value, 11));
      let valueY = baseY - 16;
      for (const line of valueLines.slice(0, 2)) {
        page.drawText(line, {
          x,
          y: valueY,
          size: 11,
          font: bodyFont,
          color: PDF_THEME.ink,
        });
        valueY -= 14;
      }
    });

    y -= rows * rowHeight;
  };

  const drawCaption = (text: string) => {
    drawParagraph(text, { size: 10, color: PDF_THEME.muted, font: monoFont });
  };

  const finalize = async () => {
    const pages = pdfDoc.getPages();
    pages.forEach((currentPage, index) => {
      const pageHeight = currentPage.getHeight();
      currentPage.drawLine({
        start: { x: margin, y: 34 },
        end: { x: currentPage.getWidth() - margin, y: 34 },
        color: PDF_THEME.subtle,
        thickness: 1,
      });
      currentPage.drawText(`Pulse report`, {
        x: margin,
        y: 20,
        size: 9,
        font: bodyFont,
        color: PDF_THEME.muted,
      });
      currentPage.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: currentPage.getWidth() - margin - 58,
        y: 20,
        size: 9,
        font: bodyFont,
        color: PDF_THEME.muted,
      });
      currentPage.drawText(formatDate(new Date().toISOString(), { month: "short", day: "numeric", year: "numeric" }), {
        x: currentPage.getWidth() / 2 - 32,
        y: 20,
        size: 9,
        font: bodyFont,
        color: PDF_THEME.muted,
      });
      void pageHeight;
    });

    return pdfDoc.save();
  };

  return {
    drawParagraph,
    drawSection,
    drawMetricGrid,
    drawList,
    drawKeyValueGrid,
    drawCaption,
    finalize,
  };
}

export async function buildAnalyticsReportPdf(events: AnalyticsEvent[], range: number, category: string) {
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

  const pdf = await createBrandedPdfDocument({
    eyebrow: "Analytics Export",
    title: "Pulse Analytics Report",
    subtitle: `Workspace performance snapshot for the last ${range} days across the ${category} event stream.`,
  });

  pdf.drawMetricGrid([
    { label: "Total events", value: formatNumber(totalEvents), tone: "accent" },
    { label: "Unique users", value: formatNumber(uniqueUsers), tone: "info" },
    { label: "Estimated revenue", value: formatCurrency(estimatedRevenue), tone: "success" },
    { label: "Conversion rate", value: `${conversionRate}%`, tone: "accent" },
  ]);

  pdf.drawSection(
    "Report parameters",
    "This export captures the active analytics filter state so the document can be shared without recreating the dashboard view.",
  );
  pdf.drawKeyValueGrid([
    { label: "Range", value: `Last ${range} days` },
    { label: "Category", value: category },
    {
      label: "Generated",
      value: formatDate(new Date().toISOString(), {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    },
    { label: "Dataset health", value: totalEvents > 0 ? "Live event stream available" : "No events in selected range" },
  ]);

  pdf.drawSection("Top event types", "Highest-volume events in the selected range.");
  pdf.drawList(
    eventsByType.map((item) => ({
      title: item.event,
      detail: `${formatNumber(item.total)} events recorded in this reporting window.`,
    })),
    "No events in this range.",
  );

  pdf.drawSection("Daily trend", "Daily volume and estimated revenue movement across the selected window.");
  pdf.drawList(
    series.map((item) => ({
      title: item.label,
      detail: `${formatNumber(item.users)} events, ${formatCurrency(item.revenue)} estimated revenue, ${formatNumber(item.sessions)} sessions.`,
    })),
    "No daily trend available.",
  );

  pdf.drawSection("Recent event sample", "The most recent events included in this export.");
  pdf.drawList(
    events.slice(0, 20).map((event) => ({
      title: event.event_name,
      detail: `${formatDate(event.recorded_at, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })} • ${event.user_id} • value ${event.value}`,
    })),
    "No recent events available.",
  );

  pdf.drawCaption("Generated by Pulse analytics exports.");
  return pdf.finalize();
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
  const { project, milestones, tasks, comments, assets, activity } = params;
  const cover = assets.find((asset) => asset.asset_type === "cover") ?? null;
  const attachments = assets.filter((asset) => asset.asset_type === "attachment");

  const pdf = await createBrandedPdfDocument({
    eyebrow: "Project Export",
    title: `${project.name} Delivery Report`,
    subtitle: "Client-facing delivery snapshot covering scope, progress, assets, discussion, and recent execution activity.",
  });

  pdf.drawMetricGrid([
    { label: "Status", value: project.status, tone: "accent" },
    { label: "Progress", value: `${project.progress}%`, tone: "success" },
    { label: "Milestones", value: formatNumber(milestones.length), tone: "info" },
    { label: "Tasks", value: formatNumber(tasks.length), tone: "accent" },
  ]);

  pdf.drawSection("Overview", "Core project metadata captured at export time.");
  pdf.drawKeyValueGrid([
    { label: "Due date", value: formatDate(project.due_date) },
    {
      label: "Owner",
      value: project.members.find((member) => member.id === project.owner_id)?.full_name ?? project.owner_id,
    },
    {
      label: "Collaborators",
      value: project.members.map((member) => member.full_name ?? member.email ?? member.id).join(", ") || "None",
    },
    { label: "Cover asset", value: cover ? "Uploaded" : "Not uploaded" },
  ]);

  pdf.drawSection("Description");
  pdf.drawParagraph(project.description ?? "No project description provided.", {
    color: project.description ? PDF_THEME.ink : PDF_THEME.muted,
  });

  pdf.drawSection("Milestones", "Scheduled delivery markers and current status.");
  pdf.drawList(
    milestones.map((milestone) => ({
      title: milestone.title,
      detail: `${milestone.status} • Due ${formatDate(milestone.due_date)}${milestone.notes ? ` • ${milestone.notes}` : ""}`,
    })),
    "No milestones defined.",
  );

  pdf.drawSection("Tasks", "Execution tasks and current assignee coverage.");
  pdf.drawList(
    tasks.map((task) => ({
      title: task.title,
      detail: `${task.status} • ${task.priority} priority • ${task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"} • Due ${formatDate(task.due_date)}`,
    })),
    "No tasks defined.",
  );

  pdf.drawSection("Assets", "Current cover asset and uploaded attachments.");
  pdf.drawList(
    [
      {
        title: cover ? "Cover image available" : "No cover uploaded",
        detail: cover ? cover.publicUrl : "This report was generated without a project cover asset.",
      },
      ...attachments.map((asset) => ({
        title: asset.file_name,
        detail: `${formatFileSize(asset.file_size)} • ${asset.publicUrl}`,
      })),
    ],
    "No assets uploaded.",
  );

  pdf.drawSection("Recent discussion", "Latest collaborator notes linked to this project.");
  pdf.drawList(
    comments.map((comment) => ({
      title: `${comment.author?.full_name ?? comment.author?.email ?? "Unknown"} • ${comment.relativeTime}`,
      detail: comment.body,
    })),
    "No discussion recorded.",
  );

  pdf.drawSection("Activity", "Recent delivery and collaboration events for this project.");
  pdf.drawList(
    activity.map((entry) => ({
      title: `${entry.title} • ${entry.timestamp}`,
      detail: entry.description,
    })),
    "No recent activity.",
  );

  pdf.drawCaption("Generated by Pulse project exports.");
  return pdf.finalize();
}
