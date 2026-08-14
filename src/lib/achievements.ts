import { AchievementContext, AchievementDefinition, BeerLog, Profile } from "@/lib/types";

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

function allPlayersLoggedWithinFiveMinutes(logs: BeerLog[], playerIds: string[]) {
  if (playerIds.length === 0) return false;
  const timestampsByPlayer = new Map<string, number[]>();
  logs.forEach((log) => {
    const timestamps = timestampsByPlayer.get(log.user_id) ?? [];
    timestamps.push(new Date(log.created_at).getTime());
    timestampsByPlayer.set(log.user_id, timestamps);
  });

  const playerTimestamps = [...timestampsByPlayer.values()];
  if (playerTimestamps.length < playerIds.length) return false;
  const allTimes = [...new Set(playerTimestamps.flat())].sort((a, b) => a - b);
  for (let start = 0; start < allTimes.length; start += 1) {
    const windowEnd = allTimes[start] + 5 * 60 * 1000;
    const playersInWindow = new Set(
      logs
        .filter((log) => {
          const timestamp = new Date(log.created_at).getTime();
          return timestamp >= allTimes[start] && timestamp <= windowEnd;
        })
        .map((log) => log.user_id)
    );
    if (playerIds.every((playerId) => playersInWindow.has(playerId))) return true;
  }
  return false;
}

