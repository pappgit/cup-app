import type { CupData, Match, PageContent, ScheduleParams } from '../types';
import { DEFAULT_CUP } from '../types';
import { normalizePageContent } from './pageContent';
import { normalizePlacement, normalizeSponsor } from './sponsors';
import { getCupSlug, supabase } from './supabase';

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

async function persistMatches(
  client: ReturnType<typeof requireClient>,
  cupId: string,
  matches: Match[]
): Promise<void> {
  const { error: delError } = await client.from('matches').delete().eq('cup_id', cupId);
  if (delError) throw delError;
  if (matches.length === 0) return;

  const rows = matches.map((m) => ({
    id: isValidUuid(m.id) ? m.id : crypto.randomUUID(),
    cup_id: cupId,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    start_time: m.startTime,
    court: m.court ?? null,
    round: m.round ?? null,
    match_number: m.matchNumber ?? null,
    group_id: m.groupId ?? null,
    phase: m.phase ?? null,
    home_score: m.homeScore ?? null,
    away_score: m.awayScore ?? null,
    match_label: m.label ?? null,
  }));

  let { error } = await client.from('matches').insert(rows);
  if (
    error?.message?.includes('court') ||
    error?.message?.includes('group_id') ||
    error?.message?.includes('match_number')
  ) {
    const basic = rows.map(
      ({
        group_id: _g,
        phase: _p,
        home_score: _hs,
        away_score: _as,
        match_label: _l,
        match_number: _mn,
        ...rest
      }) => rest
    );
    ({ error } = await client.from('matches').insert(basic));
  }
  if (error?.message?.includes('court')) {
    const legacy = rows.map(
      ({
        court: _c,
        group_id: _g,
        phase: _p,
        home_score: _hs,
        away_score: _as,
        match_label: _l,
        ...rest
      }) => rest
    );
    ({ error } = await client.from('matches').insert(legacy));
  }
  if (error) throw error;
}

export interface CupRecord {
  id: string;
  slug: string;
  name: string;
  team_count: number;
  schedule_params: ScheduleParams | null;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase er ikke konfigurert. Legg til VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

export async function fetchCup(): Promise<CupData & { cupId: string }> {
  const client = requireClient();
  const slug = getCupSlug();

  const { data: cupRow, error: cupError } = await client
    .from('cups')
    .select('id, slug, name, team_count, schedule_params, page_content')
    .eq('slug', slug)
    .maybeSingle();

  if (cupError) throw cupError;
  if (!cupRow) {
    return { ...DEFAULT_CUP, cupId: '' };
  }

  const cupId = cupRow.id;

  const [teamsRes, shopRes] = await Promise.all([
    client.from('teams').select('id, name, sort_order').eq('cup_id', cupId).order('sort_order'),
    client.from('shop_items').select('id, name, price, description, available, sort_order').eq('cup_id', cupId).order('sort_order'),
  ]);

  let sponsorsRes = await client
    .from('sponsors')
    .select('id, name, logo_url, placement, slogan, sort_order')
    .eq('cup_id', cupId)
    .order('sort_order');

  if (sponsorsRes.error?.message?.includes('placement')) {
    sponsorsRes = await client
      .from('sponsors')
      .select('id, name, logo_url, sort_order')
      .eq('cup_id', cupId)
      .order('sort_order');
  }

  const matchSelectFull =
    'id, home_team_id, away_team_id, start_time, round, match_number, court, group_id, phase, home_score, away_score, match_label';
  const matchSelectBasic = 'id, home_team_id, away_team_id, start_time, round, court';
  const matchSelectLegacy = 'id, home_team_id, away_team_id, start_time, round';

  let matchesRes = await client
    .from('matches')
    .select(matchSelectFull)
    .eq('cup_id', cupId)
    .order('start_time');

  if (matchesRes.error) {
    matchesRes = await client
      .from('matches')
      .select(matchSelectBasic)
      .eq('cup_id', cupId)
      .order('start_time');
  }
  if (matchesRes.error?.message?.includes('court')) {
    matchesRes = await client
      .from('matches')
      .select(matchSelectLegacy)
      .eq('cup_id', cupId)
      .order('start_time');
  }

  if (teamsRes.error) throw teamsRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (shopRes.error) throw shopRes.error;
  if (sponsorsRes.error) throw sponsorsRes.error;

  return {
    cupId,
    name: cupRow.name,
    teamCount: cupRow.team_count,
    scheduleParams: cupRow.schedule_params as ScheduleParams | null,
    pageContent: normalizePageContent(cupRow.page_content as PageContent | null),
    teams: (teamsRes.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    matches: (matchesRes.data ?? []).map((m) => ({
      id: m.id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      startTime: m.start_time,
      court: m.court ?? undefined,
      round: m.round ?? undefined,
      matchNumber: m.match_number ?? undefined,
      groupId: m.group_id ?? undefined,
      phase: m.phase ?? undefined,
      homeScore: m.home_score ?? null,
      awayScore: m.away_score ?? null,
      label: m.match_label ?? undefined,
    })),
    shopItems: (shopRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      description: s.description ?? undefined,
      available: s.available,
    })),
    sponsors: (sponsorsRes.data ?? []).map((s) =>
      normalizeSponsor({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url,
        placement: normalizePlacement(s.placement),
        slogan: s.slogan ?? undefined,
      })
    ),
  };
}

