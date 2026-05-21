-- Bilde per kioskvare
alter table public.shop_items
  add column if not exists image_url text;
