import type {
  ActivityItem,
  AnalyticsEvent,
  BillingPlanDefinition,
  DashboardStat,
  Profile,
  ProjectWithMembers,
  RevenueDatum,
} from "@/lib/types";

export const APP_NAME = "Pulse";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/analytics", label: "Analytics", icon: "analytics" as const },
  { href: "/projects", label: "Projects", icon: "projects" as const },
  { href: "/team", label: "Team", icon: "team" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

export const MARKETING_FEATURES = [
  {
    title: "See momentum at a glance",
    description:
      "Track revenue, engagement, and project health from a single dashboard built for operators and founders.",
  },
  {
    title: "Keep teams aligned",
    description:
      "Share ownership, invite collaborators, and make project status visible without chasing updates across tools.",
  },
  {
    title: "Move from signal to action",
    description:
      "Spot drop-offs, identify high-value events, and adjust priorities with a live analytics layer behind every decision.",
  },
];

export const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$19",
    description: "For solo builders validating traction.",
    features: ["Up to 5 projects", "Core analytics", "2 team members", "Email support"],
  },
  {
    name: "Scale",
    price: "$79",
    description: "For growing teams running multiple product lines.",
    features: ["Unlimited projects", "Advanced charts", "10 team members", "Priority support"],
  },
];

export const DASHBOARD_STATS: DashboardStat[] = [
  {
    label: "Total Revenue",
    value: "$48,295",
    trend: "+12.4%",
    trendDirection: "up",
    icon: "revenue",
  },
  {
    label: "Active Projects",
    value: "12",
    trend: "+3.1%",
    trendDirection: "up",
    icon: "projects",
  },
  {
    label: "Team Members",
    value: "8",
    trend: "+1.8%",
    trendDirection: "up",
    icon: "team",
  },
  {
    label: "Tasks Completed",
    value: "94%",
    trend: "-0.6%",
    trendDirection: "down",
    icon: "tasks",
  },
];

export const BILLING_PLANS: Record<"starter" | "growth" | "scale", BillingPlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "$0",
    description: "Portfolio-friendly plan for a small live workspace and lightweight collaboration.",
    limits: {
      projects: 5,
      members: 5,
      storageMb: 250,
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceLabel: "$49/mo",
    description: "Balanced operating plan for active teams shipping across multiple workstreams.",
    limits: {
      projects: 20,
      members: 15,
      storageMb: 2048,
    },
  },
  scale: {
    id: "scale",
    name: "Scale",
    priceLabel: "$199/mo",
    description: "High-capacity plan for asset-heavy delivery and broader team collaboration.",
    limits: {
      projects: 100,
      members: 50,
      storageMb: 10240,
    },
  },
};

export const ANALYTICS_REPORT_PRESETS = [
  {
    id: "exec-weekly",
    label: "Executive weekly",
    description: "Short-window view for leadership check-ins and trend reviews.",
    range: 7,
    category: "all",
  },
  {
    id: "conversion-watch",
    label: "Conversion watch",
    description: "Focus on conversion events and revenue-adjacent movement.",
    range: 30,
    category: "conversions",
  },
  {
    id: "delivery-ops",
    label: "Delivery ops",
    description: "Project-heavy instrumentation for workflow and execution tracking.",
    range: 30,
    category: "projects",
  },
  {
    id: "team-pulse",
    label: "Team pulse",
    description: "Invite and collaboration activity over a longer operating window.",
    range: 90,
    category: "team",
  },
  {
    id: "billing-health",
    label: "Billing health",
    description: "Subscription, invoice, and billing-related events in one filtered view.",
    range: 90,
    category: "billing",
  },
] as const;

