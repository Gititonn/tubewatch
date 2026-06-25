export interface Profile {
  id: string;
  email: string | null;
  plan: "free" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Channel {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  channel_name: string | null;
  channel_thumbnail: string | null;
  subscriber_count: number | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  youtube_video_id: string;
  title: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  outlier_score: number | null;
  updated_at: string;
}
