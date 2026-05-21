-- 003_match_series.sql
-- Seriekamper: grupper, faser, resultater

alter table public.matches
  add column if not exists court text,
  add column if not exists group_id text,
  add column if not exists phase text,
  add column if not exists home_score int,
  add column if not exists away_score int,
  add column if not exists match_label text;
