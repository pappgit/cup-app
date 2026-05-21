alter table public.sponsors
  add column if not exists placement text not null default 'kiosk';

alter table public.sponsors
  add column if not exists slogan text;

-- Eksisterende logoer uten plassering → kiosk
update public.sponsors set placement = 'kiosk' where placement is null or placement = '';
