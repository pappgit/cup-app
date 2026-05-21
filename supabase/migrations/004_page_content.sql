-- 004_page_content.sql
-- Forside-innhold, menyikoner og tema (jsonb på cups)

alter table public.cups
  add column if not exists page_content jsonb;

-- Eksempel for aktiv cup (kan redigeres i admin)
update public.cups
set page_content = jsonb_build_object(
  'heroSubtitle',
  'Velg ditt lag under – da vises riktige kamper og tabell i hele appen.',
  'participantInfo',
  E'Velkommen som deltaker på Tunet Cup!\n\n• Møt opp i god tid før kamp\n• Husk hvit trøye og lue\n• Kamper og resultater finner du under «Kamper» og «Tabell»\n\nLykke til!',
  'navItems',
  jsonb_build_array(
    jsonb_build_object('path', '/', 'label', 'Forside', 'icon', '⌂'),
    jsonb_build_object('path', '/kamper', 'label', 'Kamper', 'icon', '⚽'),
    jsonb_build_object('path', '/tabell', 'label', 'Tabell', 'icon', '📊'),
    jsonb_build_object('path', '/kiosk', 'label', 'Kiosk', 'icon', '🛒'),
    jsonb_build_object('path', '/admin', 'label', 'Admin', 'icon', '⚙')
  ),
  'theme',
  jsonb_build_object(
    'purple', '#503688',
    'purpleDark', '#3d2a66',
    'purpleLight', '#6d4fa8',
    'yellow', '#f9dc00',
    'yellowDark', '#e6c800'
  )
)
where slug = 'active' and page_content is null;
