-- 002_match_court.sql
-- Legg til bane på kamper
alter table public.matches add column if not exists court text;
