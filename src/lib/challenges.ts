import { BeerLog } from "@/lib/types";

export interface DailyChallenge {
  key: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  points: number;
  progress: (logs: BeerLog[]) => number;
}

function namedPubs(logs: BeerLog[]) {
  return new Set(
    logs.map((log) => log.bar_name?.trim().toLowerCase()).filter(Boolean)
  ).size;
}

function beerStyles(logs: BeerLog[]) {
  return new Set(logs.map((log) => log.style).filter(Boolean)).size;
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    key: "pub_scout",
    icon: "🧭",
    title: "Pub Scout",
    description: "Visit 2 different named pubs today.",
    target: 2,
    points: 10,
    progress: namedPubs,
  },
  {
    key: "style_explorer",
    icon: "🎨",
    title: "Style Explorer",
    description: "Try 2 different beer styles today.",
    target: 2,
    points: 10,
    progress: beerStyles,
  },
  {
    key: "tasting_panel",
    icon: "📝",
    title: "Tasting Panel",
    description: "Give thoughtful ratings to 3 beers today.",
    target: 3,
    points: 15,
    progress: (logs) => logs.length,
  },
  {
    key: "city_specialist",
    icon: "🏙️",
    title: "City Specialist",
    description: "Log 3 beers in the same city today.",
    target: 3,
    points: 15,
    progress: (logs) => {
      const counts = new Map<string, number>();
      logs.forEach((log) => {
        if (log.city) counts.set(log.city, (counts.get(log.city) ?? 0) + 1);
      });
      return Math.max(0, ...counts.values());
    },
  },
  {
    key: "pub_marathon",
    icon: "🚶",
    title: "Pub Marathon",
    description: "Visit 4 different named pubs today.",
    target: 4,
    points: 25,
    progress: namedPubs,
  },
  {
    key: "brewery_flight",
    icon: "🏭",
    title: "Brewery Flight",
    description: "Try beers from 3 different breweries today.",
    target: 3,
    points: 25,
    progress: (logs) =>
      new Set(
        logs.map((log) => log.brewery?.trim().toLowerCase()).filter(Boolean)
      ).size,
  },
  {
    key: "photo_journalist",
    icon: "📸",
    title: "Photo Journalist",
    description: "Capture 3 beer photos today.",
    target: 3,
    points: 25,
    progress: (logs) => logs.filter((log) => Boolean(log.photo_url)).length,
  },
  {
    key: "variety_sprint",
    icon: "🌈",
    title: "Variety Sprint",
    description: "Log 4 different beers today.",
    target: 4,
    points: 25,
    progress: (logs) =>
      new Set(logs.map((log) => log.beer_name.trim().toLowerCase())).size,
  },
  {
    key: "style_flight",
    icon: "🎨",
    title: "Style Flight",
    description: "Try 4 different beer styles today.",
    target: 4,
    points: 30,
    progress: beerStyles,
  },
  {
    key: "perfect_scores",
    icon: "⭐",
    title: "Perfect Scores",
    description: "Give 3 beers a 5-star rating today.",
    target: 3,
    points: 30,
    progress: (logs) => logs.filter((log) => log.rating === 5).length,
  },
  {
    key: "grand_pub_tour",
    icon: "🗺️",
    title: "Grand Pub Tour",
    description: "Visit 5 different named pubs today.",
    target: 5,
    points: 40,
    progress: namedPubs,
  },
  {
    key: "critics_circle",
    icon: "📝",
    title: "Critics Circle",
    description: "Write ratings for 6 beers today.",
    target: 6,
    points: 40,
    progress: (logs) => logs.length,
  },
];

export function getTodayChallenge(date = new Date()) {
  return DAILY_CHALLENGES[date.getDate() % DAILY_CHALLENGES.length];
}

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isToday(date: string, now = new Date()) {
  return new Date(date).toDateString() === now.toDateString();
}
