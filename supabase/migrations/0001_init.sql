-- Retro League — schema initial (PRD Tome 2, section 3).
-- Modele de donnees du jeu multijoueur. Les ecritures de gameplay passent
-- toutes par le serveur (service role) ; les clients ne peuvent que LIRE
-- (Tome 2 section 16 : impossible de modifier equipe/score via le frontend).

-- ------------------------------------------------------------------ enums ---
create type era_type as enum ('MODERNE', 'E2015', 'E2010', 'E2007', 'E2003');

create type position_type as enum (
  'G', 'DC', 'DD', 'DG', 'MDC', 'MC', 'MOC', 'MD', 'MG', 'BU', 'AD', 'AG'
);

create type simulation_mode as enum ('rapide', 'validation');
create type league_status as enum (
  'draft', 'composition', 'season', 'mercato', 'finished'
);
create type ai_personality as enum (
  'conservatrice', 'offensive', 'collectionneur', 'equilibree'
);
create type fixture_status as enum ('scheduled', 'played');
create type match_event_type as enum (
  'goal', 'legendary', 'narrative', 'kickoff', 'fulltime'
);
create type trade_status as enum ('pending', 'accepted', 'rejected');

-- --------------------------------------------------------- content (read) ---
-- La Content Bible (Tome 3). Lecture publique, ecriture reservee au seed /
-- service role. Peuplee par supabase/seed.sql (genere depuis src/lib/content).

create table historical_teams (
  id              text primary key,
  club_name       text not null,
  season          text not null,
  era             era_type not null,
  league          text not null,
  coach           text not null,
  final_position  int not null,
  points          int not null,
  description     text not null,
  mythic_tag      text
);

create table players (
  id                   text primary key,
  name                 text not null,
  position             position_type not null,
  secondary_positions  position_type[] not null default '{}',
  overall              int not null,
  potential            int not null,
  age                  int not null,
  nationality          text not null,
  decade               int not null,
  historical_team_id   text not null references historical_teams(id),
  club                 text not null,
  season               text not null,
  era                  era_type not null
);
create index players_team_idx on players(historical_team_id);
create index players_era_idx on players(era);

create table legendary_moments (
  id           bigint generated always as identity primary key,
  player_match text not null,
  archetype    text not null,
  trigger      text not null,
  bonus        int not null,
  narration    text[] not null
);

-- --------------------------------------------------------------- accounts ---
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  username   text,
  avatar     text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- league ---
create table leagues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  invite_code      text not null unique,
  simulation_mode  simulation_mode not null default 'rapide',
  historical_depth text not null,
  status           league_status not null default 'draft',
  current_matchday int not null default 1,
  season_number    int not null default 1,
  owner_id         uuid references users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index leagues_owner_idx on leagues(owner_id);

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references leagues(id) on delete cascade,
  user_id     uuid references users(id) on delete set null, -- null => club IA
  name        text not null,
  is_ai       boolean not null default false,
  personality ai_personality,
  formation   text not null default '4-4-2',
  form        real not null default 0,
  created_at  timestamptz not null default now()
);
create index clubs_league_idx on clubs(league_id);
create index clubs_user_idx on clubs(user_id);

create table squad_players (
  id                bigint generated always as identity primary key,
  club_id           uuid not null references clubs(id) on delete cascade,
  player_id         text not null references players(id),
  starter           boolean not null default false,
  assigned_position position_type not null,
  bench_order       int
);
create index squad_players_club_idx on squad_players(club_id);

create table fixtures (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references leagues(id) on delete cascade,
  matchday      int not null,
  home_club_id  uuid not null references clubs(id) on delete cascade,
  away_club_id  uuid not null references clubs(id) on delete cascade,
  home_score    int,
  away_score    int,
  status        fixture_status not null default 'scheduled'
);
create index fixtures_league_md_idx on fixtures(league_id, matchday);

create table match_events (
  id          bigint generated always as identity primary key,
  fixture_id  uuid not null references fixtures(id) on delete cascade,
  minute      int not null,
  event_type  match_event_type not null,
  club_id     uuid references clubs(id) on delete cascade,
  player_id   text,
  assist_id   text,
  description text not null
);
create index match_events_fixture_idx on match_events(fixture_id);

create table trade_offers (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references leagues(id) on delete cascade,
  from_club_id  uuid not null references clubs(id) on delete cascade,
  to_club_id    uuid not null references clubs(id) on delete cascade,
  offered       text[] not null default '{}',
  requested     text[] not null default '{}',
  status        trade_status not null default 'pending',
  created_at    timestamptz not null default now()
);
create index trade_offers_league_idx on trade_offers(league_id);

-- --------------------------------------------------------------- RLS --------
-- Securite (Tome 2 section 16). Les clients LISENT les donnees de leurs ligues
-- mais n'ecrivent jamais l'etat de jeu : toutes les mutations passent par le
-- serveur avec la service role key (qui contourne RLS). Aucune policy
-- d'INSERT/UPDATE/DELETE n'est donc accordee a anon/authenticated sur les
-- tables de gameplay.

alter table historical_teams enable row level security;
alter table players enable row level security;
alter table legendary_moments enable row level security;
alter table users enable row level security;
alter table leagues enable row level security;
alter table clubs enable row level security;
alter table squad_players enable row level security;
alter table fixtures enable row level security;
alter table match_events enable row level security;
alter table trade_offers enable row level security;

-- Contenu : lecture publique.
create policy content_read_teams on historical_teams for select using (true);
create policy content_read_players on players for select using (true);
create policy content_read_moments on legendary_moments for select using (true);

-- Compte : chacun voit/maj sa propre ligne.
create policy users_self_select on users for select using (auth.uid() = id);
create policy users_self_update on users for update using (auth.uid() = id);

-- Helper : l'utilisateur courant est-il membre de la ligue ?
create or replace function is_league_member(p_league uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from clubs c
    where c.league_id = p_league and c.user_id = auth.uid()
  );
$$;

-- Ligues : visibles par leurs membres.
create policy leagues_member_select on leagues
  for select using (is_league_member(id) or owner_id = auth.uid());

create policy clubs_member_select on clubs
  for select using (is_league_member(league_id));

create policy squad_member_select on squad_players
  for select using (
    is_league_member((select league_id from clubs where id = club_id))
  );

create policy fixtures_member_select on fixtures
  for select using (is_league_member(league_id));

create policy events_member_select on match_events
  for select using (
    is_league_member((select league_id from fixtures where id = fixture_id))
  );

create policy trades_member_select on trade_offers
  for select using (is_league_member(league_id));

-- Auto-provision de la ligne users a l'inscription.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