const seedTeam: Profile[] = [
  {
    id: "4f067fd4-bffc-42df-8705-e715f6ea3834",
    full_name: "Maya Chen",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    role: "admin",
    email: "maya@pulse.app",
    created_at: "2025-09-08T10:00:00.000Z",
  },
  {
    id: "0608c10f-f23f-4786-b67d-15a6c318b2c6",
    full_name: "Noah Patel",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    role: "member",
    email: "noah@pulse.app",
    created_at: "2025-11-01T09:00:00.000Z",
  },
  {
    id: "fb04f52e-76d6-4ef1-b1aa-d16a81faf2b3",
    full_name: "Lena Brooks",
    avatar_url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=160&q=80",
    role: "viewer",
    email: "lena@pulse.app",
    created_at: "2026-01-15T15:30:00.000Z",
  },
  {
    id: "efb3745f-17b5-40e4-9f93-e6f2057fb63a",
    full_name: "Marcus Rivera",
    avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
    role: "member",
    email: "marcus@pulse.app",
    created_at: "2026-02-04T12:15:00.000Z",
  },
];

const seedProjects: ProjectWithMembers[] = [
  {
    id: "fa41abff-f2a9-4e27-bd2d-c45840db7f52",
    name: "Northstar Growth",
    description: "Quarterly revenue expansion initiative focused on activation funnels and retention experiments.",
    status: "active",
    owner_id: seedTeam[0].id,
    progress: 72,
    due_date: "2026-06-30",
    created_at: "2026-01-10T11:00:00.000Z",
    members: [seedTeam[0], seedTeam[1], seedTeam[2]],
  },
  {
    id: "ea07e537-8eb6-476e-ad7e-ee1dfe52cb95",
    name: "Ops Migration",
    description: "Move internal workflows to a single analytics-backed operating system.",
    status: "paused",
    owner_id: seedTeam[0].id,
    progress: 38,
    due_date: "2026-07-14",
    created_at: "2025-12-18T08:30:00.000Z",
    members: [seedTeam[0], seedTeam[3]],
  },
  {
    id: "81f7322c-bc82-4328-b5ce-8a1b4ef9e755",
    name: "Signal Engine",
    description: "Event instrumentation overhaul for clearer attribution across the product suite.",
    status: "completed",
    owner_id: seedTeam[1].id,
    progress: 100,
    due_date: "2026-04-28",
    created_at: "2025-10-11T14:20:00.000Z",
    members: [seedTeam[1], seedTeam[3]],
  },
  {
    id: "3b3d1c49-6288-4341-a9ae-7626115ad1b6",
    name: "Atlas Expansion",
    description: "Pilot launch for a second product line with localized reporting dashboards.",
    status: "active",
    owner_id: seedTeam[3].id,
    progress: 56,
    due_date: "2026-08-20",
    created_at: "2026-02-02T13:45:00.000Z",
    members: [seedTeam[0], seedTeam[2], seedTeam[3]],
  },
  {
    id: "f77fbbdf-916d-454c-b55c-c7440d4c6a27",
    name: "Legacy Sunset",
    description: "Archive unused projects, migrate customers, and reduce maintenance overhead.",
    status: "archived",
    owner_id: seedTeam[2].id,
    progress: 100,
    due_date: "2026-03-01",
    created_at: "2025-09-01T07:10:00.000Z",
    members: [seedTeam[2]],
  },
];

const seedRevenue: RevenueDatum[] = [
  { month: "Nov", revenue: 28140, expenses: 13820 },
  { month: "Dec", revenue: 31200, expenses: 14610 },
  { month: "Jan", revenue: 34690, expenses: 15920 },
  { month: "Feb", revenue: 37210, expenses: 17110 },
  { month: "Mar", revenue: 42185, expenses: 18350 },
  { month: "Apr", revenue: 48295, expenses: 20140 },
];