async function ensureCupId(client: ReturnType<typeof requireClient>, data: CupData): Promise<string> {
  const slug = getCupSlug();

  const { data: existing } = await client
    .from('cups')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await client
      .from('cups')
      .update({
        name: data.name,
        team_count: data.teamCount,
        schedule_params: data.scheduleParams,
        page_content: data.pageContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data: created, error } = await client
    .from('cups')
    .insert({
      slug,
      name: data.name,
      team_count: data.teamCount,
      schedule_params: data.scheduleParams,
      page_content: data.pageContent,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

export async function persistCup(data: CupData, cupId?: string): Promise<string> {
  const client = requireClient();
  const id = cupId || (await ensureCupId(client, data));

  let { error: updateError } = await client
    .from('cups')
    .update({
      name: data.name,
      team_count: data.teamCount,
      schedule_params: data.scheduleParams,
      page_content: data.pageContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError?.message?.includes('page_content')) {
    ({ error: updateError } = await client
      .from('cups')
      .update({
        name: data.name,
        team_count: data.teamCount,
        schedule_params: data.scheduleParams,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id));
  }
  if (updateError) throw updateError;

  const teamIds = data.teams.map((t) => t.id);
  const shopIds = data.shopItems.map((s) => s.id);
  const sponsorIds = data.sponsors.map((s) => s.id);

  // Teams
  if (data.teams.length > 0) {
    const { error } = await client.from('teams').upsert(
      data.teams.map((t, i) => ({
        id: t.id,
        cup_id: id,
        name: t.name,
        sort_order: i,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  {
    let q = client.from('teams').delete().eq('cup_id', id);
    if (teamIds.length > 0) q = q.not('id', 'in', `(${teamIds.join(',')})`);
    const { error } = await q;
    if (error) throw error;
  }

  // Matches — erstatt hele programmet (sikrer publisering til forsiden)
  await persistMatches(client, id, data.matches);

  // Shop
  if (data.shopItems.length > 0) {
    const { error } = await client.from('shop_items').upsert(
      data.shopItems.map((s, i) => ({
        id: s.id,
        cup_id: id,
        name: s.name,
        price: s.price,
        description: s.description ?? null,
        available: s.available,
        sort_order: i,
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  {
    let q = client.from('shop_items').delete().eq('cup_id', id);
    if (shopIds.length > 0) q = q.not('id', 'in', `(${shopIds.join(',')})`);
    const { error } = await q;
    if (error) throw error;
  }

  // Sponsors
  if (data.sponsors.length > 0) {
    const rows = data.sponsors.map((s, i) => ({
      id: s.id,
      cup_id: id,
      name: s.name,
      logo_url: s.logoUrl,
      placement: s.placement,
      slogan: s.slogan ?? null,
      sort_order: i,
    }));

    let { error } = await client.from('sponsors').upsert(rows, { onConflict: 'id' });
    if (error?.message?.includes('placement')) {
      ({ error } = await client.from('sponsors').upsert(
        rows.map(({ placement: _p, slogan: _s, ...rest }) => rest),
        { onConflict: 'id' }
      ));
    }
    if (error) throw error;
  }
  {
    let q = client.from('sponsors').delete().eq('cup_id', id);
    if (sponsorIds.length > 0) q = q.not('id', 'in', `(${sponsorIds.join(',')})`);
    const { error } = await q;
    if (error) throw error;
  }

  return id;
}

export async function uploadSidebarLogo(cupId: string, file: File): Promise<string> {
  const client = requireClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${cupId}/sidebar-logo.${ext}`;

  const { error: uploadError } = await client.storage
    .from('sponsors')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from('sponsors').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFeaturedSponsorLogo(cupId: string, file: File): Promise<string> {
  const client = requireClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${cupId}/featured.${ext}`;

  const { error: uploadError } = await client.storage
    .from('sponsors')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from('sponsors').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSponsorLogo(
  cupId: string,
  sponsorId: string,
  file: File
): Promise<string> {
  const client = requireClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `${cupId}/${sponsorId}.${ext}`;

  const { error: uploadError } = await client.storage
    .from('sponsors')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from('sponsors').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteSponsorLogo(cupId: string, sponsorId: string): Promise<void> {
  const client = requireClient();
  const { data: files } = await client.storage.from('sponsors').list(cupId);
  const toRemove = (files ?? [])
    .filter((f) => f.name?.startsWith(sponsorId))
    .map((f) => `${cupId}/${f.name}`);

  if (toRemove.length > 0) {
    await client.storage.from('sponsors').remove(toRemove);
  }
}

export function stripCupMeta(data: CupData & { cupId?: string }): CupData {
  const { cupId: _, ...rest } = data as CupData & { cupId?: string };
  return rest;
}
