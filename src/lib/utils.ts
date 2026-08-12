import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const BEER_STYLES = [
  "Lager",
  "Pilsner",
  "Czech Dark Lager",
  "Wheat Beer",
  "IPA",
  "Pale Ale",
  "Stout",
  "Porter",
  "Amber Ale",
  "Märzen",
  "Dunkel",
  "Hefeweizen",
  "Radler",
  "Other",
];

export const TRIP_CITIES = [
  "Český Krumlov",
  "České Budějovice",
  "Prague",
] as const;

export const CZECH_BEERS = [
  "Budvar",
  "Pilsner Urquell",
  "Kozel",
  "Staropramen",
  "Bernard",
  "Gambrinus",
  "Krušovice",
  "Velkopopovický Kozel",
  "Černá Hora",
  "Eggenberg",
  "Regent",
  "Samson",
];