const seedEvents: AnalyticsEvent[] = [
  { id: "c1", user_id: seedTeam[0].id, event_name: "signup_completed", value: 1, recorded_at: "2026-03-07T10:00:00.000Z" },
  { id: "c2", user_id: seedTeam[1].id, event_name: "dashboard_viewed", value: 3, recorded_at: "2026-03-08T09:20:00.000Z" },
  { id: "c3", user_id: seedTeam[2].id, event_name: "project_created", value: 1, recorded_at: "2026-03-08T11:45:00.000Z" },
  { id: "c4", user_id: seedTeam[3].id, event_name: "report_exported", value: 2, recorded_at: "2026-03-10T15:10:00.000Z" },
  { id: "c5", user_id: seedTeam[0].id, event_name: "dashboard_viewed", value: 4, recorded_at: "2026-03-11T13:12:00.000Z" },
  { id: "c6", user_id: seedTeam[1].id, event_name: "project_updated", value: 2, recorded_at: "2026-03-12T08:20:00.000Z" },
  { id: "c7", user_id: seedTeam[1].id, event_name: "team_invited", value: 1, recorded_at: "2026-03-13T12:00:00.000Z" },
  { id: "c8", user_id: seedTeam[2].id, event_name: "dashboard_viewed", value: 2, recorded_at: "2026-03-13T17:32:00.000Z" },
  { id: "c9", user_id: seedTeam[3].id, event_name: "report_exported", value: 5, recorded_at: "2026-03-15T14:18:00.000Z" },
  { id: "c10", user_id: seedTeam[0].id, event_name: "project_created", value: 1, recorded_at: "2026-03-16T10:41:00.000Z" },
  { id: "c11", user_id: seedTeam[3].id, event_name: "dashboard_viewed", value: 3, recorded_at: "2026-03-18T09:24:00.000Z" },
  { id: "c12", user_id: seedTeam[2].id, event_name: "conversion_recorded", value: 7, recorded_at: "2026-03-19T16:56:00.000Z" },
  { id: "c13", user_id: seedTeam[0].id, event_name: "dashboard_viewed", value: 6, recorded_at: "2026-03-22T08:16:00.000Z" },
  { id: "c14", user_id: seedTeam[1].id, event_name: "project_updated", value: 2, recorded_at: "2026-03-24T11:08:00.000Z" },
  { id: "c15", user_id: seedTeam[2].id, event_name: "team_invited", value: 1, recorded_at: "2026-03-26T13:03:00.000Z" },
  { id: "c16", user_id: seedTeam[3].id, event_name: "report_exported", value: 4, recorded_at: "2026-03-27T18:14:00.000Z" },
  { id: "c17", user_id: seedTeam[0].id, event_name: "conversion_recorded", value: 9, recorded_at: "2026-03-28T09:50:00.000Z" },
  { id: "c18", user_id: seedTeam[1].id, event_name: "dashboard_viewed", value: 5, recorded_at: "2026-03-30T10:28:00.000Z" },
  { id: "c19", user_id: seedTeam[2].id, event_name: "project_created", value: 1, recorded_at: "2026-04-01T07:57:00.000Z" },
  { id: "c20", user_id: seedTeam[3].id, event_name: "dashboard_viewed", value: 6, recorded_at: "2026-04-03T12:42:00.000Z" },
];

const seedActivity: ActivityItem[] = [
  {
    id: "activity-1",
    title: "Northstar Growth hit 72% completion",
    description: "Sprint velocity improved after the onboarding flow redesign shipped.",
    timestamp: "2 hours ago",
    type: "project",
  },
  {
    id: "activity-2",
    title: "Revenue crossed $48K this month",
    description: "Expansion revenue from three new teams pushed MRR to its highest point this year.",
    timestamp: "5 hours ago",
    type: "revenue",
  },
  {
    id: "activity-3",
    title: "Marcus joined the Atlas Expansion workspace",
    description: "New member access was granted to analytics and roadmap views.",
    timestamp: "Yesterday",
    type: "team",
  },
  {
    id: "activity-4",
    title: "Signal Engine instrumentation passed QA",
    description: "Core revenue events are now tracked across marketing, product, and retention funnels.",
    timestamp: "2 days ago",
    type: "system",
  },
];

export const SEED_DATA = {
  revenue: seedRevenue,
  projects: seedProjects,
  team: seedTeam,
  events: seedEvents,
  activity: seedActivity,
};
