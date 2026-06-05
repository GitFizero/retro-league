/**
 * Typed schema for the Supabase database (mirror of supabase/migrations).
 * Hand-maintained here; in a live project regenerate with
 *   supabase gen types typescript --local > src/lib/supabase/database.types.ts
 */
import type {
  AiPersonality,
  Era,
  FixtureStatusValue,
  LeagueStatus,
  MatchEventType,
  Position,
  SimulationMode,
  TradeStatusValue,
} from "@/lib/types";

type Timestamp = string;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          avatar: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          avatar?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      Relationships: [];
      };
      historical_teams: {
        Row: {
          id: string;
          club_name: string;
          season: string;
          era: Era;
          league: string;
          coach: string;
          final_position: number;
          points: number;
          description: string;
          mythic_tag: string | null;
        };
        Insert: Database["public"]["Tables"]["historical_teams"]["Row"];
        Update: Partial<Database["public"]["Tables"]["historical_teams"]["Row"]>;
      Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          position: Position;
          secondary_positions: Position[];
          overall: number;
          potential: number;
          age: number;
          nationality: string;
          decade: number;
          historical_team_id: string;
          club: string;
          season: string;
          era: Era;
        };
        Insert: Database["public"]["Tables"]["players"]["Row"];
        Update: Partial<Database["public"]["Tables"]["players"]["Row"]>;
      Relationships: [];
      };
      legendary_moments: {
        Row: {
          id: number;
          player_match: string;
          archetype: string;
          trigger: string;
          bonus: number;
          narration: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["legendary_moments"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["legendary_moments"]["Row"]>;
      Relationships: [];
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          simulation_mode: SimulationMode;
          historical_depth: string;
          status: LeagueStatus;
          current_matchday: number;
          season_number: number;
          owner_id: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          simulation_mode: SimulationMode;
          historical_depth: string;
          status?: LeagueStatus;
          current_matchday?: number;
          season_number?: number;
          owner_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leagues"]["Insert"]>;
      Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          league_id: string;
          user_id: string | null;
          name: string;
          is_ai: boolean;
          personality: AiPersonality | null;
          formation: string;
          form: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id?: string | null;
          name: string;
          is_ai: boolean;
          personality?: AiPersonality | null;
          formation?: string;
          form?: number;
        };
        Update: Partial<Database["public"]["Tables"]["clubs"]["Insert"]>;
      Relationships: [];
      };
      squad_players: {
        Row: {
          id: number;
          club_id: string;
          player_id: string;
          starter: boolean;
          assigned_position: Position;
          bench_order: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["squad_players"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["squad_players"]["Row"]>;
      Relationships: [];
      };
      fixtures: {
        Row: {
          id: string;
          league_id: string;
          matchday: number;
          home_club_id: string;
          away_club_id: string;
          home_score: number | null;
          away_score: number | null;
          status: FixtureStatusValue;
        };
        Insert: {
          id?: string;
          league_id: string;
          matchday: number;
          home_club_id: string;
          away_club_id: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: FixtureStatusValue;
        };
        Update: Partial<Database["public"]["Tables"]["fixtures"]["Insert"]>;
      Relationships: [];
      };
      match_events: {
        Row: {
          id: number;
          fixture_id: string;
          minute: number;
          event_type: MatchEventType;
          club_id: string | null;
          player_id: string | null;
          assist_id: string | null;
          description: string;
        };
        Insert: Omit<Database["public"]["Tables"]["match_events"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["match_events"]["Row"]>;
      Relationships: [];
      };
      trade_offers: {
        Row: {
          id: string;
          league_id: string;
          from_club_id: string;
          to_club_id: string;
          offered: string[];
          requested: string[];
          status: TradeStatusValue;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          league_id: string;
          from_club_id: string;
          to_club_id: string;
          offered: string[];
          requested: string[];
          status?: TradeStatusValue;
        };
        Update: Partial<Database["public"]["Tables"]["trade_offers"]["Insert"]>;
      Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_league_member: {
        Args: { p_league: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
