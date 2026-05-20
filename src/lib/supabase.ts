import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
/** Legacy anon JWT (eyJ…) or new publishable key (sb_publishable_…) */
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

export const isSupabaseConfigured = Boolean(
  url?.startsWith('https://') && url.includes('.supabase.co') && anonKey
);

export function getSupabaseConfigStatus(): { ok: boolean; message: string } {
  if (!url?.trim()) {
    return {
      ok: false,
      message: 'VITE_SUPABASE_URL mangler (Project URL fra Supabase → Settings → API).',
    };
  }
  if (!url.includes('.supabase.co')) {
    return { ok: false, message: 'VITE_SUPABASE_URL ser ugyldig ut — må være https://….supabase.co' };
  }
  if (!anonKey?.trim()) {
    return {
      ok: false,
      message: 'Supabase-nøkkel mangler (VITE_SUPABASE_PUBLISHABLE_KEY eller VITE_SUPABASE_ANON_KEY).',
    };
  }
  return { ok: true, message: '' };
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

export function getCupSlug(): string {
  return (import.meta.env.VITE_CUP_SLUG as string | undefined) || 'active';
}
