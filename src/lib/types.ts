export type City = "Český Krumlov" | "České Budějovice" | "Prague";

export interface Profile {
  id: string;
  player_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface BeerLog {
  id: string;
  user_id: string;
  beer_name: string;
  brewery: string | null;
  style: string | null;
  rating: number;
  city: City | null;
  bar_name: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  check: (logs: BeerLog[], profile: Profile) => boolean;
}

export interface LeaderboardEntry {
  profile: Profile;
  total_beers: number;
  avg_rating: number;
  unique_beers: number;
  cities_visited: number;
  achievements_count: number;
}
