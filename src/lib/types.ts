export type City = string;

export interface Profile {
  id: string;
  player_name: string;
  avatar_url: string | null;
  weight_kg: number;
  sex: "male" | "female";
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

export interface AchievementContext {
  allLogs: BeerLog[];
  playerIds: string[];
  reactions: { user_id: string; beer_log_id: string }[];
  currentUserId: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface ChallengeCompletion {
  id: string;
  user_id: string;
  challenge_key: string;
  challenge_date: string;
  points: number;
  completed_at: string;
}

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  hidden?: boolean;
  check: (logs: BeerLog[], profile: Profile, context?: AchievementContext) => boolean;
}

export interface LeaderboardEntry {
  profile: Profile;
  total_beers: number;
  avg_rating: number;
  unique_beers: number;
  cities_visited: number;
  achievements_count: number;
}
