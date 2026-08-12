import { AchievementDefinition, BeerLog } from "@/lib/types";

function logsOnSameDay(logs: BeerLog[], date: Date): BeerLog[] {
  return logs.filter((l) => {
    const d = new Date(l.created_at);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });
}

function maxBeersInOneDay(logs: BeerLog[]): number {
  const days = new Map<string, number>();
  for (const l of logs) {
    const key = new Date(l.created_at).toDateString();
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...days.values());
}

function uniqueBarsOnDay(logs: BeerLog[], date: Date): number {
  const bars = new Set(
    logsOnSameDay(logs, date)
      .map((l) => l.bar_name)
      .filter(Boolean)
  );
  return bars.size;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── Getting started ────────────────────────────────────────────────────────
  {
    key: "first_beer",
    title: "First Pour",
    description: "Log your very first beer of the trip.",
    icon: "🍺",
    check: (logs) => logs.length >= 1,
  },
  {
    key: "double_digits",
    title: "Double Digits",
    description: "Log 10 beers total.",
    icon: "💪",
    check: (logs) => logs.length >= 10,
  },
  {
    key: "warming_up",
    title: "Warming Up",
    description: "Log 20 beers total.",
    icon: "🔥",
    check: (logs) => logs.length >= 20,
  },
  {
    key: "getting_serious",
    title: "Getting Serious",
    description: "Log 30 beers total.",
    icon: "💀",
    check: (logs) => logs.length >= 30,
  },
  {
    key: "czech_legend",
    title: "Czech Legend",
    description: "Log 50 beers total.",
    icon: "🏆",
    check: (logs) => logs.length >= 50,
  },
  {
    key: "honorary_citizen",
    title: "Honorary Czech Citizen",
    description: "Log 70 beers total. Are you even human?",
    icon: "👨‍🦱🇨🇿",
    check: (logs) => logs.length >= 70,
  },

  // ── Daily volume ───────────────────────────────────────────────────────────
  {
    key: "five_a_day",
    title: "Five a Day",
    description: "Log 5 beers in a single day.",
    icon: "🖐️",
    check: (logs) => maxBeersInOneDay(logs) >= 5,
  },
  {
    key: "one_per_hour",
    title: "One Per Hour",
    description: "Log 8 beers in a single day.",
    icon: "⏱️",
    check: (logs) => maxBeersInOneDay(logs) >= 8,
  },
  {
    key: "daily_double_digits",
    title: "Ten Pints Day",
    description: "Log 10 beers in a single day.",
    icon: "🤯",
    check: (logs) => maxBeersInOneDay(logs) >= 10,
  },
  {
    key: "unstoppable",
    title: "Unstoppable",
    description: "Log 15 beers in a single day. We're worried about you.",
    icon: "☠️",
    check: (logs) => maxBeersInOneDay(logs) >= 15,
  },

  // ── Cities ─────────────────────────────────────────────────────────────────
  {
    key: "river_rat",
    title: "River Rat",
    description: "Log a beer in Český Krumlov.",
    icon: "🛶",
    check: (logs) => logs.some((l) => l.city === "Český Krumlov"),
  },
  {
    key: "at_the_source",
    title: "At the Source",
    description: "Log a Budvar beer in České Budějovice.",
    icon: "🏭",
    check: (logs) =>
      logs.some(
        (l) =>
          l.city === "České Budějovice" &&
          (l.beer_name?.toLowerCase().includes("budvar") ||
            l.brewery?.toLowerCase().includes("budvar"))
      ),
  },
  {
    key: "prague_king",
    title: "Prague King",
    description: "Log 5 or more beers in Prague.",
    icon: "👑",
    check: (logs) => logs.filter((l) => l.city === "Prague").length >= 5,
  },
  {
    key: "prague_emperor",
    title: "Prague Emperor",
    description: "Log 15 or more beers in Prague.",
    icon: "🏰",
    check: (logs) => logs.filter((l) => l.city === "Prague").length >= 15,
  },
  {
    key: "czech_completionist",
    title: "Czech Completionist",
    description: "Log a beer in all 3 cities.",
    icon: "🗺️",
    check: (logs) => {
      const cities = new Set(logs.map((l) => l.city));
      return (
        cities.has("Český Krumlov") &&
        cities.has("České Budějovice") &&
        cities.has("Prague")
      );
    },
  },

  // ── Time-based ─────────────────────────────────────────────────────────────
  {
    key: "early_bird",
    title: "Early Bird",
    description: "Log a beer before noon.",
    icon: "🌅",
    check: (logs) => logs.some((l) => new Date(l.created_at).getHours() < 12),
  },
  {
    key: "hair_of_the_dog",
    title: "Hair of the Dog",
    description: "Log a beer before 9am.",
    icon: "🐕",
    check: (logs) => logs.some((l) => new Date(l.created_at).getHours() < 9),
  },
  {
    key: "breakfast_champion",
    title: "Breakfast of Champions",
    description: "Log a beer before 8am. Legendary.",
    icon: "🍳",
    check: (logs) => logs.some((l) => new Date(l.created_at).getHours() < 8),
  },
  {
    key: "night_owl",
    title: "Night Owl",
    description: "Log a beer after midnight.",
    icon: "🦉",
    check: (logs) => logs.some((l) => new Date(l.created_at).getHours() < 4),
  },
  {
    key: "never_sleeps",
    title: "Never Sleeps",
    description: "Log a beer between 3am and 5am.",
    icon: "🌙",
    check: (logs) => {
      return logs.some((l) => {
        const h = new Date(l.created_at).getHours();
        return h >= 3 && h < 5;
      });
    },
  },

  // ── Pub crawl & variety ────────────────────────────────────────────────────
  {
    key: "pub_crawl",
    title: "Pub Crawler",
    description: "Log beers in 3 different bars in one day.",
    icon: "🚶",
    check: (logs) => {
      const days = new Set(logs.map((l) => new Date(l.created_at).toDateString()));
      return [...days].some((d) => uniqueBarsOnDay(logs, new Date(d)) >= 3);
    },
  },
  {
    key: "pub_marathon",
    title: "Pub Marathon",
    description: "Log beers in 5 different bars in one day.",
    icon: "🏃",
    check: (logs) => {
      const days = new Set(logs.map((l) => new Date(l.created_at).toDateString()));
      return [...days].some((d) => uniqueBarsOnDay(logs, new Date(d)) >= 5);
    },
  },
  {
    key: "loyal_subject",
    title: "Loyal Subject",
    description: "Log the same beer 3 times in a row.",
    icon: "🔁",
    check: (logs) => {
      const sorted = [...logs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      for (let i = 2; i < sorted.length; i++) {
        if (
          sorted[i].beer_name === sorted[i - 1].beer_name &&
          sorted[i].beer_name === sorted[i - 2].beer_name
        )
          return true;
      }
      return false;
    },
  },
  {
    key: "connoisseur",
    title: "Connoisseur",
    description: "Log 5 different beer styles.",
    icon: "🎩",
    check: (logs) => new Set(logs.map((l) => l.style).filter(Boolean)).size >= 5,
  },
  {
    key: "variety_pack",
    title: "Variety Pack",
    description: "Log 10 different beers.",
    icon: "🌈",
    check: (logs) =>
      new Set(logs.map((l) => l.beer_name.toLowerCase())).size >= 10,
  },
  {
    key: "master_of_variety",
    title: "Master of Variety",
    description: "Log 20 different beers.",
    icon: "🧠",
    check: (logs) =>
      new Set(logs.map((l) => l.beer_name.toLowerCase())).size >= 20,
  },

  // ── Ratings ────────────────────────────────────────────────────────────────
  {
    key: "critic",
    title: "Harsh Critic",
    description: "Rate a beer 1 star.",
    icon: "👎",
    check: (logs) => logs.some((l) => l.rating === 1),
  },
  {
    key: "top_rated",
    title: "Beer Snob",
    description: "Rate 3 beers 5 stars.",
    icon: "⭐",
    check: (logs) => logs.filter((l) => l.rating === 5).length >= 3,
  },
  {
    key: "full_week",
    title: "Full Week Soldier",
    description: "Log at least one beer every day of the 7-day trip.",
    icon: "📅",
    check: (logs) => {
      const days = new Set(logs.map((l) => new Date(l.created_at).toDateString()));
      return days.size >= 7;
    },
  },
];

export function checkNewAchievements(
  logs: BeerLog[],
  unlockedKeys: string[]
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    (a) => !unlockedKeys.includes(a.key) && a.check(logs, {} as never)
  );
}
