-- Legg til bane på kamper (kjør i Supabase SQL Editor)
alter table public.matches add column if not exists court text;
