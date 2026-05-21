alter table public.matches
  add column if not exists match_number int;

create index if not exists matches_cup_match_number_idx
  on public.matches (cup_id, match_number);
