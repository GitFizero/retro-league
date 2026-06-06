-- Retro League — multijoueur : identite anonyme (pseudo + code), modes
-- "league" / "duel", salle d'attente (lobby) et adhesion par code.
-- A appliquer APRES 0001_init.sql (supabase db push, ou SQL editor).
--
-- Rappel securite : les clients ne PEUVENT PAS ecrire l'etat de jeu (RLS). Les
-- seules ecritures autorisees au joueur passent par des RPC SECURITY DEFINER
-- controlees (definir son pseudo, rejoindre par code) ou par l'API serveur
-- (service role) pour le draft et la simulation.

-- ----------------------------------------------------------- league status --
-- Etat "lobby" : la ligue attend que les amis rejoignent avant le draft.
alter type league_status add value if not exists 'lobby' before 'draft';

-- --------------------------------------------------------- league options ---
alter table leagues
  add column if not exists mode           text    not null default 'league', -- 'league' | 'duel'
  add column if not exists max_humans     int     not null default 8,
  add column if not exists club_pool      text    not null default 'top10',
  add column if not exists with_subs      boolean not null default false,
  add column if not exists mercato_enabled boolean not null default true,
  add column if not exists max_trade_size int     not null default 2;

-- Une fois le draft d'un club termine cote joueur.
alter table clubs
  add column if not exists drafted boolean not null default false;

-- ------------------------------------------------- comptes anonymes (pseudo) --
-- Provision a l'inscription : anonyme => pas d'email, on prend le pseudo des
-- metadonnees s'il existe, sinon un nom d'invite.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Invite'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Le joueur (anonyme) definit/maj son pseudo.
create or replace function set_username(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.users set username = left(trim(p_name), 24) where id = auth.uid();
end;
$$;

-- --------------------------------------------------- rejoindre par code -----
-- Cree le club (vide, a drafter) du joueur courant dans la ligue ciblee par son
-- code, si la salle n'est pas pleine et qu'il n'est pas deja membre.
create or replace function join_league_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league   leagues%rowtype;
  v_humans   int;
  v_name     text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_league from leagues
   where upper(invite_code) = upper(trim(p_code))
   limit 1;
  if not found then
    raise exception 'league not found';
  end if;

  if v_league.status not in ('lobby', 'draft') then
    raise exception 'league already started';
  end if;

  -- Deja membre ? on renvoie simplement l'id.
  if exists (select 1 from clubs where league_id = v_league.id and user_id = auth.uid()) then
    return v_league.id;
  end if;

  select count(*) into v_humans from clubs
   where league_id = v_league.id and user_id is not null;
  if v_humans >= v_league.max_humans then
    raise exception 'league full';
  end if;

  select coalesce(username, 'Invite') into v_name from users where id = auth.uid();

  insert into clubs (league_id, user_id, name, is_ai, formation)
  values (v_league.id, auth.uid(), v_name, false, '4-4-2');

  return v_league.id;
end;
$$;

-- Droits d'execution pour les sessions (anon = utilisateur anonyme connecte).
grant execute on function set_username(text) to authenticated, anon;
grant execute on function join_league_by_code(text) to authenticated, anon;