function uniquePhotoOwnersReactedTo(
  context: AchievementContext,
  userId: string
) {
  const logOwners = new Map(context.allLogs.map((log) => [log.id, log.user_id]));
  return new Set(
    context.reactions
      .filter((reaction) => reaction.user_id === userId)
      .map((reaction) => logOwners.get(reaction.beer_log_id))
      .filter((ownerId): ownerId is string => Boolean(ownerId && ownerId !== userId))
  ).size;
}

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function latestLogForPlayer(logs: BeerLog[], userId: string) {
  return [...logs]
    .filter((log) => log.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function latestLogByOtherPlayers(logs: BeerLog[], userId: string) {
  return logs
    .filter((log) => log.user_id !== userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function currentUserHasUniqueBrewery(logs: BeerLog[], userId: string) {
  const ownBreweries = new Set(
    logs.filter((log) => log.user_id === userId).map((log) => normalized(log.brewery)).filter(Boolean)
  );
  const otherBreweries = new Set(
    logs.filter((log) => log.user_id !== userId).map((log) => normalized(log.brewery)).filter(Boolean)
  );
  return [...ownBreweries].some((brewery) => !otherBreweries.has(brewery));
}

function currentUserWasFirstAtPub(logs: BeerLog[], userId: string) {
  const firstByPub = new Map<string, BeerLog>();
  [...logs]
    .filter((log) => log.bar_name)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((log) => {
      const pubKey = `${normalized(log.bar_name)}|${normalized(log.city)}`;
      if (!firstByPub.has(pubKey)) firstByPub.set(pubKey, log);
    });
  return [...firstByPub.values()].some((log) => log.user_id === userId);
}

function currentUserHasLongWayRound(logs: BeerLog[], userId: string) {
  const pubsByCity = new Map<string, Set<string>>();
  logs.filter((log) => log.user_id === userId && log.city && log.bar_name).forEach((log) => {
    const pubs = pubsByCity.get(log.city!) ?? new Set<string>();
    pubs.add(normalized(log.bar_name));
    pubsByCity.set(log.city!, pubs);
  });
  const cities = [...pubsByCity.keys()];
  for (let first = 0; first < cities.length; first += 1) {
    for (let second = first + 1; second < cities.length; second += 1) {
      if ((pubsByCity.get(cities[first])?.size ?? 0) + (pubsByCity.get(cities[second])?.size ?? 0) >= 5) return true;
    }
  }
  return false;
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

  // ── Hidden group achievements ─────────────────────────────────────────────
  {
    key: "five_minute_crew",
    title: "Five-Minute Crew",
    description: "All players logged a beer within the same five-minute window.",
    icon: "⚡",
    hidden: true,
    check: (logs, _profile, context) =>
      Boolean(context && allPlayersLoggedWithinFiveMinutes(context.allLogs, context.playerIds)),
  },
  ...[20, 50, 100, 150, 200, 250].map((threshold) => ({
    key: `crew_${threshold}`,
    title: `Crew ${threshold}`,
    description: `The group collectively logged ${threshold} beers.`,
    icon: threshold >= 100 ? "🏆" : "🍻",
    hidden: true,
    check: (logs: BeerLog[], _profile: Profile, context?: AchievementContext) =>
      (context?.allLogs.length ?? logs.length) >= threshold,
  })),
  {
    key: "czech_formation",
    title: "Czech Formation",
    description: "The group collectively logged beers in all three cities.",
    icon: "🇨🇿",
    hidden: true,
    check: (_logs, _profile, context) => {
      const cities = new Set(context?.allLogs.map((log) => log.city));
      return Boolean(
        cities.has("Český Krumlov") &&
          cities.has("České Budějovice") &&
          cities.has("Prague")
      );
    },
  },
  {
    key: "social_butterfly",
    title: "Social Butterfly",
    description: "React to photos from 20 different players.",
    icon: "🦋",
    hidden: true,
    check: (_logs, _profile, context) =>
      Boolean(context && uniquePhotoOwnersReactedTo(context, context.currentUserId) >= 20),
  },
  {
    key: "local_treasure",
    title: "Local Treasure",
    description: "Log a beer from a brewery nobody else has logged.",
    icon: "💎",
    hidden: true,
    check: (_logs, _profile, context) =>
      Boolean(context && currentUserHasUniqueBrewery(context.allLogs, context.currentUserId)),
  },
  {
    key: "pub_pioneer",
    title: "Pub Pioneer",
    description: "Be the first player to log a pub.",
    icon: "🚩",
    hidden: true,
    check: (_logs, _profile, context) =>
      Boolean(context && currentUserWasFirstAtPub(context.allLogs, context.currentUserId)),
  },
  {
    key: "last_call_explorer",
    title: "Last Call Explorer",
    description: "Log a beer at a pub after every other player has stopped.",
    icon: "🌃",
    hidden: true,
    check: (_logs, _profile, context) => {
      if (!context?.isTripFinalDay) return false;
      const ownLatest = latestLogForPlayer(context.allLogs, context.currentUserId);
      const otherLatest = latestLogByOtherPlayers(context.allLogs, context.currentUserId);
      return Boolean(
        ownLatest &&
          otherLatest &&
          ownLatest.bar_name &&
          new Date(ownLatest.created_at).getTime() > new Date(otherLatest.created_at).getTime()
      );
    },
  },
  {
    key: "long_way_round",
    title: "The Long Way Round",
    description: "Visit five different pubs across two cities.",
    icon: "🛣️",
    hidden: true,
    check: (_logs, _profile, context) =>
      Boolean(context && currentUserHasLongWayRound(context.allLogs, context.currentUserId)),
  },
  {
    key: "the_optimist",
    title: "The Optimist",
    description: "Give five beers a 5-star rating.",
    icon: "🌞",
    hidden: true,
    check: (logs) => logs.filter((log) => log.rating === 5).length >= 5,
  },
  {
    key: "the_skeptic",
    title: "The Skeptic",
    description: "Give five beers a 1- or 2-star rating.",
    icon: "🧐",
    hidden: true,
    check: (logs) => logs.filter((log) => log.rating <= 2).length >= 5,
  },
  {
    key: "alphabet_pour",
    title: "Alphabet Pour",
    description: "Log beers beginning with five different letters.",
    icon: "🔤",
    hidden: true,
    check: (logs) => new Set(logs.map((log) => normalized(log.beer_name).charAt(0)).filter(Boolean)).size >= 5,
  },
  {
    key: "perfect_timing",
    title: "Perfect Timing",
    description: "Log a beer exactly one hour after another beer.",
    icon: "🎯",
    hidden: true,
    check: (logs) => {
      const times = logs.map((log) => new Date(log.created_at).getTime());
      return times.some((time, index) => times.some((other, otherIndex) => index !== otherIndex && Math.abs(time - other) === 60 * 60 * 1000));
    },
  },
  {
    key: "the_comeback",
    title: "The Comeback",
    description: "Log a 5-star beer immediately after a 1-star beer.",
    icon: "🔄",
    hidden: true,
    check: (logs) => {
      const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return sorted.some((log, index) => index > 0 && log.rating === 5 && sorted[index - 1].rating === 1);
    },
  },
  ...[20, 50, 100, 150, 200].map((threshold) => ({
    key: `lucky_number_${threshold}`,
    title: `Lucky Number ${threshold}`,
    description: `Log the beer that brings the group to exactly ${threshold} beers.`,
    icon: "🎰",
    hidden: true,
    check: (logs: BeerLog[], _profile: Profile, context?: AchievementContext) =>
      (context?.allLogs.length ?? logs.length) === threshold,
  })),
  {
    key: "the_outlier",
    title: "The Outlier",
    description: "Be the only player to log a particular beer.",
    icon: "🛰️",
    hidden: true,
    check: (_logs, _profile, context) => {
      if (!context) return false;
      const ownersByBeer = new Map<string, Set<string>>();
      context.allLogs.forEach((log) => {
        const owners = ownersByBeer.get(normalized(log.beer_name)) ?? new Set<string>();
        owners.add(log.user_id);
        ownersByBeer.set(normalized(log.beer_name), owners);
      });
      return context.allLogs.some(
        (log) => log.user_id === context.currentUserId && (ownersByBeer.get(normalized(log.beer_name))?.size ?? 0) === 1
      );
    },
  },
  {
    key: "leaderboard_ghost",
    title: "Leaderboard Ghost",
    description: "Hold first place, then disappear from the top spot within ten minutes on the final day.",
    icon: "👻",
    hidden: true,
    check: (_logs, _profile, context) => Boolean(context?.isTripFinalDay && context.leaderboardGhost),
  },
  {
    key: "the_underdog",
    title: "The Underdog",
    description: "Move from last place into the top three on the final day.",
    icon: "🐕",
    hidden: true,
    check: (_logs, _profile, context) => Boolean(context?.isTripFinalDay && context.underdog),
  },
  {
    key: "plot_armor",
    title: "Plot Armor",
    description: "Unlock two other achievements from a single beer log.",
    icon: "🛡️",
    hidden: true,
    check: (_logs, _profile, context) => Boolean(context?.plotArmor),
  },
];

export function checkNewAchievements(
  logs: BeerLog[],
  unlockedKeys: string[],
  context?: AchievementContext
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    (a) => !unlockedKeys.includes(a.key) && a.check(logs, {} as never, context)
  );
}
