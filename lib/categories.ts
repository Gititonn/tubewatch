/**
 * SINGLE SOURCE OF TRUTH for competitor-channel niche categories.
 * Values must match the CHECK constraint in
 * supabase/migrations/20260701_competitor_categories.sql.
 */

export type ChannelCategory =
  | "movies_trailers"
  | "gaming"
  | "education"
  | "finance_business"
  | "diy_home"
  | "tech_reviews"
  | "beauty_fashion"
  | "fitness_health"
  | "food_cooking"
  | "comedy_entertainment"
  | "music"
  | "vlogs_lifestyle"
  | "other";

export interface CategoryDef {
  id: ChannelCategory;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "movies_trailers", label: "Movies & Trailers", emoji: "🎬" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "finance_business", label: "Finance & Business", emoji: "💰" },
  { id: "diy_home", label: "DIY & Home", emoji: "🛠️" },
  { id: "tech_reviews", label: "Tech & Reviews", emoji: "💻" },
  { id: "beauty_fashion", label: "Beauty & Fashion", emoji: "💄" },
  { id: "fitness_health", label: "Fitness & Health", emoji: "🏋️" },
  { id: "food_cooking", label: "Food & Cooking", emoji: "🍳" },
  { id: "comedy_entertainment", label: "Comedy & Entertainment", emoji: "😂" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "vlogs_lifestyle", label: "Vlogs & Lifestyle", emoji: "📹" },
  { id: "other", label: "Other", emoji: "📦" },
];

export const CATEGORY_MAP: Record<ChannelCategory, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<ChannelCategory, CategoryDef>;

export function categoryLabel(id: string | null | undefined): string {
  return CATEGORY_MAP[id as ChannelCategory]?.label ?? "Other";
}

export function categoryEmoji(id: string | null | undefined): string {
  return CATEGORY_MAP[id as ChannelCategory]?.emoji ?? "📦";
}
