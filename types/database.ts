// =============================================================================
// Story Hunters Guild — Database Types
// Mirrors supabase/migrations/001_shg_init.sql exactly. Keep in sync.
// =============================================================================

export type EventStatus    = "draft" | "published" | "cancelled";
export type BookingStatus  = "pending" | "approved" | "rejected" | "cancelled";
export type GameComplexity = "light" | "medium" | "heavy";
export type MagicLinkPurpose = "public" | "admin";
export type AdminRole      = "admin" | "owner";

// ─── Identity ───────────────────────────────────────────────────────────────

export interface ShgUser {
  id:            string;
  email:         string;
  name:          string | null;
  phone:         string | null;
  created_at:    string;
  last_login_at: string | null;
}

export interface ShgAdminUser {
  id:            string;
  email:         string;
  name:          string;
  role:          AdminRole;
  is_active:     boolean;
  created_at:    string;
  last_login_at: string | null;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export interface ShgVenue {
  id:         string;
  name:       string;
  address:    string;
  city:       string | null;
  map_url:    string | null;
  notes:      string | null;   // admin-only, never sent to public API responses
  created_at: string;
  updated_at: string;
}

/** Venue fields safe to include in a public API response — no `notes`. */
export type ShgVenuePublic = Omit<ShgVenue, "notes">;

export interface ShgGame {
  id:                string;
  name:              string;
  slug:              string;
  min_players:       number;
  max_players:       number;
  playtime_minutes:  number;
  complexity:        GameComplexity;
  beginner_friendly: boolean;
  tags:              string[];
  image_url:         string | null;
  description:       string | null;
  bgg_link:          string | null;
  available:         boolean;
  created_at:        string;
  updated_at:        string;
}

export interface ShgEvent {
  id:                string;
  title:             string;
  slug:              string;
  description:       string | null;
  venue_id:          string;
  starts_at:         string;
  ends_at:           string | null;
  capacity:          number;
  price_per_person:  number;
  currency:          string;
  status:            EventStatus;
  cover_image_url:   string | null;
  created_at:        string;
  updated_at:        string;
}

export interface ShgEventWithVenue extends ShgEvent {
  venue:     ShgVenuePublic;
  games:     ShgGame[];
  remaining: number;
}

export interface ShgEventListItem extends ShgEvent {
  venue:     Pick<ShgVenuePublic, "id" | "name" | "city">;
  remaining: number;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export interface ShgBooking {
  id:            string;
  event_id:      string;
  user_id:       string | null;
  name:          string;
  email:         string;
  phone:         string | null;
  guest_count:   number;
  cost:          number;
  status:        BookingStatus;
  receipt_path:  string | null;
  admin_note:    string | null;
  reviewed_by:   string | null;
  reviewed_at:   string | null;
  created_at:    string;
  updated_at:    string;
}

export interface ShgBookingWithEvent extends ShgBooking {
  event: Pick<ShgEvent, "id" | "title" | "slug" | "starts_at">;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface ShgSetting {
  key:        string;
  value:      string;
  updated_at: string;
}

// ─── Session payloads (signed into the shg_session / shg_admin_session cookies) ──

export interface ShgSessionPayload {
  sub:   string;   // shg_users.id
  email: string;
  kind:  "public";
}

export interface ShgAdminSessionPayload {
  sub:   string;   // shg_admin_users.id
  email: string;
  role:  AdminRole;
  kind:  "admin";
}
