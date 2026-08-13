import { City } from "@/lib/types";

export interface Pub {
  id: string;
  name: string;
  city: City;
  latitude: number;
  longitude: number;
}

export interface MapBeerLog {
  id: string;
  beer_name: string;
  rating: number;
  city: City | null;
  bar_name: string | null;
  pub_id: string | null;
  created_at: string;
  profiles?: { player_name: string } | { player_name: string }[] | null;
}
