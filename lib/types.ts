export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRole = "admin" | "member" | "viewer";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";

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
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type AnalyticsEvent = Database["public"]["Tables"]["analytics_events"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type WorkspaceInvite = Database["public"]["Tables"]["workspace_invites"]["Row"];

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
}

export interface AuthFormState extends ActionState {
  email?: string;
}
