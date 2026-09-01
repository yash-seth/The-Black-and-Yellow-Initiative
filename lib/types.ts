/** Shared domain types. Kept in sync with supabase/migrations/*.sql. */

export type Role = "user" | "moderator" | "admin";
export type PinStatus = "pending" | "approved" | "rejected";
export type PaintState = "unmarked" | "marked";
export type Severity = "low" | "medium" | "high";
export type PhotoKind = "report" | "after";
export type PhotoStatus = "pending" | "approved" | "rejected";
export type PostStatus = "visible" | "pending" | "removed";
export type ThreadStatus = "open" | "locked" | "removed";
export type ReportTarget = "speed_breaker" | "forum_post";

export interface Profile {
  id: string;
  display_name: string | null;
  role: Role;
  is_banned: boolean;
  created_at: string;
}

export interface SpeedBreaker {
  id: string;
  lat: number;
  lng: number;
  description: string | null;
  severity: Severity;
  status: PinStatus;
  paint_state: PaintState;
  landmark: string | null;
  submitter_id: string | null;
  submitter_token: string | null;
  reject_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  speed_breaker_id: string;
  storage_path: string;
  kind: PhotoKind;
  status: PhotoStatus;
  uploader_id: string | null;
  created_at: string;
}

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort: number;
}

export interface ForumThread {
  id: string;
  category_id: string | null;
  speed_breaker_id: string | null;
  title: string;
  author_id: string | null;
  status: ThreadStatus;
  created_at: string;
  last_post_at: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  status: PostStatus;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  reporter_id: string | null;
  resolved: boolean;
  created_at: string;
}

/** GeoJSON feature returned by the public_speed_breakers RPC. */
export interface PinFeatureProps {
  id: string;
  severity: Severity;
  paint_state: PaintState;
}
