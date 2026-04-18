export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRole = "admin" | "member" | "viewer";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type ProjectTaskStatus = "todo" | "in_progress" | "done";
export type ProjectTaskPriority = "low" | "medium" | "high";
export type ProjectMilestoneStatus = "planned" | "in_progress" | "completed";
export type NotificationType = "info" | "project" | "team" | "system";
export type WorkspacePlan = "starter" | "growth" | "scale";
export type WorkspaceBillingStatus = "active" | "past_due" | "trialing" | "canceled";
export type PlanLimitResource = "projects" | "members" | "storage";
export type BillingGateFeature = "attachments" | "team_invites";
export type ReportKind = "analytics" | "project";
export type ReportFormat = "csv" | "pdf" | "md";
export type ScheduledReportCadence = "weekly" | "monthly";
export type ScheduledReportRunStatus = "delivered" | "failed";
export type ScheduledReportDeliveryMode = "manual" | "scheduled";

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string;
          created_at: string;
          description: string | null;
          event_type: string;
          id: string;
          metadata: Json;
          project_id: string | null;
          title: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          description?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json;
          project_id?: string | null;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          recorded_at: string;
          event_name: string;
          user_id: string;
          value: number;
        };
        Insert: {
          id?: string;
          recorded_at?: string;
          event_name: string;
          user_id: string;
          value?: number;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_saved_views: {
        Row: {
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          range: 7 | 30 | 90;
        };
        Insert: {
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          range: 7 | 30 | 90;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_saved_views"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analytics_saved_views_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      report_exports: {
        Row: {
          created_at: string;
          filters: Json;
          format: ReportFormat;
          id: string;
          owner_id: string;
          project_id: string | null;
          report_kind: ReportKind;
          title: string;
        };
        Insert: {
          created_at?: string;
          filters?: Json;
          format: ReportFormat;
          id?: string;
          owner_id: string;
          project_id?: string | null;
          report_kind: ReportKind;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["report_exports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "report_exports_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_exports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_reports: {
        Row: {
          active: boolean;
          cadence: ScheduledReportCadence;
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at: string;
          format: "csv" | "pdf";
          id: string;
          last_sent_at: string | null;
          name: string;
          next_run_at: string;
          owner_id: string;
          range: 7 | 30 | 90;
          recipient_email: string;
          report_kind: "analytics";
        };
        Insert: {
          active?: boolean;
          cadence: ScheduledReportCadence;
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at?: string;
          format: "csv" | "pdf";
          id?: string;
          last_sent_at?: string | null;
          name: string;
          next_run_at: string;
          owner_id: string;
          range: 7 | 30 | 90;
          recipient_email: string;
          report_kind?: "analytics";
        };
        Update: Partial<Database["public"]["Tables"]["scheduled_reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_report_runs: {
        Row: {
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at: string;
          delivered_at: string | null;
          delivery_mode: ScheduledReportDeliveryMode;
          error_message: string | null;
          id: string;
          owner_id: string;
          range: 7 | 30 | 90;
          recipient_email: string;
          report_format: "csv" | "pdf";
          schedule_id: string;
          status: ScheduledReportRunStatus;
        };
        Insert: {
          category: "all" | "conversions" | "projects" | "team" | "billing";
          created_at?: string;
          delivered_at?: string | null;
          delivery_mode: ScheduledReportDeliveryMode;
          error_message?: string | null;
          id?: string;
          owner_id: string;
          range: 7 | 30 | 90;
          recipient_email: string;
          report_format: "csv" | "pdf";
          schedule_id: string;
          status: ScheduledReportRunStatus;
        };
        Update: Partial<Database["public"]["Tables"]["scheduled_report_runs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "scheduled_report_runs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_report_runs_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          target_path: string | null;
          title: string;
          type: NotificationType;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          target_path?: string | null;
          title: string;
          type?: NotificationType;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_billing: {
        Row: {
          created_at: string;
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          id: string;
          owner_id: string;
          plan: WorkspacePlan;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          status: WorkspaceBillingStatus;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          id?: string;
          owner_id: string;
          plan?: WorkspacePlan;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: WorkspaceBillingStatus;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_billing"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workspace_billing_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: ProfileRole;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: ProfileRole;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_assets: {
        Row: {
          asset_type: "cover" | "attachment";
          content_type: string | null;
          created_at: string;
          file_name: string;
          file_size: number;
          id: string;
          object_path: string;
          project_id: string;
          uploaded_by: string;
        };
        Insert: {
          asset_type?: "cover" | "attachment";
          content_type?: string | null;
          created_at?: string;
          file_name: string;
          file_size: number;
          id?: string;
          object_path: string;
          project_id: string;
          uploaded_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_assets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_assets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_assets_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          project_id: string;
          task_id: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          project_id: string;
          task_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["project_comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "project_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      project_milestones: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          project_id: string;
          status: ProjectMilestoneStatus;
          title: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          project_id: string;
          status?: ProjectMilestoneStatus;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_milestones"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          name: string;
          owner_id: string;
          progress: number;
          status: ProjectStatus;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          progress?: number;
          status?: ProjectStatus;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          assignee_id: string | null;
          created_at: string;
          due_date: string | null;
          id: string;
          priority: ProjectTaskPriority;
          project_id: string;
          status: ProjectTaskStatus;
          title: string;
        };
        Insert: {
          assignee_id?: string | null;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          priority?: ProjectTaskPriority;
          project_id: string;
          status?: ProjectTaskStatus;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_tasks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_invites: {
        Row: {
          accepted_at: string | null;
          email: string;
          id: string;
          invited_at: string;
          invited_by: string;
          role: ProfileRole;
          status: "pending" | "accepted" | "revoked";
        };
        Insert: {
          accepted_at?: string | null;
          email: string;
          id?: string;
          invited_at?: string;
          invited_by: string;
          role?: ProfileRole;
          status?: "pending" | "accepted" | "revoked";
        };
        Update: Partial<Database["public"]["Tables"]["workspace_invites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workspace_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_project_visible: {
        Args: {
          project_uuid: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type ProjectAsset = Database["public"]["Tables"]["project_assets"]["Row"];
export type ProjectComment = Database["public"]["Tables"]["project_comments"]["Row"];
export type ProjectTask = Database["public"]["Tables"]["project_tasks"]["Row"];
export type ProjectMilestone = Database["public"]["Tables"]["project_milestones"]["Row"];
export type AnalyticsEvent = Database["public"]["Tables"]["analytics_events"]["Row"];
export type AnalyticsSavedView = Database["public"]["Tables"]["analytics_saved_views"]["Row"];
export type ReportExport = Database["public"]["Tables"]["report_exports"]["Row"];
export type ScheduledReport = Database["public"]["Tables"]["scheduled_reports"]["Row"];
export type ScheduledReportRun = Database["public"]["Tables"]["scheduled_report_runs"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type WorkspaceInvite = Database["public"]["Tables"]["workspace_invites"]["Row"];
export type WorkspaceBilling = Database["public"]["Tables"]["workspace_billing"]["Row"];

export interface RevenueDatum {
  month: string;
  revenue: number;
  expenses: number;
}

export interface AnalyticsSeriesDatum {
  label: string;
  users: number;
  revenue: number;
  sessions: number;
}

export interface EventBreakdownDatum {
  event: string;
  total: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "project" | "team" | "revenue" | "system";
}

export interface ProjectWithMembers extends Project {
  members: Profile[];
}

export interface ProjectAssetWithUrl extends ProjectAsset {
  publicUrl: string;
}

export interface ProjectTaskWithAssignee extends ProjectTask {
  assignee: Profile | null;
}

export interface ProjectCommentWithAuthor extends ProjectComment {
  author: Profile | null;
  relativeTime: string;
}

export interface NotificationWithMeta extends Notification {
  relativeTime: string;
}

export interface ReportExportWithMeta extends ReportExport {
  relativeTime: string;
  downloadPath: string;
}

export interface ScheduledReportWithMeta extends ScheduledReport {
  relativeTime: string;
  nextRunLabel: string;
  lastSentLabel: string | null;
}

export interface ScheduledReportRunWithMeta extends ScheduledReportRun {
  relativeTime: string;
  deliveredLabel: string | null;
}

export interface BillingPlanDefinition {
  id: WorkspacePlan;
  name: string;
  priceLabel: string;
  description: string;
  limits: {
    projects: number;
    members: number;
    storageMb: number;
  };
}

export interface WorkspaceUsage {
  projectsUsed: number;
  membersUsed: number;
  storageBytesUsed: number;
}

export interface PlanLimitPayload {
  kind: "plan_limit";
  resource: PlanLimitResource;
  currentPlan: WorkspacePlan;
  recommendedPlan: WorkspacePlan | null;
  used: number;
  limit: number;
}

export interface BillingGatePayload {
  kind: "billing_gate";
  feature: BillingGateFeature;
  status: WorkspaceBillingStatus;
  currentPlan: WorkspacePlan;
  reason: "requires_active_subscription";
}

export interface WorkspaceBillingSummary {
  billing: WorkspaceBilling;
  plan: BillingPlanDefinition;
  usage: WorkspaceUsage;
  stripeConfigured: boolean;
}

export interface WorkspaceInvoiceSummary {
  id: string;
  number: string | null;
  status: string | null;
  currency: string;
  amountPaid: number;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

export interface CurrentWorkspaceAccess {
  userId: string;
  role: ProfileRole;
}

export type DataSource = "live" | "seed" | "empty";

export interface WorkspaceChecklistItem {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

export interface WorkspaceReadiness {
  liveProjectCount: number;
  liveEventCount: number;
  teamCount: number;
  activityCount: number;
  isBootstrapped: boolean;
  checklist: WorkspaceChecklistItem[];
}

export interface DashboardStat {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  icon: "revenue" | "projects" | "team" | "tasks";
}

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  avgSession: string;
  conversionRate: string;
}

export interface ActionState {
  success?: boolean;
  message?: string;
  errorId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  payload?: Json | PlanLimitPayload | BillingGatePayload;
}

export interface AuthFormState extends ActionState {
  email?: string;
}
