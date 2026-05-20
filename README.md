# Tunet Cup App

Webapp for innebandy-cup — publiseres på GitHub Pages med **Supabase** som delt database.

## Funksjoner

### For besøkende
- Forside med velkomst og kamprogram (live fra Supabase)
- Velg favorittlag (lagres lokalt i nettleseren)
- Kamper og kiosk
- Sponsorlogoer

### Admin (Supabase Auth)
- Cupnavn, lag, kamprogram, kiosk, sponsorer
- Live synkronisering til alle enheter via Realtime

## Oppsett Supabase

1. Opprett prosjekt på [supabase.com](https://supabase.com)
2. Kjør SQL fra `supabase/migrations/001_initial.sql` i **SQL Editor**
3. **Authentication → Users → Add user** — opprett admin (e-post + passord)
4. **Project Settings → API** — kopier URL og `anon` public key
5. Opprett `.env` i prosjektmappen:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CUP_SLUG=active
```

6. Under **Database → Replication**, sjekk at tabellene er med i Realtime (migration prøver å legge dem til automatisk)

## Lokalt

```bash
npm install
npm run dev
```

Admin: `/admin/login` med Supabase-brukeren du opprettet.

## GitHub Pages

1. Legg secrets i repo: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. Endre `base` i `vite.config.ts` til repo-navnet
3. Push til `main` — workflow bygger og deployer

Manuelt deploy:

```bash
GITHUB_PAGES=true npm run build
npx gh-pages -d dist
```

## Design

- Lilla `#503688`, gul `#F9DC00`, hvit
- Tunet-logo, venstremeny
